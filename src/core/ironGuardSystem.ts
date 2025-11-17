/**
 * IronGuard: Unbreakable Runtime + Compile-Time Lock Protection System
 *
 * Features:
 * - Runtime mutual exclusion (only one thread can hold each lock)
 * - Compile-time lock ordering validation (prevents deadlocks)
 * - Flexible acquisition patterns (skip locks: 1→3, 1→5)
 * - Type-safe function composition with lock constraints
 * - Configurable lock levels (easily change from 5 to any number)
 */

import type { MaxHeldLock, IronLocks } from './ironGuardTypes';

// =============================================================================
// CONFIGURATION SECTION - Easily configurable lock system
// =============================================================================

/**
 * IronGuard supports up to 15 lock levels.
 * Users can simply use fewer locks (1-5, 1-7, etc.) if they don't need all 15.
 * No configuration needed - just use the locks you need!
 */
type SUPPORTED_LOCK_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

// =============================================================================
// GENERIC TYPE SYSTEM - Automatically works with any configuration above
// =============================================================================

// Core type definition - automatically derived from configuration
type LockLevel = SUPPORTED_LOCK_LEVELS[number];

// Maximum lock level (derived from configuration) - currently unused but available for future features
type _MAX_LOCK_LEVEL = SUPPORTED_LOCK_LEVELS extends readonly [...infer _Rest, infer _Last extends number]
  ? _Last
  : never;

// Lock constants - all 15 locks available
const LOCK_1 = 1 as const;
const LOCK_2 = 2 as const;
const LOCK_3 = 3 as const;
const LOCK_4 = 4 as const;
const LOCK_5 = 5 as const;
const LOCK_6 = 6 as const;
const LOCK_7 = 7 as const;
const LOCK_8 = 8 as const;
const LOCK_9 = 9 as const;
const LOCK_10 = 10 as const;
const LOCK_11 = 11 as const;
const LOCK_12 = 12 as const;
const LOCK_13 = 13 as const;
const LOCK_14 = 14 as const;
const LOCK_15 = 15 as const;

// Read/Write lock mode type
type LockMode = 'read' | 'write';

// Global lock manager for runtime read/write lock management with writer preference
// Automatically supports any configured lock levels
class IronGuardManager {
  private static instance: IronGuardManager;
  private readerCounts = new Map<LockLevel, number>();
  private activeWriters = new Set<LockLevel>();
  private pendingWriters = new Map<LockLevel, Array<() => void>>();
  private pendingReaders = new Map<LockLevel, Array<() => void>>();

  static getInstance(): IronGuardManager {
    if (!IronGuardManager.instance) {
      IronGuardManager.instance = new IronGuardManager();
    }
    return IronGuardManager.instance;
  }

  // Acquire a read lock - allows concurrent readers unless writer is waiting/active
  async acquireReadLock(lock: LockLevel): Promise<void> {
    // If writer active or pending, wait in reader queue
    while (this.activeWriters.has(lock) || this.hasPendingWriters(lock)) {
      await this.waitInReaderQueue(lock);
    }

    // Grant read lock
    this.incrementReaderCount(lock);
  }

  // Acquire a write lock - waits for all readers and other writers, has preference
  async acquireWriteLock(lock: LockLevel): Promise<void> {
    // Add to pending writers queue (establishes writer preference)
    this.addToPendingWriter(lock);

    try {
      // Wait for all readers and other writers to finish
      while (this.hasActiveReaders(lock) || this.activeWriters.has(lock)) {
        await this.waitInWriterQueue(lock);
      }

      // Grant write lock
      this.activeWriters.add(lock);
    } finally {
      // Remove from pending queue
      this.removeFromPendingWriters(lock);
    }
  }

  // Release a read lock
  releaseReadLock(lock: LockLevel): void {
    const currentCount = this.readerCounts.get(lock) || 0;
    if (currentCount <= 1) {
      this.readerCounts.delete(lock);
    } else {
      this.readerCounts.set(lock, currentCount - 1);
    }

    // If no more readers, notify waiting writers
    if (!this.hasActiveReaders(lock)) {
      this.notifyWaitingWriters(lock);
    }
  }

