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
 * The general pattern is: ValidLockXContext<THeld> where X is the required lock level.
 * These types are now built from composable building blocks:
 * 1. HasLock<THeld, Level> - checks if lock Level is already held
 * 2. CanAcquireLockX<THeld> - checks if lock X can be acquired following ordering rules
 * 3. ValidLockXContext<THeld> - combines the above with proper error messages
 */

import type { LockContext, Contains, LockLevel } from './ironGuardSystem';

// =============================================================================
// BUILDING BLOCK TYPES - Composable type utilities
// =============================================================================

/**
 * Checks if a specific lock level is already held in the context
 */
type HasLock<THeld extends readonly LockLevel[], Level extends LockLevel> =
  Contains<THeld, Level>;

/**
 * Checks if context is empty (can acquire any first lock)
 */
type IsEmpty<THeld extends readonly LockLevel[]> =
  THeld extends readonly [] ? true : false;

/**
 * Gets the highest lock level currently held
 */
type MaxHeldLock<THeld extends readonly LockLevel[]> =
  THeld extends readonly []
    ? 0
    : THeld extends readonly [...unknown[], infer Last extends LockLevel]
      ? Last
      : 0;

// =============================================================================
// CAN ACQUIRE TYPES - Hierarchical lock acquisition rules
// =============================================================================

/**
 * Base case: Can always acquire lock 1 if context is empty
 */
type CanAcquireLock1<THeld extends readonly LockLevel[]> =
  IsEmpty<THeld>;

/**
 * Can acquire lock 2 if: empty OR can acquire lock 1 OR max held lock ≤ 1
 */
type CanAcquireLock2<THeld extends readonly LockLevel[]> =
  IsEmpty<THeld> extends true
    ? true
    : CanAcquireLock1<THeld> extends true
      ? true
      : MaxHeldLock<THeld> extends infer Max
        ? Max extends 1 ? true : false
        : false;

/**
 * Can acquire lock 3 if: can acquire lock 2 OR max held lock ≤ 2
 */
type CanAcquireLock3<THeld extends readonly LockLevel[]> =
  CanAcquireLock2<THeld> extends true
    ? true
    : MaxHeldLock<THeld> extends infer Max
      ? Max extends 1 | 2 ? true : false
      : false;

/**
 * Can acquire lock 4 if: can acquire lock 3 OR max held lock ≤ 3
 */
type CanAcquireLock4<THeld extends readonly LockLevel[]> =
  CanAcquireLock3<THeld> extends true
    ? true
    : MaxHeldLock<THeld> extends infer Max
      ? Max extends 1 | 2 | 3 ? true : false
      : false;

/**
 * Can acquire lock 5 if: can acquire lock 4 OR max held lock ≤ 4
 */
type CanAcquireLock5<THeld extends readonly LockLevel[]> =
  CanAcquireLock4<THeld> extends true
    ? true
    : MaxHeldLock<THeld> extends infer Max
      ? Max extends 1 | 2 | 3 | 4 ? true : false
      : false;

/**
 * Can acquire lock 6 if: can acquire lock 5 OR max held lock ≤ 5
 */
type CanAcquireLock6<THeld extends readonly LockLevel[]> =
  CanAcquireLock5<THeld> extends true
    ? true
    : MaxHeldLock<THeld> extends infer Max
      ? Max extends 1 | 2 | 3 | 4 | 5 ? true : false
      : false;

/**
 * Can acquire lock 7 if: can acquire lock 6 OR max held lock ≤ 6
 */
type CanAcquireLock7<THeld extends readonly LockLevel[]> =
  CanAcquireLock6<THeld> extends true
    ? true
    : MaxHeldLock<THeld> extends infer Max
      ? Max extends 1 | 2 | 3 | 4 | 5 | 6 ? true : false
      : false;

/**
 * Can acquire lock 8 if: can acquire lock 7 OR max held lock ≤ 7
 */
