# Software Requirements Specification (SRS)

*(IEEE 830 / ISO 29148 aligned)*
*Pickle Rick*

## Introduction

### Purpose

- To build a program to act as a GitHub Portfolio Project.
- For the author to learn full-stack development using Node.JS, Python,
  Rest API, GitHub Actions CI/CD, Performance Testing using k6, API
  Testing using Postman (Manual and Automation), and automation testing
  using Playwright using TypeScript.
- To build a program that is both a Pickleball Court Management System
  for Admins and a Pickleball Reservation System for Users. Pickle Rick —
  the app — solves both problems into one solution.

### Scope

This project is only for local deployment.

### Definitions & Acronyms

- **Pickle Rick** — the name of the program.
- **Player** — refers to the players using the program for bookings and
  reservations.
- **Admin** — refers to the employees with the highest level of access and
  account.
- **Court** — refers to the physical courts assigned to a specific Admin;
  also the part of the system where bookings are placed by a specific User.
- **Item** — refers to an item that is available for purchase on a
  specific court.
- **Booking** — refers to the specific timeslot that can be reserved by a
  User on a specific Court.

## Overall Description

### User Classes

- Admin
- Player

### Operating Environment

- Web-based
- Node.JS
- Docker
- Python
- RestAPI
- GitHub Actions

## Functional Requirements

| ID | Description |
| --- | --- |
| FR-01 | Users can log in based on their assigned User Classes (Admin or Player). |
| FR-02 | Admins can configure their courts to be "Auto-Approval" or "Manual Approval". |
| FR-03 | If a Court is tagged as "Auto-Approval," any bookings by any player made onto that specific court are automatically approved at the end of the Player. |
| FR-04 | If a Court is tagged as "Manual Approval", any booking by any player made onto that specific court needs approval by the admin at the admin's dashboard. |
| FR-05 | Players should be able to purchase items based on a court's inventory. |
| FR-06 | Players are only allowed to book a court's specific time slot that is not yet tagged as approved for a specific day. |
| FR-07 | Players that are approved in a specific booking are shown as "Players" for that specific booking by other players as well. |
| FR-08 | When a booking is already made by Player A on a specific court, other Players can ask to join that specific booking, requesting approval by Player A. When approved by Player A, Players A & B are shown as "Players" for that specific booking. If not approved by Player A, Player B is not allowed to join. |
| FR-09 | The Admin Dashboard should indicate the admin's Total Revenue of all of its courts per month. |
| FR-10 | Admins should have an Inventory Page where they can add, remove, and update quantities of items. |
| FR-11 | Users should be able to log out of the program. |

## Non-Functional Requirements

| ID | Description |
| --- | --- |
| NFR-01 | The system should be able to handle multiple requests simultaneously. |
| NFR-02 | The system should follow Clean Code Principles. |
| NFR-03 | The system should be secure enough that it can be publicly published in GitHub with no security and privacy issues. |

## Constraint

- Local Deployment
- GitHub Portfolio Project