  // Release a write lock
  releaseWriteLock(lock: LockLevel): void {
    this.activeWriters.delete(lock);

    // Notify waiting writers first (writer preference), then readers
    if (this.hasPendingWriters(lock)) {
      this.notifyWaitingWriters(lock);
    } else {
      this.notifyWaitingReaders(lock);
    }
  }

  // Check if a specific lock is currently held at runtime
  isLockHeld(lock: LockLevel, mode: LockMode): boolean {
    if (mode === 'read') {
      return (this.readerCounts.get(lock) || 0) > 0;
    }
    return this.activeWriters.has(lock);
  }

  // Helper methods
  private hasActiveReaders(lock: LockLevel): boolean {
    return (this.readerCounts.get(lock) || 0) > 0;
  }

  private hasPendingWriters(lock: LockLevel): boolean {
    const queue = this.pendingWriters.get(lock);
    return queue !== undefined && queue.length > 0;
  }

  private incrementReaderCount(lock: LockLevel): void {
    const currentCount = this.readerCounts.get(lock) || 0;
    this.readerCounts.set(lock, currentCount + 1);
  }

  private addToPendingWriter(lock: LockLevel): void {
    // We'll add the actual resolver in waitInWriterQueue
    if (!this.pendingWriters.has(lock)) {
      this.pendingWriters.set(lock, []);
    }
  }

  private removeFromPendingWriters(lock: LockLevel): void {
    // Remove current writer from pending queue
    const queue = this.pendingWriters.get(lock);
    if (queue && queue.length > 0) {
      queue.shift();
    }
  }

  private async waitInReaderQueue(lock: LockLevel): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!this.pendingReaders.has(lock)) {
        this.pendingReaders.set(lock, []);
      }
      const queue = this.pendingReaders.get(lock);
      if (queue) {
        queue.push(resolve);
      }
    });
  }

  private async waitInWriterQueue(lock: LockLevel): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!this.pendingWriters.has(lock)) {
        this.pendingWriters.set(lock, []);
      }
      const queue = this.pendingWriters.get(lock);
      if (queue) {
        queue.push(resolve);
      }
    });
  }

  private notifyWaitingWriters(lock: LockLevel): void {
    const writerQueue = this.pendingWriters.get(lock);
    if (writerQueue && writerQueue.length > 0) {
      const nextWriter = writerQueue[0]; // Don't shift yet - will be removed in removeFromPendingWriters
      if (nextWriter) {
        nextWriter();
      }
    }
  }

  private notifyWaitingReaders(lock: LockLevel): void {
    const readerQueue = this.pendingReaders.get(lock);
    if (readerQueue && readerQueue.length > 0) {
      // Wake up all waiting readers
      const readers = readerQueue.splice(0);
      readers.forEach(resolve => resolve());
    }
  }

  // Debug method to check current lock state
  getGlobalLocks(): {
    readers: Map<LockLevel, number>;
    writers: Set<LockLevel>;
    pendingWriters: Map<LockLevel, number>;
    } {
    const pendingWriterCounts = new Map<LockLevel, number>();
    for (const [lock, queue] of this.pendingWriters) {
      if (queue.length > 0) {
        pendingWriterCounts.set(lock, queue.length);
      }
    }

    return {
      readers: new Map(this.readerCounts),
      writers: new Set(this.activeWriters),
      pendingWriters: pendingWriterCounts
    };
  }
}

// Check if a lock is in the held locks array
type Contains<T extends readonly unknown[], U> = T extends readonly [infer First, ...infer Rest]
  ? First extends U
    ? true
    : Contains<Rest, U>
  : false;

// Extract prefix of array up to and including the target element
type PrefixUpTo<T extends readonly unknown[], Target> =
  T extends readonly [infer First, ...infer Rest]
    ? First extends Target
      ? readonly [First]  // Found target, include it and stop
      : readonly [First, ...PrefixUpTo<Rest, Target>]
    : readonly [];  // Target not found, return empty

