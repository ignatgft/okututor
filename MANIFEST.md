# Package manifest

- `MASTER_EXECUTION_TASK.md` — main autonomous engineering task.
- `MVP_FUNCTIONAL_CATALOG.md` — user-facing functional catalog and each control's intended behavior.
- `PAGES_AND_ROUTES_MAP.md` — route inventory and canonical paths.
- `REPOSITORY_AUDIT_BASELINE.md` — verified static baseline for inspected GitHub commit.
- `PRODUCT_SCOPE_AND_DECISIONS.md` — product boundaries and decisions.
- `ADMIN_AND_MONITORING_SPEC.md` — admin console and operations design.
- `ACCEPTANCE_TEST_SCENARIOS.md` — end-to-end, security, auth and admin scenarios.
- `GIT_REPOSITORY_GOVERNANCE.md` — branches, worktrees, PR, CI and cleanup rules.
- `AGENTS.md` — always-on project instructions.
- `.agents/rules/` — flat Antigravity rules with valid frontmatter triggers.
- `.agents/agents/` — specialist roles for orchestrated subagents.
- `docs/engineering/` and `docs/runbooks/` — templates for local evidence and operations.
- `.github/workflows/README.md` — instructs release agent to create real CI workflows only after checking available tooling.

The pack is a starter specification, not a claim that the project is already fixed. Its audit is static source inspection; Antigravity must reproduce and record runtime results locally.
