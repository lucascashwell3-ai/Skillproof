#!/usr/bin/env python3
"""Unit tests for the feeder — the short-list edition. Inline fixtures, no
network: `gh`, the skills.sh lookups, SKILL.md reads and the malice scan are
all stubbed, so every rule is shown rejecting (or admitting) for its stated
reason."""
import copy
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
import feeder  # noqa: E402

TODAY = feeder.TODAY


def repo(**kw):
    base = {
        "full_name": "acme/skills",
        "name": "skills",
        "html_url": "https://github.com/acme/skills",
        "owner": {"login": "acme"},
        "stargazers_count": 5000,
        "forks_count": 50,
        "pushed_at": "2026-09-01T00:00:00Z",
        "created_at": "2025-01-01T00:00:00Z",
        "archived": False,
        "fork": False,
        "license": {"spdx_id": "MIT"},
        "description": "skills",
        "topics": [],
        "default_branch": "main",
    }
    base.update(kw)
    return base


def tree(*paths):
    return {"truncated": False, "tree": [{"path": p, "type": "blob"} for p in paths]}


def skill_md(name, desc="Does a useful thing.", extra=""):
    return f"---\nname: {name}\ndescription: {desc}\n{extra}---\n\n# {name}\n"


PAINS = [{"id": "planning-drift", "label": "x", "keywords": []},
         {"id": "code-quality", "label": "x", "keywords": []},
         {"id": "generic-frontend", "label": "x", "keywords": []}]


def listed(name="grill-me", repo_="acme/skills", path="skills/grill-me", **kw):
    e = {"id": name, "name": name,
         "repo_url": f"https://github.com/{repo_}/tree/main/{path}",
         "author": "acme", "category": "planning", "summary": "hand-written summary",
         "line": "Type /grill-me and your AI asks questions until the plan holds up.",
         "calls": "you", "for": "anyone", "needs": [], "pain_points": [],
         "source": {"repo": repo_, "branch": "main", "path": path},
         "signals": {"stars": 1, "forks": 0, "head_sha": "aaa", "checked": "2026-09-01"},
         "checked": {"date": "2026-09-01", "files_scanned": 1}}
    e.update(kw)
    return e


class Stubbed(unittest.TestCase):
    """Swap the feeder's outside world for fixtures; restore after."""

    def setUp(self):
        self._saved = {k: getattr(feeder, k) for k in ("gh", "read_skill", "rescan", "http_get")}
        self.gh_map = {}
        self.skills = {}
        feeder.gh = lambda path: self.gh_map.get(path.split("?")[0])
        feeder.read_skill = lambda full, branch, folder: self.skills.get(f"{full}/{folder}")
        feeder.rescan = lambda url, paths=None: ("clean", {"files_scanned": 2, "reds": {}, "notes": {}})
        feeder.http_get = lambda url, timeout=30: None

    def tearDown(self):
        for k, v in self._saved.items():
            setattr(feeder, k, v)


# ------------------------------------------------------------------ parsing
class TestFrontmatter(unittest.TestCase):
    def test_folded_description_is_one_line(self):
        fm = feeder.frontmatter("---\nname: x\ndescription: >\n  first part\n  second part\nlicense: MIT\n---\n")
        self.assertEqual(fm["description"], "first part second part")
        self.assertEqual(fm["license"], "MIT")

    def test_user_only_flag(self):
        fm = feeder.frontmatter(skill_md("x", extra="disable-model-invocation: true\n"))
        self.assertEqual(fm["disable-model-invocation"], "true")

    def test_no_header(self):
        self.assertEqual(feeder.frontmatter("# just a readme"), {})


class TestSkillFolders(unittest.TestCase):
    def test_root_nested_and_dot_folders(self):
        t = tree("SKILL.md", "skills/a/SKILL.md", ".claude/skills/b/SKILL.md", "skills/a/ref.md")
        self.assertEqual(sorted(feeder.skill_folders(t)), ["", "skills/a"])

    def test_no_tree(self):
        self.assertEqual(feeder.skill_folders(None), [])


