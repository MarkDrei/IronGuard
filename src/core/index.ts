/**
 * IronGuard - Core Module Exports
 *
 * This is the main entry point for the IronGuard locking system.
 * Re-exports all core functionality for clean imports.
 */

// Core system
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
} from './ironGuardSystem';

// Type definitions
export type {
  LockLevel,
  Contains,
  PrefixUpTo,
} from './ironGuardSystem';

// Advanced constraint types
export type {
  // Building blocks
  HasLock,
  IsEmpty,
  MaxHeldLock,

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
  NullableLocksAtMost15,

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
} from './ironGuardTypes';
