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

## Admin Rules

- Admins can add multiple courts that they manage.
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

## UI Rules

- The UI should be intuitive, professional-looking, but artistic, since
  the inspiration for this web app is Pickle Rick from the show
  "Rick & Morty".
