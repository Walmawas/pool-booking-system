---
name: performance
description: Optimize Pool Booking System loading speed, React rendering, Firebase traffic, and perceived performance.
---

# Performance

Prioritize measurable improvements without changing business behavior.

## Inspect first
- Firebase listeners in hooks and pages.
- Full-collection reads and client-side filtering/sorting.
- Large root-level legacy scripts and duplicate implementations.
- Images and media loading.
- React rerenders and expensive derived calculations.
- Vite bundle/chunk behavior.

## Preferred techniques
- Lazy-load admin/studio routes when appropriate.
- Share or scope realtime subscriptions.
- Use Firestore queries/indexes instead of downloading unnecessary documents.
- Keep public pages independent of admin-only state.
- Lazy-load images and preserve stable dimensions to avoid layout shifts.
- Memoize only where profiling or data flow justifies it.

Do not optimize by weakening authorization or removing required realtime behavior.
