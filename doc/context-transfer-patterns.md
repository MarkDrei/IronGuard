# Lock Context Transfer Patterns

## Overview

IronGuard provides flexible type patterns for passing lock contexts between functions as parameters. This enables writing modular code where functions can accept lock contexts in various states while maintaining compile-time deadlock prevention.

This guide covers two complementary approaches:
1. **LocksAtMost Types** (1-9): For accepting any ordered combination of locks
2. **NullableLocksAtMost Types** (10-15): For validating maximum lock levels

## LocksAtMost Types: Flexible Lock Acceptance

### Pre-defined Types: LocksAtMost{N}

For convenience, IronGuard provides pre-defined types `LocksAtMost1` through `LocksAtMost9`:

```typescript
import { LockContext, LocksAtMost3, LocksAtMost5 } from '@markdrei/ironguard-typescript-locks';

// Function accepts any ordered combination of locks 1-3
async function processData(ctx: LockContext<LocksAtMost3>): Promise<void> {
  // Accepts: [], [1], [2], [3], [1,2], [1,3], [2,3], [1,2,3]
  const locks = ctx.getHeldLocks();
  // Adapt behavior based on which locks are held
}

// Function accepts any ordered combination of locks 1-5
async function pluginHook(ctx: LockContext<LocksAtMost5>): Promise<void> {
  // Accepts all ordered combinations from [] to [1,2,3,4,5]
}
```

### Why Only 1-9?

The pre-defined types stop at level 9 to maintain reasonable compilation performance. Higher levels generate exponentially more type combinations (2^N), which can slow down TypeScript compilation on some systems.

**However**, you can easily create your own types for higher levels if needed:

```typescript
// Custom types for levels 10 and above
type LocksAtMost10 = OrderedSubsequences<readonly [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]>;
type LocksAtMost14 = OrderedSubsequences<readonly [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]>;

async function advancedPlugin(ctx: LockContext<LocksAtMost14>): Promise<void> {
  // Works perfectly fine, just not pre-defined in the library
}
```

**Note**: Level 15 can experience noticeable compilation slowdown on some systems. If you need many locks, consider grouping them logically (see "Lock Grouping" section below).

## The OrderedSubsequences Type

Under the hood, `LocksAtMost{N}` uses the `OrderedSubsequences<T>` type utility:

```typescript
type LocksAtMost3 = OrderedSubsequences<readonly [1, 2, 3]>;
```

`OrderedSubsequences<T>` generates all possible ordered subsequences (the powerset) while maintaining order. This enables maximum flexibility:

- **Lock skipping**: Acquire `[1, 3]` without `2`
- **Starting mid-sequence**: Acquire `[2, 4]` without `1` or `3`
- **Any ordered combination**: Empty `[]`, single locks, or any valid sequence

**Key property**: Order is always preserved. If lock A comes before lock B in the sequence, and both are acquired, then A must be acquired before B. This maintains the hierarchical ordering critical for deadlock prevention.

## Complete Usage Example

```typescript
import { 
  createLockContext, 
  LockContext, 
  LOCK_4, 
  LOCK_5, 
  LocksAtMost5 
} from '@markdrei/ironguard-typescript-locks';

// Function accepts any ordered combination of locks 1-5
async function processWithFlexibleContext(ctx: LockContext<LocksAtMost5>): Promise<void> {
  const locks = ctx.getHeldLocks();
  console.log(`Processing with locks: [${locks}]`);
  
  // ✅ Valid: Can use locks that are already held
  if (ctx.hasLock(LOCK_4)) {
    console.log('Lock 4 is available');
  }
  
  if (ctx.hasLock(LOCK_5)) {
    console.log('Lock 5 is available');
  }
  
  // ❌ COMPILE ERROR: Cannot acquire lock 5 because it might already be held
  // The function signature accepts contexts that may already hold lock 5,
  // so attempting to acquire it would violate the no-duplicate-locks rule
  // const ctx5 = await ctx.acquireRead(LOCK_5); // ❌ Compile error
  
  // ❌ COMPILE ERROR: Cannot acquire lock 4 for the same reason
  // const ctx4 = await ctx.acquireRead(LOCK_4); // ❌ Compile error
  
  // ❌ COMPILE ERROR: Cannot acquire any lock from 1-5
  // const ctx3 = await ctx.acquireRead(LOCK_3); // ❌ Compile error
  
  // The function can only READ from the context, not acquire more locks
  // within the [1-5] range, because it doesn't know what's already held
}

async function demonstrateUsage(): Promise<void> {
  // Start with empty context
  const ctx0 = createLockContext();
  
  // Acquire lock 4
  const ctx4 = await ctx0.acquireRead(LOCK_4);
  console.log('Acquired lock 4');
  
  // Acquire lock 5 (higher than 4, so valid)
  const ctx5 = await ctx4.acquireRead(LOCK_5);
  console.log('Acquired lock 5');
  
  // ✅ Valid: Pass [4, 5] context to function accepting LocksAtMost5
  await processWithFlexibleContext(ctx5);
  
  // ✅ Valid: Can also pass partial contexts
  await processWithFlexibleContext(ctx4); // Just [4]
  await processWithFlexibleContext(ctx0); // Empty []
  
  // Cleanup
  ctx5.dispose();
}
```

