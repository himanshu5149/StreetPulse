# Security Specification - StreetPulse

## 1. Data Invariants
- A **VendorSession** cannot exist without a valid location (`lat`, `lng`).
- A session's `openedAt` and `closesAt` must be valid ISO strings.
- Only an authenticated user can create a session.
- Once a session is closed, it cannot be reopened (Terminal State).
- A user can only modify the `status` and `viewCount` of a session (Tiered Identity).

## 2. The Dirty Dozen Payloads (Target: Permission Denied)

1. **Identity Spoofing**: Attempt to create a session with a `vendorId` that doesn't match the auth UID.
2. **Resource Poisoning**: Attempt to inject a 1MB string into the `dishName` field.
3. **Location Injection**: Attempt to create a session without `location` data.
4. **Terminal Bypass**: Attempt to update a `closed` session back to `open`.
5. **Privilege Escalation**: Attempt to update the `vendorName` or `location` of an existing session.
6. **Shadow Update**: Attempt to add an `isAdmin: true` field to a session payload.
7. **Negative Price**: Attempt to set a `price` less than 0.
8. **Stale Signal**: Attempt to create a session with `closesAt` in the past.
9. **Query Scraping**: Attempt to list ALL sessions (including closed ones) without a filter.
10. **ID Poisoning**: Attempt to use a 2KB string as a `sessionId`.
11. **PII Leak**: Attempt to read private user alert data as a different user.
12. **Unauthorized Deletion**: Attempt to delete a session (Deletion is forbidden for vendors, only status change).

## 3. Conflict Report & Audit
| Collection | Identity Spoofing | State Shortcutting | Resource Poisoning |
|------------|-------------------|--------------------|--------------------|
| /sessions  | Protected (UID)   | Protected (Enum)   | Protected (Size)   |
| /alerts    | Protected (Owner) | N/A                | Protected (Size)   |