// Remove a specific element from an array (for releasing individual locks)
type RemoveElement<T extends readonly unknown[], Target> =
  T extends readonly [infer First, ...infer Rest]
    ? First extends Target
      ? Rest  // Found target, skip it and return the rest
      : readonly [First, ...RemoveElement<Rest, Target>]
    : readonly [];  // Target not found, return empty

// Check if we can acquire a specific lock given current holdings
// Rules: Can only acquire if lock is not held AND lock level > max currently held
// Comprehensive logic for all 15 locks
type CanAcquireInternal<THeld extends IronLocks, TLock extends LockLevel> =
  Contains<THeld, TLock> extends true
    ? false  // Already held
    : THeld extends readonly []
      ? true  // No locks held, can acquire any
      : // Check each lock level systematically
        Contains<THeld, 15> extends true
        ? false  // Have lock 15, can't acquire anything higher
        : Contains<THeld, 14> extends true
          ? TLock extends 15 ? true : false
          : Contains<THeld, 13> extends true
            ? TLock extends 14 | 15 ? true : false
            : Contains<THeld, 12> extends true
              ? TLock extends 13 | 14 | 15 ? true : false
              : Contains<THeld, 11> extends true
                ? TLock extends 12 | 13 | 14 | 15 ? true : false
                : Contains<THeld, 10> extends true
                  ? TLock extends 11 | 12 | 13 | 14 | 15 ? true : false
                  : Contains<THeld, 9> extends true
                    ? TLock extends 10 | 11 | 12 | 13 | 14 | 15 ? true : false
                    : Contains<THeld, 8> extends true
                      ? TLock extends 9 | 10 | 11 | 12 | 13 | 14 | 15 ? true : false
                      : Contains<THeld, 7> extends true
                        ? TLock extends 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 ? true : false
                        : Contains<THeld, 6> extends true
                          ? TLock extends 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 ? true : false
                          : Contains<THeld, 5> extends true
                            ? TLock extends 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 ? true : false
                            : Contains<THeld, 4> extends true
                              ? TLock extends 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 ? true : false
                              : Contains<THeld, 3> extends true
                                ? TLock extends 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15
                                  ? true : false
                                : Contains<THeld, 2> extends true
                                  ? TLock extends 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15
                                    ? true : false
                                  : Contains<THeld, 1> extends true
                                    ? TLock extends 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15
                                      ? true : false
                                    : true;  // Fallback for edge cases


// =============================================================================
// LOCK CONTEXT CLASS - Core of IronGuard system
// =============================================================================

class LockContext<THeldLocks extends readonly LockLevel[] = readonly []> {
  private heldLocks: THeldLocks;
  private lockModes = new Map<LockLevel, LockMode>();
  private manager = IronGuardManager.getInstance();

  constructor(heldLocks: THeldLocks, lockModes?: Map<LockLevel, LockMode>) {
    this.heldLocks = heldLocks;
    if (lockModes) {
      this.lockModes = new Map(lockModes);
    }
  }

  // Acquire a read lock - COMPILE-TIME ONLY enforcement with runtime read/write semantics
  async acquireRead<TLock extends LockLevel>(
    lock: CanAcquireInternal<THeldLocks, TLock> extends true ? TLock : never
  ): Promise<LockContext<readonly [...THeldLocks, TLock]>> {

    // Runtime read lock acquisition
    await this.manager.acquireReadLock(lock);

    const newLockModes = new Map(this.lockModes);
    newLockModes.set(lock, 'read');

    return new LockContext([...this.heldLocks, lock] as const, newLockModes);
  }

  // Acquire a write lock - COMPILE-TIME ONLY enforcement with runtime read/write semantics
  async acquireWrite<TLock extends LockLevel>(
    lock: CanAcquireInternal<THeldLocks, TLock> extends true ? TLock : never
  ): Promise<LockContext<readonly [...THeldLocks, TLock]>> {

    // Runtime write lock acquisition
    await this.manager.acquireWriteLock(lock);

    const newLockModes = new Map(this.lockModes);
    newLockModes.set(lock, 'write');

    return new LockContext([...this.heldLocks, lock] as const, newLockModes);
  }

