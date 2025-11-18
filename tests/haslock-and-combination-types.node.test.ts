/**
 * HasLock and Combination Types Tests - Node.js Test Runner Format
 * 
 * Tests the HasLockX and LocksAtMostAndHasX types including:
 * - HasLockX context validation
 * - LocksAtMostAndHasX flexible contexts with required locks
 * - Type combinations and practical usage patterns
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  createLockContext,
  type LockContext,
  LOCK_1,
  LOCK_2,
  LOCK_3,
  LOCK_4,
  LOCK_5,
  LOCK_6,
  LOCK_7,
  LOCK_8,
  type HasLock3Context,
  type HasLock6Context,
  type HasLock8Context,
  type LocksAtMostAndHas3,
  type LocksAtMostAndHas6,
  type LocksAtMostAndHas8,
  type IronLocks
} from '../src';

describe('HasLockX Context Types', () => {
  test('should accept context with required lock - HasLock3Context', async () => {
    const processWithLock3 = <THeld extends IronLocks>(ctx: HasLock3Context<THeld>): number => {
      assert.strictEqual(ctx.hasLock(LOCK_3), true);
      return ctx.getHeldLocks().length;
    };
    
    // Context with just LOCK_3
    const ctx0 = createLockContext();
    const ctx3 = await ctx0.acquireRead(LOCK_3);
    assert.strictEqual(processWithLock3(ctx3), 1);
    ctx3.dispose();
    
    // Context with LOCK_1 and LOCK_3
    const ctx0b = createLockContext();
    const ctx1 = await ctx0b.acquireRead(LOCK_1);
    const ctx3b = await ctx1.acquireRead(LOCK_3);
    assert.strictEqual(processWithLock3(ctx3b), 2);
    ctx3b.dispose();
    
    // Context with LOCK_1, LOCK_3, and LOCK_5
    const ctx0c = createLockContext();
    const ctx1c = await ctx0c.acquireRead(LOCK_1);
    const ctx3c = await ctx1c.acquireRead(LOCK_3);
    const ctx5c = await ctx3c.acquireRead(LOCK_5);
    assert.strictEqual(processWithLock3(ctx5c), 3);
    ctx5c.dispose();
  });
  
  test('should reject context without required lock at compile-time', async () => {
    // ❌ These would fail TypeScript compilation:
    // const processWithLock6 = <THeld extends IronLocks>(ctx: HasLock6Context<THeld>) => {
    //   return ctx.getHeldLocks();
    // };
    // 
    // const ctx0 = createLockContext();
    // const ctx3 = await ctx0.acquireRead(LOCK_3);
    // processWithLock6(ctx3); // ❌ Compile error - LOCK_6 not held
    
    // ✅ Valid usage for comparison
    const processWithLock6 = <THeld extends IronLocks>(ctx: HasLock6Context<THeld>): boolean => {
      return ctx.hasLock(LOCK_6);
    };
    
    const ctx0 = createLockContext();
    const ctx6 = await ctx0.acquireRead(LOCK_6);
    assert.strictEqual(processWithLock6(ctx6), true);
    ctx6.dispose();
  });
  
  test('should work with high lock levels - HasLock8Context', async () => {
    const checkLock8 = <THeld extends IronLocks>(ctx: HasLock8Context<THeld>): string => {
      const locks = ctx.getHeldLocks() as readonly number[];
      return `has-lock-8-with-${locks.length}-total`;
    };
    
    // Just LOCK_8
    const ctx0 = createLockContext();
    const ctx8 = await ctx0.acquireRead(LOCK_8);
    assert.strictEqual(checkLock8(ctx8), 'has-lock-8-with-1-total');
    ctx8.dispose();
    
    // LOCK_3, LOCK_8
    const ctx0b = createLockContext();
    const ctx3 = await ctx0b.acquireRead(LOCK_3);
    const ctx8b = await ctx3.acquireRead(LOCK_8);
    assert.strictEqual(checkLock8(ctx8b), 'has-lock-8-with-2-total');
    ctx8b.dispose();
  });
});

describe('LocksAtMostAndHas3 Type', () => {
  test('should accept context with only required lock', async () => {
    const process = (ctx: LockContext<LocksAtMostAndHas3>): readonly number[] => {
      return ctx.getHeldLocks();
    };
    
    const ctx0 = createLockContext();
    const ctx3 = await ctx0.acquireRead(LOCK_3);
    assert.deepStrictEqual(process(ctx3), [3]);
    ctx3.dispose();
  });
  
  test('should accept context with lock combinations below required', async () => {
    const process = (ctx: LockContext<LocksAtMostAndHas3>): readonly number[] => {
      return ctx.getHeldLocks();
    };
    
    // [1, 3]
    const ctx0a = createLockContext();
    const ctx1a = await ctx0a.acquireRead(LOCK_1);
    const ctx3a = await ctx1a.acquireRead(LOCK_3);
    assert.deepStrictEqual(process(ctx3a), [1, 3]);
    ctx3a.dispose();
    
    // [2, 3]
    const ctx0b = createLockContext();
    const ctx2b = await ctx0b.acquireRead(LOCK_2);
    const ctx3b = await ctx2b.acquireRead(LOCK_3);
    assert.deepStrictEqual(process(ctx3b), [2, 3]);
    ctx3b.dispose();
    
    // [1, 2, 3]
    const ctx0c = createLockContext();
    const ctx1c = await ctx0c.acquireRead(LOCK_1);
    const ctx2c = await ctx1c.acquireRead(LOCK_2);
    const ctx3c = await ctx2c.acquireRead(LOCK_3);
    assert.deepStrictEqual(process(ctx3c), [1, 2, 3]);
    ctx3c.dispose();
  });
  
  test('should reject context without required lock at compile-time', async () => {
    // ❌ These would fail TypeScript compilation:
    // const process = (ctx: LockContext<LocksAtMostAndHas3>) => {
    //   return ctx.getHeldLocks();
    // };
    // 
    // const ctx0 = createLockContext();
    // const ctx2 = await ctx0.acquireRead(LOCK_2);
    // process(ctx2); // ❌ Compile error - LOCK_3 not held
    // 
    // const ctx1 = await ctx0.acquireRead(LOCK_1);
    // process(ctx1); // ❌ Compile error - LOCK_3 not held
    
    // ✅ Valid usage
    const process = (ctx: LockContext<LocksAtMostAndHas3>): number => {
      return ctx.getHeldLocks().length;
    };
    
    const ctx0 = createLockContext();
    const ctx3 = await ctx0.acquireRead(LOCK_3);
    assert.strictEqual(process(ctx3), 1);
    ctx3.dispose();
  });
  
  test('should allow acquiring higher locks', async () => {
    const process = async (ctx: LockContext<LocksAtMostAndHas3>): Promise<readonly number[]> => {
      // Can acquire locks higher than 3
      const ctx5 = await ctx.acquireRead(LOCK_5);
      const locks = ctx5.getHeldLocks();
      ctx5.dispose();
      return locks;
    };
    
    const ctx0 = createLockContext();
    const ctx1 = await ctx0.acquireRead(LOCK_1);
    const ctx3 = await ctx1.acquireRead(LOCK_3);
    const result = await process(ctx3);
    assert.deepStrictEqual(result, [1, 3, 5]);
  });
});

describe('LocksAtMostAndHas6 Type', () => {
  test('should guarantee LOCK_6 is held while accepting flexible lower locks', async () => {
    const processData = async (ctx: LockContext<LocksAtMostAndHas6>): Promise<string> => {
      // TypeScript guarantees LOCK_6 is held
      assert.strictEqual(ctx.hasLock(LOCK_6), true);
      
      const locks = ctx.getHeldLocks() as readonly number[];
      
      // LOCK_6 is guaranteed to be held
      const result = 'processed-with-lock-6';
      
      return `${result}-total-${locks.length}`;
    };
    
    // Just LOCK_6
    const ctx0a = createLockContext();
    const ctx6a = await ctx0a.acquireRead(LOCK_6);
    assert.strictEqual(await processData(ctx6a), 'processed-with-lock-6-total-1');
    ctx6a.dispose();
    
    // LOCK_2, LOCK_6
    const ctx0b = createLockContext();
    const ctx2 = await ctx0b.acquireRead(LOCK_2);
    const ctx6b = await ctx2.acquireRead(LOCK_6);
    assert.strictEqual(await processData(ctx6b), 'processed-with-lock-6-total-2');
    ctx6b.dispose();
    
    // LOCK_1, LOCK_3, LOCK_5, LOCK_6
    const ctx0c = createLockContext();
    const ctx1 = await ctx0c.acquireRead(LOCK_1);
    const ctx3 = await ctx1.acquireRead(LOCK_3);
    const ctx5 = await ctx3.acquireRead(LOCK_5);
    const ctx6c = await ctx5.acquireRead(LOCK_6);
    assert.strictEqual(await processData(ctx6c), 'processed-with-lock-6-total-4');
    ctx6c.dispose();
  });
  
  test('should enable single-parameter function signatures', async () => {
    // Instead of needing: <THeld>(check: HasLock6Context<THeld>, ops: LocksAtMost6)
    // Can use: (ctx: LockContext<LocksAtMostAndHas6>)
    
    const singleParamFunction = async (ctx: LockContext<LocksAtMostAndHas6>): Promise<void> => {
      // Check that lock is held
      if (ctx.hasLock(LOCK_6)) {
        // Perform operations with lock
        await ctx.useLockWithAcquire(LOCK_8, async (ctx8) => {
          assert.strictEqual(ctx8.hasLock(LOCK_6), true);
          assert.strictEqual(ctx8.hasLock(LOCK_8), true);
        });
      }
    };
    
    const ctx0 = createLockContext();
    const ctx6 = await ctx0.acquireRead(LOCK_6);
    await singleParamFunction(ctx6);
    ctx6.dispose();
  });
});

describe('LocksAtMostAndHas8 Type', () => {
  test('should work with higher lock levels', async () => {
    const highLevelProcess = (ctx: LockContext<LocksAtMostAndHas8>): number => {
      assert.strictEqual(ctx.hasLock(LOCK_8), true);
      return ctx.getMaxHeldLock();
    };
    
    // Just LOCK_8
    const ctx0 = createLockContext();
    const ctx8 = await ctx0.acquireRead(LOCK_8);
    assert.strictEqual(highLevelProcess(ctx8), 8);
    ctx8.dispose();
    
    // LOCK_3, LOCK_6, LOCK_8
    const ctx0b = createLockContext();
    const ctx3 = await ctx0b.acquireRead(LOCK_3);
    const ctx6 = await ctx3.acquireRead(LOCK_6);
    const ctx8b = await ctx6.acquireRead(LOCK_8);
    assert.strictEqual(highLevelProcess(ctx8b), 8);
    ctx8b.dispose();
  });
});

describe('Practical Usage Patterns', () => {
  test('should support plugin hook pattern with required lock', async () => {
    // Plugin that requires LOCK_3 but is flexible about other locks
    const pluginHook = (ctx: LockContext<LocksAtMostAndHas3>): string => {
      const locks = ctx.getHeldLocks() as readonly number[];
      
      if (locks.includes(1) && locks.includes(2)) {
        return 'full-access';
      } else if (locks.length === 1) {
        return 'minimal-access';
      } else {
        return 'partial-access';
      }
    };
    
    // Minimal access [3]
    const ctx0a = createLockContext();
    const ctx3a = await ctx0a.acquireRead(LOCK_3);
    assert.strictEqual(pluginHook(ctx3a), 'minimal-access');
    ctx3a.dispose();
    
    // Full access [1, 2, 3]
    const ctx0b = createLockContext();
    const ctx1 = await ctx0b.acquireRead(LOCK_1);
    const ctx2 = await ctx1.acquireRead(LOCK_2);
    const ctx3b = await ctx2.acquireRead(LOCK_3);
    assert.strictEqual(pluginHook(ctx3b), 'full-access');
    ctx3b.dispose();
    
    // Partial access [1, 3]
    const ctx0c = createLockContext();
    const ctx1c = await ctx0c.acquireRead(LOCK_1);
    const ctx3c = await ctx1c.acquireRead(LOCK_3);
    assert.strictEqual(pluginHook(ctx3c), 'partial-access');
    ctx3c.dispose();
  });
  
  test('should support resource access patterns', async () => {
    // Function that needs LOCK_6 to access a resource,
    // but accepts various calling contexts
    const accessResource = async (ctx: LockContext<LocksAtMostAndHas6>): Promise<string> => {
      const locks = ctx.getHeldLocks() as readonly number[];
      
      // LOCK_6 is guaranteed to be held by type system
      const accessType = locks.length > 2 ? 'privileged' : 'standard';
      
      return `resource-accessed-${accessType}`;
    };
    
    // Standard access
    const ctx0a = createLockContext();
    const ctx6a = await ctx0a.acquireRead(LOCK_6);
    assert.strictEqual(await accessResource(ctx6a), 'resource-accessed-standard');
    ctx6a.dispose();
    
    // Privileged access
    const ctx0b = createLockContext();
    const ctx2 = await ctx0b.acquireRead(LOCK_2);
    const ctx4 = await ctx2.acquireRead(LOCK_4);
    const ctx6b = await ctx4.acquireRead(LOCK_6);
    assert.strictEqual(await accessResource(ctx6b), 'resource-accessed-privileged');
    ctx6b.dispose();
  });
  
  test('should combine with lock acquisition', async () => {
    const chainedOperation = async (ctx: LockContext<LocksAtMostAndHas3>): Promise<number> => {
      // Can acquire higher locks
      const ctx5 = await ctx.acquireRead(LOCK_5);
      const ctx7 = await ctx5.acquireRead(LOCK_7);
      
      const max = ctx7.getMaxHeldLock();
      ctx7.dispose();
      
      return max;
    };
    
    const ctx0 = createLockContext();
    const ctx1 = await ctx0.acquireRead(LOCK_1);
    const ctx3 = await ctx1.acquireRead(LOCK_3);
    
    const result = await chainedOperation(ctx3);
    assert.strictEqual(result, 7);
  });
});

describe('Compile-Time Safety', () => {
  test('should demonstrate compile-time guarantees', async () => {
    // ❌ Cannot pass context without required lock:
    // const requiresLock6 = (ctx: LockContext<LocksAtMostAndHas6>) => {
    //   return ctx.getHeldLocks();
    // };
    // 
    // const ctx0 = createLockContext();
    // const ctx3 = await ctx0.acquireRead(LOCK_3);
    // requiresLock6(ctx3); // ❌ Compile error - LOCK_6 not held
    
    // ❌ Cannot pass context with higher lock as max:
    // const ctx0 = createLockContext();
    // const ctx7 = await ctx0.acquireRead(LOCK_7);
    // const ctx8 = await ctx7.acquireRead(LOCK_8);
    // const requiresLock6 = (ctx: LockContext<LocksAtMostAndHas6>) => {};
    // requiresLock6(ctx8); // ❌ Compile error - has LOCK_8 > LOCK_6
    
    // ✅ Valid usage patterns
    const requiresLock3 = (ctx: LockContext<LocksAtMostAndHas3>): boolean => {
      return ctx.hasLock(LOCK_3);
    };
    
    const ctx0 = createLockContext();
    const ctx1 = await ctx0.acquireRead(LOCK_1);
    const ctx3 = await ctx1.acquireRead(LOCK_3);
    
    assert.strictEqual(requiresLock3(ctx3), true);
    
    ctx3.dispose();
  });
});
