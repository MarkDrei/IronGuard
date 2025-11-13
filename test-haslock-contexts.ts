/**
 * Example: HasLockXContext Types
 * 
 * This example demonstrates the HasLockXContext types which provide simple
 * compile-time checks for lock presence. These types ensure that a specific
 * lock is held before a function can be called, regardless of other locks.
 */

import {
  createLockContext,
  LOCK_1,
  LOCK_2,
  LOCK_3,
  LOCK_5,
  LOCK_8,
  LOCK_10,
  LOCK_12,
  LOCK_15,
  type LockLevel,
  type HasLock3Context,
  type HasLock5Context,
  type HasLock8Context,
  type HasLock10Context,
  type HasLock12Context,
  type HasLock15Context
} from './src/core';

// =============================================================================
// Example 1: Basic Lock Presence Check
// =============================================================================

function processWithLock3<THeld extends readonly LockLevel[]>(
  ctx: HasLock3Context<THeld>
): void {
  console.log('=== processWithLock3 ===');
  // TypeScript guarantees LOCK_3 is present
  ctx.useLock(LOCK_3, () => {
    console.log('✅ Processing with LOCK_3');
  });
  console.log(`   Context holds: [${ctx.getHeldLocks()}]`);
  console.log();
}

function processWithLock5<THeld extends readonly LockLevel[]>(
  ctx: HasLock5Context<THeld>
): void {
  console.log('=== processWithLock5 ===');
  ctx.useLock(LOCK_5, () => {
    console.log('✅ Processing with LOCK_5');
  });
  console.log(`   Context holds: [${ctx.getHeldLocks()}]`);
  console.log();
}

// =============================================================================
// Example 2: Multiple Lock Requirements
// =============================================================================

/**
 * Function requiring LOCK_3 and LOCK_8
 */
function processWithLocks3And8<THeld extends readonly LockLevel[]>(
  ctx: HasLock3Context<THeld> extends string ? never : HasLock8Context<THeld>
): void {
  console.log('=== processWithLocks3And8 ===');
  console.log('✅ Processing with LOCK_3 and LOCK_8');
  console.log(`   Context holds: [${ctx.getHeldLocks()}]`);
  
  ctx.useLock(LOCK_3, () => {
    console.log('   - Using LOCK_3');
  });
  ctx.useLock(LOCK_8, () => {
    console.log('   - Using LOCK_8');
  });
  console.log();
}

// =============================================================================
// Example 3: Real-world Use Cases
// =============================================================================

/**
 * Database operation requiring LOCK_3
 */
function databaseQuery<THeld extends readonly LockLevel[]>(
  ctx: HasLock3Context<THeld>,
  query: string
): void {
  console.log('=== Database Query ===');
  ctx.useLock(LOCK_3, () => {
    console.log(`✅ Executing query: "${query}"`);
    console.log(`   Protected by LOCK_3 (database lock)`);
  });
  console.log();
}

/**
 * File operation requiring LOCK_5
 */
function fileOperation<THeld extends readonly LockLevel[]>(
  ctx: HasLock5Context<THeld>,
  filename: string
): void {
  console.log('=== File Operation ===');
  ctx.useLock(LOCK_5, () => {
    console.log(`✅ Writing to file: "${filename}"`);
    console.log(`   Protected by LOCK_5 (file lock)`);
  });
  console.log();
}

/**
 * Network operation requiring LOCK_8
 */
function networkRequest<THeld extends readonly LockLevel[]>(
  ctx: HasLock8Context<THeld>,
  endpoint: string
): void {
  console.log('=== Network Request ===');
  ctx.useLock(LOCK_8, () => {
    console.log(`✅ Calling endpoint: "${endpoint}"`);
    console.log(`   Protected by LOCK_8 (network lock)`);
  });
  console.log();
}

/**
 * Admin operation requiring LOCK_15
 */
function adminOperation<THeld extends readonly LockLevel[]>(
  ctx: HasLock15Context<THeld>,
  operation: string
): void {
  console.log('=== Admin Operation ===');
  ctx.useLock(LOCK_15, () => {
    console.log(`✅ Executing admin operation: "${operation}"`);
    console.log(`   Protected by LOCK_15 (highest privilege)`);
  });
  console.log();
}

// =============================================================================
// Example 4: Chaining Operations
// =============================================================================

async function chainedOperations<THeld extends readonly LockLevel[]>(
  baseCtx: HasLock3Context<THeld>
): Promise<void> {
  console.log('=== Chained Operations ===');
  console.log('Starting with LOCK_3');
  
  // First operation with LOCK_3
  databaseQuery(baseCtx, 'SELECT * FROM users');
  
  // Acquire LOCK_5 and do file operation
  const ctx5 = await (baseCtx as any).acquireWrite(LOCK_5);
  fileOperation(ctx5, 'users.json');
  
  // Acquire LOCK_8 and do network operation
  const ctx8 = await ctx5.acquireWrite(LOCK_8);
  networkRequest(ctx8, '/api/sync');
  
  console.log('✅ All chained operations completed');
  console.log();
  
  ctx8.dispose();
}

