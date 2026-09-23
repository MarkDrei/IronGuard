---
name: ironguard-usage
description: This skill should be used when the user asks to use IronGuard, LockContext, lock hierarchy, useLockWithAcquire, LocksAtMost, HasLock contexts, stale-context behavior, or compile-time lock-order enforcement in this repository.
---

# IronGuard Usage

## Purpose

Use this skill to apply IronGuard idiomatically in this repository. It teaches the preferred lock-modeling approach, the runtime lineage rules, and the validation steps expected here.

## When to Use

- The task asks to add or refactor code that uses `createLockContext`
- The task mentions `LockContext`, `useLockWithAcquire`, `releaseLock`, `dispose`, `LocksAtMost*`, `HasLock*Context`, or `LocksAtMostAndHas*`
- The task is about preventing deadlocks or coordinating async access through IronGuard
- The task needs examples, docs, or tests for IronGuard behavior

## When NOT to Use

- The task is unrelated to IronGuard APIs or lock-order logic
- The problem is better solved with ordinary application logic and does not involve shared-resource ordering
- The request is only about generic TypeScript style, packaging, or infrastructure with no IronGuard usage

## Repository-Specific Rules

1. Treat IronGuard as a **focused async resource coordination library**
2. Prefer a **small, stable lock hierarchy** over ad hoc per-entity lock levels
3. Prefer `useLockWithAcquire()` for temporary lock elevation
4. Use `releaseLock()` for partial release and `dispose()` only when done with the whole lineage
5. Respect the **single active lineage snapshot** runtime model:
   - a parent context becomes stale after a derived context acquires another lock
   - stale contexts throw until the lineage returns to their exact held-lock state
6. Use `timeoutMs` or `AbortSignal` when lock waits can outlive the caller's patience or lifecycle

## Recommended Workflow

### 1. Model the hierarchy first

Before writing code, name the shared resources and define the escalation order.

Good fit:

- workflow state → ledger mutation → outbound dispatch
- cache gate → database mutation → side-effect publication
- plugin boundary → privileged core operation

Bad fit:

- arbitrary per-record IDs with no fixed global order
- workloads that should use queueing, transactions, or datastore primitives instead

### 2. Choose the narrowest API pattern

- Use `useLockWithAcquire()` when work is scoped and nested
- Use `acquireWrite()` / `acquireRead()` directly only when a longer-lived context is intentional
- Use `releaseLock()` when dropping one lock while keeping the rest
- Use `dispose()` only when the full lineage should end

### 3. Choose the right type constraint

- `LockContext<LocksAtMostX>`: accept any ordered combination below a threshold
- `HasLockXContext<THeld>`: require a specific held lock without granting a broader acquisition story
- `LockContext<LocksAtMostAndHasX>`: require a specific lock and still allow higher acquisitions
- `NullableLocksAtMostX<THeld>`: use when the high-level API truly needs nullable threshold gating

### 4. Account for stale contexts explicitly

Do not generate code that assumes every older context remains usable after a child acquires a new lock.

Preferred pattern:

1. Acquire or temporarily elevate
2. Perform work through the newest active context
3. Release or exit helper scope
4. Resume using the older context only after the lineage returns to its snapshot

### 5. Add waiting controls when appropriate

If the caller has cancellation semantics, request deadlines, or bounded latency requirements, pass:

- `timeoutMs`
- `signal`

Use both when the surrounding workflow already has a cancellation model.

## Testing Expectations

Whenever IronGuard behavior changes or new usage patterns are added:

1. Add or update runtime tests in `tests/*.node.test.ts`
2. Add compile-time validation cases in `scripts/test-compile-time.js` if the change affects type-safety guarantees
3. Keep invalid examples as commented single-line snippets with `// ❌` markers where that pattern is already used

## Validation Checklist

Run:

```bash
npm install
npm test
npm run test:compile
npm run lint
npm run build
```

## Reference Files

- `src/core/ironGuardSystem.ts`
- `src/core/ironGuardTypes.ts`
- `src/examples/workflowCoordinationDemo.ts`
- `doc/quick-start.md`
- `README.md`
