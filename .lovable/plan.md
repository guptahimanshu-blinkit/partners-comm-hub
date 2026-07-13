Update the "Raise a Ticket" modal so the Issue type field is read-only and visually consistent with the other static fields.

Changes in `src/components/notifications/RaiseTicketDialog.tsx`:
- Remove the interactive `Select` dropdown for Issue type.
- Replace it with a locked display field using the same styling as the Linked notification and Reference ID fields (rounded container, border, muted background, small text).
- Keep the existing logic that auto-selects the issue type based on the notification category so the value still comes from the notification context.
- Add a small helper label underneath the field reading: "Auto detected from notification".
- Clean up the unused `Select` imports and the `type`/`setType` state if they are no longer needed elsewhere.

No other pages or components are affected.