# ---------------------------------------------------------------- the bar
class TestBar(unittest.TestCase):
    def cand(self, r=None, name="helper", desc="Helps you plan.", **fm):
        f = {"name": name, "description": desc}
        f.update(fm)
        return {"repo": r or repo(), "folder": f"skills/{name}", "name": name, "fm": f, "files": []}

    def test_ok(self):
        self.assertEqual(feeder.passes_bar(self.cand()), (True, "ok"))

    def test_archived_and_fork_fail(self):
        self.assertFalse(feeder.passes_bar(self.cand(repo(archived=True)))[0])
        self.assertFalse(feeder.passes_bar(self.cand(repo(fork=True)))[0])

    def test_no_license_fails_unless_skill_declares_one(self):
        r = repo(license=None)
        self.assertEqual(feeder.passes_bar(self.cand(r))[1], "no open license")
        self.assertTrue(feeder.passes_bar(self.cand(r, license="MIT"))[0])

    def test_stale_fails(self):
        ok, reason = feeder.passes_bar(self.cand(repo(pushed_at="2024-01-01T00:00:00Z")))
        self.assertFalse(ok)
        self.assertIn("12 months", reason)

    def test_copy_of_a_popular_skill_fails(self):
        ok, reason = feeder.passes_bar(self.cand(repo(stargazers_count=40)))
        self.assertFalse(ok)
        self.assertIn("not an original", reason)

    def test_vendor_tied_skill_fails(self):
        ok, reason = feeder.passes_bar(self.cand(desc="Deploy your app to Azure in one step."))
        self.assertFalse(ok)
        self.assertIn("vendor", reason)

    def test_tool_named_skill_fails(self):
        self.assertFalse(feeder.passes_bar(self.cand(name="orca-cli"))[0])


class TestUsage(unittest.TestCase):
    def test_leaderboard_hit_needs_no_lookup(self):
        u = feeder.Usage({"acme/skills/helper": 250_000}, budget=0)
        self.assertEqual(u.installs("acme/skills", "helper"), 250_000)

    def test_budget_spent_means_unknown(self):
        u = feeder.Usage({}, budget=0)
        self.assertIsNone(u.installs("acme/skills", "helper"))

    def test_leaderboard_parse(self):
        saved = feeder.http_get
        feeder.http_get = lambda url, timeout=30: (
            '[{\\"source\\":\\"acme/skills\\",\\"skillId\\":\\"helper\\",\\"name\\":\\"helper\\",'
            '\\"installs\\":1234},{\\"source\\":\\"open.example.cn\\",\\"skillId\\":\\"x\\",'
            '\\"name\\":\\"x\\",\\"installs\\":9}]')
        try:
            self.assertEqual(feeder.fetch_leaderboard(), {"acme/skills/helper": 1234})
        finally:
            feeder.http_get = saved


