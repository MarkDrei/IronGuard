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

// Flexible lock context types for function signatures
export type {
  OrderedSubsequences,
  CanAcquire,
  LocksAtMost1,
  LocksAtMost2,
  LocksAtMost3,
  LocksAtMost4,
  LocksAtMost5,
  LocksAtMost6,
  LocksAtMost7,
  LocksAtMost8,
  LocksAtMost9
} from './core/ironGuardSystem';

// Utility building blocks for advanced usage
export type {
  HasLock,
  IsEmpty,
  MaxHeldLock,
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
} from './core/ironGuardTypes';