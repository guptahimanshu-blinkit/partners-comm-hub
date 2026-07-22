Remove the "Digest frequency" section from Preference Centre for both Vendor Admin and Vendor Employee views.

## Changes

**`src/routes/notifications.settings.tsx`**
- Delete the `<section>` block titled "Digest frequency" (the card with Real-time / Daily / Weekly selectors) from `SettingsInner` (used by Vendor Admin).
- Delete the same section from `EmployeePreferences` if it renders one.
- Remove the now-unused `digest` state, `setDigest`, `Digest` type, and any imports that become unused (`Select*`, `digestEligible` filter usage) if nothing else references them.

No other sections, logic, or styling touched.
