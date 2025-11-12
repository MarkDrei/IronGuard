# Flexible Lock Context Types

## Overview

IronGuard provides flexible lock context types that allow functions to accept lock contexts in various states. This enables writing code that works with different lock combinations while maintaining compile-time deadlock prevention.

## Pre-defined Types: LocksAtMost{N}

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

4. **Read-Only Access**: Functions with flexible parameters are typically "readers" of the lock state, inspecting what's held and adapting behavior accordingly.

## When to Use Flexible Types

### ✅ Good Use Cases

1. **Plugin Systems**: Plugins need to work with whatever locks the host application provides
2. **Middleware Chains**: Different middleware layers may have different lock requirements
3. **Adaptive Algorithms**: Code that adjusts behavior based on available locks
4. **Testing Frameworks**: Test harnesses that work with all possible lock states
5. **Public APIs**: Library functions where callers have varying lock contexts

### ❌ Not Recommended

1. **Known Patterns**: If you know exactly which locks are needed, specify them:
   ```typescript
   async function specific(ctx: LockContext<readonly [1, 2, 3]>): Promise<void>
   ```

2. **Simple Sequential Code**: Use specific types for clarity:
   ```typescript
   async function process(ctx: LockContext<readonly [1, 2]>): Promise<void>
   ```

3. **Internal Functions**: If it's not a public API, specific types are clearer

## Best Practices

### 1. Choose the Right Level

```typescript
// ✅ Good: Use appropriate level for your needs
async function smallPlugin(ctx: LockContext<LocksAtMost3>): Promise<void> { }
async function largePlugin(ctx: LockContext<LocksAtMost7>): Promise<void> { }

// ✅ Good: Create custom types for higher levels
type LocksAtMost12 = OrderedSubsequences<readonly [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]>;
async function advancedPlugin(ctx: LockContext<LocksAtMost12>): Promise<void> { }

// ⚠️ Consider: Do you really need all 15 locks with full flexibility?
type LocksAtMost15 = OrderedSubsequences<readonly [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]>;
// This might slow down compilation - consider lock grouping instead
```

## Compile-Time Safety

Flexible types maintain all of IronGuard's compile-time guarantees:

```typescript
async function example() {
  const ctx0 = createLockContext();
  
  // ✅ Valid: Ordered acquisition
  const ctx1 = await ctx0.acquireRead(LOCK_1);
  const ctx3 = await ctx1.acquireRead(LOCK_3); // [1, 3] - OK!
  
  // ❌ Compile error: Wrong order
  const ctx3b = await ctx0.acquireRead(LOCK_3);
  const ctx1b = await ctx3b.acquireRead(LOCK_1); // Error: can't acquire 1 after 3
  
  // ❌ Compile error: Duplicate
  const ctx1c = await ctx0.acquireRead(LOCK_1);
  const ctx1d = await ctx1c.acquireRead(LOCK_1); // Error: already held
  
  // ✅ Works with flexible functions
  async function flexible(ctx: LockContext<LocksAtMost5>): Promise<void> { }
  await flexible(ctx3);  // [1, 3] is valid
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

## Type Definition Reference

```typescript
/**
 * Generates all ordered subsequences maintaining the original order.
 * 
 * For [1, 2, 3], produces:
 * [] | [1] | [2] | [3] | [1,2] | [1,3] | [2,3] | [1,2,3]
 */
type OrderedSubsequences<T extends readonly any[]> =
  T extends readonly [infer First, ...infer Rest]
    ? OrderedSubsequences<Rest> | readonly [First, ...OrderedSubsequences<Rest>]
    : readonly [];

// Pre-defined convenience types (1-9 included in library)
type LocksAtMost1 = OrderedSubsequences<readonly [1]>;
type LocksAtMost2 = OrderedSubsequences<readonly [1, 2]>;
type LocksAtMost3 = OrderedSubsequences<readonly [1, 2, 3]>;
// ... through LocksAtMost9
```