# --------------------------------------------------------------- feed stage
class TestFeed(Stubbed):
    def data(self, *entries):
        return {"pain_points": PAINS, "skills": list(entries)}

    def author_world(self, *folders, **repo_kw):
        r = repo(**repo_kw)
        self.gh_map["users/acme/repos"] = [r]
        self.gh_map[f"repos/{r['full_name']}/git/trees/main"] = tree(*[f"{f}/SKILL.md" for f in folders])
        for f in folders:
            self.skills[f"{r['full_name']}/{f}"] = skill_md(f.split("/")[-1])
        return r

    def feed(self, data, usage, seen=None, q=None, skip=None, baseline=False):
        return feeder.feed(data, q or {"entries": []}, ["acme"], skip or {}, usage,
                           seen=seen if seen is not None else {}, baseline=baseline)

    def test_new_folder_from_proven_author_with_real_use_is_a_candidate(self):
        self.author_world("skills/helper")
        cands, _ = self.feed(self.data(), feeder.Usage({"acme/skills/helper": 25_000}, 0))
        self.assertEqual([c["name"] for c in cands], ["helper"])

    def test_not_enough_use_waits_and_is_recorded(self):
        self.author_world("skills/helper")
        seen = {}
        cands, dropped = self.feed(self.data(), feeder.Usage({"acme/skills/helper": 500}, 0), seen)
        self.assertEqual(cands, [])
        self.assertEqual(seen[feeder.seen_key("acme/skills/skills/helper")]["verdict"], "waiting")
        self.assertIn("not enough real use yet", dropped[0][1])

    def test_waiting_folder_closes_after_wait_days(self):
        self.author_world("skills/helper")
        seen = {feeder.seen_key("acme/skills/skills/helper"): {"first_seen": "2026-01-01", "verdict": "waiting"}}
        cands, _ = self.feed(self.data(), feeder.Usage({"acme/skills/helper": 900_000}, 0), seen)
        self.assertEqual(cands, [])
        self.assertIn("no real use within", seen[feeder.seen_key("acme/skills/skills/helper")]["verdict"])

    def test_judged_folder_is_never_reconsidered(self):
        self.author_world("skills/helper")
        seen = {feeder.seen_key("acme/skills/skills/helper"): {"first_seen": "2026-09-27",
                                              "verdict": "already there when the list was chosen by hand"}}
        cands, dropped = self.feed(self.data(), feeder.Usage({"acme/skills/helper": 900_000}, 0), seen)
        self.assertEqual((cands, dropped), ([], []))

    def test_baseline_records_everything_and_admits_nothing(self):
        self.author_world("skills/a", "skills/b")
        seen = {}
        cands, _ = self.feed(self.data(), feeder.Usage({"acme/skills/a": 900_000}, 0), seen, baseline=True)
        self.assertEqual(cands, [])
        self.assertIn(feeder.seen_key("acme/skills/skills/a"), seen)
        self.assertIn(feeder.seen_key("acme/skills/skills/b"), seen)
        self.assertIn(feeder.seen_key("acme/skills/a"), seen)   # by name too
        self.assertFalse(any("acme" in k for k in seen))       # no names in the record

    def test_listed_twin_part_skip_quarantine_and_vendor_are_refused(self):
        self.author_world("skills/grill-me", "skills/other/grill-me", "skills/grill-me-lite",
                          "skills/meta", "skills/azure-deploy", "skills/fresh")
        usage = feeder.Usage({f"acme/skills/{n}": 900_000 for n in
                              ("grill-me", "grill-me-lite", "meta", "azure-deploy", "fresh")}, 0)
        data = self.data(listed())
        q = {"entries": [{"id": "fresh", "source": {"repo": "acme/skills", "path": "skills/fresh"}}]}
        cands, dropped = self.feed(data, usage, q=q, skip={"acme/skills/meta": "a pack's setup"})
        self.assertEqual(cands, [])
        reasons = sorted(r for _, r in dropped)
        self.assertEqual(reasons, sorted([
            "a skill with this name is already listed (no twins)",
            "part of grill-me, which is already listed",
            "skip list: a pack's setup",
            "tied to one vendor's product or a paid service",
            "quarantined"]))

    def test_whole_repo_parked_blocks_its_folders(self):
        self.author_world("skills/fresh")
        q = {"entries": [{"id": "acme-skills", "repo_url": "https://github.com/acme/skills"}]}
        cands, dropped = self.feed(self.data(), feeder.Usage({"acme/skills/fresh": 900_000}, 0), q=q)
        self.assertEqual(cands, [])
        self.assertEqual(dropped[0][1], "quarantined")

    def test_low_star_author_repos_are_not_walked(self):
        self.author_world("skills/helper", stargazers_count=10)
        cands, dropped = self.feed(self.data(), feeder.Usage({"acme/skills/helper": 900_000}, 0))
        self.assertEqual((cands, dropped), ([], []))


