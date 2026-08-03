# Use Case Specification

*Pickle Rick*

| ID | Title | Actor | Prerequisite | Flow | Prompt | Result |
| --- | --- | --- | --- | --- | --- | --- |
| UC-01 | Player Registration | Player | N/A | 1. User clicks on Register and selects "Player". 2. User creates their profile by keying in details and uploading a Photo. | Confirmation Prompt | User is directed to the Player Dashboard. |
| UC-02 | Admin Registration | Admin | N/A | 1. User clicks on Register and selects "Admin". 2. User creates their profile by keying in details and uploading a Photo. | Confirmation Prompt | User is directed to the Admin Dashboard. |
| UC-03 | Admin Court Management | Admin | Admin has an account in the system | 1. Admin selects "Courts". 2. Admin selects "Add Court". 3. Admin fills up Court Details such as Court Name, Address, Hour Time slots available, and Hourly Rate. 4. Success Prompt is displayed. | — | Court can be booked by Players based on their location. |
| UC-04 | Admin Inventory Management | Admin | Admin has an account in the system | 1. Admin goes to a specific Court. 2. Admin selects "Inventory". 3. Admin selects "Add Item." 4. Admin enters details about the item such as Item Name, Details, Photo, Quantity, and Price in Php. | Confirmation Prompt | Players can see and are able to purchase a specific item from a specific court. |
| UC-05-01 | Booking | Player | 1. Player already has an account. 2. Court is tagged as "Auto Approval" | 1. Player navigates to "Play". 2. Player selects a Court. 3. Player selects a specific hour time slot. | Confirmation Prompt with the total time booked and total price to be paid at the Court. | Player's name is indicated on the specific time slot. |
| UC-05-02 (Player) | Booking | Player | 1. Player already has an account. 2. Court is tagged as "Manual Approval" | 1. Player navigates to "Play". 2. Player selects a Court. 3. Player selects a specific hour time slot. | Confirmation Prompt with the total time booked and total price to be paid at the Court. | 1. If Approved by Admin, Player's name is indicated on the specific time slot. 2. If not approved by Admin, Player's booking is cancelled. |
| UC-05-02 (Admin) | Booking | Admin | 1. Player already has an account. 2. Court is tagged as "Manual Approval". 3. Multiple players already booked the same timeslot for the same court. | 1. Admin navigates to "Courts". 2. Admin sees all hour time slots, particularly the ones with multiple bookings. 3. Admin selects a timeslot with all of the Player's bookings. 4. Admin selects a specific Player to be approved. | Confirmation Prompt with the total time booked and total price to be paid at the Court. | 1. The player approved is notified. 2. The approved Player's name is indicated on the specific time slot. 3. All other players' bookings for the same time slot are cancelled. |

> Note: the two UC-05-02 rows share an ID in the original doc (one per
> actor, Player vs. Admin) — kept distinguished here as "(Player)" and
> "(Admin)" so both flows are easy to reference separately in code
> comments and commits.
