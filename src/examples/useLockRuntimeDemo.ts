import { createLockContext, LOCK_1, LOCK_3 } from '../core/ironGuardSystem';

export async function runUseLockRuntimeDemo(): Promise<void> {
  console.log('\n=== useLock() runtime safety demo ===');

  const base = await createLockContext().acquireWrite(LOCK_1);
  try {
    base.useLock(LOCK_1, () => {
      console.log('  ✓ base context used LOCK_1 successfully');
    });

    await base.useLockWithAcquire(LOCK_3, async (temporaryCtx) => {
        console.log('    → using LOCK_3 inside helper operation');
    });

    console.log('  ✓ useLockWithAcquire() released LOCK_3 automatically (base still holds [1])');

    // ❌ COMPILE-TIME ERROR: Uncommenting this would fail TypeScript compilation
    // Cannot acquire LOCK_1 again as it is already held
    // await base.useLockWithAcquire(LOCK_1, async (temporaryCtx) => {
    //     console.log('    → using LOCK_1 inside helper operation');
    // });

    const elevated = await base.acquireWrite(LOCK_3);
    try {
      elevated.useLock(LOCK_1, () => {
        console.log('  ✓ elevated context still sees LOCK_1 as held');
      });
      elevated.useLock(LOCK_3, () => {
        console.log('  ✓ elevated context used LOCK_3 successfully');
      });
    } finally {
      console.log('  Disposing elevated context (releases locks 1 & 3 at runtime)...');
      elevated.dispose();
    }

    console.log('  Attempting to use LOCK_1 on base context after child disposal...');
    try {
      base.useLock(LOCK_1, () => {
        console.log('    ❌ This should not print');
      });
    } catch (error) {
      console.log(`  ✓ Expected failure: ${(error as Error).message}`);
    }
  } finally {
    base.dispose();
  }
}
