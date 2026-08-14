# Business Rules Document

*Pickle Rick*

## Booking Rules

- Bookings can be made anytime on a specific court.
- Bookings can only be made on a specific hour time slot on a specific
  court that is not yet tagged as "approved".
- If multiple consecutive hour time slots are booked by a specific player,
  those specific timeslots are joined into one booking in the UI. For
  example, 8 AM to 9 AM, 9 AM to 10 AM, and 10 AM to 11 AM booked by
  Player A should appear as one 8 AM–11 AM block.
- Players can only see and book Courts that are in their location. Example:
  Player A's location is Davao, so only Courts from Davao can appear in
  their selection.
- Only one player can request a booking for a specific hour timeslot, day,
  and Manually Approved Court. Any succeeding players who attempt to
  request that same booking are not allowed to.

## Admin Rules

- Admins can add multiple courts that they manage.
- Admins can only add one court with a given Court Name — the same Admin
  cannot register two courts under the same name.
- Admins have the authority to approve bookings made on their court (for
  Manual Approval Courts).
- Admins can change inventory per Court.
- Admins can configure the hourly rate of a specific court, in "Php".

## "Pasalo" Rules

- When a Player makes a booking that is tagged as approved, other Players
  can come and join in that specific booking. From Player A's perspective,
  the Player has a "Pasalo" section on their Dashboard where they can
  Approve or Disapprove a "Pasalo" Request. Only a maximum of 8 players are
  allowed in that timeslot.

## Purchasing Rules

- Players can only purchase items that are available on a specific court.

## Account Deletion Rules

- A user can only delete their own account. There is no way for one user
  to delete another's, and no admin override.
- Deletion requires re-entering the account password, even though the user
  is already logged in. A logged-in session alone is not enough authority
  to destroy an account permanently.
- Deletion is permanent and immediate. There is no soft delete, no grace
  period, and no recovery — this matches what the "Delete account" panel
  in Profile Settings tells the user: *"This cancels all bookings and
  cannot be undone."*
- Deleting a **Player** removes their bookings, their "Pasalo" join
  requests, and their orders. Time slots those bookings occupied become
  free for other Players again.
- Deleting an **Admin** removes every Court they manage, and therefore
  also removes the inventory, bookings, and orders on those Courts —
  *including other Players' bookings*. An Admin deleting their account
  cancels other people's games, which is why the password re-prompt
  applies here especially.
- A deleted account's email address becomes available for registration
  again, since no record of the old account is kept.
- Any access token issued before deletion stops working the moment the
  account is gone, even if that token has not expired yet.

> Trade-off on record: because deletion is permanent, a deleted user's
> past bookings and orders no longer contribute to the Revenue/Profit
> metrics in the BRD. This is accepted for now — no purchasing endpoints
> or analytics service exist yet, so there is no revenue history to lose.
> Revisit this when `analytics-service-python` is built: preserving
> financial history across account deletion normally means anonymising the
> user rather than deleting the rows.

## UI Rules

- The UI should be intuitive, professional-looking, but artistic, since
  the inspiration for this web app is Pickle Rick from the show
  "Rick & Morty".
