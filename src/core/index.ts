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
  CanAcquire,
  PrefixUpTo
} from './ironGuardSystem';

// Advanced constraint types
export type {
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
  ValidLock15Context
} from './ironGuardTypes';
