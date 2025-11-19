import { createLockContext, LOCK_1, LOCK_2, IronGuardManager, LOCK_3 } from '../index';

// Enable debug mode to capture stack traces
IronGuardManager.getInstance().enableDebugMode();

async function demonstrateDebugInfo() {
  console.log('=== IronGuard Debug Mode Demo ===\n');

  // Acquire some locks
  const ctx1 = await createLockContext().acquireWrite(LOCK_1);
  console.log('After acquiring LOCK_1 (write):');
  console.log(IronGuardManager.getInstance().getGlobalLocks());
  console.log();

  const ctx2 = await ctx1.acquireRead(LOCK_2);
  console.log('After acquiring LOCK_2 (read):');
  console.log(IronGuardManager.getInstance().getGlobalLocks());
  console.log();

  const anotherCtx = await createLockContext().acquireWrite(LOCK_3);
  console.log('After acquiring LOCK_3 (write) on a separate context:');
  console.log(IronGuardManager.getInstance().getGlobalLocks());
  console.log();

  // Show stack traces
  const debugInfo = IronGuardManager.getInstance().getGlobalLocks();
  console.log('=== Stack Traces ===');
  if (debugInfo.writerStacks) {
    console.log('Writer stacks:');
    for (const [lock, stack] of debugInfo.writerStacks) {
      console.log(`LOCK_${lock}:`);
      console.log(stack.split('\n').slice(0, 5).join('\n')); // First 5 lines
      console.log('...');
    }
  }
  if (debugInfo.readerStacks) {
    console.log('Reader stacks:');
    for (const [lock, stacks] of debugInfo.readerStacks) {
      console.log(`LOCK_${lock} (${stacks.length} readers):`);
      stacks.forEach((stack, i) => {
        console.log(`Reader ${i + 1}:`);
        console.log(stack.split('\n').slice(0, 5).join('\n'));
        console.log('...');
      });
    }
  }

  ctx2.dispose();
  console.log('\nAfter disposal:');
  console.log(IronGuardManager.getInstance().getGlobalLocks());
}

export { demonstrateDebugInfo };