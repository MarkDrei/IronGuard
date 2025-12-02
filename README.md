# 🛡️ IronGuard

Unbreakable TypeScript compile-time lock order violation detection system with runtime mutual exclusion. Prevents both deadlocks (through compile-time validation) and race conditions (through async mutual exclusion).

## Installation

```bash
npm install @markdrei/ironguard-typescript-locks
```

## Quick Start

```typescript
import { 
  createLockContext, 
  LOCK_1, 
  LOCK_3,
  type LockContext
} from '@markdrei/ironguard-typescript-locks';

// Basic lock acquisition with automatic cleanup
async function example(): Promise<void> {
  const ctx0 = createLockContext();
  
  await ctx0.useLockWithAcquire(LOCK_1, async (ctx1) => {
    console.log(`Holding: [${ctx1.getHeldLocks()}]`); // [1]
    
    await ctx1.useLockWithAcquire(LOCK_3, async (ctx13) => {
      console.log(`Holding: [${ctx13.getHeldLocks()}]`); // [1, 3]
      // Use locks here
    }); // LOCK_3 auto-released
  }); // LOCK_1 auto-released
}
```

## Understanding Deadlocks

Deadlocks occur when two or more operations wait for each other to release resources, creating a circular dependency that prevents any progress. This is one of the most challenging bugs in concurrent programming.

### Classic Deadlock Scenario

Consider two threads accessing shared resources (e.g., bank accounts):

```typescript
// ❌ DEADLOCK SCENARIO (without IronGuard)
// accountA and accountB represent shared resources (e.g., bank accounts)

// Thread 1's execution path:
async function transferMoney() {
  await acquireLock(accountA);     // Gets lock A
  await acquireLock(accountB);     // Waits for lock B (held by Thread 2)
  // Transfer funds...
  releaseLock(accountB);
  releaseLock(accountA);
}

// Thread 2's execution path (running concurrently):
async function calculateBalance() {
  await acquireLock(accountB);     // Gets lock B
  await acquireLock(accountA);     // Waits for lock A (held by Thread 1)
  // Calculate balance...
  releaseLock(accountA);
  releaseLock(accountB);
}

// Result: Thread 1 holds A and waits for B
//         Thread 2 holds B and waits for A
//         → DEADLOCK: Neither can proceed! 🔒💀
```

### Why Lock Ordering Prevents Deadlocks

The solution is simple but must be enforced: **always acquire locks in the same order**. If all code follows a consistent ordering rule, circular wait becomes impossible.

```typescript
// ✅ DEADLOCK-FREE (with consistent ordering)

// Both threads now follow the same lock order: A before B

// Thread 1:
async function transferMoney() {
  await acquireLock(accountA);     // Gets lock A first
  await acquireLock(accountB);     // Gets lock B second
  // Transfer funds...
  releaseLock(accountB);
  releaseLock(accountA);
}

// Thread 2:
async function calculateBalance() {
  await acquireLock(accountA);     // Gets lock A first (might wait)
  await acquireLock(accountB);     // Gets lock B second
  // Calculate balance...
  releaseLock(accountB);
  releaseLock(accountA);
}

// Result: Thread 2 waits for Thread 1 to finish
//         No circular dependency → No deadlock! ✅
```

### The Challenge

The problem with traditional locking: **ordering is a convention, not a rule**. One mistake anywhere in your codebase can cause deadlocks:

```typescript
// 99% of your code follows the rules...
await acquireLock(accountA);
await acquireLock(accountB);

// But one function gets it wrong...
await acquireLock(accountB);  // ⚠️ Wrong order!
await acquireLock(accountA);  // → Potential deadlock

// Finding this bug: 😱
// - No compiler warnings
// - Only happens under specific timing conditions
// - May appear in production after months
// - Can crash your entire system
```

**This is where IronGuard comes in.**

## How IronGuard Prevents Deadlocks

IronGuard uses a two-layer defense strategy to prevent both deadlocks and race conditions:

### Layer 1: Compile-Time Prevention (Deadlocks)

IronGuard assigns each lock a **level** (LOCK_1 through LOCK_15) and uses TypeScript's type system to enforce ordering at compile time:

```typescript
// ✅ Valid: Ascending order (1 → 3 → 5)
const ctx1 = await createLockContext().acquireWrite(LOCK_1);
const ctx13 = await ctx1.acquireWrite(LOCK_3);
const ctx135 = await ctx13.acquireWrite(LOCK_5);

// ❌ Invalid: Descending order (TypeScript catches this!)
const ctx3 = await createLockContext().acquireWrite(LOCK_3);
// const ctx31 = await ctx3.acquireWrite(LOCK_1);  
// ⛔ Compile Error: Cannot acquire LOCK_1 after LOCK_3
//    Lock order violation detected at compile time!

// ❌ Invalid: Duplicate acquisition
const ctx2 = await createLockContext().acquireWrite(LOCK_2);
// const ctx22 = await ctx2.acquireWrite(LOCK_2);
// ⛔ Compile Error: LOCK_2 already held
//    Duplicate acquisition prevented!
```

**How it works**: IronGuard's context type encodes which locks are held. Each `acquireWrite()`/`acquireRead()` call validates against the type system:
- ✅ Target lock level > maximum held lock level → Allowed
- ❌ Target lock level ≤ maximum held lock level → Type error
- ❌ Target lock already held → Type error

This makes deadlocks **impossible to compile**, turning a runtime bug into a compile-time error.

### Layer 2: Runtime Prevention (Race Conditions)

Compile-time ordering prevents deadlocks, but you still need **mutual exclusion** to prevent race conditions:

```typescript
// Two concurrent operations competing for the same lock
const operation1 = async () => {
  const ctx = await createLockContext().acquireWrite(LOCK_5);
  console.log('Operation 1: Got LOCK_5, performing work...');
  await new Promise(resolve => setTimeout(resolve, 100)); // Critical section
  ctx.dispose();
  console.log('Operation 1: Released LOCK_5');
};

const operation2 = async () => {
  const ctx = await createLockContext().acquireWrite(LOCK_5);
  console.log('Operation 2: Got LOCK_5, performing work...');
  await new Promise(resolve => setTimeout(resolve, 100)); // Critical section
  ctx.dispose();
  console.log('Operation 2: Released LOCK_5');
};

// Runtime behavior:
await Promise.all([operation1(), operation2()]);

// Output:
// Operation 1: Got LOCK_5, performing work...
// Operation 1: Released LOCK_5
// Operation 2: Got LOCK_5, performing work...  ← Waits for operation1
// Operation 2: Released LOCK_5

// ✅ True mutual exclusion: Only one operation holds LOCK_5 at a time
// ✅ No race conditions: Critical sections never overlap
```

### Lock Order Control in Practice

IronGuard gives you flexible control while maintaining safety:

```typescript
// ✅ You can skip lock levels (useful for hierarchical resources)
const ctx1 = await createLockContext().acquireWrite(LOCK_1);
const ctx15 = await ctx1.acquireWrite(LOCK_5);  // Skipped 2, 3, 4
const ctx158 = await ctx15.acquireWrite(LOCK_8); // Skipped 6, 7

// ✅ You can start at any level
const ctx7 = await createLockContext().acquireWrite(LOCK_7);

// ✅ Mix read and write locks (ordering still enforced)
const ctx = await createLockContext()
  .acquireRead(LOCK_2)   // Read lock
  .then(c => c.acquireWrite(LOCK_5))  // Write lock
  .then(c => c.acquireRead(LOCK_9));  // Read lock

// ✅ Release individual locks while keeping others
const ctx13 = await ctx1.acquireWrite(LOCK_3);
ctx13.releaseLock(LOCK_3);  // Release only LOCK_3, keep LOCK_1
// Now can re-acquire LOCK_3 or acquire LOCK_2
```

### Type-Safe Context Transfer

Functions can declare their lock requirements, and TypeScript validates callers:

```typescript
import { 
  createLockContext,
  LOCK_1,
  LOCK_3,
  LOCK_5,
  LOCK_6,
  LOCK_8,
  type LockContext,
  type LocksAtMost5 
} from '@markdrei/ironguard-typescript-locks';

// This function accepts contexts holding locks 1-5
// and can acquire locks 6+
async function processWithHigherLocks(
  ctx: LockContext<LocksAtMost5>
): Promise<void> {
  // ✅ Can acquire LOCK_6 and higher
  const ctx6 = await ctx.acquireWrite(LOCK_6);
  
  // ❌ Cannot acquire LOCK_1-5 (might already be held)
  // const bad = await ctx.acquireWrite(LOCK_3); // Compile error!
}

// All valid calls:
const ctx1 = await createLockContext().acquireWrite(LOCK_1);
await processWithHigherLocks(ctx1);  // ✅ [1] ⊆ [1..5]

const ctx3 = await createLockContext().acquireWrite(LOCK_3);
await processWithHigherLocks(ctx3);  // ✅ [3] ⊆ [1..5]

const ctx135 = await ctx1.acquireWrite(LOCK_3).then(c => c.acquireWrite(LOCK_5));
await processWithHigherLocks(ctx135);  // ✅ [1,3,5] ⊆ [1..5]

// Invalid call caught at compile time:
const ctx8 = await createLockContext().acquireWrite(LOCK_8);
// await processWithHigherLocks(ctx8);  // ❌ Compile error: 8 ∉ [1..5]
```

