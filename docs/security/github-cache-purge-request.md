# GitHub Support Request: Purge Cached Views for Rewritten Personal Email Commits

Repository: https://github.com/lac5q/agentkitche.dev
Former repository URL: https://github.com/lac5q/agent-kitchen
Owner: lac5q
Date prepared: 2026-05-05

## Summary

Please purge cached GitHub views and pull request references for old commits that contained a personal author email address. The repository history was rewritten with `git filter-repo`, and the rewritten `main` branch and tags were force-pushed successfully. The old commits are no longer reachable from the current branch/tag refs, but the GitHub commits API still resolves the orphaned SHAs and exposes the original author email.

This request follows GitHub's documented guidance for sensitive data removal after force-pushing rewritten history: contact GitHub Support to remove cached views and references to sensitive data in pull requests on GitHub.

Reference: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository

## Sensitive Data Type

Personal email address exposed in historical commit author metadata.

Old email to purge from cached/orphaned GitHub views:

- `luis@calderon.com`

Replacement email now present in canonical history:

- `lcalderon@users.noreply.github.com`

## Completed Remediation

- Rewrote local history with `git filter-repo` to replace the personal email with the GitHub noreply address.
- Force-pushed rewritten `main` with `--force-with-lease`.
- Force-updated all repository tags.
- Verified current `origin/main` no longer contains the personal email.
- Verified local reachable refs no longer contain the personal email.

Current canonical `main` tip:

- `b8263dd567e90a769d4cae63b4a0ff0358b644cf`

## Old SHAs Still Resolving Through GitHub API

The following old SHAs still resolve via the GitHub commits API and expose the old author email:

- `585cf1bfe78c3449793d3144edb65c35cc101858` — `feat: start v1.7 tool gateway runtime`
- `833d3e2c30084568e651f10a65a5b77f8e6a39ef` — `fix: redact tool attention paths`
- `4d319288b521e01bbe9b146ff668e59f4826ec88` — `Merge pull request #2 from lac5q/codex/v1.6-gsd-monorepo-completion`
- `d25a54e27d9edbde35d22cc378cd0fd11cb2aca7` — `Merge pull request #1 from lac5q/codex/v1.6-monorepo-tool-attention`

## Requested Action

Please purge cached views, pull request references, and orphaned commit API visibility for the old SHAs above, or advise if any additional repository-side action is required.

## Local Verification Commands Already Run

```bash
git log origin/main --format='%ae' | sort -u
git log origin/main --author='luis@calderon.com' --oneline
git log --all --author='luis@calderon.com' --oneline
git ls-remote --tags origin
```

Expected current branch/tag refs are clean; only orphaned GitHub cached/API views remain.
