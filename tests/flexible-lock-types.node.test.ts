/**
 * Flexible Lock Context Types Tests - Node.js Test Runner Format
 * 
 * Tests the LocksAtMost{N} flexible lock context types including:
 * - Pre-defined types (LocksAtMost1-9)
 * - Lock skipping patterns
 * - Plugin system usage patterns
 * - Compile-time safety examples
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
  type LocksAtMost3,
  type LocksAtMost5
} from '../src/core';

describe('LocksAtMost3 Type', () => {
  test('should accept empty context', async () => {
    const ctx = createLockContext();
    
    const testFunc = async (context: LockContext<LocksAtMost3>) => {
      assert.strictEqual(context.getHeldLocks().length, 0);
    };
    
    await testFunc(ctx);
  });
  
  test('should accept single locks', async () => {
    // Test [1]
    const ctx1 = await createLockContext().acquireRead(LOCK_1);
    const testFunc1 = async (context: LockContext<LocksAtMost3>) => {
      const locks = context.getHeldLocks() as readonly number[];
      assert.deepStrictEqual(locks, [1]);
    };
    await testFunc1(ctx1);
    ctx1.dispose();
    
    // Test [2]
    const ctx2 = await createLockContext().acquireRead(LOCK_2);
    const testFunc2 = async (context: LockContext<LocksAtMost3>) => {
      const locks = context.getHeldLocks() as readonly number[];
      assert.deepStrictEqual(locks, [2]);
    };
    await testFunc2(ctx2);
    ctx2.dispose();
    
    // Test [3]
    const ctx3 = await createLockContext().acquireRead(LOCK_3);
    const testFunc3 = async (context: LockContext<LocksAtMost3>) => {
      const locks = context.getHeldLocks() as readonly number[];
      assert.deepStrictEqual(locks, [3]);
    };
    await testFunc3(ctx3);
    ctx3.dispose();
  });
  
  test('should accept skip pattern [1, 3]', async () => {
    const ctx0 = createLockContext();
    const ctx1 = await ctx0.acquireRead(LOCK_1);
    const ctx3 = await ctx1.acquireRead(LOCK_3);
    
    const testFunc = async (context: LockContext<LocksAtMost3>) => {
      const locks = context.getHeldLocks() as readonly number[];
      assert.deepStrictEqual(locks, [1, 3]);
    };
    
    await testFunc(ctx3);
    ctx3.dispose();
  });
  
  test('should accept skip pattern [2, 3]', async () => {
    const ctx0 = createLockContext();
    const ctx2 = await ctx0.acquireRead(LOCK_2);
    const ctx3 = await ctx2.acquireRead(LOCK_3);
    
    const testFunc = async (context: LockContext<LocksAtMost3>) => {
      const locks = context.getHeldLocks() as readonly number[];
      assert.deepStrictEqual(locks, [2, 3]);
    };
    
    await testFunc(ctx3);
    ctx3.dispose();
  });
  
  test('should accept contiguous patterns', async () => {
    const ctx0 = createLockContext();
    const ctx1 = await ctx0.acquireRead(LOCK_1);
    const ctx2 = await ctx1.acquireRead(LOCK_2);
    const ctx3 = await ctx2.acquireRead(LOCK_3);
    
    const testFunc = async (context: LockContext<LocksAtMost3>) => {
      const locks = context.getHeldLocks() as readonly number[];
      assert.deepStrictEqual(locks, [1, 2, 3]);
    };
    
    await testFunc(ctx3);
    ctx3.dispose();
  });
  
  test('should still prevent wrong ordering at compile-time', async () => {
    // ❌ These would fail TypeScript compilation if uncommented:
    // const ctx0 = createLockContext();
    // const ctx3 = await ctx0.acquireRead(LOCK_3);
    // const ctx1 = await ctx3.acquireRead(LOCK_1); // ❌ Compile error: wrong order
    // 
    // const testFunc = async (context: LockContext<LocksAtMost3>) => {
    //   // This would be [3, 1] which violates ordering
    // };
    // await testFunc(ctx1); // Would be compile error
    
    // ✅ Valid pattern for comparison:
    const ctx0 = createLockContext();
    const ctx1 = await ctx0.acquireRead(LOCK_1);
    const ctx3 = await ctx1.acquireRead(LOCK_3);
    
    const validFunc = async (context: LockContext<LocksAtMost3>) => {
      const locks = context.getHeldLocks() as readonly number[];
      assert.deepStrictEqual(locks, [1, 3]);
    };
    
    await validFunc(ctx3);
    ctx3.dispose();
  });
});

describe('LocksAtMost5 Usage Pattern', () => {
  test('should demonstrate complete usage pattern from documentation', async () => {
    // Function that accepts flexible context
    const processWithFlexibleContext = async (ctx: LockContext<LocksAtMost5>): Promise<string> => {
      const locks = ctx.getHeldLocks() as readonly number[];
      
      if (locks.includes(4) && locks.includes(5)) {
        return 'full-access';
      } else if (locks.length === 0) {
        return 'read-only';
      } else {
        return 'partial';
      }
    };
    
    // Empty context
    const result0 = await processWithFlexibleContext(createLockContext());
    assert.strictEqual(result0, 'read-only');
    
    // Context with [4, 5]
    const ctx0 = createLockContext();
    const ctx4 = await ctx0.acquireRead(LOCK_4);
    const ctx5 = await ctx4.acquireRead(LOCK_5);
    const resultFull = await processWithFlexibleContext(ctx5);
    assert.strictEqual(resultFull, 'full-access');
    
    // Partial context [4]
    const resultPartial = await processWithFlexibleContext(ctx4);
    assert.strictEqual(resultPartial, 'partial');
    
    ctx5.dispose();
  });
  
  test('should work with plugin hook pattern', async () => {
    const pluginHook = async (ctx: LockContext<LocksAtMost5>): Promise<string> => {
      const locks = ctx.getHeldLocks() as readonly number[];
      
      if (locks.length === 0) return 'read-only';
      if (locks.includes(1) && locks.includes(5)) return 'full-access';
      return 'partial-access';
    };
    
    // Read-only mode
    const result0 = await pluginHook(createLockContext());
    assert.strictEqual(result0, 'read-only');
    
    // Full access with skip pattern [1, 5]
    const ctx0 = createLockContext();
    const ctx1 = await ctx0.acquireRead(LOCK_1);
    const ctx5 = await ctx1.acquireRead(LOCK_5);
    const resultFull = await pluginHook(ctx5);
    assert.strictEqual(resultFull, 'full-access');
    ctx5.dispose();
    
    // Partial access [2, 3]
    const ctx0b = createLockContext();
    const ctx2 = await ctx0b.acquireRead(LOCK_2);
    const ctx3 = await ctx2.acquireRead(LOCK_3);
    const resultPartial = await pluginHook(ctx3);
    assert.strictEqual(resultPartial, 'partial-access');
    ctx3.dispose();
  });
});

describe('Lock Skipping Patterns', () => {
  test('should allow various skip patterns with LocksAtMost5', async () => {
    const getLocks = async (ctx: LockContext<LocksAtMost5>): Promise<string> => {
      const locks = ctx.getHeldLocks() as readonly number[];
      return locks.join(',');
    };
    
    // Skip pattern: [1, 5]
    const ctx0a = createLockContext();
    const ctx1a = await ctx0a.acquireRead(LOCK_1);
    const ctx5a = await ctx1a.acquireRead(LOCK_5);
    assert.strictEqual(await getLocks(ctx5a), '1,5');
    ctx5a.dispose();
    
    // Skip pattern: [2, 4]
    const ctx0b = createLockContext();
    const ctx2b = await ctx0b.acquireRead(LOCK_2);
    const ctx4b = await ctx2b.acquireRead(LOCK_4);
    assert.strictEqual(await getLocks(ctx4b), '2,4');
    ctx4b.dispose();
    
    // Skip pattern: [1, 3, 5]
    const ctx0c = createLockContext();
    const ctx1c = await ctx0c.acquireRead(LOCK_1);
    const ctx3c = await ctx1c.acquireRead(LOCK_3);
    const ctx5c = await ctx3c.acquireRead(LOCK_5);
    assert.strictEqual(await getLocks(ctx5c), '1,3,5');
    ctx5c.dispose();
  });
});

describe('Compile-Time Safety Examples', () => {
  test('should demonstrate what cannot be done at compile-time', async () => {
    // These demonstrate patterns that TypeScript prevents at compile-time
    
    // ❌ Cannot acquire locks within LocksAtMost range:
    // async function fn(ctx: LockContext<LocksAtMost5>) {
    //   const ctx3 = await ctx.acquireRead(LOCK_3); // ❌ Compile error
    //   // Reason: Lock 3 might already be held by caller
    // }
    
    // ❌ Cannot violate lock ordering:
    // const ctx0 = createLockContext();
    // const ctx3 = await ctx0.acquireRead(LOCK_3);
    // const ctx1 = await ctx3.acquireRead(LOCK_1); // ❌ Compile error
    // // Reason: Cannot acquire lock 1 after lock 3
    
    // ❌ Cannot acquire duplicate locks:
    // const ctx0 = createLockContext();
    // const ctx1 = await ctx0.acquireRead(LOCK_1);
    // const ctx1b = await ctx1.acquireRead(LOCK_1); // ❌ Compile error
    // // Reason: Lock 1 is already held
    
    // ✅ Valid patterns work correctly
    const ctx0 = createLockContext();
    const ctx1 = await ctx0.acquireRead(LOCK_1);
    const ctx3 = await ctx1.acquireRead(LOCK_3);
    
    const flexible = async (ctx: LockContext<LocksAtMost5>) => {
      return ctx.getHeldLocks();
    };
    
    const result = await flexible(ctx3);
    assert.deepStrictEqual(result, [1, 3]);
    
    ctx3.dispose();
  });
});

describe('Type Combinations', () => {
  test('should handle LocksAtMost with different levels', async () => {
    const func3 = async (ctx: LockContext<LocksAtMost3>) => {
      return ctx.getHeldLocks().length;
    };
    
    const func5 = async (ctx: LockContext<LocksAtMost5>) => {
      return ctx.getHeldLocks().length;
    };
    
    const ctx0 = createLockContext();
    assert.strictEqual(await func3(ctx0), 0);
    assert.strictEqual(await func5(ctx0), 0);
    
    const ctx1 = await ctx0.acquireRead(LOCK_1);
    assert.strictEqual(await func3(ctx1), 1);
    assert.strictEqual(await func5(ctx1), 1);
    
    const ctx2 = await ctx1.acquireRead(LOCK_2);
    assert.strictEqual(await func3(ctx2), 2);
    assert.strictEqual(await func5(ctx2), 2);
    
    const ctx3 = await ctx2.acquireRead(LOCK_3);
    assert.strictEqual(await func3(ctx3), 3);
    assert.strictEqual(await func5(ctx3), 3);
    
    const ctx4 = await ctx3.acquireRead(LOCK_4);
    assert.strictEqual(await func5(ctx4), 4);
    
    const ctx5 = await ctx4.acquireRead(LOCK_5);
    assert.strictEqual(await func5(ctx5), 5);
    
    ctx5.dispose();
  });
});
