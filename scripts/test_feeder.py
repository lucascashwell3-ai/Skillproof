#!/usr/bin/env python3
"""Unit tests for the feeder's check-stage filters. Inline fixtures, no network."""
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
import feeder  # noqa: E402


def repo(**kw):
    base = {
        "full_name": "acme/skill",
        "html_url": "https://github.com/acme/skill",
        "owner": {"login": "acme"},
        "stargazers_count": 100,
        "pushed_at": "2026-08-01T00:00:00Z",
        "created_at": "2024-01-01T00:00:00Z",
        "archived": False,
        "fork": False,
        "license": {"spdx_id": "MIT"},
        "description": "a skill",
        "topics": [],
        "forks_count": 5,
        "name": "skill",
    }
    base.update(kw)
    return base


class TestBaseline(unittest.TestCase):
    def test_ok_repo_passes(self):
        ok, _ = feeder.passes_baseline(repo(), [])
        self.assertTrue(ok)

    def test_low_stars_fails_without_named_source(self):
        ok, reason = feeder.passes_baseline(repo(stargazers_count=10), [])
        self.assertFalse(ok)
        self.assertIn("stars", reason)

    def test_low_stars_passes_for_named_source(self):
        ok, _ = feeder.passes_baseline(repo(stargazers_count=10), ["acme"])
        self.assertTrue(ok)

    def test_named_source_case_insensitive(self):
        ok, _ = feeder.passes_baseline(repo(stargazers_count=10), ["ACME"])
        self.assertTrue(ok)

    def test_archived_fails(self):
        ok, reason = feeder.passes_baseline(repo(archived=True), [])
        self.assertFalse(ok)
        self.assertIn("archived", reason)

    def test_fork_fails(self):
        ok, reason = feeder.passes_baseline(repo(fork=True), [])
        self.assertFalse(ok)
        self.assertIn("fork", reason)

    def test_no_license_fails(self):
        ok, reason = feeder.passes_baseline(repo(license=None), [])
        self.assertFalse(ok)
        self.assertIn("license", reason)

    def test_noassertion_license_fails(self):
        ok, reason = feeder.passes_baseline(repo(license={"spdx_id": "NOASSERTION"}), [])
        self.assertFalse(ok)
        self.assertIn("license", reason)

    def test_stale_push_fails(self):
        ok, reason = feeder.passes_baseline(repo(pushed_at="2023-01-01T00:00:00Z"), [])
        self.assertFalse(ok)
        self.assertIn("months", reason)

    def test_recent_push_passes(self):
        ok, _ = feeder.passes_baseline(repo(pushed_at="2026-07-01T00:00:00Z"), [])
        self.assertTrue(ok)


