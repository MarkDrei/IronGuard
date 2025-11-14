/**
 * Example: Acquiring Additional Locks with NullableLocksAtMost
 * 
 * Demonstrates how to acquire additional locks when using NullableLocksAtMost
 * types (for lock levels 10-15). Uses runtime validation and casting.
 */

import {
  createLockContext,
  LOCK_10,
  LOCK_12,
  LOCK_15,
  type LockContext,
  type LockLevel,
  type NullableLocksAtMost12
} from '../core';

/**
 * Process data and acquire additional lock if safe.
 */
async function processWithAdditionalLock<THeld extends readonly LockLevel[]>(
  ctx: NullableLocksAtMost12<THeld>
): Promise<void> {
  if (ctx !== null) {
    const maxLock = ctx.getMaxHeldLock();
    
    console.log(`Processing with locks: [${ctx.getHeldLocks()}]`);
    
    // Runtime check before acquiring additional lock
    if (maxLock <= 12) {
      // Cast through unknown to bypass compile-time checks
      // Safe because: maxLock ≤ 12 and LOCK_15 > 12 (maintains ordering)
      const safeCtx = ctx as unknown as LockContext<readonly [12]>;
      
      // ❌ Cannot take locks <= 12 directly here
      //   const invalid = await safeCtx.acquireRead(LOCK_10);
      //   const invalid2 = await safeCtx.acquireRead(LOCK_12);

      const ctxWithLock15 = await safeCtx.acquireRead(LOCK_15);
      
      console.log(`✅ Acquired LOCK_15: [${ctxWithLock15.getHeldLocks()}]`);
      
      // Do work with additional lock
      ctxWithLock15.useLock(LOCK_15, () => {
        console.log('   Performing operation with LOCK_15');
      });
      
      ctxWithLock15.dispose();
    }
  }
}

async function main() {
  console.log('NullableLocksAtMost: Acquiring Additional Locks\n');
  
  // Example 1: Start with LOCK_10, acquire LOCK_15
  const ctx10 = await createLockContext().acquireWrite(LOCK_10);
  await processWithAdditionalLock(ctx10);
  ctx10.dispose();
  
  console.log();
  
  // Example 2: Start with LOCK_12, acquire LOCK_15
  const ctx12 = await createLockContext().acquireWrite(LOCK_12);
  await processWithAdditionalLock(ctx12);
  ctx12.dispose();
  
  // ❌ Compile-time safety examples (uncommenting these will cause TypeScript errors):
  
  // Error: Context with LOCK_15 exceeds NullableLocksAtMost12 threshold
  // const ctx15 = await createLockContext().acquireWrite(LOCK_15);
  // await processWithAdditionalLock(ctx15);
  
  console.log('\n✅ Complete');
}

main().catch(console.error);
