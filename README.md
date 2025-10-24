# 🛡️ IronGuard

TypeScript compile-time lock order violation detection system with runtime mutual exclusion and advanced rollback functionality. Prevents both deadlocks (through compile-time validation) and race conditions (through async mutual exclusion).

## Installation

```bash
npm install @markdrei/ironguard-typescript-locks
```

## Quick Start

```typescript
import { 
  createLockContext, 
  LOCK_1, 
  LOCK_2, 
  ValidLock2Context 
} from '@markdrei/ironguard-typescript-locks';

// Function requires LOCK_2 to be held or acquirable - enforced at compile-time!
async function processData<T extends readonly any[]>(
  ctx: ValidLock2Context<T>
): Promise<void> {
  const lockCtx = await ctx.acquireWrite(LOCK_2);
  // ... your critical section logic here ...
  lockCtx.dispose();
}

// Usage
async function example(): Promise<void> {
  const ctx = await createLockContext().acquireWrite(LOCK_1);
  
  // ✅ This works - LOCK_2 can be acquired after LOCK_1
  await processData(ctx);
  
  // ❌ This would fail at compile-time:
  // await processData(await createLockContext()); // No LOCK_2 available
  
  ctx.dispose();
}
```

## What It Delivers

- **Compile-time deadlock prevention**: TypeScript type system enforces lock ordering
- **Runtime thread safety**: Async mutual exclusion prevents race conditions  
- **Read/write lock semantics**: Concurrent readers with writer preference
- **Context transfer validation**: Type-safe function parameters with lock requirements
- **Flexible lock patterns**: Sequential acquisition, lock skipping, function constraints
- **15 lock levels supported**: LOCK_1 through LOCK_15 available (no configuration required)
- **Advanced rollback functionality**: Partial lock release with compile-time validation
- **Production-ready**: Clean API, comprehensive testing, proper resource management

## Enhanced Features

### Rollback Functionality
Roll back to previously held locks while maintaining type safety:

```typescript
// Acquire locks 1, 3, 5
const ctx135 = await createLockContext()
  .acquireWrite(LOCK_1)
  .then(c => c.acquireWrite(LOCK_3))
  .then(c => c.acquireWrite(LOCK_5));

// Rollback to LOCK_3 (releases LOCK_5)
const ctx13 = ctx135.rollbackTo(LOCK_3);

// Now can acquire LOCK_4
const ctx134 = await ctx13.acquireWrite(LOCK_4);
```

### Read/Write Lock Semantics
Full read/write lock support with concurrent readers and writer preference:

```typescript
// Multiple readers can hold the same lock simultaneously
const reader1 = await createLockContext().acquireRead(LOCK_3);
const reader2 = await createLockContext().acquireRead(LOCK_3);  // ✅ Concurrent

// Writers get priority and wait for readers to finish
const writer = await createLockContext().acquireWrite(LOCK_3);  // ⏳ Waits
```

### Context Transfer with Compile-Time Validation
Type-safe function parameters with composable ValidLockContext types:

```typescript
// Composable building blocks for all 15 lock levels
type HasLock<THeld, Level> = Contains<THeld, Level>;
type CanAcquireLock3<THeld> = /* hierarchical composition logic */;

// Function that requires LOCK_3 (works with multiple scenarios)
function processData<THeld extends readonly any[]>(
  ctx: ValidLock3Context<THeld> extends string ? never : ValidLock3Context<THeld>
): string {
  // TypeScript guarantees LOCK_3 can be used - compile-time safety
  return `Processing with: ${ctx.toString()}`;
}

// ✅ Valid scenarios (all work at compile-time):
const emptyCtx = createLockContext();           // Can acquire LOCK_3
const ctx1 = await createLockContext().acquireRead(LOCK_1);  // Can acquire LOCK_3  
const ctx2 = await createLockContext().acquireRead(LOCK_2);  // Can acquire LOCK_3
const ctx3 = await createLockContext().acquireRead(LOCK_3);  // Already has LOCK_3

processData(emptyCtx); processData(ctx1); processData(ctx2); processData(ctx3);

// ❌ Compile error: cannot acquire LOCK_3 when holding higher locks
const ctx5 = await createLockContext().acquireRead(LOCK_5);
processData(ctx5); // "Cannot acquire lock 3 when holding lock 5. Locks must be acquired in order."
```

### Composable ValidLockContext Types (All 15 Levels)
New composable type system with building blocks and hierarchical composition:

**Building Blocks:**
- `HasLock<THeld, Level>` - Checks if a specific lock is already held
- `CanAcquireLockX<THeld>` - Hierarchical rules for acquiring lock X
- `ValidLockXContext<THeld>` - Combines HasLock OR CanAcquire with error messages

**All 15 Lock Levels Supported:**
- `ValidLock1Context` through `ValidLock15Context` 
- Hierarchical composition: `CanAcquireLock3` builds on `CanAcquireLock2`
- Descriptive error messages: "Cannot acquire lock 3 when holding lock 8"
- Easy to extend: Adding new lock levels requires minimal code

## What's Missing

- Performance benchmarks for high-contention scenarios
- Lock timeout/cancellation mechanisms
- Lock priority/scheduling policies

## Project Structure

- `src/core/` - Core IronGuard system and type definitions
- `src/examples/` - Usage demonstrations and patterns including rollback
- `tests/` - Comprehensive test suite with custom runner (7 runtime + 31 compile-time tests)
- `doc/` - Documentation and guides

## Commands

```bash
# See IronGuard in action with various lock patterns
npm run examples

# Run specific example demos
npm run examples:flexible    # Flexible lock 3 function demo
npm run examples:violations  # Compile-time violation detection demo
npm run examples:mutex       # Two-thread mutual exclusion demo
npm run examples:rollback    # Advanced rollback functionality demo
npm run examples:combinations # Feature combinations demo
npm run examples:readwrite   # Read/write lock demonstrations
npm run examples:context     # Context transfer with compile-time validation

# Run all tests (runtime + compile-time validation)
npm run test:all

# Run runtime tests only (8/8 passing)
npm run test

# Run compile-time validation tests only (31/31 passing)
npm run test:compile

# Build TypeScript to JavaScript
npm run build
```

## System Status

**✅ Fully Enhanced**: 15-lock system with read/write locks, context transfer, and rollback functionality
**✅ All Tests Passing**: 9 runtime + 31 compile-time validation tests
**✅ Complete Type Safety**: Lock ordering, duplicates, rollback, read/write modes, and context validation
**✅ Production Ready**: Comprehensive examples and documentation

## Feature Combinations Tested

- **Rollback + Mutual Exclusion**: Rollback operations release locks for waiting threads
- **Rollback + High Lock Levels**: All 15 lock levels work correctly with rollback
- **Rollback + Lock Skipping**: Rollback works with non-sequential lock acquisition
- **Rollback + Function Parameters**: Type constraints work after rollback operations
- **Complex Multi-Feature Scenarios**: Multiple threads with concurrent rollback operations

## Documentation

- **[Quick Start Guide](doc/quick-start.md)** - Essential features and usage patterns
- **[Read/Write Lock Best Practices](doc/read-write-best-practices.md)** - Concurrent readers and writer preference
- **[Compile-time Testing Guide](doc/compile-time-testing.md)** - How to validate TypeScript lock safety