type CanAcquireLock8<THeld extends readonly LockLevel[]> =
  CanAcquireLock7<THeld> extends true
    ? true
    : MaxHeldLock<THeld> extends infer Max
      ? Max extends 1 | 2 | 3 | 4 | 5 | 6 | 7 ? true : false
      : false;

/**
 * Can acquire lock 9 if: can acquire lock 8 OR max held lock ≤ 8
 */
type CanAcquireLock9<THeld extends readonly LockLevel[]> =
  CanAcquireLock8<THeld> extends true
    ? true
    : MaxHeldLock<THeld> extends infer Max
      ? Max extends 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 ? true : false
      : false;

/**
 * Can acquire lock 10 if: can acquire lock 9 OR max held lock ≤ 9
 */
type CanAcquireLock10<THeld extends readonly LockLevel[]> =
  CanAcquireLock9<THeld> extends true
    ? true
    : MaxHeldLock<THeld> extends infer Max
      ? Max extends 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 ? true : false
      : false;

/**
 * Can acquire lock 11 if: can acquire lock 10 OR max held lock ≤ 10
 */
type CanAcquireLock11<THeld extends readonly LockLevel[]> =
  CanAcquireLock10<THeld> extends true
    ? true
    : MaxHeldLock<THeld> extends infer Max
      ? Max extends 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 ? true : false
      : false;

/**
 * Can acquire lock 12 if: can acquire lock 11 OR max held lock ≤ 11
 */
type CanAcquireLock12<THeld extends readonly LockLevel[]> =
  CanAcquireLock11<THeld> extends true
    ? true
    : MaxHeldLock<THeld> extends infer Max
      ? Max extends 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 ? true : false
      : false;

/**
 * Can acquire lock 13 if: can acquire lock 12 OR max held lock ≤ 12
 */
type CanAcquireLock13<THeld extends readonly LockLevel[]> =
  CanAcquireLock12<THeld> extends true
    ? true
    : MaxHeldLock<THeld> extends infer Max
      ? Max extends 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 ? true : false
      : false;

/**
 * Can acquire lock 14 if: can acquire lock 13 OR max held lock ≤ 13
 */
type CanAcquireLock14<THeld extends readonly LockLevel[]> =
  CanAcquireLock13<THeld> extends true
    ? true
    : MaxHeldLock<THeld> extends infer Max
      ? Max extends 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 ? true : false
      : false;

/**
 * Can acquire lock 15 if: can acquire lock 14 OR max held lock ≤ 14
 */
type CanAcquireLock15<THeld extends readonly LockLevel[]> =
  CanAcquireLock14<THeld> extends true
    ? true
    : MaxHeldLock<THeld> extends infer Max
      ? Max extends 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 ? true : false
      : false;

// =============================================================================
// VALID CONTEXT TYPES - Combining has + can acquire with error messages
// =============================================================================

/**
 * Valid context for lock 1: can acquire lock 1 OR already has lock 1
 */
type ValidLock1Context<THeld extends readonly LockLevel[]> =
  THeld extends readonly []
    ? LockContext<THeld>  // Empty - can acquire
    : HasLock<THeld, 1> extends true
      ? LockContext<THeld>  // Already has lock 1
      : 'IronGuard: Lock 1 can only be acquired on empty context';

/**
 * Valid context for lock 2: can acquire lock 2 OR already has lock 2
 */
type ValidLock2Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 2> extends true
    ? LockContext<THeld>  // Already has lock 2
    : CanAcquireLock2<THeld> extends true
      ? LockContext<THeld>  // Can acquire lock 2
      : MaxHeldLock<THeld> extends infer Max
        ? Max extends 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15
          ? `IronGuard: Cannot acquire lock 2 when holding lock ${Max}. Locks must be acquired in order.`
          : 'IronGuard: Invalid lock state for acquiring lock 2'
        : 'IronGuard: Cannot acquire lock 2 in current context';

/**
 * Valid context for lock 3: can acquire lock 3 OR already has lock 3
 */