### Key Insights from the Example

1. **Flexible Acceptance**: `LocksAtMost5` accepts any ordered combination: `[]`, `[1]`, `[2]`, `[4,5]`, etc.

2. **Cannot Acquire Within Range**: A function accepting `LocksAtMost5` cannot acquire locks 1-5 because:
   - The caller might have already acquired lock 5 → duplicate violation
   - The caller might have already acquired lock 3 → cannot acquire lock 1 or 2 after it
   - TypeScript prevents all acquisitions in the [1-5] range to maintain safety

3. **Can Acquire Above Range**: The function could acquire locks 6 and above:
   ```typescript
   async function processWithFlexibleContext(ctx: LockContext<LocksAtMost5>): Promise<void> {
     // ✅ Valid: Can acquire locks higher than 5
     const ctx6 = await ctx.acquireRead(LOCK_6);
     // Now has any combination of [1-5] plus lock 6
   }
   ```

## Creating Custom Types

For locks beyond level 9, or for specific subsets:

```typescript
// Higher levels
type LocksAtMost10 = OrderedSubsequences<readonly [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]>;
type LocksAtMost14 = OrderedSubsequences<readonly [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]>;

// Use them just like pre-defined types
async function customPlugin(ctx: LockContext<LocksAtMost10>): Promise<void> {
  // Works perfectly!
}
```

## NullableLocksAtMost Types: Maximum Lock Validation

For higher lock levels (10-15), IronGuard provides `NullableLocksAtMost` types that validate the maximum lock level without generating exponential type combinations.

### Why Nullable?

Unlike `LocksAtMost` types which enumerate all possible combinations (2^N), `NullableLocksAtMost` types only check the maximum lock level:

```typescript
// This would generate 1,024 combinations - too expensive
type LocksAtMost10 = OrderedSubsequences<readonly [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]>;

// This only checks max lock ≤ 10 - efficient!
type NullableLocksAtMost10<THeld extends IronLocks> =
  MaxHeldLock<THeld> extends 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
    ? LockContext<THeld>
    : null;
```

### Available Types

Pre-defined nullable types for levels 10-15:

```typescript
import type { 
  NullableLocksAtMost10,
  NullableLocksAtMost11,
  NullableLocksAtMost12,
  NullableLocksAtMost13,
  NullableLocksAtMost14,
  NullableLocksAtMost15
} from '@markdrei/ironguard-typescript-locks';
```

### Usage Pattern

Functions using nullable types must check for null:

```typescript
async function processWithHighLocks<THeld extends IronLocks>(
  ctx: NullableLocksAtMost10<THeld>
): Promise<void> {
  if (ctx !== null) {
    // Type system guarantees max lock ≤ 10
    console.log(`Locks: [${ctx.getHeldLocks()}]`);
    console.log(`Max: ${ctx.getMaxHeldLock()}`);
    
    // To acquire new locks, cast to a concrete type
    // The null check already validated max lock ≤ 10
    if (ctx.getMaxHeldLock() <= 10) {
      const safeCtx = ctx as unknown as LockContext<readonly [10]>;
      const withLock11 = await safeCtx.acquireWrite(LOCK_11);
      try {
        console.log(`Acquired LOCK_11: [${withLock11.getHeldLocks()}]`);
        // Use LOCK_11
      } finally {
        withLock11.releaseLock(LOCK_11);
      }
    }
  }
  // If ctx is null, the caller had max lock > 10
}
```

### Type Safety Guarantees

```typescript
// ✅ Valid: max lock is 8
const ctx8 = await createLockContext().acquireWrite(LOCK_8);
await processWithHighLocks(ctx8); // ctx !== null

// ✅ Valid: max lock is 10
const ctx10 = await createLockContext().acquireWrite(LOCK_10);
await processWithHighLocks(ctx10); // ctx !== null

// ❌ Invalid: max lock is 12 > 10
const ctx12 = await createLockContext().acquireWrite(LOCK_12);
await processWithHighLocks(ctx12); // ctx === null (but won't happen due to type system)
```

### Why the Type Cast?

The nullable type only validates the maximum lock level - it doesn't enumerate all possible combinations. To acquire new locks, you need to cast to a concrete type:

```typescript
// Without cast: TypeScript doesn't know the exact lock combination
const ctx: NullableLocksAtMost10<THeld>; // Could be [1], [5,8], [2,4,9], etc.

// With cast: Tell TypeScript we're treating it as [10]
const safeCtx = ctx as unknown as LockContext<readonly [10]>;

// Now can acquire lock 11 (higher than 10)
const withLock11 = await safeCtx.acquireWrite(LOCK_11);
```

**Note**: This cast is safe because:
1. The null check already validated max lock ≤ 10
2. Lock ordering only cares about the maximum lock
3. We're acquiring lock 11, which is higher than any lock ≤ 10

### Complete Example

```typescript
import {
  createLockContext,
  LOCK_1,
  LOCK_6,
  LOCK_11,
  type LockContext
} from '@markdrei/ironguard-typescript-locks';
import type { 
  IronLocks, 
  LocksAtMost5, 
  NullableLocksAtMost10 
} from '@markdrei/ironguard-typescript-locks';

// Step 1: Function accepts LocksAtMost5
async function earlyStage(ctx: LockContext<LocksAtMost5>): Promise<void> {
  // Can acquire locks > 5
  const withLock6 = await ctx.acquireWrite(LOCK_6);
  try {
    await lateStage(withLock6); // Pass to next function
  } finally {
    withLock6.releaseLock(LOCK_6);
  }
}

// Step 2: Function accepts NullableLocksAtMost10
async function lateStage<THeld extends IronLocks>(
  ctx: NullableLocksAtMost10<THeld>
): Promise<void> {
  if (ctx !== null) {
    console.log(`Processing with locks: [${ctx.getHeldLocks()}]`);
    
    // Can acquire locks > 10
    if (ctx.getMaxHeldLock() <= 10) {
      const safeCtx = ctx as unknown as LockContext<readonly [10]>;
      const withLock11 = await safeCtx.acquireWrite(LOCK_11);
      try {
        console.log(`Now have LOCK_11: [${withLock11.getHeldLocks()}]`);
      } finally {
        withLock11.releaseLock(LOCK_11);
      }
    }
  }
}

// Usage
async function workflow(): Promise<void> {
  const ctx1 = await createLockContext().acquireWrite(LOCK_1);
  try {
    await earlyStage(ctx1); // ✅ [1] is in LocksAtMost5
  } finally {
    ctx1.dispose();
  }
}
```

## Choosing Between LocksAtMost and NullableLocksAtMost

| Type | Levels | Use Case | Type Combinations | Performance |
|------|--------|----------|-------------------|-------------|
| `LocksAtMost` | 1-9 | General purpose, any combination | 2^N (up to 512) | Good |
| `NullableLocksAtMost` | 10-15 | High lock levels, max validation | N (just the max) | Excellent |

**Guideline**: Use `LocksAtMost` for locks 1-9, `NullableLocksAtMost` for locks 10-15.

## Best Practices for Context Transfer

1. **Use LocksAtMost for low/mid-level locks**: Better for locks 1-9 where you need flexible acceptance
2. **Use NullableLocksAtMost for high-level locks**: Better for locks 10-15 to avoid type explosion
3. **Add null checks**: Always check `if (ctx !== null)` when using nullable types
4. **Cast when acquiring new locks**: Use `as unknown as LockContext<readonly [N]>` pattern
5. **Document assumptions**: Add comments explaining why casts are safe
6. **Chain functions**: Pass contexts through multiple processing stages

## Advanced Pattern: Mixed Approach

Combine both patterns for maximum flexibility:

```typescript
async function pipeline<THeld extends IronLocks>(
  ctx: NullableLocksAtMost10<THeld>
): Promise<void> {
  if (ctx !== null) {
    // Process with high locks
    if (ctx.getMaxHeldLock() <= 5) {
      // If max lock ≤ 5, can use LocksAtMost5 functions too
      const ctxAs5 = ctx as unknown as LockContext<LocksAtMost5>;
      await processLowLevel(ctxAs5);
    }
    
    // Always can acquire > 10
    if (ctx.getMaxHeldLock() <= 10) {
      const safeCtx = ctx as unknown as LockContext<readonly [10]>;
      const withLock11 = await safeCtx.acquireWrite(LOCK_11);
      try {
        await processHighLevel(withLock11);
      } finally {
        withLock11.releaseLock(LOCK_11);
      }
    }
  }
}
```

## Summary

- **LocksAtMost Types**: Accept any ordered combination of locks 1-N (N ≤ 9)
  - Pre-defined: `LocksAtMost1` through `LocksAtMost9`
  - Can create custom types for higher levels
  
- **NullableLocksAtMost Types**: Validate maximum lock ≤ N (10 ≤ N ≤ 15)
  - Pre-defined: `NullableLocksAtMost10` through `NullableLocksAtMost15`
  - Require null checks and type casting for lock acquisition
  - More efficient for high lock levels (avoids type explosion)

Both patterns enable modular, type-safe code that passes lock contexts between functions while maintaining compile-time deadlock prevention.

