#!/usr/bin/env python3
"""The `review` data contract — one definition, imported by everyone.

`deep_review.py` writes review blocks; `validate_index.py` polices them. If the
two ever disagreed about the shape, the gate would be checking something the
producer isn't producing. So the vocabulary, the required fields, and the JSON
schema handed to the model all live here.

The tier this describes is `reviewed`: an automated reviewer READ the source.
Nothing was installed and nothing was executed. That distinction is the product,
so it is encoded in the field names (`limits`, `scope`) rather than left to prose.
"""

# What an entry can touch. A FIXED vocabulary, so the site can render these as
# consistent chips and filter on them. The model picks from this list only —
# anything else is a validation error, because an invented category is a claim
# nobody defined and nobody can filter.
TOUCHES_VOCAB = (
    "reads project files",
    "writes project files",
    "network calls",
    "reads credentials/keys",
    "runs shell commands",
    "installs dependencies",
    "writes outside the project",
    "no side effects",
)

# "no side effects" is a claim about the whole entry, so it cannot be combined
# with a claim that it does something.
TOUCHES_EXCLUSIVE = "no side effects"

REVIEW_REQUIRED = (
    "does",       # one sentence, plain English: what this gives your agent
    "touches",    # fixed vocabulary above
    "undo",       # how to turn it off / remove it
    "scope",      # what the review actually covered
    "limits",     # what this review canNOT tell you
    "reviewed_at",
    "reviewer",
    "source_sha",  # THE load-bearing field: pins the claim to one commit
)

# The archived footprint of a review that went stale. Kept, never rendered as
# current — see validate_index.py --downgrade-stale.
REVIEW_STALE_REQUIRED = ("downgraded_on", "stale_reason")

REVIEWER_ID = "automated-source-review v1"

# The undo string a reviewer must write when the source genuinely doesn't say.
# Real finding, not a gap to paper over.
UNDO_NOT_DOCUMENTED = "not documented by the author"

# --- What may keep a review alive across a commit -------------------------
# A review is pinned to one commit. Expiring it on ANY commit means a typo fix
# in a README throws away a source review — measured 2026-08-03: 21 reviews
# expired in three days, and at least one of them for nothing but documentation.
#
# So a commit that changes only files in this list re-pins the review instead of
# killing it. This is a SHORT ALLOWLIST on purpose. The opposite design — list
# the dangerous file types and treat the rest as safe — fails the moment a repo
# adds something the list never anticipated, and that miss would publish a
# review of code that changed. Anything not named here is material.
INERT_NAMES = (
    "readme", "changelog", "contributing", "code_of_conduct", "license",
    "licence", "notice", "authors", "citation", "funding", "security.md",
    ".gitignore", ".gitattributes", ".editorconfig",
)
INERT_EXTS = (".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico", ".bmp",
              ".mp4", ".mov", ".webm", ".pdf")


def inert_file(path: str) -> bool:
    """True only for files whose contents cannot change behaviour.

    Judged on the file name alone, deliberately — reading the diff to decide
    would mean trusting a judgement call on every commit forever. A name-based
    rule is one someone can check.
    """
    name = (path or "").rsplit("/", 1)[-1].lower()
    if not name:
        return False
    if name.endswith(INERT_EXTS):
        return True
    return any(name == n or name.startswith(n + ".") for n in INERT_NAMES)


def output_schema() -> dict:
    """JSON Schema handed to the model as a structured-output format.

    Deliberately strict: `additionalProperties: false` and an enum on `touches`
    mean a malformed review is rejected at the API boundary instead of being
    caught three steps later by the honesty gate.
    """
    return {
        "type": "object",
        "properties": {
            "does": {
                "type": "string",
                "description": (
                    "One sentence, plain English, for someone who does not read code: "
                    "what this gives their AI agent. No jargon. Do not say 'skill' or "
                    "'library' — say what it actually does for them."
                ),
            },
            "touches": {
                "type": "array",
                "items": {"type": "string", "enum": list(TOUCHES_VOCAB)},
                "description": (
                    "Every category the source shows this touching. Use "
                    "'no side effects' ONLY when it is pure text/markdown with no "
                    "scripts, and then use it alone."
                ),
            },
            "undo": {
                "type": "string",
                "description": (
                    "Exactly how to turn it off or remove it, from what the source "
                    f"actually says. If the source does not say, write '{UNDO_NOT_DOCUMENTED}' "
                    "and nothing else. Never guess a command."
                ),
            },
            "limits": {
                "type": "string",
                "description": (
                    "What this review cannot tell the reader. Always note that the code "
                    "was read and not executed. Add anything genuinely ambiguous in the "
                    "source here rather than reassuring the reader."
                ),
            },
        },
        "required": ["does", "touches", "undo", "limits"],
        "additionalProperties": False,
    }
