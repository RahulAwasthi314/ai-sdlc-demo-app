<!--
SYNC IMPACT REPORT (remove before committing)
=============================================
Version change: [unversioned template] -> 1.0.0
Added sections:
  - Core Principles (I-VIII, all new)
  - Technology Stack Standards (new)
  - Development Workflow & Quality Gates (new)
  - Governance (new)
Modified principles: N/A (first authored version)
Removed sections: N/A
Deferred TODOs:
  - RATIFICATION_DATE: set to today 2026-10-26; project inception date not known separately.
-->

# Invoice Approval App Constitution

## Core Principles

### I. Technology Stack (NON-NEGOTIABLE)

- The **frontend** MUST be Angular 21 with TypeScript. Every type MUST be explicitly declared;
  `any` is forbidden unless explicitly justified in a code comment.
- The **backend** MUST be ASP.NET Core on .NET 10, following REST principles with an in-memory
  database.
- The frontend MUST use **Angular Material** for UI components and styling.
- Angular 21 features -- **Signals**, **Reactive Forms**, and **ARIA** accessibility attributes --
  MUST be used as the primary building blocks.
- **Rationale**: Consistency in the technology stack reduces onboarding friction, enables shared
  tooling, and ensures long-term supportability.

### II. Accessibility & Modern Web Design (NON-NEGOTIABLE)

- Every UI component MUST meet **WCAG 2.1 AA** accessibility standards (ARIA roles, labels,
  keyboard navigation).
- Angular Material components MUST be configured with proper `aria-label` and `aria-describedby`
  attributes wherever applicable.
- UI MUST follow modern web design principles: semantic HTML5, responsive layouts, and
  consistent visual hierarchy.
- **Rationale**: Accessibility is a legal and ethical requirement; modern design reduces cognitive
  load and increases adoption.

### III. Modular & Reusable Component Architecture

- Frontend components MUST be self-contained, independently testable, and reusable across
  feature modules.
- Each Angular component, service, pipe, or guard MUST reside in its own dedicated file.
- Backend services and controllers MUST follow single-responsibility: one controller per resource,
  one service per domain concept.
- Business rules MUST live in the Domain project; controllers MUST NOT contain business logic.
- **Rationale**: Modularity prevents spaghetti coupling, enables parallel development, and
  simplifies testing.

### IV. Strict Typing & Clean Code

- TypeScript MUST have `strict: true` enabled; all data shapes MUST be declared as `interface`
  or `type` -- never inlined `{}` or `object`.
- C# code MUST use records for request bodies and DTOs (code-first approach for data formats).
- All code MUST comply with **clean code guidelines**: meaningful names, no one-letter variables,
  no `flag` parameters, no magic numbers, functions <= 20 lines where possible.
- **SonarQube** (or equivalent static analysis) issues MUST be resolved before merge; zero
  blocker/critical issues are a merge gate.
- **Rationale**: Strict typing eliminates a class of runtime errors; clean code lowers the cost
  of maintenance.

### V. Security & Route Protection

- The **homepage** is the only public route; all other frontend routes MUST be protected by
  Angular route guards.
- All backend endpoints EXCEPT the homepage MUST be behind authentication. Destructive actions
  MUST use `[RequireRole("Admin")]`; approval actions MUST use
  `[RequireRole("Approver")]` or `[RequireRole("Admin")]`.
- Real credentials, tokens, and customer data MUST NEVER be committed to version control.
- **Rationale**: Defense-in-depth at both layers prevents unauthorized access to sensitive
  invoice data.

### VI. Global Exception Handling

- The **frontend** MUST implement a global Angular `ErrorHandler` that catches unhandled
  exceptions and presents user-friendly error messages.
- The **backend** MUST implement a global exception-handling middleware (or filter) that maps
  domain errors to appropriate HTTP status codes (400, 404, 409) and never leaks stack traces
  to clients.
- **Rationale**: Centralised error handling prevents information leakage and provides a
  consistent user experience.

