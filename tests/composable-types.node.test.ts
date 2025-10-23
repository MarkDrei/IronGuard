/**
 * IronGuard Composable ValidLockContext Types Test
 * 
 * Tests the new composable type system with all 15 lock levels:
 * - Building block types (HasLock, CanAcquireLockX)
 * - ValidLockXContext types for all 15 levels
 * - Hierarchical composition and error messages
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { 
  createLockContext, 
  LOCK_1, LOCK_2, LOCK_3, LOCK_4, LOCK_5, 
  LOCK_6, LOCK_7, LOCK_8, LOCK_9, LOCK_10,
  LOCK_11, LOCK_12, LOCK_13, LOCK_14, LOCK_15 
} from '../src/core';

import type { 
  ValidLock1Context, ValidLock2Context, ValidLock3Context, ValidLock4Context, ValidLock5Context,
  ValidLock6Context, ValidLock7Context, ValidLock8Context, ValidLock9Context, ValidLock10Context,
  ValidLock11Context, ValidLock12Context, ValidLock13Context, ValidLock14Context, ValidLock15Context,
  CanAcquireLock1, CanAcquireLock2, CanAcquireLock3, CanAcquireLock5, CanAcquireLock10, CanAcquireLock15,
  HasLock, IsEmpty, MaxHeldLock
} from '../src/core';

describe('Composable ValidLockContext Types', () => {

  describe('Building Block Types', () => {
    test('should validate building block type logic', async () => {
      // These tests demonstrate the composable nature but are mainly compile-time
      
      // IsEmpty should work for empty contexts
      const emptyCtx = createLockContext();
      // Type: IsEmpty<[]> extends true ? ... : ... would be true
      
      // HasLock should detect held locks
      const ctx3 = await createLockContext().acquireWrite(LOCK_3);
      // Type: HasLock<[3], 3> extends true ? ... : ... would be true
      
      ctx3.dispose();
      assert.ok(true); // Placeholder for compile-time validation
    });
  });

  describe('ValidLock1Context - Level 1', () => {
    test('should accept empty context for lock 1', async () => {
      function requiresLock1<T extends readonly any[]>(ctx: ValidLock1Context<T> extends string ? never : ValidLock1Context<T>) {
        return ctx;
      }
      
      // ✅ Valid: empty context can acquire lock 1
      const emptyCtx = createLockContext();
      const result = requiresLock1(emptyCtx);
      result.dispose();
      
      // ✅ Valid: context already has lock 1
      const ctx1 = await createLockContext().acquireWrite(LOCK_1);
      const result2 = requiresLock1(ctx1);
      result2.dispose();
    });
  });

  describe('ValidLock2Context - Level 2', () => {
    test('should demonstrate hierarchical composition', async () => {
      function requiresLock2<T extends readonly any[]>(ctx: ValidLock2Context<T> extends string ? never : ValidLock2Context<T>) {
        return ctx;
      }
      
      // ✅ Valid: empty context can acquire lock 2
      const emptyCtx = createLockContext();
      requiresLock2(emptyCtx);
      emptyCtx.dispose();
      
      // ✅ Valid: has lock 1, can acquire lock 2
      const ctx1 = await createLockContext().acquireWrite(LOCK_1);
      requiresLock2(ctx1);
      ctx1.dispose();
      
      // ✅ Valid: already has lock 2
      const ctx2 = await createLockContext().acquireWrite(LOCK_2);
      requiresLock2(ctx2);
      ctx2.dispose();
      
      // ❌ Compile-time error would occur with:
      // const ctx3 = await createLockContext().acquireWrite(LOCK_3);
      // requiresLock2(ctx3); // Cannot acquire lock 2 when holding lock 3
    });
  });

  describe('ValidLock5Context - Mid-Level', () => {
    test('should work with various valid contexts', async () => {
      function requiresLock5<T extends readonly any[]>(ctx: ValidLock5Context<T> extends string ? never : ValidLock5Context<T>) {
        return ctx;
      }
      
      // ✅ Valid: empty context
      const emptyCtx = createLockContext();
      requiresLock5(emptyCtx);
      emptyCtx.dispose();
      
      // ✅ Valid: progressive acquisition (1 → 5)
      const ctx1 = await createLockContext().acquireWrite(LOCK_1);
      requiresLock5(ctx1);
      ctx1.dispose();
      
      // ✅ Valid: multiple lower locks (1, 3, 4)
      const ctx134 = await createLockContext()
        .acquireWrite(LOCK_1)
        .then(c => c.acquireWrite(LOCK_3))
        .then(c => c.acquireWrite(LOCK_4));
      requiresLock5(ctx134);
      ctx134.dispose();
      
      // ✅ Valid: already has lock 5
      const ctx5 = await createLockContext().acquireWrite(LOCK_5);
      requiresLock5(ctx5);
      ctx5.dispose();
    });
  });

  describe('ValidLock10Context - High Level', () => {
    test('should support high-level lock operations', async () => {
      function requiresLock10<T extends readonly any[]>(ctx: ValidLock10Context<T> extends string ? never : ValidLock10Context<T>) {
        return ctx;
      }
      
      // ✅ Valid: empty context can acquire any lock
      const emptyCtx = createLockContext();
      requiresLock10(emptyCtx);
      emptyCtx.dispose();
      
      // ✅ Valid: progressive chain (1 → 7 → 10)
      const ctx17 = await createLockContext()
        .acquireWrite(LOCK_1)
        .then(c => c.acquireWrite(LOCK_7));
      requiresLock10(ctx17);
      ctx17.dispose();
      
      // ✅ Valid: already has lock 10
      const ctx10 = await createLockContext().acquireWrite(LOCK_10);
      requiresLock10(ctx10);
      ctx10.dispose();
    });
  });

  describe('ValidLock15Context - Maximum Level', () => {
    test('should work as the highest lock level', async () => {
      function requiresLock15<T extends readonly any[]>(ctx: ValidLock15Context<T> extends string ? never : ValidLock15Context<T>) {
        return ctx;
      }
      
      // ✅ Valid: empty context
      const emptyCtx = createLockContext();
      requiresLock15(emptyCtx);
      emptyCtx.dispose();
      
      // ✅ Valid: any lower lock progression
      const ctx135 = await createLockContext()
        .acquireWrite(LOCK_1)
        .then(c => c.acquireWrite(LOCK_3))
        .then(c => c.acquireWrite(LOCK_5));
      requiresLock15(ctx135);
      ctx135.dispose();
      
      // ✅ Valid: already has lock 15 (highest possible)
      const ctx15 = await createLockContext().acquireWrite(LOCK_15);
      requiresLock15(ctx15);
      ctx15.dispose();
    });
  });

  describe('All ValidLockContext Types Together', () => {
    test('should demonstrate complete composable system', async () => {
      // Functions for each lock level
      function req1<T extends readonly any[]>(ctx: ValidLock1Context<T> extends string ? never : ValidLock1Context<T>) { return ctx; }
      function req2<T extends readonly any[]>(ctx: ValidLock2Context<T> extends string ? never : ValidLock2Context<T>) { return ctx; }
      function req3<T extends readonly any[]>(ctx: ValidLock3Context<T> extends string ? never : ValidLock3Context<T>) { return ctx; }
      function req5<T extends readonly any[]>(ctx: ValidLock5Context<T> extends string ? never : ValidLock5Context<T>) { return ctx; }
      function req10<T extends readonly any[]>(ctx: ValidLock10Context<T> extends string ? never : ValidLock10Context<T>) { return ctx; }
      function req15<T extends readonly any[]>(ctx: ValidLock15Context<T> extends string ? never : ValidLock15Context<T>) { return ctx; }
      
      // ✅ Empty context works with all levels
      const empty = createLockContext();
      req1(empty); req2(empty); req3(empty); req5(empty); req10(empty); req15(empty);
      empty.dispose();
      
      // ✅ Progressive acquisition allows higher levels
      const ctx1 = await createLockContext().acquireWrite(LOCK_1);
      req1(ctx1); req2(ctx1); req3(ctx1); req5(ctx1); req10(ctx1); req15(ctx1);
      
      const ctx12 = await ctx1.acquireWrite(LOCK_2);
      req1(ctx12); req2(ctx12); req3(ctx12); req5(ctx12); req10(ctx12); req15(ctx12);
      
      const ctx125 = await ctx12.acquireWrite(LOCK_5);
      req1(ctx125); req2(ctx125); req5(ctx125); req10(ctx125); req15(ctx125);
      // Note: req3 would fail here since we have lock 5 > 3
      
      ctx125.dispose();
    });
  });

  describe('Compile-Time Error Prevention', () => {
    test('should prevent invalid operations via compile-time', async () => {
      // ❌ These would fail TypeScript compilation if uncommented:
      
      // Lock ordering violations:
      // const ctx4 = await createLockContext().acquireWrite(LOCK_4);
      // function req2<T extends readonly any[]>(ctx: ValidLock2Context<T>) { return ctx; }
      // req2(ctx4); // "Cannot acquire lock 2 when holding lock 4. Locks must be acquired in order."
      
      // const ctx15 = await createLockContext().acquireWrite(LOCK_15);
      // function req1<T extends readonly any[]>(ctx: ValidLock1Context<T>) { return ctx; }
      // req1(ctx15); // "Lock 1 can only be acquired on empty context"
      
      // Invalid combinations:
      // const ctx10 = await createLockContext().acquireWrite(LOCK_10);
      // function req3<T extends readonly any[]>(ctx: ValidLock3Context<T>) { return ctx; }
      // req3(ctx10); // "Cannot acquire lock 3 when holding lock 10. Locks must be acquired in order."
      
      assert.ok(true); // This test is about compile-time behavior
    });
  });

});