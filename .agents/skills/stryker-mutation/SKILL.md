---
name: "stryker-mutation"
description: "Run mutation testing via dotnet Stryker, compute mutation scores, enforce an 80% mutation quality gate, and block or permit merges into main/master. Use when asked to test mutation score, verify unit test strength, run Stryker, or validate pre-merge mutation gates."
---

# Stryker Mutation Testing Gate Skill

This skill executes mutation testing for the backend (.NET) test suite using **dotnet Stryker**, calculates the mutation score percentage, validates it against the **80% quality gate** mandated by the project constitution ([.specify/memory/constitution.md](file:///c:/Data/ai-sdlc-demo-app/.specify/memory/constitution.md)), and determines whether changes can be merged into `main` or `master`.

---

## Operating Modes & Arguments

The skill accepts arguments from the prompt or CLI:

| Argument / Flag | Mode | Behavior |
| :--- | :--- | :--- |
| *(default)* or `--since` | Differential Gate | Mutates only files changed relative to `main`/`master` (fast PR feedback). |
| `--full`, `-Full` | Full Solution Run | Mutates all domain code in `InvoiceApp.Domain`. |
| `--threshold <num>` | Custom Gate | Overrides the minimum score threshold (default: `80%`). |
| `--open-report` | Browser Inspection | Automatically opens the interactive HTML report upon completion. |

---

## Execution Workflow

### Step 1: Pre-Flight Cleanup & Tool Verification
Ensure clean workspace state to prevent file locking on compiled binaries:
1. Terminate any lingering `testhost.exe` processes.
2. Verify that `dotnet-stryker` is restored in `backend/` via `dotnet tool restore`.
3. Confirm that baseline unit tests pass (`dotnet test`) before injecting mutations. If baseline tests fail, halt and resolve the failures first.

### Step 2: Run Stryker Mutation Testing
Execute the pre-merge gate script from repository root:

```powershell
# Differential mode (default - compares against main/master):
powershell -ExecutionPolicy Bypass -File .agents/skills/stryker-mutation/scripts/run-stryker-gate.ps1

# Full solution mutation run:
powershell -ExecutionPolicy Bypass -File .agents/skills/stryker-mutation/scripts/run-stryker-gate.ps1 -Full

# Custom threshold and open HTML report:
powershell -ExecutionPolicy Bypass -File .agents/skills/stryker-mutation/scripts/run-stryker-gate.ps1 -Threshold 85 -OpenReport
```

### Step 3: Parse Score & Evaluate Quality Gate
The script inspects the generated `mutation-report.json` under `backend/tests/InvoiceApp.Tests/StrykerOutput/`:
- **Killed Mutants**: Mutants caught by existing unit tests (good).
- **Survived Mutants**: Mutants that did not cause any test to fail (tests are missing assertions or boundary checks).
- **Timeout Mutants**: Mutants that caused infinite loops (counted as caught).
- **Mutation Score**: $\frac{\text{Killed} + \text{Timeout}}{\text{Total Tested}} \times 100\%$

### Step 4: Gate Verdict & Merge Decision
- **Score $\ge 80\%$**: **`PASSED`** — Unit tests are verified effective. Merge to target branch is **PERMITTED**.
- **Score $< 80\%$**: **`FAILED`** — Merge to target branch is **BLOCKED**. The agent or developer must write unit tests that kill the reported surviving mutants.

---

## Output Reporting Format

Present the mutation testing results using the following structured template:

```markdown
## 🧬 Dotnet Stryker Mutation Testing Gate Report

### Summary
| Metric | Value | Gate Threshold | Status |
| :--- | :--- | :--- | :---: |
| **Mutation Score** | **{SCORE}%** | 80.00% | {PASSED / FAILED} |
| **Mutants Killed** | {KILLED_COUNT} | - | ✅ |
| **Mutants Survived** | {SURVIVED_COUNT} | 0 | {⚠️ / ❌} |
| **Total Evaluated** | {TOTAL_COUNT} | - | ℹ️ |

**Merge Verdict**: {🟢 PERMITTED / 🔴 BLOCKED}

### Surviving Mutants (Actionable Test Items)
- **[{MUTATOR_NAME}]** `{FILE}:{LINE}`
  - *Original*: `expression`
  - *Mutant*: `replacement`
  - *Recommendation*: Write a unit test asserting `{EXPECTED_BEHAVIOR}`.

### Artifacts
- **Interactive HTML Report**: `file:///path/to/mutation-report.html`
- **JSON Report**: `file:///path/to/mutation-report.json`
```

---

## References
- In-depth mutation testing guide & mutators: [mutation-guide.md](references/mutation-guide.md)
- Automated gate script: [run-stryker-gate.ps1](scripts/run-stryker-gate.ps1)
- Project Constitution: [.specify/memory/constitution.md](file:///c:/Data/ai-sdlc-demo-app/.specify/memory/constitution.md)