### Summary: Double Protection

1. **Compile-Time (Deadlock Prevention)**
   - TypeScript enforces ascending lock order
   - Violations caught before code runs
   - Impossible to create circular wait conditions

2. **Runtime (Race Condition Prevention)**
   - Async mutual exclusion via singleton lock manager
   - Only one operation holds each lock at a time
   - Automatic queuing for lock contention

**Result**: You get both the safety guarantees (no deadlocks, no races) and type-safe APIs that catch mistakes before they reach production.

## What It Delivers

- **Compile-time deadlock prevention**: TypeScript type system enforces lock ordering
- **Runtime thread safety**: Async mutual exclusion prevents race conditions  
- **Read/write lock semantics**: Concurrent readers with writer preference
- **Context transfer validation**: Type-safe function parameters with lock requirements
- **Flexible lock patterns**: Sequential acquisition, lock skipping, temporary elevation
- **15 lock levels supported**: LOCK_1 through LOCK_15 available
- **Production-ready**: Clean API, comprehensive testing, proper resource management

## Core Features

### Manual Lock Management

For fine-grained control, acquire and release locks explicitly:

```typescript
const ctx1 = await createLockContext().acquireWrite(LOCK_1);
try {
  const ctx13 = await ctx1.acquireWrite(LOCK_3);
  try {
    // Use locks here
  } finally {
    ctx13.releaseLock(LOCK_3); // Release only LOCK_3
  }
} finally {
  ctx1.releaseLock(LOCK_1); // Release only LOCK_1
}
```

### Read/Write Lock Semantics

Full read/write lock support with concurrent readers and writer preference:

```typescript
// Multiple readers can hold the same lock simultaneously
const reader1 = await createLockContext().acquireRead(LOCK_3);
const reader2 = await createLockContext().acquireRead(LOCK_3);  // ✅ Concurrent

// Writers get priority over new readers
const writer = await createLockContext().acquireWrite(LOCK_3);  // ⏳ Waits for readers
```

### Context Transfer with Type Safety

Pass lock contexts between functions with compile-time validation:

```typescript
import type { LocksAtMost5, HasLock3Context } from '@markdrei/ironguard-typescript-locks';

// Accepts any ordered combination of locks 1-5
async function middleProcessor(context: LockContext<LocksAtMost5>): Promise<void> {
  // Can acquire locks > 5
  const withLock6 = await context.acquireWrite(LOCK_6);
  try {
    // Use locks
  } finally {
    withLock6.releaseLock(LOCK_6);
  }
}

// Requires LOCK_3 to be held
function processData<THeld extends IronLocks>(
  ctx: HasLock3Context<THeld>
): void {
  ctx.useLock(LOCK_3, () => {
    // TypeScript guarantees LOCK_3 is present
  });
}
```

### Flexible Lock Types

```typescript
// Pre-defined types for locks 1-9
import type { LocksAtMost1, LocksAtMost5, LocksAtMost9 } from '@markdrei/ironguard-typescript-locks';

// Nullable types for locks 10-15 (performance optimization)
import type { NullableLocksAtMost10, NullableLocksAtMost15 } from '@markdrei/ironguard-typescript-locks';

// Ensure specific locks are held
import type { HasLock3Context, HasLock11Context } from '@markdrei/ironguard-typescript-locks';
```

## What's Missing

- Performance benchmarks for high-contention scenarios
- Lock timeout/cancellation mechanisms
- Lock priority/scheduling policies

## Commands

```bash
# See IronGuard in action
npm run examples

# Run all tests
npm test

# Run compile-time validation tests
npm run test:compile

# Build the project
npm run build
```


## Documentation

- **[Quick Start Guide](doc/quick-start.md)** - Essential features and usage patterns
- **[Debugging Guide](doc/debugging-guide.md)** - Debug mode and stack trace capture for lock analysis
- **[Lock Context Transfer Patterns](doc/context-transfer-patterns.md)** - Guide to passing contexts between functions using LocksAtMost and NullableLocksAtMost types
- **[Read/Write Lock Best Practices](doc/read-write-best-practices.md)** - Concurrent readers and writer preference
- **[Compile-time Testing Guide](doc/compile-time-testing.md)** - How to validate TypeScript lock safety
- **[Changelog](CHANGELOG.md)** - Version history and release notes

## License

MIT