class TestSkillEvidence(unittest.TestCase):
    def test_skill_topic_alone_is_not_evidence(self):
        # maintainers mis-tag (cherry-studio, nanoclaw): topic without SKILL.md fails
        orig = feeder.gh
        feeder.gh = lambda path: {"truncated": False, "tree": [{"path": "README.md"}]}
        try:
            r = repo(topics=["claude-skills"], default_branch="main")
            ok, reason = feeder.is_skill_evidence(r)
        finally:
            feeder.gh = orig
        self.assertFalse(ok)
        self.assertIn("SKILL.md", reason)

    def test_skill_topic_with_skill_md_passes(self):
        orig = feeder.gh
        feeder.gh = lambda path: {"truncated": False, "tree": [{"path": "skills/x/SKILL.md"}]}
        try:
            r = repo(topics=["Claude-Code-Plugin"], default_branch="main")
            ok, _ = feeder.is_skill_evidence(r)
        finally:
            feeder.gh = orig
        self.assertTrue(ok)

    def test_unrelated_topics_fall_through_to_tree_check(self):
        orig = feeder.gh
        feeder.gh = lambda path: {"truncated": False, "tree": [
            {"path": "src/index.js"}, {"path": "SKILL.md"},
        ]}
        try:
            r = repo(topics=["mcp-server"], default_branch="main")
            ok, reason = feeder.is_skill_evidence(r)
        finally:
            feeder.gh = orig
        self.assertTrue(ok)
        self.assertEqual(reason, "ok")

    def test_skill_md_in_subdirectory_counts(self):
        orig = feeder.gh
        feeder.gh = lambda path: {"truncated": False, "tree": [
            {"path": "packages/my-skill/SKILL.md"},
        ]}
        try:
            r = repo(topics=[], default_branch="main")
            ok, _ = feeder.is_skill_evidence(r)
        finally:
            feeder.gh = orig
        self.assertTrue(ok)

    def test_no_topic_no_skill_md_fails(self):
        orig = feeder.gh
        feeder.gh = lambda path: {"truncated": False, "tree": [
            {"path": "README.md"}, {"path": "src/index.js"},
        ]}
        try:
            r = repo(topics=[], default_branch="main")
            ok, reason = feeder.is_skill_evidence(r)
        finally:
            feeder.gh = orig
        self.assertFalse(ok)
        self.assertIn("SKILL.md", reason)

    def test_truncated_tree_is_unknown_not_evidence(self):
        orig = feeder.gh
        feeder.gh = lambda path: {"truncated": True, "tree": [
            {"path": "SKILL.md"},  # even present, truncated means "can't trust it"
        ]}
        try:
            r = repo(topics=[], default_branch="main")
            ok, reason = feeder.is_skill_evidence(r)
        finally:
            feeder.gh = orig
        self.assertFalse(ok)
        self.assertIn("unknown", reason)

    def test_failed_tree_lookup_is_unknown_not_evidence(self):
        orig = feeder.gh
        feeder.gh = lambda path: None
        try:
            r = repo(topics=[], default_branch="main")
            ok, reason = feeder.is_skill_evidence(r)
        finally:
            feeder.gh = orig
        self.assertFalse(ok)
        self.assertIn("unknown", reason)

    def test_mcp_server_repo_without_skill_md_is_dropped_by_check(self):
        # Regression: gemini-cli/Scrapling/cherry-studio-style repos that pass
        # baseline (stars/license/freshness) but are not skills at all.
        r = repo(topics=["mcp-server"], stargazers_count=50000, default_branch="main")
        orig = feeder.gh
        feeder.gh = lambda path: {"truncated": False, "tree": [{"path": "README.md"}]}
        try:
            kept, dropped, _ = feeder.check([r], [], skim_new=False)
        finally:
            feeder.gh = orig
        self.assertEqual(kept, [])
        self.assertEqual(len(dropped), 1)
        self.assertIn("SKILL.md", dropped[0][1])


class TestFeedDedupe(unittest.TestCase):
    def test_dedupe_against_existing_and_quarantine(self, tmp_path=None):
        import tempfile
        tmp = Path(tempfile.mkdtemp())
        data_file = tmp / "skills.json"
        data_file.write_text(json.dumps({
            "skills": [{"id": "x", "repo_url": "https://github.com/acme/skill"}]
        }))
        qfile = tmp / "quarantine.json"
        qfile.write_text(json.dumps({
            "entries": [{"id": "y", "repo_url": "https://github.com/acme/bad"}]
        }))

        orig_data, orig_q = feeder.DATA, feeder.load_quarantine
        try:
            feeder.DATA = data_file

            def fake_load_quarantine():
                return json.loads(qfile.read_text())
            feeder.load_quarantine = fake_load_quarantine

            def fake_gh(path):
                if path.startswith("search/repositories"):
                    return {"items": [
                        repo(full_name="acme/skill", html_url="https://github.com/acme/skill"),
                        repo(full_name="acme/bad", html_url="https://github.com/acme/bad"),
                        repo(full_name="acme/new", html_url="https://github.com/acme/new"),
                    ]}
                return None
            orig_module_gh = feeder.gh
            feeder.gh = fake_gh
            try:
                _, candidates = feeder.feed(cap=50, named_owners=[])
            finally:
                feeder.gh = orig_module_gh
            names = {c["full_name"] for c in candidates}
            self.assertNotIn("acme/skill", names)   # already in catalog
            self.assertNotIn("acme/bad", names)      # quarantined
            self.assertIn("acme/new", names)
        finally:
            feeder.DATA = orig_data
            feeder.load_quarantine = orig_q

    def test_cap_respected(self):
        def fake_gh(path):
            if path.startswith("search/repositories"):
                return {"items": [
                    repo(full_name=f"acme/skill{i}", html_url=f"https://github.com/acme/skill{i}",
                         stargazers_count=100 - i)
                    for i in range(10)
                ]}
            return None
        orig_gh = feeder.gh
        feeder.gh = fake_gh
        import tempfile
        tmp = Path(tempfile.mkdtemp()) / "skills.json"
        tmp.write_text(json.dumps({"skills": []}))
        orig_data, orig_q = feeder.DATA, feeder.load_quarantine
        feeder.load_quarantine = lambda: {"entries": []}
        try:
            feeder.DATA = tmp
            _, candidates = feeder.feed(cap=3, named_owners=[])
            self.assertEqual(len(candidates), 3)
        finally:
            feeder.gh = orig_gh
            feeder.DATA = orig_data
            feeder.load_quarantine = orig_q


