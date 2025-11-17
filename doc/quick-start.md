# IronGuard Quick Start Guide

This guide covers the essential patterns for using IronGuard's lock ordering system safely and effectively.

## Installation & Setup

```bash
npm install
npm run build
npm run examples  # See all features in action
```

## Core Concepts

- **Lock Levels**: 15 levels (LOCK_1 through LOCK_15) representing increasing privilege
- **Compile Time Deadlock Prevention**: TypeScript prevents lock ordering violations at compile-time
- **Lock Ordering**: Must acquire locks in ascending order (can skip levels)
- **Runtime Safety**: Async mutual exclusion prevents race conditions

## Key Usage Patterns

### 1. Basic Lock Acquisition and Release

The safest pattern uses `useLockWithAcquire()` for automatic cleanup:

```typescript
import { createLockContext, LOCK_1, LOCK_3 } from './src/core';

const ctx0 = createLockContext();

await ctx0.useLockWithAcquire(LOCK_1, async (ctx1) => {
  console.log(`Holding: [${ctx1.getHeldLocks()}]`); // [1]
  
  await ctx1.useLockWithAcquire(LOCK_3, async (ctx13) => {
    console.log(`Holding: [${ctx13.getHeldLocks()}]`); // [1, 3]
    // Use locks here
  }); // LOCK_3 auto-released
  
  console.log(`Holding: [${ctx1.getHeldLocks()}]`); // [1]
}); // LOCK_1 auto-released
```

**Why this is best**: Locks are automatically released even if exceptions occur. No risk of forgetting cleanup.

### 2. Manual Lock Management

When you need more control, acquire and release explicitly:

```typescript
const ctx1 = await createLockContext().acquireWrite(LOCK_1);
try {
  console.log(`Holding: [${ctx1.getHeldLocks()}]`); // [1]
  
  const ctx13 = await ctx1.acquireWrite(LOCK_3);
  try {
    console.log(`Holding: [${ctx13.getHeldLocks()}]`); // [1, 3]
    // Use locks here
  } finally {
    ctx13.releaseLock(LOCK_3); // Release only LOCK_3
  }
  
  console.log(`Holding: [${ctx1.getHeldLocks()}]`); // [1]
} finally {
  ctx1.releaseLock(LOCK_1); // Release only LOCK_1
}
```

**Key point**: Use `releaseLock()` to release individual locks while keeping others.

### 3. The Danger of dispose()

⚠️ **WARNING**: `dispose()` releases ALL locks and invalidates the entire context chain:

```typescript
const ctx1 = await createLockContext().acquireWrite(LOCK_1);
const ctx13 = await ctx1.acquireWrite(LOCK_3);
const ctx135 = await ctx13.acquireWrite(LOCK_5);

ctx135.dispose(); // ⚠️ Releases ALL locks: 5, 3, AND 1
                  // Now ctx135, ctx13, and ctx1 are ALL invalid!

// ❌ RUNTIME ERROR: Resources are no longer locked, can lead to race conditions
```

**When to use dispose()**:
- Only when you're done with the ENTIRE lock chain
- Prefer `releaseLock()` for individual locks
- Prefer `useLockWithAcquire()` for automatic cleanup

### 4. Passing Locks Between Functions

Functions can accept flexible lock states using `LocksAtMost` types:

```typescript
import type { LocksAtMost5 } from './src/core';

// Accepts any ordered combination of locks 1-5
async function middleProcessor(context: LockContext<LocksAtMost5>): Promise<void> {
  // Can't acquire locks 1-5 (might already be held)
  // ❌ await context.acquireWrite(LOCK_3); // Compile error
  
  // ✅ Can acquire locks above 5
  const withLock6 = await context.acquireWrite(LOCK_6);
  try {
    // Use locks
  } finally {
    withLock6.releaseLock(LOCK_6);
  }
}

// Usage
const ctx1 = await createLockContext().acquireWrite(LOCK_1);
await middleProcessor(ctx1); // ✅ [1] is in LocksAtMost5

const ctx3 = await createLockContext().acquireWrite(LOCK_3);
await middleProcessor(ctx3); // ✅ [3] is in LocksAtMost5

const ctx135 = await ctx1.acquireWrite(LOCK_3).then(c => c.acquireWrite(LOCK_5));
await middleProcessor(ctx135); // ✅ [1,3,5] is in LocksAtMost5
```

### 5. Ensuring Specific Locks Are Held (HasLockXContext)

Sometimes you need to ensure a function is only called when a specific lock is already held. Use `HasLockXContext` types:

```typescript
import type { HasLock3Context, HasLock11Context } from './src/core';

// This function requires LOCK_3 to be held by the caller
function processData<THeld extends IronLocks>(
  ctx: HasLock3Context<THeld>
): void {
  // TypeScript guarantees LOCK_3 is present
  ctx.useLock(LOCK_3, () => {
    console.log('Processing with LOCK_3');
    // Can safely access resources protected by LOCK_3
  });
}

// This function requires LOCK_11 to be held
async function criticalOperation<THeld extends IronLocks>(
  ctx: HasLock11Context<THeld>
): Promise<void> {
  // TypeScript guarantees LOCK_11 is present
  if (ctx.hasLock(LOCK_11)) {
    console.log('Performing critical operation');
    // Work with LOCK_11 protected resources
  }
}

// Usage examples
const ctx3 = await createLockContext().acquireWrite(LOCK_3);
processData(ctx3); // ✅ Compiles - LOCK_3 is held

const ctx1 = await createLockContext().acquireWrite(LOCK_1);
// processData(ctx1); // ❌ Compile error - LOCK_3 not held

const ctx11 = await createLockContext().acquireWrite(LOCK_11);
await criticalOperation(ctx11); // ✅ Compiles

const ctx13 = await ctx1.acquireWrite(LOCK_3);
processData(ctx13); // ✅ Also works - LOCK_3 is held (along with LOCK_1)
```

**When to use HasLockXContext**:
- You need compile-time guarantee that a specific lock is held
- The function doesn't acquire locks itself, just uses existing ones
- You want to enforce lock requirements for critical operations
- You don't care what other locks are held

### 6. Complete Example Flow

Combining all patterns from MarksExample.ts:

```typescript
async function validPath(): Promise<void> {
  const ctx1 = await createLockContext().acquireWrite(LOCK_1);
  try {
    console.log(`Step 1: [${ctx1.getHeldLocks()}]`); // [1]
    await middleProcessor(ctx1);
    
    const ctx13 = await ctx1.acquireWrite(LOCK_3);
    try {
      console.log(`Step 2: [${ctx13.getHeldLocks()}]`); // [1, 3]
      await middleProcessor(ctx13);
    } finally {
      ctx13.releaseLock(LOCK_3); // Release only LOCK_3
    }
  } finally {
    ctx1.dispose(); // ⚠️ Releases all remaining locks
  }
}

async function middleProcessor(context: LockContext<LocksAtMost5>): Promise<void> {
  const withLock6 = await context.acquireWrite(LOCK_6);
  try {
    console.log(`Processing: [${withLock6.getHeldLocks()}]`);
    await finalProcessor(withLock6);
  } finally {
    withLock6.releaseLock(LOCK_6);
  }
}

async function finalProcessor<THeld extends IronLocks>(
  ctx: NullableLocksAtMost10<THeld>
): Promise<void> {
  if (ctx !== null) {
    // Context has locks ≤10, can acquire higher locks
    console.log(`Final: [${ctx.getHeldLocks()}]`);
    
    // Acquire LOCK_11 and use HasLock11Context function
    if (ctx.getMaxHeldLock() <= 10) {
      const safeCtx = ctx as unknown as LockContext<readonly [10]>;
      const withLock11 = await safeCtx.acquireWrite(LOCK_11);
      try {
        await criticalOperation(withLock11); // Requires LOCK_11
      } finally {
        withLock11.releaseLock(LOCK_11);
      }
    }
  }
}

async function criticalOperation<THeld extends IronLocks>(
  ctx: HasLock11Context<THeld>
): Promise<void> {
  console.log('Critical operation with LOCK_11');
}
```

## Lock Skipping

You can skip intermediate locks:

```typescript
// ✅ Valid: skip locks 2, 3, 4
const ctx1 = await createLockContext().acquireWrite(LOCK_1);
const ctx15 = await ctx1.acquireWrite(LOCK_5);

// ✅ Valid: direct acquisition of any lock
const ctx8 = await createLockContext().acquireWrite(LOCK_8);
```

## Read/Write Lock Semantics

### Concurrent Readers

```typescript
// Multiple readers can hold the same lock simultaneously
const reader1 = await createLockContext().acquireRead(LOCK_3);
const reader2 = await createLockContext().acquireRead(LOCK_3); // ✅ Granted immediately
```

### Writer Preference

```typescript
// Writers get priority over new readers
const reader1 = await createLockContext().acquireRead(LOCK_3);
const writerPromise = createLockContext().acquireWrite(LOCK_3); // Waits for reader1
const reader2Promise = createLockContext().acquireRead(LOCK_3); // Waits for writer

reader1.dispose(); // Writer proceeds first (writer preference)
```

