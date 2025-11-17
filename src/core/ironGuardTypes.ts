/**
 * IronGuard Advanced Type Definitions
 *
 * This file contains sophisticated type aliases that define valid lock combinations
 * for functions with specific lock requirements. These types enable:
 *
 * - Functions that can work with multiple lock scenarios (flexible functions)
 * - Clean, readable function signatures using descriptive type aliases
 * - Compile-time validation of complex lock state requirements
 * - Reusable constraint patterns for different lock combinations
 *
 * Building blocks:
 * TODO update
 */

import type { LockContext, Contains, LockLevel } from './ironGuardSystem';

type IronLocks = readonly LockLevel[];

// =============================================================================
// BUILDING BLOCK TYPES - Composable type utilities
// =============================================================================

/**
 * Checks if a specific lock level is already held in the context
 */
type HasLock<THeld extends IronLocks, Level extends LockLevel> =
  Contains<THeld, Level>;

/**
 * Checks if context is empty (can acquire any first lock)
 */
type IsEmpty<THeld extends IronLocks> =
  THeld extends readonly [] ? true : false;

/**
 * Gets the highest lock level currently held
 */
type MaxHeldLock<THeld extends IronLocks> =
  THeld extends readonly []
    ? 0
    : THeld extends readonly [...unknown[], infer Last extends LockLevel]
      ? Last
      : 0;

// =============================================================================
// =============================================================================
// HASLOCK CONTEXT TYPES - Simple lock presence constraints
// =============================================================================

/**
 * HasLockXContext types provide simple boolean checks for lock presence.
 *
 * These types are useful when you need to verify that a specific lock is held,
 * regardless of what other locks might be present in the context.
 *
 * Use these when:
 * - You need to ensure a specific lock is held before calling a function
 * - You want compile-time validation that a lock is present
 * - You don't care about lock ordering or other locks in the context
 *
 * @example
 * ```typescript
 * function processWithLock3<THeld extends IronLocks>(
 *   ctx: HasLock3Context<THeld>
 * ): void {
 *   // TypeScript guarantees LOCK_3 is present in ctx
 *   ctx.useLock(LOCK_3, () => {
 *     console.log('Processing with LOCK_3');
 *   });
 * }
 *
 * const ctx = await createLockContext().acquireWrite(LOCK_3);
 * processWithLock3(ctx); // ✅ Compiles - LOCK_3 is held
 *
 * const ctx1 = await createLockContext().acquireWrite(LOCK_1);
 * processWithLock3(ctx1); // ❌ Compile error - LOCK_3 not held
 * ```
 */

/** Context that must hold LOCK_1 */
type HasLock1Context<THeld extends IronLocks> = HasLock<THeld, 1> extends true ? LockContext<THeld> : never;

/** Context that must hold LOCK_2 */
type HasLock2Context<THeld extends IronLocks> = HasLock<THeld, 2> extends true ? LockContext<THeld> : never;

/** Context that must hold LOCK_3 */
type HasLock3Context<THeld extends IronLocks> =  HasLock<THeld, 3> extends true ? LockContext<THeld> : never;

/** Context that must hold LOCK_4 */
type HasLock4Context<THeld extends IronLocks> = HasLock<THeld, 4> extends true ? LockContext<THeld> : never;

/** Context that must hold LOCK_5 */
type HasLock5Context<THeld extends IronLocks> = HasLock<THeld, 5> extends true ? LockContext<THeld> : never;

/** Context that must hold LOCK_6 */
type HasLock6Context<THeld extends IronLocks> = HasLock<THeld, 6> extends true ? LockContext<THeld> : never;

/** Context that must hold LOCK_7 */
type HasLock7Context<THeld extends IronLocks> = HasLock<THeld, 7> extends true ? LockContext<THeld> : never;

/** Context that must hold LOCK_8 */
type HasLock8Context<THeld extends IronLocks> = HasLock<THeld, 8> extends true ? LockContext<THeld> : never;

/** Context that must hold LOCK_9 */
type HasLock9Context<THeld extends IronLocks> = HasLock<THeld, 9> extends true ? LockContext<THeld> : never;

/** Context that must hold LOCK_10 */
type HasLock10Context<THeld extends IronLocks> = HasLock<THeld, 10> extends true ? LockContext<THeld> : never;

/** Context that must hold LOCK_11 */
type HasLock11Context<THeld extends IronLocks> = HasLock<THeld, 11> extends true ? LockContext<THeld> : never;

/** Context that must hold LOCK_12 */
type HasLock12Context<THeld extends IronLocks> = HasLock<THeld, 12> extends true ? LockContext<THeld> : never;

/** Context that must hold LOCK_13 */
type HasLock13Context<THeld extends IronLocks> = HasLock<THeld, 13> extends true ? LockContext<THeld> : never;

