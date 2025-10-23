# IronGuard Read/Write Lock Implementation - Best Practices

## Overview

IronGuard now supports read/write locks with full backward compatibility. This document outlines best practices for using the enhanced system.

## Key Features

✅ **Concurrent Readers**: Multiple threads can hold read locks simultaneously  
✅ **Writer Preference**: Writers get priority to prevent starvation  
✅ **Mode-Agnostic Ordering**: Lock ordering rules apply regardless of read/write mode  
✅ **Type Safety**: Full compile-time validation preserved  

## API Reference

### Lock Acquisition Methods

```typescript
// Read and write lock acquisition
const readCtx = await createLockContext().acquireRead(LOCK_3);
const writeCtx = await createLockContext().acquireWrite(LOCK_3);
```

### Lock Mode Inspection

```typescript
const ctx = await createLockContext().acquireRead(LOCK_2);
const mode = ctx.getLockMode(LOCK_2); // Returns 'read' | 'write' | undefined
```

### Mixed Lock Patterns

```typescript
// Mode-agnostic ordering - only lock levels matter for deadlock prevention
const ctx1 = await createLockContext().acquireRead(LOCK_1);   // Read at level 1
const ctx2 = await ctx1.acquireWrite(LOCK_3);                 // Write at level 3 (valid: 1 < 3)
const ctx3 = await ctx2.acquireRead(LOCK_5);                  // Read at level 5 (valid: 3 < 5)
```

## Usage Patterns

### 1. Database-Style Access

```typescript
// Multiple readers can access data concurrently
async function readData() {
  const ctx = await createLockContext().acquireRead(DATA_LOCK);
  try {
    // Safe concurrent read access
    return await database.read();
  } finally {
    ctx.dispose();
  }
}

// Writers get exclusive access
async function writeData(data: any) {
  const ctx = await createLockContext().acquireWrite(DATA_LOCK);
  try {
    // Exclusive write access
    await database.write(data);
  } finally {
    ctx.dispose();
  }
}
```

### 2. Hierarchical Locking

```typescript
// Lock ordering preserved with mixed modes
const ctx = await createLockContext()
  .acquireRead(SCHEMA_LOCK)     // Read schema information
  .acquireWrite(TABLE_LOCK)     // Exclusive table modification
  .acquireRead(INDEX_LOCK);     // Read index information
```

### 3. Lock Rollback with Modes

```typescript
const ctx = await createLockContext()
  .acquireRead(LOCK_1)
  .acquireWrite(LOCK_3)
  .acquireRead(LOCK_5);

// Rollback preserves lock modes
const rolled = ctx.rollbackTo(LOCK_3);
// rolled still has: LOCK_1 (read) and LOCK_3 (write)
```

## Runtime Behavior

### Reader Concurrency
- Multiple readers can hold the same lock simultaneously
- Readers are granted immediately if no writers are waiting
- Reader count is tracked internally

### Writer Preference
- When a writer requests a lock, new readers are blocked
- All existing readers must complete before writer gets access
- Prevents writer starvation in read-heavy scenarios

### Sequential Timeline Example
```
Time 1: Reader A acquires LOCK_3 ✓
Time 2: Reader B acquires LOCK_3 ✓ (concurrent with A)
Time 3: Writer C requests LOCK_3   ⏳ (waits, establishes preference)
Time 4: Reader D requests LOCK_3   ⏳ (blocked by writer preference)
Time 5: Reader A releases LOCK_3
Time 6: Reader B releases LOCK_3
Time 7: Writer C acquires LOCK_3 ✓ (exclusive access)
Time 8: Writer C releases LOCK_3
Time 9: Reader D acquires LOCK_3 ✓ (granted after writer)
```

## Performance Considerations

### When to Use Read Locks
- ✅ Data reading/querying operations
- ✅ Configuration/metadata access
- ✅ Multiple concurrent operations that don't modify state
- ✅ High read-to-write ratio scenarios

### When to Use Write Locks  
- ✅ Data modification operations
- ✅ State changes that must be exclusive
- ✅ Operations that require consistent view during modification

### Lock Granularity
- Use read locks for fine-grained concurrent access
- Use write locks when exclusive access is required
- Consider lock hierarchies to balance concurrency and safety

## Composable ValidLockContext Types

IronGuard now features a composable type system for function parameter constraints:

### Building Blocks
```typescript
// Reusable building blocks for all 15 lock levels
type HasLock<THeld, Level> = Contains<THeld, Level>;
type CanAcquireLock3<THeld> = /* hierarchical composition logic */;
type ValidLock3Context<THeld> = HasLock<THeld, 3> extends true 
  ? LockContext<THeld> 
  : CanAcquireLock3<THeld> extends true 
    ? LockContext<THeld>
    : 'IronGuard: Cannot acquire lock 3 when holding lock X';
```

### Function Parameter Patterns
```typescript
// Function that works with multiple lock scenarios
function processData<THeld extends readonly any[]>(
  ctx: ValidLock3Context<THeld> extends string ? never : ValidLock3Context<THeld>
): void {
  // This function accepts contexts that:
  // - Can acquire LOCK_3 (empty, has LOCK_1, has LOCK_2, etc.)
  // - Already have LOCK_3 (read or write mode)
  console.log(`Processing with: ${ctx.toString()}`);
}

// All these work with both read and write modes:
const emptyCtx = createLockContext();                    // ✅ Can acquire LOCK_3
const readCtx = await createLockContext().acquireRead(LOCK_2);   // ✅ Can acquire LOCK_3
const writeCtx = await createLockContext().acquireWrite(LOCK_3); // ✅ Already has LOCK_3

processData(emptyCtx); processData(readCtx); processData(writeCtx);
```

### All 15 Lock Levels Supported
- `ValidLock1Context` through `ValidLock15Context` available
- Hierarchical composition: `CanAcquireLock5` builds on `CanAcquireLock4`
- Descriptive error messages for invalid combinations
- Works seamlessly with both `acquireRead()` and `acquireWrite()`

## Debugging and Monitoring

### Enhanced toString() Output
```typescript
const ctx = await createLockContext().acquireRead(LOCK_1);
console.log(ctx.toString());
// Output: "LockContext[1R] (global: [1R:3, 2W])"
// Format: [lockR/W] where R=read, W=write
// Global shows: [lockR:count] for readers, [lockW] for writers
```

### Lock State Inspection
```typescript
const manager = IronGuardManager.getInstance();
const state = manager.getGlobalLocks();
console.log('Readers:', state.readers);        // Map<LockLevel, number>
console.log('Writers:', state.writers);        // Set<LockLevel>
console.log('Pending Writers:', state.pendingWriters); // Map<LockLevel, number>
```

## Common Pitfalls

### ❌ Don't Assume Lock Upgrade/Downgrade
```typescript
// This is NOT supported - treat as separate acquisitions
const reader = await createLockContext().acquireRead(LOCK_3);
// reader.acquireWrite(LOCK_3); // ❌ Would be compile error (duplicate)
```

### ❌ Don't Rely on Acquisition Order
```typescript
// Writer preference means this reader might wait:
const reader1 = await createLockContext().acquireRead(LOCK_3); // ✓ Granted
// ... writer queues up ...
const reader2 = await createLockContext().acquireRead(LOCK_3); // ⏳ Might wait for writer
```

### ✅ Do Use Appropriate Disposal
```typescript
const ctx = await createLockContext().acquireRead(LOCK_3);
try {
  // ... use lock ...
} finally {
  ctx.dispose(); // Always dispose to release locks
}
```

## Advanced Patterns

### Reader-Writer Escalation
```typescript
// Pattern: Read first, then escalate to write if needed
async function updateIfNeeded(id: string) {
  // Start with read lock to check condition
  const readCtx = await createLockContext().acquireRead(DATA_LOCK);
  const needsUpdate = await checkNeedsUpdate(id);
  readCtx.dispose();
  
  if (needsUpdate) {
    // Escalate to write lock for modification
    const writeCtx = await createLockContext().acquireWrite(DATA_LOCK);
    try {
      await performUpdate(id);
    } finally {
      writeCtx.dispose();
    }
  }
}
```

### Mixed Mode Hierarchies
```typescript
// Complex enterprise pattern
const systemCtx = await createLockContext()
  .acquireRead(CONFIG_LOCK)      // Read system config
  .acquireWrite(USER_LOCK)       // Exclusive user modification  
  .acquireRead(AUDIT_LOCK);      // Read audit trail

// All compile-time ordering rules still apply!
```

## Conclusion

The read/write lock extension maintains IronGuard's core principles while dramatically improving concurrency for read-heavy workloads. The type system ensures correctness, writer preference prevents starvation, and full backward compatibility enables gradual migration.

Key takeaway: **Lock levels determine ordering (deadlock prevention), lock modes determine concurrency (performance optimization)**.