// =============================================================================
// Main Demo
// =============================================================================

async function main() {
  console.log('IronGuard: HasLockXContext Examples\n');
  console.log('========================================\n');

  // Example 1: Basic usage
  console.log('--- Example 1: Basic Lock Presence ---\n');
  
  const ctx3 = await createLockContext().acquireWrite(LOCK_3);
  processWithLock3(ctx3);
  
  const ctx5 = await createLockContext().acquireWrite(LOCK_5);
  processWithLock5(ctx5);
  
  // Example 2: Context with multiple locks
  console.log('--- Example 2: Multiple Locks ---\n');
  
  const ctx135 = await createLockContext()
    .acquireWrite(LOCK_1)
    .then(c => c.acquireWrite(LOCK_3))
    .then(c => c.acquireWrite(LOCK_5));
  
  processWithLock3(ctx135);  // ✅ Has LOCK_3
  processWithLock5(ctx135);  // ✅ Has LOCK_5
  
  const ctx358 = await createLockContext()
    .acquireWrite(LOCK_3)
    .then(c => c.acquireWrite(LOCK_5))
    .then(c => c.acquireWrite(LOCK_8));
  
  processWithLocks3And8(ctx358);  // ✅ Has both LOCK_3 and LOCK_8

  // Example 3: Real-world operations
  console.log('--- Example 3: Real-world Operations ---\n');
  
  databaseQuery(ctx3, 'UPDATE users SET active=1');
  
  fileOperation(ctx5, 'backup.dat');
  
  const ctx8 = await createLockContext().acquireWrite(LOCK_8);
  networkRequest(ctx8, '/api/status');
  
  const ctx15 = await createLockContext().acquireWrite(LOCK_15);
  adminOperation(ctx15, 'Reset system configuration');

  // Example 4: Chained operations
  console.log('--- Example 4: Chained Operations ---\n');
  
  await chainedOperations(ctx3);

  // Example 5: High-level locks
  console.log('--- Example 5: High-level Locks (10-15) ---\n');
  
  const ctx10 = await createLockContext().acquireWrite(LOCK_10);
  function processWithLock10<THeld extends readonly LockLevel[]>(
    ctx: HasLock10Context<THeld>
  ): void {
    console.log('✅ Processing with LOCK_10');
    console.log(`   Context holds: [${ctx.getHeldLocks()}]`);
  }
  processWithLock10(ctx10);
  console.log();
  
  const ctx12 = await createLockContext().acquireWrite(LOCK_12);
  function processWithLock12<THeld extends readonly LockLevel[]>(
    ctx: HasLock12Context<THeld>
  ): void {
    console.log('✅ Processing with LOCK_12');
    console.log(`   Context holds: [${ctx.getHeldLocks()}]`);
  }
  processWithLock12(ctx12);
  console.log();

  // Cleanup
  ctx3.dispose();
  ctx5.dispose();
  ctx135.dispose();
  ctx358.dispose();
  ctx8.dispose();
  ctx15.dispose();
  ctx10.dispose();
  ctx12.dispose();

  console.log('========================================');
  console.log('✅ All examples completed successfully!');
}

// =============================================================================
// Compile-time Violations (Commented Out)
// =============================================================================

/*
// ❌ These would cause TypeScript compilation errors:

async function demonstrateErrors() {
  const ctx1 = await createLockContext().acquireWrite(LOCK_1);
  
  // Error: Context must hold LOCK_3
  processWithLock3(ctx1);
  
  // Error: Context must hold LOCK_5
  processWithLock5(ctx1);
  
  const ctx3 = await createLockContext().acquireWrite(LOCK_3);
  
  // Error: Context must hold LOCK_8
  processWithLocks3And8(ctx3);
}
*/

// =============================================================================
// Key Takeaways
// =============================================================================

console.log(`
Key Takeaways:
--------------

1. HasLockXContext Benefits:
   - Simple boolean check: "Does this context have lock X?"
   - Compile-time validation
   - Clear function requirements
   - Works regardless of other locks held

2. When to Use:
   - Functions that require a specific lock to be present
   - Resource-specific operations (database, file, network)
   - Privilege-level operations (admin, user, guest)
   - When you don't care about lock ordering, just presence

3. Comparison with ValidLockXContext:
   - ValidLockXContext: Can acquire OR already has lock X
   - HasLockXContext: Must already have lock X
   - Use ValidLockX when function might acquire the lock
   - Use HasLockX when lock must be pre-acquired

4. Real-world Usage:
   - Database operations: HasLock3Context
   - File operations: HasLock5Context
   - Network operations: HasLock8Context
   - Admin operations: HasLock15Context

5. Type Safety:
   - TypeScript prevents calling functions without required locks
   - Compile-time errors with descriptive messages
   - No runtime overhead
`);

main().catch(console.error);
