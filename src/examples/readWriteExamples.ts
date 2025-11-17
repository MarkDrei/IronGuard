/**
 * IronGuard Read/Write Lock Examples
 * 
 * This file demonstrates the new read/write lock capabilities including:
 * - Concurrent read access patterns
 * - Writer preference behavior
 * - Mixed read/write lock ordering
 * - Real-world usage scenarios
 */

import { 
  createLockContext, 
  LOCK_1, 
  LOCK_2, 
  LOCK_3, 
  LOCK_4, 
  LOCK_5,
  type LockContext,
  type LockLevel
} from '../core';

// Example 1: Database-style read/write access pattern
async function databaseAccessDemo(): Promise<void> {
  console.log('\n=== Database Read/Write Access Demo ===');
  
  // Simulate multiple readers accessing data concurrently
  console.log('Starting multiple readers...');
  
  const reader1Promise = (async () => {
    const ctx = await createLockContext().acquireRead(LOCK_3);
    console.log(`  📖 Reader 1 acquired: ${ctx.toString()}`);
    
    // Simulate read operation
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log(`  📖 Reader 1 finished reading`);
    
    ctx.dispose();
  })();
  
  const reader2Promise = (async () => {
    const ctx = await createLockContext().acquireRead(LOCK_3);
    console.log(`  📖 Reader 2 acquired: ${ctx.toString()}`);
    
    // Simulate read operation
    await new Promise(resolve => setTimeout(resolve, 80));
    console.log(`  📖 Reader 2 finished reading`);
    
    ctx.dispose();
  })();
  
  // Wait a bit, then start a writer (should wait for readers)
  setTimeout(async () => {
    console.log('Starting writer (should wait for readers)...');
    const ctx = await createLockContext().acquireWrite(LOCK_3);
    console.log(`  ✏️  Writer acquired: ${ctx.toString()}`);
    
    // Simulate write operation
    await new Promise(resolve => setTimeout(resolve, 50));
    console.log(`  ✏️  Writer finished writing`);
    
    ctx.dispose();
    
    // Start new readers after writer finishes
    console.log('Starting new readers after writer...');
    const postReader = await createLockContext().acquireRead(LOCK_3);
    console.log(`  📖 Post-write reader acquired: ${postReader.toString()}`);
    postReader.dispose();
    
  }, 30);
  
  await Promise.all([reader1Promise, reader2Promise]);
}

// Example 2: Hierarchical locking with mixed read/write modes
async function hierarchicalMixedDemo(): Promise<void> {
  console.log('\n=== Hierarchical Mixed Read/Write Demo ===');
  
  // Start with read lock on low level
  const ctx1 = await createLockContext().acquireRead(LOCK_1);
  console.log(`Step 1 - Read lock acquired: ${ctx1.toString()}`);
  
  // Escalate to write lock on higher level (ordering preserved)
  const ctx2 = await ctx1.acquireWrite(LOCK_3);
  console.log(`Step 2 - Write lock added: ${ctx2.toString()}`);
  
  // Add another read lock on even higher level
  const ctx3 = await ctx2.acquireRead(LOCK_5);
  console.log(`Step 3 - Read lock added: ${ctx3.toString()}`);
  
  // Demonstrate releasing individual lock while preserving modes
  const without5 = ctx3.releaseLock(LOCK_5);
  console.log(`Step 4 - Released LOCK_5: ${without5.toString()}`);
  console.log(`  Lock modes: LOCK_1=${without5.getLockMode(LOCK_1)}, LOCK_3=${without5.getLockMode(LOCK_3)}`);
  
  without5.dispose();
}

// Example 3: Writer preference demonstration
async function writerPreferenceDemo(): Promise<void> {
  console.log('\n=== Writer Preference Demo ===');
  
  // Start initial reader
  const initialReader = await createLockContext().acquireRead(LOCK_2);
  console.log(`Initial reader acquired: ${initialReader.toString()}`);
  
  // Queue up a writer (establishes writer preference)
  const writerPromise = (async () => {
    console.log('Writer queued - establishing preference...');
    const ctx = await createLockContext().acquireWrite(LOCK_2);
    console.log(`  ✏️  Writer got lock: ${ctx.toString()}`);
    
    await new Promise(resolve => setTimeout(resolve, 30));
    console.log(`  ✏️  Writer releasing...`);
    ctx.dispose();
  })();
  
  // Small delay to ensure writer is queued
  await new Promise(resolve => setTimeout(resolve, 10));
  
  // Try to add more readers - should be blocked by writer preference
  const laterReadersPromise = (async () => {
    console.log('Later readers attempting to acquire (should wait for writer)...');
    const reader1 = await createLockContext().acquireRead(LOCK_2);
    const reader2 = await createLockContext().acquireRead(LOCK_2);
    
    console.log(`  📖 Later readers acquired: ${reader1.toString()}`);
    
    reader1.dispose();
    reader2.dispose();
  })();
  
  // Release initial reader after short delay
  setTimeout(() => {
    console.log('Initial reader releasing...');
    initialReader.dispose();
  }, 50);
  
  await Promise.all([writerPromise, laterReadersPromise]);
}

// Example 4: Function that accepts different lock contexts
async function flexibleFunction<THeld extends readonly LockLevel[]>(
  context: LockContext<THeld>,
  lockLevel: LockLevel
): Promise<void> {
  console.log(`Flexible function called with: ${context.toString()}`);
  
  // Check if we have the required lock (simplified for demo)
  const heldLocks = context.getHeldLocks();
  if (heldLocks.includes(lockLevel)) {
    console.log(`  Using existing lock on level ${lockLevel}`);
  } else {
    console.log(`  Lock ${lockLevel} not held - would need to acquire it`);
  }
}

async function flexibleFunctionDemo(): Promise<void> {
  console.log('\n=== Flexible Function Demo ===');
  
  // Call with read lock
  const readCtx = await createLockContext().acquireRead(LOCK_3);
  await flexibleFunction(readCtx, LOCK_3);  
  readCtx.dispose();
  
  // Call with write lock
  const writeCtx = await createLockContext().acquireWrite(LOCK_3);
  await flexibleFunction(writeCtx, LOCK_3);
  writeCtx.dispose();
  
  // Call with mixed locks
  const mixedCtx = await (await createLockContext().acquireRead(LOCK_1)).acquireWrite(LOCK_4);
  await flexibleFunction(mixedCtx, LOCK_1);
  await flexibleFunction(mixedCtx, LOCK_4);
  mixedCtx.dispose();
}

// Run all examples sequentially to avoid conflicts
async function runAllExamples(): Promise<void> {
  console.log('🔒 IronGuard Read/Write Lock Examples');
  console.log('=====================================');
  
  try {
    await databaseAccessDemo();
    await new Promise(resolve => setTimeout(resolve, 200));
    
    await hierarchicalMixedDemo();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await writerPreferenceDemo();
    await new Promise(resolve => setTimeout(resolve, 200));
    
    await flexibleFunctionDemo();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('\n✅ All read/write lock examples completed successfully!');
    
  } catch (error) {
    console.error('❌ Example failed:', error);
    throw error;
  }
}

export {
  databaseAccessDemo,
  hierarchicalMixedDemo,
  writerPreferenceDemo,
  flexibleFunctionDemo,
  runAllExamples
};