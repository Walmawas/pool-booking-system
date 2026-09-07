---
name: project-audit
description: Audit the Pool Booking System architecture, code quality, security, performance, and regressions before making changes.
---

# Pool Booking System Audit

Treat the repository root as the application root. Inspect the existing implementation before proposing changes.

## Architecture
- React 18 + Vite frontend.
- Firebase Authentication and Firestore are the backend services.
- Main application areas are `src/pages`, `src/components`, `src/hooks`, and `src/config`.
- Preserve existing functionality unless the user explicitly requests a behavior change.

## Audit priorities
1. Authentication and Firestore authorization consistency.
2. Firebase reads/listeners and unnecessary realtime subscriptions.
3. Public versus admin data exposure.
4. React rendering, bundle size, and avoidable rerenders.
5. Mobile/RTL usability.
6. Error handling and loading states.
7. Dead/duplicate legacy JavaScript files at the repository root.

## Rules
- Never expose passwords or secrets in source control.
- Never weaken Firestore rules to fix a client-side error.
- Verify client-side admin checks against server-side authorization.
- Prefer small, reversible changes and preserve the existing data model unless migration is planned.
- Run/build the project when possible after changes.
