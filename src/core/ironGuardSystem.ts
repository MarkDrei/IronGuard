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

// Check if we can acquire a specific lock given current holdings
// Rules: Can only acquire if lock is not held AND lock level > max currently held
// Comprehensive logic for all 15 locks
type CanAcquire<THeld extends readonly LockLevel[], TLock extends LockLevel> =
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

/**
 * Generates all ordered subsequences maintaining the original order.
 * 
 * This recursive type creates a union of all possible ordered subsequences (powerset)
 * from a tuple while preserving the ordering. This is more permissive than AllPrefixes
 * as it allows non-contiguous lock acquisition patterns.
 * 
 * For example, given [1, 2, 3], it produces:
 * [] | [1] | [2] | [3] | [1, 2] | [1, 3] | [2, 3] | [1, 2, 3]
 * 
 * This enables flexible lock acquisition patterns where locks can be skipped:
 * - Acquire lock 1, skip lock 2, acquire lock 3 → [1, 3]
 * - Skip lock 1, acquire lock 2 and 3 → [2, 3]
 * - Any ordered combination while maintaining deadlock prevention
 * 
 * The key property is that order is preserved: if lock A comes before lock B in
 * the original sequence, and both are acquired, then A must be acquired before B.
 * This maintains the hierarchical ordering critical for deadlock prevention.
 * 
 * Performance: O(2^N) complexity - generates 2^N combinations. Recommended for
 * use with lock levels ≤14 for optimal performance. Level 15 shows 93% overhead
 * increase (~2.2s vs ~1.1s).
 * 
 * @example
 * ```typescript
 * // For SUPPORTED_LOCK_LEVELS = [1, 2, 3]
 * type ValidLockContextsFlexible = OrderedSubsequences<SUPPORTED_LOCK_LEVELS>;
 * // Produces: [] | [1] | [2] | [3] | [1,2] | [1,3] | [2,3] | [1,2,3]
 * 
 * // Use in function signatures for maximum flexibility:
 * async function veryFlexibleFunction(
 *   context: LockContext<ValidLockContextsFlexible>
 * ): Promise<void> {
 *   // Function accepts ANY ordered lock combination
 * }
 * ```
 * 
 * @template T - The tuple to generate ordered subsequences from (typically SUPPORTED_LOCK_LEVELS)
 * @see {@link doc/flexible-lock-types.md} for detailed usage guide and performance analysis
 */
type OrderedSubsequences<T extends readonly any[]> =
  T extends readonly [infer First, ...infer Rest]
    ? OrderedSubsequences<Rest> | readonly [First, ...OrderedSubsequences<Rest>]
    : readonly [];

// =============================================================================
// PRE-DEFINED FLEXIBLE LOCK CONTEXT TYPES
// =============================================================================

/**
 * Pre-defined OrderedSubsequences types for common use cases.
 * 
 * These types represent lock contexts that may hold any ordered combination
 * of locks up to the specified level. For example, LocksAtMost3 accepts:
 * [], [1], [2], [3], [1,2], [1,3], [2,3], [1,2,3]
 * 
 * Use these in function parameters to accept flexible lock contexts:
 * ```typescript
 * async function pluginHook(ctx: LockContext<LocksAtMost5>): Promise<void> {
 *   // Accepts any ordered combination of locks 1-5
 * }
 * ```
 * 
 * Note: Only levels 1-9 are pre-defined for optimal compilation performance.
 * Level 10 generates 1,024 combinations, level 14 generates 16,384 combinations.
 * 
 * For levels 10 and above, create your own type alias:
 * ```typescript
 * type LocksAtMost10 = OrderedSubsequences<readonly [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]>;
 * ```
 * 
 * Performance warning: Level 15 has significant compilation overhead (2x compile time).
 * Stay at level 14 or below for best performance.
 */

/** Accepts any ordered combination of locks 1 (2 combinations) */
type LocksAtMost1 = OrderedSubsequences<readonly [1]>;

