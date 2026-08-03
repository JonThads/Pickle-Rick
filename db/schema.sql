-- =============================================================================
-- Pickle Rick - Database Schema
-- =============================================================================
-- This is plain SQL (no ORM) on purpose: the goal of this project is to LEARN,
-- and writing your own SQL teaches you what an ORM normally hides from you.
-- Run this once against a fresh Postgres database to create every table.
--
-- Traceability back to the docs you uploaded:
--   BR-01/BR-02 -> users table (role column)
--   BR-03       -> bookings table (court + date + hour slot)
--   BR-04       -> courts.approval_type
--   BR-05       -> courts.admin_id (a court belongs to one admin)
--   BR-07       -> items table (per-court shop/inventory)
--   Pasalo rule -> booking_players table (many players can join one booking)
-- =============================================================================

-- Using UUIDs for primary keys is a common real-world choice: IDs are not
-- guessable/sequential, and they work fine across multiple services
-- (Node + Python) without fighting over auto-increment counters.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- USERS  (both Players and Admins live in one table, split by `role`)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name     VARCHAR(150) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR (10) NOT NULL CHECK (role IN ('admin', 'player')),
    location      VARCHAR(100),
    photo_url     TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- COURTS  (each court belongs to exactly one admin)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS courts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    address         TEXT NOT NULL,
    location        VARCHAR(100) NOT NULL,
    hourly_rate_php NUMERIC(10, 2) NOT NULL,
    approval_type   VARCHAR(10) NOT NULL DEFAULT 'manual'
                        CHECK (approval_type IN ('auto', 'manual')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- ITEMS  (per-court shop/inventory - BR-07, UC-04)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    court_id    UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    name        VARCHAR(150) NOT NULL,
    details     TEXT,
    photo_url   TEXT,
    quantity    INTEGER NOT NULL DEFAULT 0,
    price_php   NUMERIC(10, 2) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- BOOKINGS  (one row = one hour time-slot reserved on one court, one day)
-- -----------------------------------------------------------------------------
-- Business Rules doc: consecutive hour slots by the same player get merged
-- in the UI into a single visual "booking block" - but we still store each
-- hour separately here. Merging adjacent rows is a presentation-layer job,
-- not a data-model job (keeps the schema simple and the merging logic testable).

CREATE TABLE IF NOT EXISTS bookings (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    court_id     UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    booked_by    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    start_hour   SMALLINT NOT NULL CHECK (start_hour BETWEEN 0 and 23),
    status       VARCHAR(10) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'cancelled')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A blanket UNIQUE(court_id, booking_date, start_hour) would block UC-05-02's
-- Admin flow, where several players' PENDING requests for the same slot must
-- coexist until the admin approves one (which then cancels the rest). Only
-- APPROVED bookings need to be mutually exclusive per slot, so this is a
-- partial index rather than a table constraint.
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_slot_approved
    ON bookings (court_id, booking_date, start_hour)
    WHERE status = 'approved';

-- -----------------------------------------------------------------------------
-- BOOKING_PLAYERS  ("Pasalo" join-requests - max 8 players per slot)
-- -----------------------------------------------------------------------------
-- The player who made the booking (booked_by) is the one who approves or
-- disapproves other players trying to join (Business Rules doc, FR-08).

CREATE TABLE IF NOT EXISTS booking_players (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id   UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    player_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status       VARCHAR(10) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'disapproved')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (booking_id, player_id)
);

-- -----------------------------------------------------------------------------
-- ORDERS / ORDER_ITEMS  (BR-07: purchase items in advance, pick up at court)
-- -----------------------------------------------------------------------------
-- Split into a header (orders) + line items (order_items) so one order can
-- contain several different items, each with its own quantity - the same
-- pattern a real e-commerce cart uses.

CREATE TABLE IF NOT EXISTS orders (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    court_id   UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    player_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status     VARCHAR(10) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('placed', 'picked_up', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_id        UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    quantity       INTEGER NOT NULL CHECK (quantity > 0),
    -- Snapshot the price at time of purchase, so later price changes on
    -- the `items` table don't rewrite history for past orders/revenue.
    unit_price_php NUMERIC(10, 2) NOT NULL
);

-- Indices for the queries the app will run constantly.
CREATE INDEX IF NOT EXISTS idx_courts_location ON courts (location);
CREATE INDEX IF NOT EXISTS idx_bookings_court_date ON bookings (court_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_booking_players_booking ON booking_players (booking_id);