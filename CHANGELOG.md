# Changelog

## Unreleased

### Fixed

- Serialize Pasalo approval decisions in one PostgreSQL transaction with a booking-row lock, enforce the eight-player limit including the owner, and return 409 for requests that are no longer pending. Add concurrent Postman/API regressions and SQL rollback coverage ([PR-123](https://pickle-rick.atlassian.net/browse/PR-123)).