type ValidLock3Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 3> extends true
    ? LockContext<THeld>  // Already has lock 3
    : CanAcquireLock3<THeld> extends true
      ? LockContext<THeld>  // Can acquire lock 3
      : MaxHeldLock<THeld> extends infer Max
        ? Max extends 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15
          ? `IronGuard: Cannot acquire lock 3 when holding lock ${Max}. Locks must be acquired in order.`
          : 'IronGuard: Invalid lock state for acquiring lock 3'
        : 'IronGuard: Cannot acquire lock 3 in current context';

/**
 * Valid context for lock 4: can acquire lock 4 OR already has lock 4
 */
type ValidLock4Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 4> extends true
    ? LockContext<THeld>  // Already has lock 4
    : CanAcquireLock4<THeld> extends true
      ? LockContext<THeld>  // Can acquire lock 4
      : MaxHeldLock<THeld> extends infer Max
        ? Max extends 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15
          ? `IronGuard: Cannot acquire lock 4 when holding lock ${Max}. Locks must be acquired in order.`
          : 'IronGuard: Invalid lock state for acquiring lock 4'
        : 'IronGuard: Cannot acquire lock 4 in current context';

/**
 * Valid context for lock 5: can acquire lock 5 OR already has lock 5
 */
type ValidLock5Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 5> extends true
    ? LockContext<THeld>  // Already has lock 5
    : CanAcquireLock5<THeld> extends true
      ? LockContext<THeld>  // Can acquire lock 5
      : MaxHeldLock<THeld> extends infer Max
        ? Max extends 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15
          ? `IronGuard: Cannot acquire lock 5 when holding lock ${Max}. Locks must be acquired in order.`
          : 'IronGuard: Invalid lock state for acquiring lock 5'
        : 'IronGuard: Cannot acquire lock 5 in current context';

/**
 * Valid context for lock 6: can acquire lock 6 OR already has lock 6
 */
type ValidLock6Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 6> extends true
    ? LockContext<THeld>  // Already has lock 6
    : CanAcquireLock6<THeld> extends true
      ? LockContext<THeld>  // Can acquire lock 6
      : MaxHeldLock<THeld> extends infer Max
        ? Max extends 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15
          ? `IronGuard: Cannot acquire lock 6 when holding lock ${Max}. Locks must be acquired in order.`
          : 'IronGuard: Invalid lock state for acquiring lock 6'
        : 'IronGuard: Cannot acquire lock 6 in current context';

/**
 * Valid context for lock 7: can acquire lock 7 OR already has lock 7
 */
type ValidLock7Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 7> extends true
    ? LockContext<THeld>  // Already has lock 7
    : CanAcquireLock7<THeld> extends true
      ? LockContext<THeld>  // Can acquire lock 7
      : MaxHeldLock<THeld> extends infer Max
        ? Max extends 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15
          ? `IronGuard: Cannot acquire lock 7 when holding lock ${Max}. Locks must be acquired in order.`
          : 'IronGuard: Invalid lock state for acquiring lock 7'
        : 'IronGuard: Cannot acquire lock 7 in current context';

/**
 * Valid context for lock 8: can acquire lock 8 OR already has lock 8
 */
type ValidLock8Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 8> extends true
    ? LockContext<THeld>  // Already has lock 8
    : CanAcquireLock8<THeld> extends true
      ? LockContext<THeld>  // Can acquire lock 8
      : MaxHeldLock<THeld> extends infer Max
        ? Max extends 9 | 10 | 11 | 12 | 13 | 14 | 15
          ? `IronGuard: Cannot acquire lock 8 when holding lock ${Max}. Locks must be acquired in order.`
          : 'IronGuard: Invalid lock state for acquiring lock 8'
        : 'IronGuard: Cannot acquire lock 8 in current context';

/**
 * Valid context for lock 9: can acquire lock 9 OR already has lock 9
 */