/** Accepts any ordered combination of locks 1-2 (4 combinations) */
type LocksAtMost2 = OrderedSubsequences<readonly [1, 2]>;

/** Accepts any ordered combination of locks 1-3 (8 combinations) */
type LocksAtMost3 = OrderedSubsequences<readonly [1, 2, 3]>;

/** Accepts any ordered combination of locks 1-4 (16 combinations) */
type LocksAtMost4 = OrderedSubsequences<readonly [1, 2, 3, 4]>;

/** Accepts any ordered combination of locks 1-5 (32 combinations) */
type LocksAtMost5 = OrderedSubsequences<readonly [1, 2, 3, 4, 5]>;

/** Accepts any ordered combination of locks 1-6 (64 combinations) */
type LocksAtMost6 = OrderedSubsequences<readonly [1, 2, 3, 4, 5, 6]>;

/** Accepts any ordered combination of locks 1-7 (128 combinations) */
type LocksAtMost7 = OrderedSubsequences<readonly [1, 2, 3, 4, 5, 6, 7]>;

/** Accepts any ordered combination of locks 1-8 (256 combinations) */
type LocksAtMost8 = OrderedSubsequences<readonly [1, 2, 3, 4, 5, 6, 7, 8]>;

/** Accepts any ordered combination of locks 1-9 (512 combinations) */
type LocksAtMost9 = OrderedSubsequences<readonly [1, 2, 3, 4, 5, 6, 7, 8, 9]>;

// Higher levels (10-15) are not pre-defined due to compilation performance impact:
// - Level 10: 1,024 combinations (~1.1s compile time)
// - Level 14: 16,384 combinations (~1.7s compile time)
// - Level 15: 32,768 combinations (~2.2s compile time) ⚠️ Performance cliff
//
// To use higher levels, create your own type alias:
// type LocksAtMost10 = OrderedSubsequences<readonly [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]>;
// type LocksAtMost14 = OrderedSubsequences<readonly [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]>;

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
    lock: CanAcquire<THeldLocks, TLock> extends true ? TLock : never
  ): Promise<LockContext<readonly [...THeldLocks, TLock]>> {

    // Runtime read lock acquisition
    await this.manager.acquireReadLock(lock);

    const newLockModes = new Map(this.lockModes);
    newLockModes.set(lock, 'read');

    return new LockContext([...this.heldLocks, lock] as const, newLockModes);
  }

  // Acquire a write lock - COMPILE-TIME ONLY enforcement with runtime read/write semantics
  async acquireWrite<TLock extends LockLevel>(
    lock: CanAcquire<THeldLocks, TLock> extends true ? TLock : never
  ): Promise<LockContext<readonly [...THeldLocks, TLock]>> {

    // Runtime write lock acquisition
    await this.manager.acquireWriteLock(lock);

    const newLockModes = new Map(this.lockModes);
    newLockModes.set(lock, 'write');

    return new LockContext([...this.heldLocks, lock] as const, newLockModes);
  }

  // Use a lock - COMPILE-TIME ONLY enforcement
  useLock<TLock extends LockLevel>(
    lock: Contains<THeldLocks, TLock> extends true ? TLock : never,
    operation: () => void
  ): void {
    operation();
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

  // Check if a specific lock is held
  hasLock<TLock extends LockLevel>(
    lock: TLock
  ): Contains<THeldLocks, TLock> {
    return this.heldLocks.includes(lock) as Contains<THeldLocks, TLock>;
  }

  getHeldLocks(): THeldLocks {
    return this.heldLocks;
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
  CanAcquire,
  OrderedSubsequences,
  PrefixUpTo,
  LocksAtMost1,
  LocksAtMost2,
  LocksAtMost3,
  LocksAtMost4,
  LocksAtMost5,
  LocksAtMost6,
  LocksAtMost7,
  LocksAtMost8,
  LocksAtMost9
};