# -------------------------------------------------------------- check stage
class TestCheck(Stubbed):
    def cand(self, name, installs, **repo_kw):
        r = repo(**repo_kw)
        return {"repo": r, "folder": f"skills/{name}", "name": name, "installs": installs,
                "fm": {"name": name, "description": "Helps you plan a big change."},
                "files": [f"skills/{name}/SKILL.md"], "key": f"acme/skills/skills/{name}"}

    def test_one_per_run_most_installed_first(self):
        data = {"pain_points": PAINS, "skills": []}
        seen = {}
        kept, dropped, _ = feeder.check([self.cand("small", 30_000), self.cand("big", 900_000)],
                                        data, scan_new=False, seen=seen)
        self.assertEqual([e["name"] for e in kept], ["big"])
        self.assertIn("slot is taken", dropped[0][1])
        self.assertEqual(seen[feeder.seen_key("acme/skills/skills/big")]["verdict"], "listed")
        self.assertEqual(seen[feeder.seen_key("acme/skills/skills/small")]["verdict"], "waiting")

    def test_full_list_admits_nothing(self):
        data = {"pain_points": PAINS, "skills": [listed(name=f"s{i}", path=f"p{i}")
                                                  for i in range(feeder.MAX_LIST)]}
        kept, dropped, _ = feeder.check([self.cand("big", 900_000)], data, scan_new=False)
        self.assertEqual(kept, [])
        self.assertIn("list is full", dropped[0][1])

    def test_flagged_scan_quarantines(self):
        feeder.rescan = lambda url, paths=None: ("flagged", {"files_scanned": 3,
                                                             "reds": {"remote-exec pipe": "x.sh"}, "notes": {}})
        kept, _, q = feeder.check([self.cand("big", 900_000)],
                                  {"pain_points": PAINS, "skills": []}, scan_new=True)
        self.assertEqual(kept, [])
        self.assertEqual(q[0]["skim"]["red_flags"], ["remote-exec pipe"])

    def test_scan_error_waits(self):
        feeder.rescan = lambda url, paths=None: ("error", None)
        seen = {}
        kept, _, q = feeder.check([self.cand("big", 900_000)],
                                  {"pain_points": PAINS, "skills": []}, scan_new=True, seen=seen)
        self.assertEqual((kept, q), ([], []))
        self.assertEqual(seen[feeder.seen_key("acme/skills/skills/big")]["verdict"], "waiting")

    def test_new_entry_passes_the_honesty_gate(self):
        self.gh_map["repos/acme/skills/commits"] = [{"sha": "b" * 40}]
        kept, _, _ = feeder.check([self.cand("big", 900_000)],
                                  {"pain_points": PAINS, "skills": []}, scan_new=True)
        e = kept[0]
        self.assertEqual(e["repo_url"], "https://github.com/acme/skills/tree/main/skills/big")
        self.assertNotRegex(e["line"], r"\bit\b")
        self.assertEqual(e["signals"]["installs"], 900_000)
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "skills.json"
            path.write_text(json.dumps({"as_of": TODAY, "pain_points": PAINS, "skills": [e]}))
            r = subprocess.run([sys.executable, str(ROOT / "validate_index.py")],
                               env=dict(os.environ, SKILLPROOF_DATA=str(path)),
                               capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)


class TestToEntry(unittest.TestCase):
    def test_user_called_skill(self):
        c = {"repo": repo(), "folder": "skills/x", "name": "x", "files": [],
             "fm": {"name": "x", "description": "Grill you about a plan. Use when planning.",
                    "disable-model-invocation": "true"}}
        e = feeder.to_entry(c, None, {"planning-drift"})
        self.assertEqual(e["calls"], "you")
        self.assertEqual(e["summary"], "Grill you about a plan.")
        self.assertEqual(e["pain_points"], ["planning-drift"])

    def test_scripts_mean_needs_scripts(self):
        c = {"repo": repo(), "folder": "skills/x", "name": "x", "files": ["skills/x/run.py"],
             "fm": {"name": "x", "description": "Refactor code."}}
        self.assertEqual(feeder.to_entry(c, None, set())["needs"], ["files", "scripts"])


