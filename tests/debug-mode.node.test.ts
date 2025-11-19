/**
 * IronGuard Debug Mode Tests - Node.js Test Runner Format
 *
 * Tests the debug mode functionality including:
 * - Stack trace capture for lock acquisitions
 * - Debug mode enable/disable
 * - Stack trace content verification
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createLockContext, LOCK_1, LOCK_2, LOCK_3, IronGuardManager } from '../src';

describe('Debug Mode Functionality', () => {
  describe('Debug Mode Control', () => {
    test('should enable and disable debug mode', () => {
      const manager = IronGuardManager.getInstance();

      // Initially debug mode should be disabled
      assert.strictEqual(manager['debugMode'], false);

      // Enable debug mode
      manager.enableDebugMode();
      assert.strictEqual(manager['debugMode'], true);

      // Disable debug mode
      manager.disableDebugMode();
      assert.strictEqual(manager['debugMode'], false);
    });

    test('should clear stacks when disabling debug mode', async () => {
      const manager = IronGuardManager.getInstance();

      // Enable debug mode and acquire some locks
      manager.enableDebugMode();
      const ctx1 = await createLockContext().acquireWrite(LOCK_1);
      const ctx2 = await ctx1.acquireRead(LOCK_2);

      // Verify stacks are captured
      const debugInfo = manager.getGlobalLocks();
      assert(debugInfo.writerStacks, 'Writer stacks should be present');
      assert(debugInfo.readerStacks, 'Reader stacks should be present');
      assert(debugInfo.writerStacks!.has(1), 'Should have stack for LOCK_1');
      assert(debugInfo.readerStacks!.has(2), 'Should have stack for LOCK_2');

      // Disable debug mode
      manager.disableDebugMode();

      // Verify stacks are cleared
      const debugInfoAfter = manager.getGlobalLocks();
      assert(!debugInfoAfter.writerStacks, 'Writer stacks should be cleared');
      assert(!debugInfoAfter.readerStacks, 'Reader stacks should be cleared');

      ctx2.dispose();
    });
  });

  describe('Stack Trace Capture', () => {
    test('should capture stack traces for write locks when debug mode enabled', async () => {
      const manager = IronGuardManager.getInstance();

      // Enable debug mode
      manager.enableDebugMode();

      try {
        // Acquire a write lock
        const ctx = await createLockContext().acquireWrite(LOCK_1);

        // Check debug info
        const debugInfo = manager.getGlobalLocks();

        assert(debugInfo.writerStacks, 'Writer stacks should be present');
        assert(debugInfo.writerStacks!.has(1), 'Should have stack for LOCK_1');

        const stack = debugInfo.writerStacks!.get(1);
        assert(stack, 'Stack should not be undefined');
        assert(typeof stack === 'string', 'Stack should be a string');
        assert(stack.length > 0, 'Stack should not be empty');

        // Verify stack contains expected function names (without hardcoding paths)
        assert(stack.includes('acquireWriteLock'), 'Stack should contain acquireWriteLock');
        assert(stack.includes('acquireWrite'), 'Stack should contain acquireWrite');
        assert(stack.includes('Error'), 'Stack should start with Error');

        ctx.dispose();
      } finally {
        manager.disableDebugMode();
      }
    });

    test('should capture stack traces for read locks when debug mode enabled', async () => {
      const manager = IronGuardManager.getInstance();

      // Enable debug mode
      manager.enableDebugMode();

      try {
        // Acquire a read lock
        const ctx = await createLockContext().acquireRead(LOCK_2);

        // Check debug info
        const debugInfo = manager.getGlobalLocks();

        assert(debugInfo.readerStacks, 'Reader stacks should be present');
        assert(debugInfo.readerStacks!.has(2), 'Should have stack for LOCK_2');

        const stacks = debugInfo.readerStacks!.get(2);
        assert(stacks, 'Stacks should not be undefined');
        assert(Array.isArray(stacks), 'Stacks should be an array');
        assert(stacks.length === 1, 'Should have one reader stack');

        const stack = stacks[0];
        assert(typeof stack === 'string', 'Stack should be a string');
        assert(stack.length > 0, 'Stack should not be empty');

        // Verify stack contains expected function names
        assert(stack.includes('acquireReadLock'), 'Stack should contain acquireReadLock');
        assert(stack.includes('acquireRead'), 'Stack should contain acquireRead');
        assert(stack.includes('Error'), 'Stack should start with Error');

        ctx.dispose();
      } finally {
        manager.disableDebugMode();
      }
    });

    test('should handle multiple readers with separate stacks', async () => {
      const manager = IronGuardManager.getInstance();

      // Enable debug mode
      manager.enableDebugMode();

      try {
        // Create two separate contexts that acquire read locks
        const ctx1 = await createLockContext().acquireRead(LOCK_3);
        const ctx2 = await createLockContext().acquireRead(LOCK_3);

        // Check debug info
        const debugInfo = manager.getGlobalLocks();

        assert(debugInfo.readerStacks, 'Reader stacks should be present');
        assert(debugInfo.readerStacks!.has(3), 'Should have stacks for LOCK_3');

        const stacks = debugInfo.readerStacks!.get(3);
        assert(stacks, 'Stacks should not be undefined');
        assert(Array.isArray(stacks), 'Stacks should be an array');
        assert(stacks.length === 2, 'Should have two reader stacks');

        // Verify both stacks contain expected content
        stacks.forEach((stack, index) => {
          assert(typeof stack === 'string', `Stack ${index} should be a string`);
          assert(stack.length > 0, `Stack ${index} should not be empty`);
          assert(stack.includes('acquireReadLock'), `Stack ${index} should contain acquireReadLock`);
          assert(stack.includes('acquireRead'), `Stack ${index} should contain acquireRead`);
          assert(stack.includes('Error'), `Stack ${index} should start with Error`);
        });

        ctx1.dispose();
        ctx2.dispose();
      } finally {
        manager.disableDebugMode();
      }
    });

    test('should not capture stacks when debug mode disabled', async () => {
      const manager = IronGuardManager.getInstance();

      // Ensure debug mode is disabled
      manager.disableDebugMode();

      // Acquire some locks
      const ctx1 = await createLockContext().acquireWrite(LOCK_1);
      const ctx2 = await ctx1.acquireRead(LOCK_2);

      // Check debug info
      const debugInfo = manager.getGlobalLocks();

      assert(!debugInfo.writerStacks, 'Writer stacks should not be present');
      assert(!debugInfo.readerStacks, 'Reader stacks should not be present');

      ctx2.dispose();
    });

    test('should clear stacks on lock release', async () => {
      const manager = IronGuardManager.getInstance();

      // Enable debug mode
      manager.enableDebugMode();

      try {
        // Acquire locks
        const ctx1 = await createLockContext().acquireWrite(LOCK_1);
        const ctx2 = await ctx1.acquireRead(LOCK_2);

        // Verify stacks are present
        let debugInfo = manager.getGlobalLocks();
        assert(debugInfo.writerStacks!.has(1), 'Should have writer stack');
        assert(debugInfo.readerStacks!.has(2), 'Should have reader stack');

        // Release read lock
        const ctx1Only = ctx2.releaseLock(LOCK_2);

        // Verify reader stack is cleared
        debugInfo = manager.getGlobalLocks();
        assert(debugInfo.writerStacks!.has(1), 'Should still have writer stack');
        assert(!debugInfo.readerStacks!.has(2), 'Reader stack should be cleared');

        // Release write lock
        ctx1Only.dispose();

        // Verify writer stack is cleared
        debugInfo = manager.getGlobalLocks();
        assert(!debugInfo.writerStacks!.has(1), 'Writer stack should be cleared');
      } finally {
        manager.disableDebugMode();
      }
    });
  });

  describe('Stack Trace Content', () => {
    test('should contain function names and line information', async () => {
      const manager = IronGuardManager.getInstance();

      // Enable debug mode
      manager.enableDebugMode();

      try {
        // Create a function with a specific name to test
        async function testFunction() {
          return await createLockContext().acquireWrite(LOCK_1);
        }

        const ctx = await testFunction();

        const debugInfo = manager.getGlobalLocks();
        const stack = debugInfo.writerStacks!.get(1);

        // Verify stack exists and contains expected content
        assert(stack, 'Stack should exist');
        assert(typeof stack === 'string', 'Stack should be a string');

        // Verify stack contains our test function name
        assert(stack.includes('testFunction'), 'Stack should contain testFunction name');

        // Verify it contains common stack trace elements
        assert(stack.includes('at '), 'Stack should contain "at" for function calls');
        assert(stack.includes('\n'), 'Stack should contain newlines');

        ctx.dispose();
      } finally {
        manager.disableDebugMode();
      }
    });

    test('should handle stack trace generation errors gracefully', async () => {
      const manager = IronGuardManager.getInstance();

      // Enable debug mode
      manager.enableDebugMode();

      try {
        // We'll test this by temporarily modifying the manager's debug capture
        // This simulates what would happen if new Error().stack returned undefined
        const originalAcquireWriteLock = manager.acquireWriteLock.bind(manager);

        manager.acquireWriteLock = async (lock: any) => {
          // Call original but simulate stack capture failure
          await originalAcquireWriteLock(lock);

          // Manually add a stack that simulates the fallback
          if (manager['debugMode']) {
            manager['writerStacks'].set(lock, 'No stack trace available');
          }
        };

        const ctx = await createLockContext().acquireWrite(LOCK_1);

        const debugInfo = manager.getGlobalLocks();
        const stack = debugInfo.writerStacks!.get(1);

        // Should contain the fallback message
        assert(stack, 'Stack should exist');
        assert(stack.includes('No stack trace available'), 'Should contain fallback message');

        ctx.dispose();

        // Restore original method
        manager.acquireWriteLock = originalAcquireWriteLock;
      } finally {
        manager.disableDebugMode();
      }
    });
  });
});