/** Context that must hold LOCK_14 */
type HasLock14Context<THeld extends IronLocks> = HasLock<THeld, 14> extends true ? LockContext<THeld> : never;

/** Context that must hold LOCK_15 */
type HasLock15Context<THeld extends IronLocks> = HasLock<THeld, 15> extends true ? LockContext<THeld> : never;

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
 * type FlexibleLockContexts = OrderedSubsequences<SUPPORTED_LOCK_LEVELS>;
 * // Produces: [] | [1] | [2] | [3] | [1,2] | [1,3] | [2,3] | [1,2,3]
 *
 * // Use in function signatures for maximum flexibility:
 * async function veryFlexibleFunction(
 *   context: LockContext<FlexibleLockContexts>
 * ): Promise<void> {
 *   // Function accepts ANY ordered lock combination
 * }
 * ```
 *
 * @template T - The tuple to generate ordered subsequences from (typically SUPPORTED_LOCK_LEVELS)
 * @see {@link doc/context-transfer-patterns.md} for detailed usage guide and performance analysis
 */
type OrderedSubsequences<T extends readonly number[]> =
  T extends readonly [infer First, ...infer Rest extends readonly number[]]
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

/** Accepts an empty lock context (0 combinations) */
type LocksAtMost0 = readonly [];

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

// =============================================================================
// NULLABLE LOCKSATMOST TYPES - For conditional lock patterns
// =============================================================================

/**
 * Nullable lock context types for advanced conditional patterns.
 *
 * These types enable a nullable approach where contexts can be either LockContext<T> or null,
 * providing compile-time safety while allowing flexible function signatures that can gracefully
 * handle invalid lock states.
 *
 * Use these when you need functions that:
 * - Accept contexts conditionally based on held locks
 * - Can handle both valid and invalid contexts at the call site
 * - Require explicit null checking for type narrowing
 *
 * @example
 * ```typescript
 *
 * function processWithLock10<THeld extends IronLocks>(
 *   ctx: NullableLocksAtMost10<THeld>
 * ): void {
 *   if (ctx !== null) {
 *     // TypeScript knows ctx is LockContext<THeld> here
 *     ctx.getHeldLocks();
 *   }
 * }
 * ```
 *
 * Note: These are defined for levels 10-15 as they complement the LocksAtMost1-9 types.
 * For lower levels (1-9), use the standard LocksAtMost types.
 */

/** Nullable context for locks up to level 10 */
type NullableLocksAtMost10<THeld extends IronLocks> =
  MaxHeldLock<THeld> extends 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
    ? LockContext<THeld>
    : null;

/** Nullable context for locks up to level 11 */
type NullableLocksAtMost11<THeld extends IronLocks> =
  MaxHeldLock<THeld> extends 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11
    ? LockContext<THeld>
    : null;

/** Nullable context for locks up to level 12 */
type NullableLocksAtMost12<THeld extends IronLocks> =
  MaxHeldLock<THeld> extends 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
    ? LockContext<THeld>
    : null;

/** Nullable context for locks up to level 13 */
type NullableLocksAtMost13<THeld extends IronLocks> =
  MaxHeldLock<THeld> extends 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13
    ? LockContext<THeld>
    : null;

/** Nullable context for locks up to level 14 */
type NullableLocksAtMost14<THeld extends IronLocks> =
  MaxHeldLock<THeld> extends 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14
    ? LockContext<THeld>
    : null;

/** Nullable context for locks up to level 15 */
type NullableLocksAtMost15<THeld extends IronLocks> =
  MaxHeldLock<THeld> extends 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15
    ? LockContext<THeld>
    : null;

// =============================================================================
// EXPORTS
// =============================================================================
export type {
  LockLevel,
  IronLocks,

  // Building blocks
  HasLock,
  IsEmpty,
  MaxHeldLock,

  // HasLock context types
  HasLock1Context,
  HasLock2Context,
  HasLock3Context,
  HasLock4Context,
  HasLock5Context,
  HasLock6Context,
  HasLock7Context,
  HasLock8Context,
  HasLock9Context,
  HasLock10Context,
  HasLock11Context,
  HasLock12Context,
  HasLock13Context,
  HasLock14Context,
  HasLock15Context, 

  // LocksAtMost types
  LocksAtMost0,
  LocksAtMost1,
  LocksAtMost2,
  LocksAtMost3,
  LocksAtMost4,
  LocksAtMost5,
  LocksAtMost6,
  LocksAtMost7,
  LocksAtMost8,
  LocksAtMost9,
  NullableLocksAtMost10,
  NullableLocksAtMost11,
  NullableLocksAtMost12,
  NullableLocksAtMost13,
  NullableLocksAtMost14,
  NullableLocksAtMost15
};