type ValidLock9Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 9> extends true
    ? LockContext<THeld>  // Already has lock 9
    : CanAcquireLock9<THeld> extends true
      ? LockContext<THeld>  // Can acquire lock 9
      : MaxHeldLock<THeld> extends infer Max
        ? Max extends 10 | 11 | 12 | 13 | 14 | 15
          ? `IronGuard: Cannot acquire lock 9 when holding lock ${Max}. Locks must be acquired in order.`
          : 'IronGuard: Invalid lock state for acquiring lock 9'
        : 'IronGuard: Cannot acquire lock 9 in current context';

/**
 * Valid context for lock 10: can acquire lock 10 OR already has lock 10
 */
type ValidLock10Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 10> extends true
    ? LockContext<THeld>  // Already has lock 10
    : CanAcquireLock10<THeld> extends true
      ? LockContext<THeld>  // Can acquire lock 10
      : MaxHeldLock<THeld> extends infer Max
        ? Max extends 11 | 12 | 13 | 14 | 15
          ? `IronGuard: Cannot acquire lock 10 when holding lock ${Max}. Locks must be acquired in order.`
          : 'IronGuard: Invalid lock state for acquiring lock 10'
        : 'IronGuard: Cannot acquire lock 10 in current context';

/**
 * Valid context for lock 11: can acquire lock 11 OR already has lock 11
 */
type ValidLock11Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 11> extends true
    ? LockContext<THeld>  // Already has lock 11
    : CanAcquireLock11<THeld> extends true
      ? LockContext<THeld>  // Can acquire lock 11
      : MaxHeldLock<THeld> extends infer Max
        ? Max extends 12 | 13 | 14 | 15
          ? `IronGuard: Cannot acquire lock 11 when holding lock ${Max}. Locks must be acquired in order.`
          : 'IronGuard: Invalid lock state for acquiring lock 11'
        : 'IronGuard: Cannot acquire lock 11 in current context';

/**
 * Valid context for lock 12: can acquire lock 12 OR already has lock 12
 */
type ValidLock12Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 12> extends true
    ? LockContext<THeld>  // Already has lock 12
    : CanAcquireLock12<THeld> extends true
      ? LockContext<THeld>  // Can acquire lock 12
      : MaxHeldLock<THeld> extends infer Max
        ? Max extends 13 | 14 | 15
          ? `IronGuard: Cannot acquire lock 12 when holding lock ${Max}. Locks must be acquired in order.`
          : 'IronGuard: Invalid lock state for acquiring lock 12'
        : 'IronGuard: Cannot acquire lock 12 in current context';

/**
 * Valid context for lock 13: can acquire lock 13 OR already has lock 13
 */
type ValidLock13Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 13> extends true
    ? LockContext<THeld>  // Already has lock 13
    : CanAcquireLock13<THeld> extends true
      ? LockContext<THeld>  // Can acquire lock 13
      : MaxHeldLock<THeld> extends infer Max
        ? Max extends 14 | 15
          ? `IronGuard: Cannot acquire lock 13 when holding lock ${Max}. Locks must be acquired in order.`
          : 'IronGuard: Invalid lock state for acquiring lock 13'
        : 'IronGuard: Cannot acquire lock 13 in current context';

/**
 * Valid context for lock 14: can acquire lock 14 OR already has lock 14
 */
type ValidLock14Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 14> extends true
    ? LockContext<THeld>  // Already has lock 14
    : CanAcquireLock14<THeld> extends true
      ? LockContext<THeld>  // Can acquire lock 14
      : MaxHeldLock<THeld> extends infer Max
        ? Max extends 15
          ? 'IronGuard: Cannot acquire lock 14 when holding lock 15. Locks must be acquired in order.'
          : 'IronGuard: Invalid lock state for acquiring lock 14'
        : 'IronGuard: Cannot acquire lock 14 in current context';

/**
 * Valid context for lock 15: can acquire lock 15 OR already has lock 15
 */
