# Stryker Mutation Testing Guide

This guide explains how mutation testing works with **dotnet Stryker**, how mutation scores are computed, how to interpret mutant states, and how to write unit tests that kill surviving mutants to pass the pre-merge quality gate.

---

## 1. What is Mutation Testing?

Code coverage only measures which lines of code were *executed* by tests, not whether the tests actually *assert* expected behavior. A test can execute 100% of the lines with zero assertions and report 100% code coverage.

**Mutation testing** tests your tests by inserting small deliberate bugs (called **mutants**) into the source code and running the test suite against each mutant:
- **Killed (`Killed`)**: At least one test failed when the bug was introduced. The test suite caught the bug.
- **Survived (`Survived`)**: All tests still passed despite the bug. The test suite is weak or missing assertions.
- **Timed Out (`Timeout`)**: The mutant caused an infinite loop or deadlock, which is counted as caught/killed.
- **No Coverage (`NoCoverage`)**: No test executed the mutated line.

$$\text{Mutation Score} = \frac{\text{Killed} + \text{Timeout}}{\text{Total Mutants} - \text{Ignored}} \times 100\%$$

---

## 2. Common Stryker Mutators in C#

| Mutator | Original Code | Mutated Code | How to Kill |
| :--- | :--- | :--- | :--- |
| **Boolean** | `if (status == Draft)` | `if (true)` or `if (false)` | Assert both true and false paths explicitly. |
| **Equality** | `amount > 1000m` | `amount >= 1000m` or `amount < 1000m` | Add boundary tests at exact edge values (e.g. `1000.00m`, `999.99m`, `1000.01m`). |
| **Arithmetic** | `total = subtotal + tax` | `total = subtotal - tax` | Assert exact computed numerical values, not just `total > 0`. |
| **String** | `new ArgumentException("Reason required")` | `new ArgumentException("")` | Assert the exception message or parameter name (`ex.Message`). |
| **Linq / Method** | `list.FirstOrDefault(x => ...)` | `list.LastOrDefault(x => ...)` | Test scenarios with multiple matching items where order matters. |
| **Statement** | `auditLog.Record(...)` | *(removed / empty)* | Assert side-effects or verify mock invocations. |

---

## 3. Pre-Merge Quality Gate (Constitution Principle VII)

The Project Constitution ([.specify/memory/constitution.md](file:///c:/Data/ai-sdlc-demo-app/.specify/memory/constitution.md)) mandates an **80% quality gate**:
- Any branch being merged into `main` or `master` MUST achieve at least **80% mutation score** on evaluated backend code.
- If the score is `< 80%`, the pre-merge gate blocks the merge and reports surviving mutants.

---

## 4. Differential vs Full Mutation Runs

### Differential Mode (`--since`)
- Compares changes against the target branch (e.g., `--since:master` or `--since:origin/main`).
- Only mutates code modified in the feature branch diff.
- **Recommended for rapid PR iterations and pre-commit checks** (< 1-2 minutes).

### Full Mode
- Analyzes the entire domain project (`InvoiceApp.Domain.csproj`).
- **Recommended for release candidates and scheduled CI builds**.