### Mixed Read/Write

```typescript
// Lock ordering applies regardless of read/write mode
const ctx = await createLockContext()
  .acquireRead(LOCK_1)
  .then(c => c.acquireWrite(LOCK_3))
  .then(c => c.acquireRead(LOCK_5));
```

## Flexible Lock Types

### LocksAtMost Types (1-9)

Pre-defined types for accepting multiple lock states:

```typescript
import type { 
  LocksAtMost1, LocksAtMost2, LocksAtMost3, // ... up to LocksAtMost9
} from './src/core';

// Accepts: [], [1], [2], [3], [1,2], [1,3], [2,3], [1,2,3]
function plugin(ctx: LockContext<LocksAtMost3>): void {
  // Can acquire locks > 3
}
```

**Type Explosion Note**: Due to TypeScript's exponential type expansion (2^N combinations), only `LocksAtMost1` through `LocksAtMost9` are pre-defined. Each level doubles the type combinations:
- `LocksAtMost9`: 512 combinations (good performance)
- `LocksAtMost10`: 1,024 combinations (starts to slow down)
- `LocksAtMost15`: 32,768 combinations (significant overhead)

### NullableLocksAtMost Types (10-15)

For higher lock levels, use nullable types:

```typescript
import type { 
  NullableLocksAtMost10,
  NullableLocksAtMost11,
  NullableLocksAtMost12,
  // ... up to NullableLocksAtMost15
} from './src/core';

async function handler<THeld extends IronLocks>(
  ctx: NullableLocksAtMost10<THeld>
): Promise<void> {
  if (ctx !== null) {
    // Max lock ≤ 10, safe to use
    console.log(`Locks: [${ctx.getHeldLocks()}]`);
    console.log(`Max: ${ctx.getMaxHeldLock()}`);
    
    // To acquire new locks, cast to a concrete type
    // The type system guarantees max lock ≤ 10
    if (ctx.getMaxHeldLock() <= 10) {
      const safeCtx = ctx as unknown as LockContext<readonly [10]>;
      const withLock11 = await safeCtx.acquireWrite(LOCK_11);
      try {
        console.log(`Acquired LOCK_11: [${withLock11.getHeldLocks()}]`);
      } finally {
        withLock11.releaseLock(LOCK_11);
      }
    }
  }
  // If max lock > 10, ctx will be null
}
```

**Why nullable?**: These types validate the maximum lock level without generating exponential type combinations. They're a fallback solution for performance reasons.

## Error Prevention

### Compile-Time Violations

TypeScript prevents these at compilation:

```typescript
const ctx3 = await createLockContext().acquireWrite(LOCK_3);

// ❌ Compile errors:
// await ctx3.acquireWrite(LOCK_1);  // Lower after higher
// await ctx3.acquireWrite(LOCK_3);  // Duplicate acquisition
// ctx3.useLock(LOCK_5, () => {});   // LOCK_5 not held
```

### Runtime Mutual Exclusion

```typescript
// Two concurrent operations competing for the same lock
const thread1 = async () => {
  const ctx = await createLockContext().acquireWrite(LOCK_5);
  console.log('Thread 1 got LOCK_5');
  await new Promise(resolve => setTimeout(resolve, 100));
  ctx.dispose();
};

const thread2 = async () => {
  const ctx = await createLockContext().acquireWrite(LOCK_5);
  console.log('Thread 2 got LOCK_5'); // Waits for thread1
  ctx.dispose();
};

await Promise.all([thread1(), thread2()]);
```

## Best Practices Summary

1. **Prefer `useLockWithAcquire()`** for automatic cleanup
2. **Use `releaseLock()`** when you need to release individual locks
3. **Avoid `dispose()`** unless you're done with the entire lock chain
4. **Use `LocksAtMost` types** (1-9) for flexible function parameters
5. **Use `NullableLocksAtMost` types** (10-15) as a fallback for higher lock levels
6. **Use `HasLockXContext` types** when functions require specific locks to be held
7. **Always clean up locks** in finally blocks or with automatic patterns

## Testing Your Code

```bash
npm run examples                # All features demo
npm run test                    # Runtime tests (155 tests)
npm run test:compile            # Compile-time validation (85 tests)
```

## Next Steps

- Explore `src/examples/MarksExample.ts` for complete usage patterns
- See `doc/context-transfer-patterns.md` for detailed type system documentation
- Review `doc/nullable-context-patterns.md` for NullableLocksAtMost details
- Study `tests/` directory for comprehensive usage examples
