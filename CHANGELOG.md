# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.2] - 2025-11-16

### Added
- Exported `IronLocks` and `LocksAtMostAndHasX` types from main module (`src/index.ts`)

## [0.2.1] - 2025-11-16

### Added
- `LocksAtMostAndHasX` types (1-9): Flexible lock contexts that guarantee a specific lock is held while accepting any ordered combination of locks below that level
  - These types combine the flexibility of `LocksAtMostX` with the requirement guarantee of `HasLockXContext`
  - Enable simpler function signatures by replacing two-parameter patterns with a single parameter
  - Can acquire new locks above the required level
- `IronLocks` type export: Base type representing any valid lock array
- Comprehensive test suite for new types (`tests/haslock-and-combination-types.node.test.ts`)
- Compile-time validation tests for `LocksAtMostAndHasX` types
- Documentation section in quick-start guide explaining new types and their use cases

### Technical Details
- `AppendRequiredLock` helper type introduced for generating `LocksAtMostAndHasX` types recursively

## [0.2.0] - 2025-11-15

### Added
- `LocksAtMostX` types (1-9): Pre-defined flexible lock context types for function parameters
  - Accept any ordered combination of locks up to level X
  - Generated using `OrderedSubsequences` recursive type for all valid combinations
- `NullableLocksAtMostX` types (10-15): Nullable variants for higher lock levels to avoid type explosion
- `HasLockXContext` types (1-15): Generic types requiring specific locks to be held
- Individual lock release with `releaseLock()` method
- `useLockWithAcquire()` for automatic lock cleanup

### Removed
- Some types like `ValidXLockContext`, as this was not flexible enough

## [0.1.0] - ??

### Added
- Initial release with basic lock ordering system
- Compile time validation of lock acquisition order

