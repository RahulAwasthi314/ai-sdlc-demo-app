---
name: "code-review"
description: "Conduct an automated multi-dimensional code review across git diffs, PR branches, and pull requests. Flags SonarQube/clean code violations, dependency vulnerabilities (npm/NuGet), code typos, and architectural compliance with the project constitution, then formats and posts actionable review comments to GitHub PRs."
---

# Code Review Agent Skill

This skill activates an automated **Code Review Agent** that performs an exhaustive, multi-dimensional audit of code changes (git diffs, branch comparisons, or GitHub pull requests) and publishes an actionable, structured review comment directly to the GitHub PR.

It enforces the standards and non-negotiables set forth in the project constitution ([.specify/memory/constitution.md](file:///c:/Data/ai-sdlc-demo-app/.specify/memory/constitution.md)) and project conventions ([AGENTS.md](file:///c:/Data/ai-sdlc-demo-app/AGENTS.md)).

---

## Capabilities & Review Dimensions

The agent audits changes across five distinct dimensions:

1. **SonarQube & Clean Code**: Detects S112 generic exception throwing, S1135 unaddressed TODOs, excessive parameter lists, single-letter variable names, and boolean flag parameters.
2. **Dependency Vulnerabilities**: Runs automated vulnerability audits for frontend packages (`npm audit`) and backend NuGet packages (`dotnet list package --vulnerable`).
3. **Code Typos & Spelling**: Identifies misspelled identifiers, method names, and comments across the diff using semantic heuristics.
4. **Architectural & Constitution Compliance**:
   - **Backend**: Resource controllers must inherit `ApiControllerBase`, use `Handle(...)`, contain no business logic (isolated in `InvoiceApp.Domain`), use code-first C# `record` models, and require role-based authorization (with the homepage public).
   - **Frontend**: Angular 21 Signals, Reactive Forms, WCAG 2.1 AA accessibility (ARIA roles/labels), strict typing without unjustified `any`, modular structure, and route guards on all non-root routes.
5. **Inline Documentation**: Enforces the 1–2 line functional header comment standard on methods, classes, and functions.

---

## Operating Workflow

### Step 1: Resolve Target Scope
Identify the git commit range, branch, or GitHub Pull Request to review from the user prompt or `$ARGUMENTS`:
- Working tree or unstaged diff: Default inspection of active workspace.
- Branch comparison: `git diff origin/main...HEAD` or `git diff main...HEAD`.
- Pull Request number: e.g., `#42` or `--pr 42`.

### Step 2: Run Multi-Dimensional Audits
Execute the automated review script:
```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/code-review/scripts/review.ps1 -BaseBranch main
```
With GitHub PR integration:
```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/code-review/scripts/review.ps1 -PrNumber <PR_NUMBER> -Repo <OWNER/REPO>
```

### Step 3: Evaluate Verdict
The agent determines one of three formal verdicts:
- **`🟢 APPROVED`**: Zero blocker/critical architectural violations, zero S112 generic exceptions, zero high/critical vulnerabilities.
- **`🟡 COMMENT (Suggestions Available)`**: Minor improvements, non-blocking code smells, minor typos, or low-severity dependency advisories.
- **`🔴 CHANGES REQUESTED`**: Unresolved architectural violations (e.g., business logic in controllers, missing route guards, unjustified `any` types) or S112 generic exception throwing.

### Step 4: Publish GitHub PR Review Comment
The agent formats and posts the review comment:
1. **GitHub REST API**: Uses `$env:GITHUB_TOKEN` to call `POST /repos/{owner}/{repo}/issues/{pr_number}/comments`.
2. **GitHub CLI (`gh`)**: Falls back to `gh pr comment <PR_NUMBER> --body-file <PATH>` if `gh` is installed.
3. **Artifact Fallback**: When offline or running locally without PR credentials, writes the formatted comment to `docs/reviews/PR-REVIEW-<timestamp>.md` for manual review or one-click copying.

---

## Standard PR Comment Format

```markdown
# 🔍 Automated Code Review

**Review Verdict**: {VERDICT}
**Branch**: `{BRANCH}` | **Commit**: `{COMMIT}`

---

### 📊 Review Dimension Summary

| Dimension | Status | Issues | Details |
| :--- | :---: | :---: | :--- |
| **Architectural & Constitution** | {PASS/FAIL} | {COUNT} | Route guards, controller purity, strict types |
| **SonarQube & Clean Code** | {PASS/WARN} | {COUNT} | S112, S1135, single-letter vars, flag params |
| **Dependency Vulnerabilities** | {PASS/ADVISORY} | {COUNT} | npm audit + dotnet package vulnerabilities |
| **Code Typos & Spelling** | {PASS/WARN} | {COUNT} | Heuristic spell check across diffs |

---

### 🚨 Architectural & Constitution Issues
- List of blockers requiring changes before merge

### ⚠️ SonarQube & Clean Code Findings
- Specific rule violations with file locations and recommended refactorings

### 🛡️ Dependency Vulnerability Summary
- Actionable npm / NuGet vulnerability notes and recommended upgrade paths

### 🔤 Code Typos & Spelling Suggestions
- File location and suggested word corrections
```

---

## References & Utilities
- Review Checklist & Template: [review-checklist.md](references/review-checklist.md)
- Review Orchestrator: [review.ps1](scripts/review.ps1)
- PR Comment Publisher: [post-pr-comment.ps1](scripts/post-pr-comment.ps1)
- Project Constitution: [.specify/memory/constitution.md](file:///c:/Data/ai-sdlc-demo-app/.specify/memory/constitution.md)
