 Now I have a complete picture. Here's my analysis and proposed plan:

  ---
  Root Cause Analysis
  
  There are 3 compounding issues that allow double-booking of the same seat:

  1. No database unique constraint on (event_id, seat_number)

  The tickets table has no UniqueConstraint('event_id', 'seat_number'). PostgreSQL cannot enforce that the same seat in the same event is only reserved once at
  the database level.

  2. Redis lock released before DB transaction commits

  In app/services/ticket.py:160-168:
  acquire Redis lock → reserve tickets (flush, NOT committed) → release Redis lock
  Then back in booking.py:110: 
  create booking (flush, NOT committed) → ... → session commits at request end
  Between Redis lock release and final commit, a second request can acquire the lock. Although SELECT FOR UPDATE should block, the early lock release widens the
  vulnerability window.

  3. Stale availability check outside any lock

  booking.py:72 checks event.available_tickets but this field is never decremented during reservation — it's a static value from event creation. Both users pass
  this check trivially.

  ---
  Proposed Fix Plan
  
  Phase 1: Database-level safety net (migration)

  - Add UniqueConstraint('event_id', 'seat_number', 'status') or a partial unique index on (event_id, seat_number) WHERE status IN ('available', 'reserved') to
  prevent the same physical seat from being available or reserved twice simultaneously
  - Add a new Alembic migration for this constraint
  
  Phase 2: Fix the reservation atomicity

  - Move the Redis lock to wrap the entire create_reservation method (from availability check through booking creation), not just reserve_tickets
  - Or better: remove the stale event.available_tickets check and rely solely on the atomic SELECT FOR UPDATE result — if reserve_tickets returns fewer tickets
  than requested, that IS the availability check

  Phase 3: Add retry/wait to the Redis lock

  - Currently event_lock uses wait_seconds=0.0, so the second user immediately gets a LockConflictException instead of waiting briefly
  - Add wait_seconds=3.0 so concurrent requests queue up rather than fail

  Phase 4: Decrement event.available_tickets atomically

  - Update event.available_tickets within the same locked transaction when tickets are reserved/released, so the count stays accurate

  Phase 5 (optional): Per-ticket Redis lock

  - Lock at ticket granularity (ticket:{ticket_id}) instead of just event level, for finer concurrency control when the event has many available tickets

  ---
  Recommended minimum fix: Phase 1 + Phase 2 + Phase 3. The database unique constraint is the ultimate safety net — even if all other layers fail, PostgreSQL
  won't allow duplicate seat assignments.
  
  Want me to proceed with implementing this plan?