"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
