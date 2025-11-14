# IronGuard Quick Start Guide

This guide covers the essential features of the IronGuard lock ordering system, from basic usage to advanced patterns.

## Installation & Setup

```bash
npm install
npm run build
npm run examples  # See all features in action
```

## Core Concepts

- **Lock Levels**: 15 levels (LOCK_1 through LOCK_15) representing increasing privilege
- **Lock Ordering**: Must acquire locks in ascending order (can skip levels)
- **Type Safety**: TypeScript prevents lock ordering violations at compile-time
- **Runtime Safety**: Async mutual exclusion prevents race conditions

## Basic Usage

### 1. Simple Lock Acquisition

```typescript
import { createLockContext, LOCK_1, LOCK_3, LOCK_5 } from './src/core';

// ✅ Valid: ascending order
const ctx = await createLockContext()
  .acquireWrite(LOCK_1)
  .then(c => c.acquireWrite(LOCK_3))
  .then(c => c.acquireWrite(LOCK_5));

// Always dispose when done
ctx.dispose();
```

### 2. Lock Skipping

```typescript
// ✅ Valid: can skip intermediate locks
const ctx1 = await createLockContext().acquireWrite(LOCK_1);
const ctx15 = await ctx1.acquireWrite(LOCK_5);  // Skipped 2, 3, 4

// ✅ Valid: direct acquisition of any lock
const ctx8 = await createLockContext().acquireWrite(LOCK_8);
```

### 3. Using Locks

```typescript
const ctx = await createLockContext()
  .acquireWrite(LOCK_1)
  .then(c => c.acquireWrite(LOCK_3));

// Use the locks for protected operations
ctx.useLock(LOCK_1, () => {
  // Critical section protected by LOCK_1
});

ctx.useLock(LOCK_3, () => {
  // Critical section protected by LOCK_3
});

ctx.dispose();
```

## Read/Write Lock Semantics

IronGuard supports concurrent readers with writer preference for enhanced performance:

### 1. Concurrent Readers

```typescript
// Multiple readers can hold the same lock simultaneously
const reader1 = await createLockContext().acquireRead(LOCK_3);
const reader2 = await createLockContext().acquireRead(LOCK_3);  // ✅ Granted immediately

// Both readers can work concurrently
console.log('Both readers active simultaneously');

reader1.dispose();
reader2.dispose();
```

### 2. Writer Preference

```typescript
// Writers get priority over new readers
const reader1 = await createLockContext().acquireRead(LOCK_3);

// Writer waits for existing readers but blocks new readers
const writerPromise = createLockContext().acquireWrite(LOCK_3);

// This reader will wait for the writer (writer preference)
const reader2Promise = createLockContext().acquireRead(LOCK_3);

reader1.dispose(); // Writer can now proceed
const writer = await writerPromise;
writer.dispose();   // Reader2 can now proceed
```

### 3. Mixed Read/Write Patterns

```typescript
// Lock ordering applies regardless of read/write mode
const ctx = await createLockContext().acquireRead(LOCK_1);    // Read at level 1
const ctx2 = await ctx.acquireWrite(LOCK_3);                  // Write at level 3
const ctx3 = await ctx2.acquireRead(LOCK_5);                  // Read at level 5

ctx3.dispose();
```

## Context Transfer & Type Safety

Pass lock contexts between functions with compile-time validation:

### 1. Type-Safe Function Parameters

```typescript
// Function that only accepts contexts with LOCK_2 using Contains constraint
async function processUserData<T extends readonly LockLevel[]>(
  context: Contains<T, 2> extends true ? LockContext<T> : never
): Promise<LockContext<T>> {
  // TypeScript guarantees LOCK_2 is present - no runtime checks needed
  console.log(`Processing with guaranteed LOCK_2: ${context.toString()}`);
  return context;
}
```

### 2. Usage Examples

```typescript
// ✅ Valid: context contains LOCK_2
const validCtx = await createLockContext().acquireRead(LOCK_2);
await processUserData(validCtx);  // Compiles successfully

// ❌ Compile error: context missing LOCK_2
const invalidCtx = await createLockContext().acquireRead(LOCK_1);
await processUserData(invalidCtx);  // TypeScript error with descriptive message
```

### 3. Function Chaining

```typescript
// Chain multiple functions with different lock requirements
const ctx = await createLockContext().acquireRead(LOCK_1);
const ctx2 = await ctx.acquireWrite(LOCK_2);
const ctx3 = await ctx2.acquireRead(LOCK_3);

// Pass context through functions that validate requirements
const result1 = await processUserData(ctx3);      // Requires LOCK_2 ✅
const result2 = await validateAndSave(result1);   // Requires LOCK_1 & LOCK_3 ✅
const result3 = await performAudit(result2);      // Works with any context ✅

result3.dispose();
```

## Advanced Features

### 1. Rollback Functionality

Roll back to previously held locks for flexible lock management:

```typescript
// Build up locks
const ctx135 = await createLockContext()
  .acquireWrite(LOCK_1)
  .then(c => c.acquireWrite(LOCK_3))
  .then(c => c.acquireWrite(LOCK_5));

// Rollback to LOCK_3 (releases LOCK_5)
const ctx13 = ctx135.rollbackTo(LOCK_3);

// Now can acquire different locks
const ctx134 = await ctx13.acquireWrite(LOCK_4);
const ctx1348 = await ctx134.acquireWrite(LOCK_8);

ctx1348.dispose();
```

## Error Prevention

### Compile-Time Violations (Prevented by TypeScript)

```typescript
const ctx3 = await createLockContext().acquireWrite(LOCK_3);

// ❌ These would cause TypeScript compilation errors:
// const invalid1 = await ctx3.acquireWrite(LOCK_1);    // Lower after higher
// const invalid2 = await ctx3.acquireWrite(LOCK_3);    // Duplicate acquisition
// const invalid3 = ctx3.rollbackTo(LOCK_1);       // LOCK_1 not held
// ctx3.useLock(LOCK_5, () => {});                 // LOCK_5 not held
```

### Runtime Mutual Exclusion

```typescript
// Two threads competing for the same lock
const thread1 = async () => {
  const ctx = await createLockContext().acquireWrite(LOCK_5);
  console.log('Thread 1 got LOCK_5');
  await new Promise(resolve => setTimeout(resolve, 100));
  ctx.dispose();
};

const thread2 = async () => {
  const ctx = await createLockContext().acquireWrite(LOCK_5);
  console.log('Thread 2 got LOCK_5'); // Will wait for thread1
  ctx.dispose();
};

// Thread 2 will wait for Thread 1 to release LOCK_5
await Promise.all([thread1(), thread2()]);
```

## Best Practices

### 1. Always Dispose Contexts

```typescript
const ctx = await createLockContext().acquireWrite(LOCK_1);
try {
  // Your operations
} finally {
  ctx.dispose(); // Always release locks
}
```

### 2. Use Lock Skipping for Performance

```typescript
// ✅ Efficient: skip unnecessary intermediate locks
const ctx = await createLockContext()
  .acquireWrite(LOCK_1)
  .then(c => c.acquireWrite(LOCK_8));  // Skip 2-7 if not needed
```

### 3. Leverage Rollback for Complex Workflows

```typescript
// Build up locks for one operation
const ctx = await createLockContext()
  .acquireWrite(LOCK_1)
  .then(c => c.acquireWrite(LOCK_5))
  .then(c => c.acquireWrite(LOCK_10));

// Operation 1
performOperation1(ctx);

// Rollback and take different path for operation 2
const rolled = ctx.rollbackTo(LOCK_5);
const extended = await rolled.acquireWrite(LOCK_8);
performOperation2(extended);

extended.dispose();
```

### 4. Use Type Constraints for API Design

```typescript
// Create functions that enforce specific lock requirements
function databaseOperation<THeld extends readonly LockLevel[]>(
  context: Contains<THeld, 2> extends true ? LockContext<THeld> : never
) {
  // Only callable with contexts holding LOCK_2 (database lock)
}

function fileOperation<THeld extends readonly LockLevel[]>(
  context: Contains<THeld, 5> extends true ? LockContext<THeld> : never
) {
  // Only callable with contexts holding LOCK_5 (file lock)
}
```

## Testing Your Code

### Run All Examples
```bash
npm run examples                # All features demo
npm run examples:rollback       # Rollback functionality
npm run examples:mutex          # Mutual exclusion
npm run examples:combinations   # Feature combinations
```

### Validate Type Safety
```bash
npm run test:compile            # 31 compile-time validation tests
```

### Test Runtime Behavior
```bash
npm run test                    # 8 runtime tests
npm run test:all               # Everything (39 total tests)
```

## Common Patterns

### Sequential Processing with Rollback
```typescript
const ctx = await createLockContext().acquireWrite(LOCK_1);

for (const step of processingSteps) {
  const stepCtx = await ctx.acquireWrite(step.requiredLock);
  
  try {
    await step.execute(stepCtx);
  } catch (error) {
    // Rollback and try alternative
    const rolled = stepCtx.rollbackTo(LOCK_1);
    await step.fallback(rolled);
  }
}
```

### Conditional Lock Acquisition
```typescript
const baseCtx = await createLockContext().acquireWrite(LOCK_1);

let workingCtx = baseCtx;
if (needsDatabase) {
  workingCtx = await workingCtx.acquireWrite(LOCK_3);
}
if (needsNetwork) {
  workingCtx = await workingCtx.acquireWrite(LOCK_7);
}
if (needsFileSystem) {
  workingCtx = await workingCtx.acquireWrite(LOCK_12);
}

// Use workingCtx for operations
workingCtx.dispose();
```

## Next Steps

- Explore the complete examples: `npm run examples`
- Study the [Compile-time Testing Guide](compile-time-testing.md)
- Run feature combination demos: `npm run examples:combinations`
- Review the test suite for usage patterns: `tests/` directory

The IronGuard system provides both compile-time safety and runtime protection, making it ideal for complex concurrent applications where deadlock prevention and thread safety are critical.