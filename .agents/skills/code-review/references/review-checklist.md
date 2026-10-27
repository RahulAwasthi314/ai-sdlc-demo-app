# Code Review Rubric & Checklist

This checklist defines the review dimensions used by the Code Review Agent to inspect pull requests and diffs against the project constitution (`.specify/memory/constitution.md`) and project conventions (`AGENTS.md`).

---

## 1. Architectural & Constitution Standards Checklist

### Frontend (Angular 21 + TypeScript)
- [ ] **Accessibility (WCAG 2.1 AA)**: All interactive elements and Angular Material components have appropriate `aria-label`, `aria-describedby`, and keyboard navigation support.
- [ ] **Reactive Paradigms**: State management uses Angular **Signals** (`signal()`, `computed()`, `effect()`); forms use **Reactive Forms** (`FormGroup`, `FormControl`).
- [ ] **Strict Typing**: No unjustified `any` usages; all public members and function return types are explicitly typed.
- [ ] **Component Modularity**: Components, services, guards, and pipes reside in individual dedicated files.
- [ ] **Route Guarding**: All routes except the homepage (`/`) are guarded by Angular route guards.
- [ ] **Error Handling**: Uses global `ErrorHandler` / HTTP error interceptor; user-friendly error banners displayed.
- [ ] **Documentation**: Crisp 1–2 line documentation header on classes, methods, and functions.

### Backend (ASP.NET Core on .NET 10 / .NET 8)
- [ ] **Controller Purity**: Resource controllers inherit `ApiControllerBase`, use `Handle(...)`, and contain NO business logic.
- [ ] **Domain Isolation**: Business rules and state transitions reside strictly in `InvoiceApp.Domain`.
- [ ] **In-Memory Persistence**: Storage implements repository interfaces with in-memory store in `InvoiceApp.Api`.
- [ ] **Code-First Data Models**: Request and response bodies are defined as C# `record` types inside or alongside controllers.
- [ ] **Security & Route Guarding**: All endpoints except the public homepage require authentication; destructive actions require `[RequireRole("Admin")]`; approvals require `[RequireRole("Approver")]` or `[RequireRole("Admin")]`. No real secrets or credentials committed.
- [ ] **Error Handling**: Global exception middleware maps domain exceptions to 400, 404, or 409 status codes without exposing stack traces.
- [ ] **Documentation**: Crisp 1–2 line XML documentation headers (`/// <summary>`) on all methods and classes.

---

## 2. SonarQube & Clean Code Checklist

- [ ] **S112 (Generic Exceptions)**: Code must throw specific domain exceptions (e.g., `KeyNotFoundException`, `InvalidOperationException`), never `System.Exception`.
- [ ] **S107 (Parameter Count)**: Methods must not accept more than 4 parameters. Group related parameters into DTOs or records.
- [ ] **S1135 (TODO Debt)**: No unaddressed or unassigned `TODO` or `FIXME` comments in PR diffs.
- [ ] **S1481 / CS0168 (Unused Variables)**: Remove unused local variables, parameters, and unreferenced imports.
- [ ] **Clean Code Naming**:
  - No single-letter variable names (e.g., `a`, `x`, `p`), except standard loop counters (`i`, `j`).
  - No `flag` parameters: Do not pass boolean flags that toggle internal method behaviors.
  - PascalCase for types/public members, camelCase for local variables.
- [ ] **Conciseness**: Methods should aim for <= 20 lines of code.

---

## 3. Dependency Vulnerabilities Checklist

- [ ] **Frontend npm Audit**: Zero high or critical vulnerabilities in `InvoiceAppFE/package.json`.
- [ ] **Backend NuGet Audit**: Zero vulnerable NuGet packages in `backend/InvoiceApp.sln`.
- [ ] **Package Legitimacy**: No duplicate or phantom dependencies introduced.

---

## 4. Code Typos & Grammar Checklist

- [ ] Variable and method names are spelled correctly without accidental typos (e.g., `recieve` -> `receive`, `invoce` -> `invoice`, `canceld` -> `canceled`).
- [ ] User-facing strings, button labels, and error messages have correct grammar and spelling.
- [ ] Documentation comments and markdown documents contain no spelling mistakes.

---

## 5. GitHub PR Comment Template

```markdown
# 🔍 Automated Code Review

**Review Verdict**: {VERDICT} <!-- 🟢 APPROVED | 🟡 COMMENT | 🔴 CHANGES REQUESTED -->
**Trigger**: {TRIGGER_INFO}
**Commit**: `{COMMIT_HASH}`

---

### 📊 Review Dimension Summary

| Dimension | Status | Issues Found | Details |
| :--- | :---: | :---: | :--- |
| **Architectural & Constitution** | {ARCH_STATUS} | {ARCH_COUNT} | {ARCH_NOTE} |
| **SonarQube & Clean Code** | {SONAR_STATUS} | {SONAR_COUNT} | {SONAR_NOTE} |
| **Dependency Vulnerabilities** | {VULN_STATUS} | {VULN_COUNT} | {VULN_NOTE} |
| **Code Typos & Spelling** | {TYPO_STATUS} | {TYPO_COUNT} | {TYPO_NOTE} |
| **Testing & Coverage** | {TEST_STATUS} | {TEST_COUNT} | {TEST_NOTE} |

---

### 🚨 Critical Issues & Required Changes
<!-- List blocker or critical issues requiring remediation before merge -->

### ⚠️ Warnings & Suggestions
<!-- Code smells, non-blocking improvements, or typo fixes with line suggestions -->

### 🛡️ Dependency Vulnerability Report
<!-- Summary of npm audit and dotnet package vulnerability findings -->

---
*Reviewed by Antigravity Code Review Agent against Project Constitution v1.0.1*
```
