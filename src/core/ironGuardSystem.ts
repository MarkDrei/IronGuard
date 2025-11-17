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

import type { IronLocks } from './ironGuardTypes';

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

  /**
   * Acquire a read lock on the specified lock level.
   *
   * Read locks allow concurrent access by multiple readers, but block if a writer
   * is active or pending (writer preference). The lock must satisfy ordering rules:
   * can only acquire locks higher than the maximum currently held lock.
   *
   * Type-safe at compile-time: TypeScript validates lock ordering and prevents
   * duplicate acquisitions. Runtime enforcement provides mutual exclusion.
   *
   * @param lock - Lock level to acquire (must be higher than max held lock)
   * @returns Promise resolving to new context with the additional read lock
   *
   * @example
   * ```ts
   * const ctx = createLockContext();
   * const ctx1 = await ctx.acquireRead(LOCK_1);
   * const ctx3 = await ctx1.acquireRead(LOCK_3); // Can skip LOCK_2
   * ctx3.dispose(); // ⚠️ Invalidates ctx3, ctx1, and ctx
   * ```
   */
  async acquireRead<TLock extends LockLevel>(
    lock: CanAcquireInternal<THeldLocks, TLock> extends true ? TLock : never
  ): Promise<LockContext<readonly [...THeldLocks, TLock]>> {

    // Runtime read lock acquisition
    await this.manager.acquireReadLock(lock);

    const newLockModes = new Map(this.lockModes);
    newLockModes.set(lock, 'read');

    return new LockContext([...this.heldLocks, lock] as const, newLockModes);
  }

  /**
   * Acquire a write lock on the specified lock level.
   *
   * Write locks provide exclusive access, blocking all other readers and writers.
   * Writers have preference: pending writers block new readers. The lock must
   * satisfy ordering rules: can only acquire locks higher than the maximum
   * currently held lock.
   *
   * Type-safe at compile-time: TypeScript validates lock ordering and prevents
   * duplicate acquisitions. Runtime enforcement provides mutual exclusion.
   *
   * @param lock - Lock level to acquire (must be higher than max held lock)
   * @returns Promise resolving to new context with the additional write lock
   *
   * @example
   * ```ts
   * const ctx = createLockContext();
   * const ctx1 = await ctx.acquireWrite(LOCK_1);
   * const ctx13 = await ctx1.acquireWrite(LOCK_3); // Can skip LOCK_2
   * ctx13.dispose(); // ⚠️ Invalidates ctx13, ctx1, and ctx
   * ```
   */
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
   * ctx.dispose(); // ⚠️ Invalidates ctx and all previous contexts
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

  /**
   * Release a specific lock while maintaining all other held locks.
   * Typically used to release the highest lock after temporary elevation.
   *
   * Removes the specified lock from the context, creating a new context without it.
   * This releases a single lock regardless of position, allowing
   * flexible lock management patterns. Useful for temporary lock elevation where
   * you acquire a higher lock, use it briefly, then release just that lock.
   *
   * Type-safe at compile-time: TypeScript validates the lock is actually held.
   * Runtime enforcement ensures proper cleanup and resource disposal.
   *
   * @param lock - Lock level to release (must be currently held)
   * @returns New context without the released lock
   * @throws {Error} If lock is not held by this context
   *
   * @example
   * ```ts
   * const ctx = await createLockContext()
   *   .acquireWrite(LOCK_1)
   *   .then(c => c.acquireWrite(LOCK_2))
   *   .then(c => c.acquireWrite(LOCK_3));
   * // ctx holds [1, 2, 3]
   *
   * const ctx13 = ctx.releaseLock(LOCK_2);
   * // ctx13 holds [1, 3], only LOCK_2 was released
   * ctx13.dispose(); // ⚠️ Invalidates ctx13 and ctx (both share locks 1, 3)
   * ```
   */
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

  /**
   * Check if a specific lock is currently held by this context.
   *
   * Type-safe compile-time check that returns a boolean indicating lock presence.
   * The return type is branded with the Contains type for additional type safety
   * in conditional logic.
   *
   * @param lock - Lock level to check
   * @returns True if the lock is held, false otherwise (type-branded boolean)
   *
   * @example
   * ```ts
   * const ctx = await createLockContext().acquireWrite(LOCK_1);
   * if (ctx.hasLock(LOCK_1)) {
   *   console.log('Have lock 1');
   * }
   * if (ctx.hasLock(LOCK_2)) {
   *   console.log('This will not execute');
   * }
   * ctx.dispose(); // ⚠️ Invalidates ctx and all previous contexts
   * ```
   */
  hasLock<TLock extends LockLevel>(
    lock: TLock
  ): Contains<THeldLocks, TLock> {
    return this.heldLocks.includes(lock) as Contains<THeldLocks, TLock>;
  }

  /**
   * Get the array of all locks currently held by this context.
   *
   * Returns the immutable tuple of lock levels in acquisition order.
   * Useful for debugging, logging, or conditional logic based on lock state.
   *
   * @returns Readonly tuple of held lock levels
   *
   * @example
   * ```ts
   * const ctx = await createLockContext()
   *   .acquireWrite(LOCK_1)
   *   .then(c => c.acquireWrite(LOCK_3));
   * console.log(ctx.getHeldLocks()); // [1, 3]
   * ctx.dispose(); // ⚠️ Invalidates ctx and all previous contexts
   * ```
   */
  getHeldLocks(): THeldLocks {
    return this.heldLocks;
  }

  /**
   * Get the maximum lock level currently held (0 if no locks held).
   *
   * Returns the highest lock number in the context. Useful for determining
   * what locks can still be acquired (must be higher than this value).
   *
   * @returns Maximum lock level, or 0 if context is empty
   *
   * @example
   * ```ts
   * const empty = createLockContext();
   * console.log(empty.getMaxHeldLock()); // 0
   *
   * const ctx = await empty.acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_5));
   * console.log(ctx.getMaxHeldLock()); // 5
   * ctx.dispose(); // ⚠️ Invalidates ctx and empty
   * ```
   */
  getMaxHeldLock(): number {
    return this.heldLocks.length > 0 ? Math.max(...this.heldLocks) : 0;
  }

  /**
   * Release all locks held by this context.
   *
   * ⚠️ WARNING: This releases ALL locks held by this context, making this context
   * AND all earlier contexts that led to it invalid/unusable. Once disposed, none
   * of the contexts in the chain can be used anymore.
   *
   * Disposes of the context by releasing all locks in the appropriate order
   * (respecting read/write modes). Should be called when done with a context
   * to free resources and allow other operations to proceed.
   *
   * Best practices:
   * - Use `useLockWithAcquire()` for automatic cleanup of temporary locks
   * - Use `releaseLock()` to release individual locks while keeping others
   * - Use try-finally only when you need to dispose the entire chain
   *
   * @see {@link releaseLock} - Release a single lock while keeping others
   * @see {@link useLockWithAcquire} - Scoped lock acquisition with automatic cleanup
   *
   * @example
   * ```ts
   * const ctx = await createLockContext().acquireWrite(LOCK_1);
   * try {
   *   // Use the context
   * } finally {
   *   ctx.dispose(); // ⚠️ Releases ALL locks, invalidates entire chain
   * }
   * ```
   */
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

  /**
   * Get the lock mode (read or write) of a specific held lock.
   *
   * Type-safe at compile-time: TypeScript validates the lock is held.
   * Returns the mode this lock was acquired in.
   *
   * @param lock - Lock level to query (must be held)
   * @returns 'read' or 'write', or undefined if lock data is missing
   *
   * @example
   * ```ts
   * const ctx = await createLockContext().acquireRead(LOCK_1);
   * console.log(ctx.getLockMode(LOCK_1)); // 'read'
   * ctx.dispose(); // ⚠️ Invalidates ctx and all previous contexts
   * ```
   */
  getLockMode<TLock extends LockLevel>(
    lock: Contains<THeldLocks, TLock> extends true ? TLock : never
  ): LockMode | undefined {
    return this.lockModes.get(lock);
  }

  /**
   * Get a string representation of this context and global lock state.
   *
   * Returns a formatted string showing:
   * - Locks held by this context with their modes (R=read, W=write)
   * - Global state showing all active locks across all contexts
   *
   * Useful for debugging and logging lock state.
   *
   * @returns Formatted string representation
   *
   * @example
   * ```ts
   * const ctx = await createLockContext().acquireWrite(LOCK_1);
   * console.log(ctx.toString());
   * // "LockContext[1W] (global: [1W])"
   * ctx.dispose(); // ⚠️ Invalidates ctx and all previous contexts
   * ```
   */
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

/**
 * Create a new empty lock context.
 *
 * Factory function that creates a LockContext with no locks held. This is the
 * starting point for all lock acquisition. From an empty context, you can acquire
 * any lock level.
 *
 * @returns New empty LockContext ready for lock acquisition
 *
 * @example
 * ```ts
 * const ctx = createLockContext();
 * const ctx1 = await ctx.acquireWrite(LOCK_1);
 * const ctx3 = await ctx1.acquireWrite(LOCK_3); // Can skip LOCK_2
 * ctx3.dispose(); // ⚠️ Invalidates ctx3, ctx1, and ctx
 * ```
 */
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
