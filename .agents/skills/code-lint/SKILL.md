---
name: "code-lint"
description: "Audit, verify, and enforce code quality, static analysis, formatting, and clean code standards separately or collectively for the Angular frontend and ASP.NET Core backend. Use when requested to lint code, check code quality, run static analysis, verify ESLint or Roslyn/Sonar rules, or fix code format issues."
---

# Code Lint & Quality Skill

This skill enforces code quality, static analysis, styling, strict typing, and architectural guidelines separately or collectively across the frontend (**Angular 21 + TypeScript**) and backend (**ASP.NET Core on .NET 10 / .NET 8**).

It implements the quality and clean code standards mandated in the project constitution ([.specify/memory/constitution.md](file:///c:/Data/ai-sdlc-demo-app/.specify/memory/constitution.md)) and project conventions ([AGENTS.md](file:///c:/Data/ai-sdlc-demo-app/AGENTS.md)).

---

## Scope & Target Resolution

Parse the user input or arguments `$ARGUMENTS` to determine target scope:

| Argument / Intent Keyword | Target Scope | Execution Command |
| :--- | :--- | :--- |
| `frontend`, `fe`, `ui`, `client` | Frontend Only | Run frontend lint script / ESLint / Prettier |
| `backend`, `be`, `api`, `server` | Backend Only | Run backend lint script / `dotnet format` / Roslyn |
| `all`, `both`, `full`, or empty | Full Stack (Both) | Run unified runner for both frontend & backend |
| `--fix`, `-Fix`, `fix` | Auto-Remediate | Run formatting and automated fixes |

---

## 1. Frontend Quality Workflow (Angular 21)

When linting the frontend (`InvoiceAppFE/`):

### Step 1: Prettier & Formatting Verification
Verify that all source files conform to [.prettierrc](file:///c:/Data/ai-sdlc-demo-app/InvoiceAppFE/.prettierrc).
- **Check command**: `npx prettier --check .` (inside `InvoiceAppFE`)
- **Fix command**: `npx prettier --write .` (inside `InvoiceAppFE`)

### Step 2: TypeScript Strict Typing & Compiler Check
Verify that TypeScript compiles with zero errors under strict mode (`strict: true`).
- **Check command**: `npx tsc --noEmit` (inside `InvoiceAppFE`)
- **Strict Typing Rules**:
  - `any` is strictly prohibited unless accompanied by an explicit inline justification comment.
  - All public component properties, method parameters, and return types must be explicitly typed.
  - Data models must be declared as `interface` or `type`, never generic `{}` or untyped objects.

### Step 3: Angular 21 Architecture & Clean Code Audit
Inspect Angular components, templates, and services against project principles:
- **Signals & Reactive Forms**: Ensure state management uses Angular Signals (`signal`, `computed`) and forms use Reactive Forms.
- **Accessibility (WCAG 2.1 AA)**: Check that Angular Material components and interactive controls include descriptive `aria-label`, `aria-describedby`, and keyboard accessibility.
- **Component Modularity**: Ensure components, services, and guards reside in dedicated individual files.
- **Documentation**: Verify that functions and classes have a crisp **1–2 line** summary documentation header comment.

### Automated Execution Script
Run the automated PowerShell script from the repository root:
```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/code-lint/scripts/lint-frontend.ps1
# With automated formatting fixes:
powershell -ExecutionPolicy Bypass -File .agents/skills/code-lint/scripts/lint-frontend.ps1 -Fix
```

---

## 2. Backend Quality Workflow (ASP.NET Core / .NET)

When linting the backend (`backend/`):

### Step 1: .NET Code Formatting
Verify that all C# code matches .NET formatting guidelines.
- **Check command**: `dotnet format backend/InvoiceApp.sln --verify-no-changes`
- **Fix command**: `dotnet format backend/InvoiceApp.sln`

### Step 2: Roslyn Compiler & Analyzer Gate
Ensure the solution compiles with zero warnings treated as errors.
- **Check command**: `dotnet build backend/InvoiceApp.sln --warnaserror`

### Step 3: Clean Code & SonarQube Compliance
Audit C# source files (`backend/src/`) for clean code rules:
- **Zero Blocker / Critical / Major Sonar Issues**: Check against rule catalogue in [quality-standards.md](references/quality-standards.md).
- **Meaningful Naming**: No single-letter variable names (e.g., `x`, `p`), except standard loop iterators (`i`, `j`).
- **No Flag Parameters**: No `bool flag` or boolean switching parameters on public methods.
- **Method Conciseness**: Keep methods compact (<= 20 lines where possible).
- **Architectural Boundary**:
  - Resource controllers in `InvoiceApp.Api/Controllers/` must inherit `ApiControllerBase` and delegate domain operations via `Handle(...)`.
  - Controllers must not contain business logic; domain rules belong exclusively in `InvoiceApp.Domain`.
  - Request bodies and DTOs must be C# `record` types declared inside the controller (code-first approach).
- **Documentation**: Ensure all methods and classes feature a crisp **1–2 line** XML documentation header (`/// <summary>...</summary>`).

### Automated Execution Script
Run the automated PowerShell script from the repository root:
```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/code-lint/scripts/lint-backend.ps1
# With automated formatting fixes:
powershell -ExecutionPolicy Bypass -File .agents/skills/code-lint/scripts/lint-backend.ps1 -Fix
```

---

## 3. Full-Stack Unified Audit

To perform an end-to-end quality check across both tiers in a single run:
```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/code-lint/scripts/lint-all.ps1
# Or with auto-fix enabled:
powershell -ExecutionPolicy Bypass -File .agents/skills/code-lint/scripts/lint-all.ps1 -Fix
```

---

## 4. Quality Gate & Output Reporting

Present the audit results to the user using the following standardized report format:

```markdown
## Code Quality & Lint Audit Report

### Summary
| Scope | Quality Gate Status | Issues Found | Auto-Fixable |
| :--- | :--- | :--- | :--- |
| **Frontend** | [PASSED / FAILED] | [Count] | [Yes / No] |
| **Backend** | [PASSED / FAILED] | [Count] | [Yes / No] |

### Detailed Findings

#### Frontend Findings
- **Rule / Category**: [e.g., Prettier Style / TypeScript Strictness]
- **File & Line**: `path/to/file.ts:line`
- **Description**: Concise explanation of the violation
- **Remediation**: Actionable fix or code snippet

#### Backend Findings
- **Rule / Category**: [e.g., dotnet format / Controller Purity / Clean Code]
- **File & Line**: `path/to/File.cs:line`
- **Description**: Concise explanation of the violation
- **Remediation**: Actionable fix or code snippet

### Gate Verdict
- **Verdict**: [PASSED / FAILED] (Zero blocker, critical, or formatting errors allowed to pass gate)
```

---

## References & Standards
- Detailed rule definitions: [quality-standards.md](references/quality-standards.md)
- Project Constitution: [.specify/memory/constitution.md](file:///c:/Data/ai-sdlc-demo-app/.specify/memory/constitution.md)
- Project Conventions: [AGENTS.md](file:///c:/Data/ai-sdlc-demo-app/AGENTS.md)
