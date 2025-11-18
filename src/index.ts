/**
 * IronGuard TypeScript Lock Order System
 * Public API entry point for npm distribution
 */

// Core system exports
export {
  createLockContext,
  LockContext,
  type LockLevel,
  type LockMode
} from './core/ironGuardSystem';

// All lock constants
export {
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
} from './core/ironGuardSystem';

// Utility types for function constraints
export type {
  Contains
} from './core/ironGuardSystem';

// Utility building blocks for advanced usage
export type {
  IronLocks,
  HasLock,
  IsEmpty,
  MaxHeldLock,
  
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
  NullableLocksAtMost15,

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

  // LocksAtMostAndHas types
  LocksAtMostAndHas1,
  LocksAtMostAndHas2,
  LocksAtMostAndHas3,
  LocksAtMostAndHas4,
  LocksAtMostAndHas5,
  LocksAtMostAndHas6,
  LocksAtMostAndHas7,
  LocksAtMostAndHas8,
  LocksAtMostAndHas9
} from './core/ironGuardTypes';