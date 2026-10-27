<!--
SYNC IMPACT REPORT (remove before committing)
=============================================
Version change: 1.0.0 -> 1.0.1
Modified principles:
  - VIII. Documentation & Code Comments: Clarified and enforced that each feature execution flow deliverables folder contains separate backend and frontend Postman collections with at least one test data set, along with C4 container diagram, sequence diagram, UML diagram, PRD.md, and BRD.md.
Added sections: None
Removed sections: None
Deferred TODOs: None
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

- Frontend components MUST be self-contained, modular, independently testable, and reusable across
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
- C# code MUST use records for request bodies and DTOs using a **code-first approach** for data
  formats.
- All code MUST comply with **clean code guidelines**: meaningful names, no one-letter variables,
  no `flag` parameters, no magic numbers, functions <= 20 lines where possible.
- **SonarQube** (or equivalent static analysis) issues MUST NOT be present; zero blocker/critical/major
  issues are a mandatory merge gate.
- **Rationale**: Strict typing eliminates a class of runtime errors; clean code lowers the cost
  of maintenance.

### V. Security & Route Protection

- The **homepage** is the only route without route guards; all other frontend routes MUST be
  guarded with route guards.
- All backend endpoints EXCEPT the homepage route MUST be behind authentication route/endpoint
  guards. Destructive actions MUST use `[RequireRole("Admin")]`; approval actions MUST use
  `[RequireRole("Approver")]` or `[RequireRole("Admin")]`.
- Real credentials, tokens, and customer data MUST NEVER be committed to version control.
- **Rationale**: Defense-in-depth at both layers prevents unauthorized access to sensitive
  invoice data while allowing public landing access.

### VI. Global Exception Handling

- The **frontend** MUST implement a global Angular `ErrorHandler` (and HTTP error interceptor)
  that catches unhandled exceptions and presents user-friendly error messages.
- The **backend** MUST implement global exception-handling middleware that maps domain errors to
  appropriate HTTP status codes (400, 404, 409) and never leaks stack traces to clients.
- **Rationale**: Centralised error handling prevents information leakage and provides a
  consistent user experience across the application.

### VII. Testing Standards (NON-NEGOTIABLE)

- Unit tests MUST be written **after** feature implementation (implementation-first approach).
- **Frontend Unit Testing**: Use **Vitest** (Jasmine/Karma is forbidden). Frontend code MUST follow
  the latest recommended **ESLint** ruleset.
- **Backend Unit Testing**: Use **xUnit**.
- **Coverage Gate**: Overall test coverage MUST be at least **80%** (lines, branches, functions,
  statements) across both frontend and backend.
- **E2E / Mutation Testing**: Mutation testing for trivial functions MUST be done using **Stryker**.
  End-to-end tests MUST use page objects and role-based locators (`getByRole`, `getByLabel`);
  CSS and XPath selectors are strictly forbidden.
- **Rationale**: Strict test quality gates and post-implementation test verification ensure robust
  regression prevention without slowing down initial feature prototyping.

### VIII. Documentation & Code Comments

- Functions and blocks MUST be properly formatted with a crisp document comment of **1 to 2 lines**
  maximum describing the functionality of that block.
- For each feature execution flow, a dedicated deliverables directory MUST be maintained under
  `docs/features/<feature-name>/deliverables/` containing:
  - **C4 Container Diagram**
  - **Sequence Diagram**
  - **UML Diagram** (Class/Component structure)
  - **PRD Document** (`PRD.md`)
  - **BRD Document** (`BRD.md`)
  - **Backend Postman Collection** (with at least one test data set)
  - **Frontend Postman Collection** (with at least one test data set)
- **Rationale**: Crisp inline documentation and standardized design artifacts guarantee full
  traceability from business requirements to API verification.

## Technology Stack Standards

### Frontend

| Concern          | Choice                                      |
|------------------|---------------------------------------------|
| Framework        | Angular 21                                  |
| Language         | TypeScript (strict mode, explicit types)    |
| UI Library       | Angular Material                            |
| Modern Tools     | WCAG 2.1 AA Accessibility, ARIA attributes  |
| Reactive Prim.   | Signals, Reactive Forms                     |
| Linting          | Latest ESLint recommended ruleset           |
| Unit Testing     | Vitest                                      |
| E2E / Mutation   | Stryker (Playwright with page objects)      |
| Route Guarding   | Angular Route Guards (all routes except /)  |
| Error Handling   | Global ErrorHandler & HTTP Interceptor      |

### Backend

| Concern          | Choice                                      |
|------------------|---------------------------------------------|
| Framework        | ASP.NET Core (.NET 10)                      |
| API Style        | REST principles                             |
| Database         | In-memory repository pattern                |
| Unit Testing     | xUnit                                       |
| Data Format      | Code-first approach (C# records & DTOs)     |
| Static Analysis  | Clean Code guidelines & SonarQube (0 issues)|
| Route Guarding   | Role-based authentication filters / guards  |
| Error Handling   | Global Exception Middleware (400, 404, 409) |

### Branching & Versioning

- Feature branches MUST follow the naming convention: `feature-[number]/feature-name`
  (e.g., `feature-01/invoice-approval`).
- Semantic versioning applies to the constitution and all shared contracts.

## Development Workflow & Quality Gates

- **Execution Flow**:
  1. Feature implementation.
  2. Unit testing (Vitest for Angular, xUnit for .NET).
  3. Quality & Coverage verification (80% minimum coverage gate).
  4. Static analysis (Latest ESLint on frontend, Sonar issues resolved on backend).
  5. Feature deliverables generation in `docs/features/<feature-name>/deliverables/`.
  6. Code review & merge.
- **Coverage Gate**: 80% coverage threshold enforced across both frontend and backend projects.
- **Deliverables Package**: Every feature MUST generate and deliver in its feature folder:
  - C4 container diagram
  - Sequence diagram
  - UML diagram
  - `PRD.md` (Product Requirements Document)
  - `BRD.md` (Business Requirements Document)
  - Separate Postman collections for backend and frontend, each containing at least one test data set.
- **Documentation Standard**: Maximum 1-2 line crisp header comments on functions and blocks.

## Governance

- This constitution supersedes all informal coding conventions and verbal agreements.
- Amendments MUST be proposed as a pull request against `.specify/memory/constitution.md`,
  include a rationale section, and receive approval from at least one project lead.
- Version bumps follow semantic versioning:
  - **MAJOR** -- backward-incompatible governance changes or principle removals.
  - **MINOR** -- new principles or materially expanded guidance.
  - **PATCH** -- clarifications, wording improvements, alignment refinements.
- All pull requests MUST verify compliance with this constitution in the PR description checklist.
- The constitution is reviewed at the start of each feature cycle.
- Refer to `.agents/` for runtime skill and workflow guidance used by AI agents on this project.

**Version**: 1.0.1 | **Ratified**: 2026-10-26 | **Last Amended**: 2026-10-28