### VII. Testing Standards (NON-NEGOTIABLE)

- Unit tests MUST be written **after** feature implementation (implementation-first, not TDD).
- **Frontend**: Use **Vitest** (not Jasmine/Karma). ESLint MUST use the latest recommended
  ruleset. Coverage gate is **80%** (lines, branches, functions, statements).
- **Backend**: Use **xUnit**. Coverage gate is **80%**.
- **E2E / Mutation tests**: Use **Stryker** for trivial function mutation testing.
  End-to-end tests MUST use page objects with role-based locators (`getByRole`, `getByLabel`);
  CSS/XPath selectors are forbidden.
- **Rationale**: Consistent tooling across the team and enforced gates prevent regressions and
  raise confidence in deployments.

### VIII. Documentation & Code Comments

- Every function, method, and class MUST have a concise doc comment of **1-2 lines** describing
  its purpose (not its implementation).
- Deliverables for each feature MUST include:
  - C4 Container diagram
  - Sequence diagram
  - UML class diagram
  - PRD document (.md)
  - BRD document (.md)
  - Postman collection with at least one test data set (backend and frontend separately)
  - All placed in `docs/features/<feature-name>/deliverables/`
- **Rationale**: Documentation as a first-class deliverable ensures knowledge transfer and
  facilitates audits.

## Technology Stack Standards

### Frontend

| Concern          | Choice                          |
|------------------|---------------------------------|
| Framework        | Angular 21                      |
| Language         | TypeScript (strict mode)        |
| UI Library       | Angular Material                |
| Reactive prim.   | Signals, Reactive Forms         |
| Linting          | ESLint (latest recommended)     |
| Unit testing     | Vitest                          |
| E2E / Mutation   | Stryker (Playwright page objs)  |
| Accessibility    | WCAG 2.1 AA, ARIA               |

### Backend

| Concern          | Choice                          |
|------------------|---------------------------------|
| Framework        | ASP.NET Core (.NET 10)          |
| API style        | REST                            |
| Database         | In-memory (repository pattern)  |
| Unit testing     | xUnit                           |
| Data format      | Code-first (C# records / DTOs)  |
| Static analysis  | SonarQube / dotnet-analyzer     |

### Branching & Versioning

- Feature branches MUST follow: `feature-[number]/feature-name`
  (e.g., `feature-42/invoice-approval`).
- Semantic versioning applies to the constitution and all shared packages.

## Development Workflow & Quality Gates

- **Implementation order**: Feature code -> Unit tests -> Code review -> Merge.
- **Coverage gate**: 80% across lines, branches, functions, and statements for both frontend and
  backend; CI MUST fail below this threshold.
- **Linting gate**: Zero ESLint errors on frontend; zero SonarQube blocker/critical issues on
  backend before merge.
- **Postman collection**: Each feature MUST ship a collection with at least one positive and one
  negative test case per endpoint, committed under `docs/postman/`.
- **Deliverables folder**: Each feature MUST include
  `docs/features/<feature-name>/deliverables/` containing C4, sequence, UML, PRD, and BRD.
- **Code review**: At least one peer review required before merge to `main`.
- **Environments**: Only `localhost` in-memory for now; no cloud deployment gates required.

## Governance

- This constitution supersedes all informal coding conventions and verbal agreements.
- Amendments MUST be proposed as a pull request against `.specify/memory/constitution.md`,
  include a rationale section, and receive approval from at least one project lead.
- Version bumps follow semantic versioning:
  - **MAJOR** -- backward-incompatible governance changes or principle removals.
  - **MINOR** -- new principles or materially expanded guidance.
  - **PATCH** -- clarifications, wording improvements, typo fixes.
- All pull requests MUST verify compliance with this constitution in the PR description checklist.
- The constitution is reviewed at the start of each feature cycle.
- Refer to `.agents/` for runtime skill and workflow guidance used by AI agents on this project.

**Version**: 1.0.0 | **Ratified**: 2026-10-26 | **Last Amended**: 2026-10-26
