---
name: security
description: Audit and harden authentication, Firestore authorization, environment handling, and public data exposure.
---

# Security

## Critical checks
- Secrets must never be committed.
- Firebase web configuration may be public, but credentials such as passwords must never be treated as configuration examples.
- Firestore rules must be the authoritative authorization layer.
- Admin email values must not silently diverge between environment configuration, client code, documentation, and rules.
- Public collections and documents should expose only information required by the storefront.

## Incident handling
If a password, private token, or other secret is found in git history or a tracked example file:
1. Treat it as compromised.
2. Remove it from tracked files.
3. Rotate the credential in the provider.
4. Do not merely rename the variable.

Never weaken security rules to make a frontend feature work.
