# IronGuard - Repository Guidance for GitHub Copilot

This repository contains a focused TypeScript library for **async resource coordination with enforced lock hierarchy**.

## What the project does

- Prevents deadlocks by enforcing lock acquisition order at compile time
- Reduces race conditions with runtime mutual exclusion
- Supports read/write locks, context transfer, and higher-order helper patterns
- Targets codebases with a **small, stable hierarchy of shared resources**

## Core implementation files

- `src/core/ironGuardSystem.ts` - runtime lock manager, `LockContext`, acquire/release/dispose behavior
- `src/core/ironGuardTypes.ts` - advanced type utilities like `LocksAtMost*`, `HasLock*Context`, `LocksAtMostAndHas*`
- `src/examples/` - usage demonstrations, including realistic workflow coordination
- `tests/` - runtime and compile-time behavior coverage
- `scripts/test-compile-time.js` - negative and positive compile-time validation harness

## Current runtime semantics that matter

- IronGuard supports **15 lock levels**: `LOCK_1` through `LOCK_15`
- Locks must be acquired in **ascending order**, but levels may be skipped
- `useLockWithAcquire()` is the preferred temporary-elevation API
- `releaseLock()` releases a specific lock while keeping the rest of the lineage active
- `dispose()` releases **all** locks in the current lineage snapshot
- `LockContext` now enforces a **single active lineage snapshot at runtime**
  - parent contexts become stale while a derived context is active
  - stale contexts throw until the lineage returns to their exact held-lock snapshot
- Lock acquisition accepts `timeoutMs` and `signal` (`AbortSignal`) options

## Preferred implementation patterns

When generating or editing code that uses IronGuard:

1. Model the resource hierarchy first, then map it to lock levels
2. Prefer `useLockWithAcquire()` over manual `acquire*()` + `dispose()` for temporary nested work
3. Use `releaseLock()` when only one lock should be dropped
4. Treat older contexts as invalid while a newer derived context is active
5. Add `timeoutMs` or `AbortSignal` when waiting could block an external workflow
6. Use the constraint types intentionally:
   - `LocksAtMostX` for flexible inputs below a threshold
   - `HasLockXContext` when a function must require a specific held lock
   - `LocksAtMostAndHasX` when a function both requires a lock and may acquire higher ones
7. Do not reintroduce examples that rely on the old `acquire()` API in new code

## Validation workflow

Always use the existing project commands:

```bash
npm install
npm test
npm run test:compile
npm run lint
npm run build
```

Notes:

- `npm install` should be run before build/test/lint in fresh environments
- Runtime tests use the Node.js test runner against `dist/tests/*.node.test.js`
- Compile-time validation is a first-class part of the project, not optional documentation
- Broken docs/examples are trust issues in this repository and should be fixed alongside code changes

## Documentation priorities

When updating docs or examples:

- Position IronGuard as a **niche infrastructure library**, not a general concurrency toolkit
- Emphasize backends, orchestration code, plugin boundaries, and fixed shared-resource hierarchies
- Call out the stale-context runtime model where relevant
- Prefer realistic async workflow examples over abstract feature demos

## Custom skill

If the task is about **using IronGuard correctly**, consult:

- `.github/skills/ironguard-usage/SKILL.md`

That skill contains the repository-preferred usage workflow, anti-patterns, and validation checklist.