  /**
   * Execute an operation while holding a specific lock.
   * 
   * Validates at compile-time that the lock is held by this context, and at runtime
   * that the lock hasn't been released. Useful for ensuring critical sections execute
   * with the correct lock protection.
   * 
   * @param lock - Lock level that must be held by this context (compile-time validated)
   * @param operation - Synchronous callback to execute under lock protection
   * @throws {Error} If lock is not held at runtime (e.g., after disposal)
   * 
   * @example
   * ```ts
   * const ctx = await createLockContext().acquireWrite(LOCK_1);
   * ctx.useLock(LOCK_1, () => {
   *   // Safe: guaranteed to hold LOCK_1
   *   console.log('Critical section');
   * });
   * ctx.dispose();
   * ```
   */
  useLock<TLock extends LockLevel>(
    lock: Contains<THeldLocks, TLock> extends true ? TLock : never,
    operation: () => void
  ): void {
    const mode = this.lockModes.get(lock);
    if (!mode) {
      throw new Error(`Cannot use lock ${lock}: not tracked by this context`);
    }

    if (!this.manager.isLockHeld(lock, mode)) {
      throw new Error(`Cannot use lock ${lock}: lock is not held at runtime`);
    }

    operation();
  }

  /**
   * Temporarily acquire a lock, execute an operation, then automatically release it.
   * 
   * Provides scoped lock acquisition with guaranteed cleanup via finally block. The lock
   * is validated at compile-time for correct ordering and automatically released after
   * operation completes (or throws). Useful for temporary lock elevation patterns.
   * 
   * @param lock - Lock level to acquire (must be valid per ordering rules)
   * @param operation - Async or sync callback receiving elevated context; return value is propagated
   * @param mode - Acquire as 'read' or 'write' (default: 'write')
   * @returns Promise resolving to operation's return value
   * 
   * @example
   * ```ts
   * const base = await createLockContext().acquireWrite(LOCK_1);
   * 
   * const result = await base.useLockWithAcquire(LOCK_3, async (ctx) => {
   *   // ctx holds [LOCK_1, LOCK_3]
   *   ctx.useLock(LOCK_3, () => console.log('Using LOCK_3'));
   *   return 42;
   * });
   * // LOCK_3 auto-released here, base still holds LOCK_1
   * console.log(result); // 42
   * ```
   */
  async useLockWithAcquire<
    TLock extends LockLevel,
    TResult = void
  >(
    lock: CanAcquireInternal<THeldLocks, TLock> extends true ? TLock : never,
    operation: (ctx: LockContext<readonly [...THeldLocks, TLock]>) => Promise<TResult> | TResult,
    mode: LockMode = 'write'
  ): Promise<TResult> {
    const ctxWithLock = mode === 'read'
      ? await this.acquireRead(lock)
      : await this.acquireWrite(lock);

    try {
      return await operation(ctxWithLock);
    } finally {
      ctxWithLock.releaseLock(
        lock as unknown as Contains<readonly [...THeldLocks, TLock], TLock> extends true ? TLock : never
      );
    }
  }

  // Rollback to a previous lock level - COMPILE-TIME ONLY enforcement
  rollbackTo<TTarget extends LockLevel>(
    targetLock: Contains<THeldLocks, TTarget> extends true ? TTarget : never
  ): LockContext<PrefixUpTo<THeldLocks, TTarget>> {

    // Find the index of the target lock
    const targetIndex = this.heldLocks.indexOf(targetLock);
    if (targetIndex === -1) {
      throw new Error(`Cannot rollback to lock ${targetLock}: not held`);
    }

    // Identify locks to release (everything after the target)
    const locksToRelease = this.heldLocks.slice(targetIndex + 1);

    // Release the higher-level locks with appropriate mode
    for (const lock of locksToRelease) {
      const mode = this.lockModes.get(lock);
      if (mode === 'read') {
        this.manager.releaseReadLock(lock);
      } else {
        this.manager.releaseWriteLock(lock);
      }
    }

    // Create new context with locks up to and including target
    const newLocks = this.heldLocks.slice(0, targetIndex + 1);
    const newLockModes = new Map<LockLevel, LockMode>();
    for (const lock of newLocks) {
      const mode = this.lockModes.get(lock);
      if (mode) {
        newLockModes.set(lock, mode);
      }
    }

    return new LockContext(newLocks as unknown as PrefixUpTo<THeldLocks, TTarget>, newLockModes);
  }

