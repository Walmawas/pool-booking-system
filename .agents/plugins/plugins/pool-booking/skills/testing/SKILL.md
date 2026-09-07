---
name: testing
description: Verify Pool Booking System changes with focused build, behavior, and security checks.
---

# Testing

For every meaningful change:

1. Inspect affected callers and data flow.
2. Run the production build (`npm run build`) when the environment permits.
3. Verify public browsing and product filtering.
4. Verify admin authentication and rejection of non-admin accounts.
5. Verify Firestore writes remain authorized.
6. Verify loading and Firebase error states.
7. Check mobile RTL layouts for regressions.

For Firebase changes, review rules and client assumptions together. Do not consider a frontend-only check sufficient for authorization.