class TestRefreshIsGrowthOnly(unittest.TestCase):
    """The refresh stage may only remove an entry for a red flag in its current
    code. Every other failure keeps the entry exactly as it was."""

    def entry(self, **kw):
        base = {"id": "acme-skill", "name": "skill", "repo_url": "https://github.com/acme/skill",
                "author": "acme", "category": "workflow", "summary": "old summary",
                "pain_points": [], "signals": {"stars": 1, "forks": 0, "head_sha": "aaa"},
                "checked": {"date": "2026-08-01", "files_scanned": 3}}
        base.update(kw)
        return base

    def run_refresh(self, gh_map, scan_status, scan_result=None, entry=None):
        data = {"skills": [entry or self.entry()]}
        orig_gh, orig_rescan = feeder.gh, feeder.rescan
        feeder.gh = lambda path: gh_map(path)
        feeder.rescan = lambda url: (scan_status, scan_result)
        try:
            out = feeder.refresh_existing(data)
        finally:
            feeder.gh, feeder.rescan = orig_gh, orig_rescan
        return data, out

    def test_api_down_keeps_entry_untouched(self):
        data, _ = self.run_refresh(lambda p: None, "clean")
        self.assertEqual(len(data["skills"]), 1)
        self.assertEqual(data["skills"][0]["summary"], "old summary")

    def test_unchanged_code_is_not_rescanned(self):
        calls = []
        def gh(p):
            if p.startswith("repos/acme/skill/commits"): return [{"sha": "aaa"}]
            return repo(description="new summary")
        orig = feeder.rescan
        feeder.rescan = lambda url: calls.append(url) or ("clean", {"files_scanned": 1, "reds": {}})
        try:
            data = {"skills": [self.entry()]}
            orig_gh = feeder.gh; feeder.gh = gh
            try: feeder.refresh_existing(data)
            finally: feeder.gh = orig_gh
        finally:
            feeder.rescan = orig
        self.assertEqual(calls, [])
        self.assertEqual(data["skills"][0]["summary"], "new summary")  # summary refreshed anyway

    def test_moved_code_rescanned_clean_updates_checked(self):
        def gh(p):
            if "commits" in p: return [{"sha": "bbb"}]
            return repo()
        data, (refreshed, rescanned, pulled) = self.run_refresh(gh, "clean", {"files_scanned": 9, "reds": {}})
        self.assertEqual(rescanned, 1)
        self.assertEqual(data["skills"][0]["checked"]["files_scanned"], 9)
        self.assertEqual(data["skills"][0]["signals"]["head_sha"], "bbb")
        self.assertEqual(pulled, [])

    def test_moved_code_flagged_is_pulled_to_quarantine(self):
        def gh(p):
            if "commits" in p: return [{"sha": "bbb"}]
            return repo()
        data, (_, _, pulled) = self.run_refresh(gh, "flagged", {"files_scanned": 9, "reds": {"remote-exec pipe": "install.sh"}, "notes": {}})
        self.assertEqual(data["skills"], [])
        self.assertEqual(len(pulled), 1)
        self.assertIn("remote-exec pipe", pulled[0]["skim"]["red_flags"])

    def test_moved_code_scan_error_keeps_entry(self):
        def gh(p):
            if "commits" in p: return [{"sha": "bbb"}]
            return repo()
        data, (_, rescanned, pulled) = self.run_refresh(gh, "error", None)
        self.assertEqual(len(data["skills"]), 1)
        self.assertEqual(rescanned, 0)
        self.assertEqual(pulled, [])
        self.assertEqual(data["skills"][0]["checked"]["date"], "2026-08-01")  # old record stands

    def test_exception_on_one_entry_never_touches_the_others(self):
        bad = self.entry(id="bad", repo_url="https://github.com/acme/bad", signals=None)  # signals=None -> attribute error inside
        good = self.entry()
        def gh(p):
            if "commits" in p: return [{"sha": "aaa"}]
            return repo()
        data = {"skills": [bad, good]}
        orig_gh = feeder.gh; feeder.gh = gh
        try: feeder.refresh_existing(data)
        finally: feeder.gh = orig_gh
        self.assertEqual([s["id"] for s in data["skills"]], ["bad", "acme-skill"])


