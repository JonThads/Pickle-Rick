# Changelog

## Unreleased

_History backfilled from Git through `1a5c86e`; subsequent completed changes accumulate here until the next tagged release._

### Changed

- Organize documentation by purpose, index the reading order, archive historical plans, and require changelog updates with every completed change set ([PR-134](https://pickle-rick.atlassian.net/browse/PR-134)).
- Bind local development service ports to localhost to limit exposure on the local network ([PR-120](https://pickle-rick.atlassian.net/browse/PR-120)).

### Added

- Restore tagged release history and summarize untagged changes from Git ([PR-101](https://pickle-rick.atlassian.net/browse/PR-101)).
- Add account deletion from profile settings and the backend self-deletion endpoint ([`aec0cfa`](https://github.com/JonThads/Pickle-Rick/commit/aec0cfa), [`8441f12`](https://github.com/JonThads/Pickle-Rick/commit/8441f12)).
- Add Postman API coverage with cleanup, headed local Playwright coverage with disposable test accounts, and a k6 smoke-test scaffold ([PR-35](https://pickle-rick.atlassian.net/browse/PR-35), [`54dd7f8`](https://github.com/JonThads/Pickle-Rick/commit/54dd7f8), [`6ddc45b`](https://github.com/JonThads/Pickle-Rick/commit/6ddc45b)).
- Add Development, QA, and Main GitHub Actions workflows ([`082e4e3`](https://github.com/JonThads/Pickle-Rick/commit/082e4e3)).
- Add Prometheus metrics and Grafana monitoring ([`7e1d988`](https://github.com/JonThads/Pickle-Rick/commit/7e1d988)).

### Removed

- Remove an obsolete local failure-injection helper after confirming it has no project references; retain its historical test reports ([PR-134](https://pickle-rick.atlassian.net/browse/PR-134)).

### Fixed

- Serialize Pasalo approval decisions in one PostgreSQL transaction with a booking-row lock, enforce the eight-player limit including the owner, and return 409 for requests that are no longer pending. Add concurrent Postman/API regressions and SQL rollback coverage ([PR-123](https://pickle-rick.atlassian.net/browse/PR-123)).
- Reject tokens issued to deleted accounts on protected routes ([PR-92](https://pickle-rick.atlassian.net/browse/PR-92)).
- Correct player-dashboard feedback and Pasalo interactions ([`52a3059`](https://github.com/JonThads/Pickle-Rick/commit/52a3059)).
- Stop unintended frontend page reloads from the Vite client ([PR-115](https://pickle-rick.atlassian.net/browse/PR-115)).
- Allow disapproved Pasalo requests to persist without exceeding the status column length ([`12c231d`](https://github.com/JonThads/Pickle-Rick/commit/12c231d)).
- Enforce court ownership, reject bookings for approved slots atomically, and make approval and competing-request cancellation transactional ([PR-12](https://pickle-rick.atlassian.net/browse/PR-12), [PR-13](https://pickle-rick.atlassian.net/browse/PR-13), [PR-15](https://pickle-rick.atlassian.net/browse/PR-15)).
- Prevent an admin from creating duplicate court names ([PR-14](https://pickle-rick.atlassian.net/browse/PR-14)).
- Align the default order status with the permitted placed-order lifecycle ([PR-16](https://pickle-rick.atlassian.net/browse/PR-16)).

## [1.1.0] - 2026-08-04

### Changed

- Revamp authentication, dashboards, court details, profile settings, and shared styling ([`427cf37`](https://github.com/JonThads/Pickle-Rick/commit/427cf37)).

## [1.0.0] - 2026-08-03

_Initial tagged release of Pickle Rick._

[1.1.0]: https://github.com/JonThads/Pickle-Rick/tree/v1.1.0
[1.0.0]: https://github.com/JonThads/Pickle-Rick/tree/v1.0.0