# ------------------------------------------------------------ refresh stage
class TestRefresh(Stubbed):
    def run_refresh(self, entry=None, usage=None):
        data = {"skills": [entry or listed()]}
        out = feeder.refresh_existing(data, usage)
        return data, out

    def test_api_down_keeps_entry_untouched(self):
        e = listed()
        data, _ = self.run_refresh(copy.deepcopy(e))
        self.assertEqual(data["skills"][0], e)

    def test_hand_written_text_is_never_overwritten(self):
        self.gh_map["repos/acme/skills"] = repo(description="a different description")
        self.gh_map["repos/acme/skills/commits"] = [{"sha": "aaa"}]
        data, _ = self.run_refresh(usage=feeder.Usage({"acme/skills/grill-me": 1_300_000}, 0))
        s = data["skills"][0]
        self.assertEqual(s["summary"], "hand-written summary")
        self.assertTrue(s["line"].startswith("Type /grill-me"))
        self.assertEqual(s["signals"]["installs"], 1_300_000)
        self.assertEqual(s["signals"]["stars"], 5000)

    def test_unchanged_folder_is_not_rescanned(self):
        calls = []
        feeder.rescan = lambda url, paths=None: calls.append(paths) or ("clean", {"files_scanned": 1})
        self.gh_map["repos/acme/skills"] = repo()
        self.gh_map["repos/acme/skills/commits"] = [{"sha": "aaa"}]
        self.run_refresh()
        self.assertEqual(calls, [])

    def test_moved_folder_rescans_exactly_its_folders(self):
        calls = []
        feeder.rescan = lambda url, paths=None: calls.append(paths) or ("clean", {"files_scanned": 4})
        self.gh_map["repos/acme/skills"] = repo()
        self.gh_map["repos/acme/skills/commits"] = [{"sha": "bbb"}]
        data, (_, rescanned, _) = self.run_refresh(listed(source={
            "repo": "acme/skills", "branch": "main", "path": "skills/grill-me",
            "with": ["skills/grilling"]}))
        self.assertEqual(calls, [["skills/grill-me", "skills/grilling"]])
        self.assertEqual(rescanned, 1)
        self.assertEqual(data["skills"][0]["checked"]["date"], TODAY)

    def test_moved_folder_flagged_is_pulled(self):
        feeder.rescan = lambda url, paths=None: ("flagged", {"files_scanned": 2,
                                                             "reds": {"ssh key read": "a.sh"}, "notes": {}})
        self.gh_map["repos/acme/skills"] = repo()
        self.gh_map["repos/acme/skills/commits"] = [{"sha": "bbb"}]
        data, (_, _, pulled) = self.run_refresh()
        self.assertEqual(data["skills"], [])
        self.assertEqual(pulled[0]["skim"]["red_flags"], ["ssh key read"])

    def test_scan_error_keeps_entry(self):
        feeder.rescan = lambda url, paths=None: ("error", None)
        self.gh_map["repos/acme/skills"] = repo()
        self.gh_map["repos/acme/skills/commits"] = [{"sha": "bbb"}]
        data, _ = self.run_refresh()
        self.assertEqual(len(data["skills"]), 1)

    def test_exception_on_one_entry_never_touches_the_others(self):
        good = listed(name="good", path="skills/good")
        bad = listed(name="bad", path="skills/bad")
        bad["signals"] = None  # makes setdefault blow up
        self.gh_map["repos/acme/skills"] = repo()
        data = {"skills": [bad, good]}
        feeder.refresh_existing(data)
        self.assertEqual([s["name"] for s in data["skills"]], ["bad", "good"])


class TestRecheck(Stubbed):
    def test_whole_repo_entry_from_the_old_catalog_is_never_readmitted(self):
        q = {"entries": [{"id": "acme-pack", "repo_url": "https://github.com/acme/pack"}]}
        data = {"skills": []}
        self.assertEqual(feeder.recheck_quarantine(q, data), [])
        self.assertEqual(len(q["entries"]), 1)

    def test_clean_single_skill_is_readmitted_with_its_fields(self):
        e = dict(listed(name="fresh", path="skills/fresh"), quarantined_on="2026-09-01",
                 skim={"red_flags": ["x"]})
        q = {"entries": [e]}
        data = {"skills": []}
        back = feeder.recheck_quarantine(q, data)
        self.assertEqual([s["name"] for s in back], ["fresh"])
        self.assertNotIn("skim", data["skills"][0])
        self.assertEqual(q["entries"], [])

    def test_hold_is_never_readmitted(self):
        q = {"entries": [dict(listed(name="fresh", path="skills/fresh"), hold=True)]}
        self.assertEqual(feeder.recheck_quarantine(q, {"skills": []}), [])

    def test_still_flagged_stays(self):
        feeder.rescan = lambda url, paths=None: ("flagged", {"files_scanned": 1, "reds": {"a": "b"},
                                                             "notes": {}})
        q = {"entries": [listed(name="fresh", path="skills/fresh")]}
        self.assertEqual(feeder.recheck_quarantine(q, {"skills": []}), [])
        self.assertEqual(q["entries"][0]["skim"]["red_flags"], ["a"])


if __name__ == "__main__":
    unittest.main()
