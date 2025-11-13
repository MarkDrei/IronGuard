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
 * 1. HasLock<THeld, Level> - checks if lock Level is already held
 * 2. CanAcquireLockX<THeld> - checks if lock X can be acquired following ordering rules
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
  CanAcquireLock15
};
