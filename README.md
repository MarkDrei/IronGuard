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
- **[Lock Context Transfer Patterns](doc/context-transfer-patterns.md)** - Guide to passing contexts between functions using LocksAtMost and NullableLocksAtMost types
- **[Read/Write Lock Best Practices](doc/read-write-best-practices.md)** - Concurrent readers and writer preference
- **[Compile-time Testing Guide](doc/compile-time-testing.md)** - How to validate TypeScript lock safety
- **[Changelog](CHANGELOG.md)** - Version history and release notes

## License

MIT
