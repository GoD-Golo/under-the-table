# Legacy v0.0.4 review policy

`under-the-table-v0.0.4` remains available as read-only inspiration. It is not a migration source of truth.

## Ideas worth preserving

- session-first D&D companion direction;
- character progression concepts;
- World Graph / visibility concepts;
- compendium + private homebrew intent;
- content portability;
- DM/player campaign loop;
- the need for realtime live-session state.

## Architecture not inherited automatically

- direct Supabase coupling;
- Supabase schema/RLS policies;
- client-only access gate;
- duplicated character-builder implementations;
- hard-coded campaign/demo pages;
- static live-session placeholder architecture;
- legacy local paths and stale documentation.

## Rule

If legacy code inspires a new implementation, the new repository must restate the reason and validate the behavior independently. Copying code is not the default path.

## Canonical GitHub history

The 2024 history currently present in `GoD-Golo/under-the-table` may remain in Git as archaeology when this fresh-start tree becomes the canonical `main`. Those historical commits are not inherited architecture and do not outrank this repository's current executable evidence, docs or ADRs.