  // Release a specific lock - COMPILE-TIME ONLY enforcement
  // This allows releasing individual locks while maintaining the others
  // Useful for temporary lock elevation: acquire lock 4, use it, release lock 4
  releaseLock<TLock extends LockLevel>(
    lock: Contains<THeldLocks, TLock> extends true ? TLock : never
  ): LockContext<RemoveElement<THeldLocks, TLock>> {
    
    // Find the lock
    if (!this.heldLocks.includes(lock)) {
      throw new Error(`Cannot release lock ${lock}: not held`);
    }

    // Release the lock with appropriate mode
    const mode = this.lockModes.get(lock);
    if (mode === 'read') {
      this.manager.releaseReadLock(lock);
    } else {
      this.manager.releaseWriteLock(lock);
    }

    // Create new context without this lock
    const newLocks = this.heldLocks.filter(l => l !== lock);
    const newLockModes = new Map<LockLevel, LockMode>();
    for (const heldLock of newLocks) {
      const lockMode = this.lockModes.get(heldLock);
      if (lockMode) {
        newLockModes.set(heldLock, lockMode);
      }
    }

    return new LockContext(newLocks as unknown as RemoveElement<THeldLocks, TLock>, newLockModes);
  }

  // Check if a specific lock is held
  hasLock<TLock extends LockLevel>(
    lock: TLock
  ): Contains<THeldLocks, TLock> {
    return this.heldLocks.includes(lock) as Contains<THeldLocks, TLock>;
  }

  getHeldLocks(): THeldLocks {
    return this.heldLocks;
  }

  // Get the maximum lock level currently held (0 if no locks held)
  getMaxHeldLock(): number {
    return this.heldLocks.length > 0 ? Math.max(...this.heldLocks) : 0;
  }

  // Release all locks held by this context (cleanup)
  dispose(): void {
    for (const lock of this.heldLocks) {
      const mode = this.lockModes.get(lock);
      if (mode === 'read') {
        this.manager.releaseReadLock(lock);
      } else {
        this.manager.releaseWriteLock(lock);
      }
    }
  }

  // Get the mode of a specific held lock
  getLockMode<TLock extends LockLevel>(
    lock: Contains<THeldLocks, TLock> extends true ? TLock : never
  ): LockMode | undefined {
    return this.lockModes.get(lock);
  }

  toString(): string {
    const globalState = this.manager.getGlobalLocks();
    const readerSummary = Array.from(globalState.readers.entries())
      .map(([lock, count]) => `${lock}R:${count}`)
      .join(', ');
    const writerSummary = Array.from(globalState.writers)
      .map(lock => `${lock}W`)
      .join(', ');

    const locksSummary = this.heldLocks
      .map(lock => {
        const mode = this.lockModes.get(lock);
        return `${lock}${mode === 'read' ? 'R' : 'W'}`;
      })
      .join(', ');

    const globalSummary = [readerSummary, writerSummary].filter(s => s).join(', ');
    return `LockContext[${locksSummary}] (global: [${globalSummary}])`;
  }
}

function createLockContext(): LockContext<readonly []> {
  return new LockContext([] as const);
}

export {
  LockContext,
  createLockContext,
  LOCK_1,
  LOCK_2,
  LOCK_3,
  LOCK_4,
  LOCK_5,
  LOCK_6,
  LOCK_7,
  LOCK_8,
  LOCK_9,
  LOCK_10,
  LOCK_11,
  LOCK_12,
  LOCK_13,
  LOCK_14,
  LOCK_15
};

export type {
  LockLevel,
  LockMode,
  Contains,
  PrefixUpTo,
  RemoveElement
};
