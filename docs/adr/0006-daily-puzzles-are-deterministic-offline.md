# ADR-0006 — Daily "-le" puzzles are deterministic from the date, computed on-device

**Status:** Accepted

## Context

The daily "-le" games — Wordle, Hexcodle, Globle — carry a shared-culture promise:
*everyone gets the same puzzle today.* The usual way to guarantee that is a server
that hands out today's answer. But a server contradicts Parlour's commitments
(offline, no egress, no accounts, nothing stored). We need "the same puzzle for
everyone, every day" *without* a server.

## Decision

Compute the daily puzzle **deterministically from the calendar date, on the
device.** The UI derives an integer seed from the local date —
`seed = year*10000 + month*100 + day` (i.e. `YYYYMMDD`) — and passes it into the
game module's pure function (`dailyAnswer(seed)` / `dailyTarget(seed)`), which
hashes the seed's bits to pick that day's answer from a bundled list.

The answer list ships inside the page; the module reads no clock and hits no
network. Because the seed is the date and the mapping is fixed, two devices on the
same calendar day produce the same puzzle.

## Consequences

- **Same puzzle, everywhere, offline, private.** No puzzle server, no request that
  could be logged, no account — yet the "everyone shares today's puzzle" social
  contract holds.
- **Deterministic and testable.** `dailyAnswer` is a pure function of its seed, so
  tests assert "deterministic per seed and always a valid answer" without mocking
  time. The clock lives only in the UI, which injects the seed.
- **Time zone = local day.** "Today" follows the device's local date, so players in
  different time zones roll over at their own midnight. This is a feature (your day
  is your day) but means "same day" is calendar-local, not UTC-global.
- **The word/answer pool is finite and bundled**, so answers eventually cycle. For a
  family cupboard that's fine; a larger or dated-offset pool is a cheap future
  tweak that keeps the no-server property.
