---
name: firebase
description: Work safely with Firebase Authentication and Firestore in the Pool Booking System.
---

# Firebase

## Authentication
- Admin access uses Firebase Authentication with Email/Password.
- The client uses `VITE_ADMIN_EMAIL` as the expected admin identity.
- Firestore rules are authoritative; client checks are UX only.

## Firestore
Current collections include `products`, `media`, `settings`, `bookings`, and `bookingSlots`.

## Safety
- Keep booking documents private.
- Public availability should expose only the minimum required information.
- Do not store or hard-code passwords in the repository.
- Keep authorization logic consistent between `.env`, client code, and `firestore.rules`.
- Any change to rules must be reviewed for read/write escalation.

## Performance
- Avoid multiple independent realtime listeners when a one-time read or shared subscription is sufficient.
- Avoid subscribing to admin-only data from public pages.
- Prefer narrow queries over downloading whole collections when the data model permits it.
