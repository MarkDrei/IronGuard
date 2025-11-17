import { createLockContext, LOCK_1, LOCK_3, LOCK_5, LOCK_8 } from '../core';

export async function demonstrateFeatureCombinations(): Promise<void> {
  console.log('\n Feature Combinations Demo');
  console.log('=============================\n');
  
  const ctx = await createLockContext()
    .acquireWrite(LOCK_1)
    .then(c => c.acquireWrite(LOCK_3))
    .then(c => c.acquireWrite(LOCK_5))
    .then(c => c.acquireWrite(LOCK_8));
  
  console.log('Acquired locks 1, 3, 5, 8');
  
  const reduced = ctx.releaseLock(LOCK_5);
  console.log('Released LOCK_5, keeping 1, 3, 8');
  
  reduced.dispose();
  console.log('Released all remaining locks\n');
}

if (require.main === module) {
  demonstrateFeatureCombinations().catch(console.error);
}