class TestQuarantineRecheck(unittest.TestCase):
    def q_entry(self, **kw):
        base = {"id": "acme-bad", "name": "bad", "repo_url": "https://github.com/acme/bad",
                "quarantined_on": "2026-07-27", "skim": {"red_flags": ["remote-exec pipe"]}}
        base.update(kw)
        return base

    def run_recheck(self, scan_status, scan_result=None, qentry=None, gh_fn=None):
        q = {"entries": [qentry or self.q_entry()]}
        data = {"skills": []}
        def gh(p):
            if "commits" in p: return [{"sha": "ccc"}]
            if p.startswith("repos/acme/bad/git/trees"): return {"truncated": False, "tree": [{"path": "SKILL.md"}]}
            return repo(full_name="acme/bad", html_url="https://github.com/acme/bad", name="bad", default_branch="main")
        orig_gh, orig_rescan = feeder.gh, feeder.rescan
        feeder.gh = gh_fn or gh
        feeder.rescan = lambda url: (scan_status, scan_result)
        try:
            readmitted = feeder.recheck_quarantine(q, data, [])
        finally:
            feeder.gh, feeder.rescan = orig_gh, orig_rescan
        return q, data, readmitted

    def test_clean_on_current_code_is_readmitted_flat(self):
        q, data, readmitted = self.run_recheck("clean", {"files_scanned": 4, "reds": {}})
        self.assertEqual(q["entries"], [])
        self.assertEqual(len(data["skills"]), 1)
        e = data["skills"][0]
        self.assertEqual(e["checked"]["files_scanned"], 4)
        for k in ("status", "triage", "skim", "quarantined_on"):
            self.assertNotIn(k, e)

    def test_still_flagged_stays_with_fresh_record(self):
        q, data, readmitted = self.run_recheck("flagged", {"files_scanned": 4, "reds": {"ssh key read": "x.py"}, "notes": {}})
        self.assertEqual(len(q["entries"]), 1)
        self.assertEqual(q["entries"][0]["skim"]["red_flags"], ["ssh key read"])
        self.assertEqual(data["skills"], [])

    def test_scan_error_stays_for_next_run(self):
        q, data, _ = self.run_recheck("error", None)
        self.assertEqual(len(q["entries"]), 1)
        self.assertEqual(data["skills"], [])

    def test_human_hold_is_never_readmitted(self):
        q, data, _ = self.run_recheck("clean", {"files_scanned": 4, "reds": {}}, qentry=self.q_entry(hold=True))
        self.assertEqual(len(q["entries"]), 1)
        self.assertEqual(data["skills"], [])

    def test_clean_but_no_skill_md_stays_out(self):
        def gh(p):
            if "commits" in p: return [{"sha": "ccc"}]
            if "git/trees" in p: return {"truncated": False, "tree": [{"path": "README.md"}]}
            return repo(full_name="acme/bad", html_url="https://github.com/acme/bad", name="bad", default_branch="main")
        q, data, _ = self.run_recheck("clean", {"files_scanned": 4, "reds": {}}, gh_fn=gh)
        self.assertEqual(len(q["entries"]), 1)
        self.assertEqual(data["skills"], [])


if __name__ == "__main__":
    unittest.main()
