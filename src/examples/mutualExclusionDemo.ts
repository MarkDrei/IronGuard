/**
 * Minimal Mutual Exclusion Demo
 * 
 * This example demonstrates runtime mutual exclusion with two threads.
 * One thread must wait for the other to release the lock before proceeding.
 */

import { createLockContext, LOCK_3 } from '../core';

async function demonstrateMutualExclusion(): Promise<void> {
  console.log('\n🔒 Mutual Exclusion Demo: Two Threads');
  console.log('======================================\n');

  const results: string[] = [];

  // Thread 1: Acquires lock first, holds it for 100ms
  const thread1 = (async () => {
    const startTime = Date.now();
    console.log(`Thread 1: Attempting to acquire LOCK_3...`);
    
    const ctx = await createLockContext().acquireWrite(LOCK_3);
    const acquiredTime = Date.now();
    
    results.push(`Thread 1: Acquired LOCK_3 at ${acquiredTime} (waited ${acquiredTime - startTime}ms)`);
    console.log(`Thread 1: ✅ Acquired LOCK_3, holding for 100ms...`);
    
    // Hold the lock for 100ms to demonstrate blocking
    await new Promise(resolve => setTimeout(resolve, 100));
    
    ctx.dispose();
    const releasedTime = Date.now();
    
    results.push(`Thread 1: Released LOCK_3 at ${releasedTime}`);
    console.log(`Thread 1: ✅ Released LOCK_3`);
  })();

  // Thread 2: Tries to acquire the same lock (will be blocked)
  const thread2 = (async () => {
    // Start slightly after thread 1 to ensure blocking scenario
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const startTime = Date.now();
    console.log(`Thread 2: Attempting to acquire LOCK_3...`);
    
    const ctx = await createLockContext().acquireWrite(LOCK_3);
    const acquiredTime = Date.now();
    
    results.push(`Thread 2: Acquired LOCK_3 at ${acquiredTime} (waited ${acquiredTime - startTime}ms)`);
    console.log(`Thread 2: ✅ Acquired LOCK_3 after waiting`);
    
    // Hold briefly then release
    await new Promise(resolve => setTimeout(resolve, 50));
    
    ctx.dispose();
    const releasedTime = Date.now();
    
    results.push(`Thread 2: Released LOCK_3 at ${releasedTime}`);
    console.log(`Thread 2: ✅ Released LOCK_3`);
  })();

  // Wait for both threads to complete
  await Promise.all([thread1, thread2]);

  // Show the timeline results
  console.log('\n📊 Timeline Results:');
  console.log('=====================');
  results.forEach(result => console.log(`  ${result}`));

  // Verify mutual exclusion occurred
  const thread1Acquired = results.find(r => r.includes('Thread 1: Acquired'))!;
  const thread1Released = results.find(r => r.includes('Thread 1: Released'))!;
  const thread2Acquired = results.find(r => r.includes('Thread 2: Acquired'))!;

  const t1AcquiredMatch = thread1Acquired.match(/at (\d+)/);
  const t1ReleasedMatch = thread1Released.match(/at (\d+)/);
  const t2AcquiredMatch = thread2Acquired.match(/at (\d+)/);

  if (t1AcquiredMatch && t1ReleasedMatch && t2AcquiredMatch) {
    const t1Acquired = parseInt(t1AcquiredMatch[1]!);
    const t1Released = parseInt(t1ReleasedMatch[1]!);
    const t2Acquired = parseInt(t2AcquiredMatch[1]!);

    console.log('\n✅ Verification:');
    if (t2Acquired >= t1Released) {
      console.log('   ✓ Thread 2 waited for Thread 1 to release the lock');
      console.log(`   ✓ Thread 1 held lock for ${t1Released - t1Acquired}ms`);
      console.log(`   ✓ Thread 2 waited ${t2Acquired - t1Acquired}ms total`);
      console.log('   ✓ Mutual exclusion working correctly!');
    } else {
      console.log('   ❌ Unexpected: Timeline suggests overlapping access');
    }
  } else {
    console.log('\n⚠️  Could not parse timeline for verification');
  }
}

// Export for use in other examples
export { demonstrateMutualExclusion };

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateMutualExclusion().catch(console.error);
}