type ValidLock15Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 15> extends true
    ? LockContext<THeld>  // Already has lock 15
    : CanAcquireLock15<THeld> extends true
      ? LockContext<THeld>  // Can acquire lock 15
      : 'IronGuard: Cannot acquire lock 15 in current context';

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
 * function processWithLock3<THeld extends readonly LockLevel[]>(
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
type HasLock1Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 1> extends true
    ? LockContext<THeld>
    : 'IronGuard: Context must hold LOCK_1';

/** Context that must hold LOCK_2 */
type HasLock2Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 2> extends true
    ? LockContext<THeld>
    : 'IronGuard: Context must hold LOCK_2';

/** Context that must hold LOCK_3 */
type HasLock3Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 3> extends true
    ? LockContext<THeld>
    : 'IronGuard: Context must hold LOCK_3';

/** Context that must hold LOCK_4 */
type HasLock4Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 4> extends true
    ? LockContext<THeld>
    : 'IronGuard: Context must hold LOCK_4';

/** Context that must hold LOCK_5 */
type HasLock5Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 5> extends true
    ? LockContext<THeld>
    : 'IronGuard: Context must hold LOCK_5';

/** Context that must hold LOCK_6 */
type HasLock6Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 6> extends true
    ? LockContext<THeld>
    : 'IronGuard: Context must hold LOCK_6';

/** Context that must hold LOCK_7 */
type HasLock7Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 7> extends true
    ? LockContext<THeld>
    : 'IronGuard: Context must hold LOCK_7';

/** Context that must hold LOCK_8 */
type HasLock8Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 8> extends true
    ? LockContext<THeld>
    : 'IronGuard: Context must hold LOCK_8';

/** Context that must hold LOCK_9 */
type HasLock9Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 9> extends true
    ? LockContext<THeld>
    : 'IronGuard: Context must hold LOCK_9';

/** Context that must hold LOCK_10 */
type HasLock10Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 10> extends true
    ? LockContext<THeld>
    : 'IronGuard: Context must hold LOCK_10';

/** Context that must hold LOCK_11 */
type HasLock11Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 11> extends true
    ? LockContext<THeld>
    : 'IronGuard: Context must hold LOCK_11';

/** Context that must hold LOCK_12 */
type HasLock12Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 12> extends true
    ? LockContext<THeld>
    : 'IronGuard: Context must hold LOCK_12';

/** Context that must hold LOCK_13 */
type HasLock13Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 13> extends true
    ? LockContext<THeld>
    : 'IronGuard: Context must hold LOCK_13';

/** Context that must hold LOCK_14 */
type HasLock14Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 14> extends true
    ? LockContext<THeld>
    : 'IronGuard: Context must hold LOCK_14';

/** Context that must hold LOCK_15 */
type HasLock15Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 15> extends true
    ? LockContext<THeld>
    : 'IronGuard: Context must hold LOCK_15';

// =============================================================================
// EXPORTS
// =============================================================================

export type {
  LockLevel,

  // Building blocks
  HasLock,
  IsEmpty,
  MaxHeldLock,

  // Can acquire types
  CanAcquireLock1,
  CanAcquireLock2,
  CanAcquireLock3,
  CanAcquireLock4,
  CanAcquireLock5,
  CanAcquireLock6,
  CanAcquireLock7,
  CanAcquireLock8,
  CanAcquireLock9,
  CanAcquireLock10,
  CanAcquireLock11,
  CanAcquireLock12,
  CanAcquireLock13,
  CanAcquireLock14,
  CanAcquireLock15,

  // Valid context types
  ValidLock1Context,
  ValidLock2Context,
  ValidLock3Context,
  ValidLock4Context,
  ValidLock5Context,
  ValidLock6Context,
  ValidLock7Context,
  ValidLock8Context,
  ValidLock9Context,
  ValidLock10Context,
  ValidLock11Context,
  ValidLock12Context,
  ValidLock13Context,
  ValidLock14Context,
  ValidLock15Context,

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
  HasLock15Context
};
