# Code Quality & Linting Standards Reference

This document codifies the quality rules, static analysis gates, and coding conventions enforced by the `code-lint` skill across both the Angular frontend and ASP.NET Core backend, in direct alignment with the project constitution (`.specify/memory/constitution.md`) and project conventions (`AGENTS.md`).

---

## 1. Frontend Quality Standards (Angular 21 + TypeScript)

### 1.1 Strict Typing & Language Rules
- **No `any`**: The use of `any` is strictly prohibited unless accompanied by an explicit inline justification comment explaining why type safety is impossible in that specific context.
- **Explicit Type Annotations**: Every function return type, method parameter, public component property, and service contract MUST have explicit types.
- **Data Shapes**: All models, payloads, and state structures MUST be declared as TypeScript `interface` or `type` definitions—never inline untyped object literals (`{}`) or `Object`.
- **TypeScript Strict Mode**: `strict: true` must be maintained in `tsconfig.json` without disabling compiler safety flags (e.g., `noImplicitAny`, `strictNullChecks`).

### 1.2 Angular 21 Architecture & Component Design
- **Reactivity**: Primary state management and reactivity MUST use Angular **Signals** (`signal()`, `computed()`, `effect()`) and **Reactive Forms** (`FormGroup`, `FormControl`). Avoid legacy two-way binding patterns where signals or reactive forms apply.
- **Component Modularity**: Every component, service, pipe, directive, and route guard MUST reside in its own dedicated file. No multi-class dumping into single files.
- **Single Responsibility**: Components must only handle view binding, presentation logic, and user interaction delegation. Business and API orchestration must reside in injectable services.
- **Clean Destruction & Memory Management**: Any manual subscriptions to RxJS observables MUST be cleanly managed using `takeUntilDestroyed()`, `take(1)`, or async pipes.

### 1.3 Accessibility & Modern Web Standards (WCAG 2.1 AA)
- **ARIA Attributes**: Every interactive element, custom control, and Angular Material component MUST provide proper accessibility attributes (`aria-label`, `aria-labelledby`, `aria-describedby`, `role`).
- **Semantic HTML5**: Native semantic elements (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<button>`) must be used instead of nested non-semantic `<div>` or `<span>` wrappers.
- **Keyboard Navigation**: All interactive elements must be focusable and operable via standard keyboard interactions (`Tab`, `Enter`, `Space`, `Esc`).

### 1.4 Code Formatting & Style
- **Prettier**: Code MUST conform to the `.prettierrc` configuration (print width, single quotes, trailing commas, tab width).
- **ESLint**: Must comply with the latest ESLint recommended ruleset for Angular and TypeScript. Zero ESLint errors allowed.

---

## 2. Backend Quality Standards (ASP.NET Core on .NET 10 / .NET 8)

### 2.1 Clean Code & Formatting
- **dotnet format**: All C# code MUST pass `dotnet format --verify-no-changes` with zero formatting deviations.
- **Naming Conventions**:
  - PascalCase for classes, records, methods, properties, and public members.
  - camelCase for local variables and parameters.
  - Meaningful names: No single-letter variables (e.g. `x`, `p`, `d`), except conventional loop iterators (`i`, `j`).
  - No `flag` parameters: Methods must not accept boolean flags that switch internal execution modes; split into separate intention-revealing methods instead.
  - No magic numbers: Use `const` or `enum` members with descriptive names.
- **Method Length**: Methods should remain concise (aiming for <= 20 lines where possible).

### 2.2 Architectural Boundaries & REST Conventions
- **Controller Purity**:
  - Controllers live in `backend/src/InvoiceApp.Api/Controllers/`, one per resource, mapped to `api/[controller]`.
  - Controllers MUST inherit `ApiControllerBase` and use `Handle(...)` to map domain errors to HTTP 400, 404, or 409 status codes.
  - Controllers MUST NOT contain business logic. Business rules belong exclusively in `InvoiceApp.Domain`.
- **Code-First Data Formats**:
  - Request bodies and DTOs MUST be C# `record` types declared inside or alongside the controller.
- **Route Guarding & Security**:
  - Every backend endpoint MUST require authentication, EXCEPT the public homepage.
  - Role-based restrictions: Destructive actions MUST have `[RequireRole("Admin")]`; approval actions MUST have `[RequireRole("Approver")]` or `[RequireRole("Admin")]`.
  - Credentials, tokens, or customer data MUST NEVER be hardcoded or committed.

### 2.3 Roslyn Analyzers & SonarQube Rules
The following key static analysis categories must have **zero blocker, critical, or major issues**:
- **S112**: Do not throw generic `System.Exception` or `System.SystemException`; throw domain-specific exceptions.
- **S107**: Methods should not have excessive parameters (limit to <= 4; use parameter objects/records for larger sets).
- **S1135**: Track and resolve `TODO` tags before production merge.
- **S1481 / CS0168**: Unused local variables and unreferenced exceptions must be removed.
- **CA2000 / CA2007**: Proper disposal and async configuration.

---

## 3. Inline Documentation Standard (Unified)

### 3.1 1–2 Line Functional Headers
Every class, record, method, function, and interface MUST include a crisp documentation comment of **1 to 2 lines maximum** describing what the block accomplishes (its purpose and contract, not an explanation of line-by-line implementation).

#### Frontend Example:
```typescript
/**
 * Submits the approval decision for the active invoice and refreshes review state.
 * @param invoiceId Unique identifier of the pending invoice.
 */
approveInvoice(invoiceId: string): void { ... }
```

#### Backend Example:
```csharp
/// <summary>
/// Transition an invoice from PendingApproval to Approved state with audit logging.
/// </summary>
public Result<Invoice> Approve(Guid invoiceId, string approverId) { ... }
```
