# IronGuard - TypeScript Lock Order System

This is a TypeScript project that implements compile-time lock order violation detection with runtime mutual exclusion.

## Project Context

- **Purpose**: Prevent deadlocks through compile-time validation and race conditions through runtime mutual exclusion
- **Core Technology**: Advanced TypeScript type system with conditional types, template literals, and recursive types
- **Runtime**: Async/await with singleton lock manager for true mutual exclusion

## Key Concepts

- **Lock Levels**: 1-5 representing increasing privilege levels
- **Lock Ordering**: Must acquire locks in ascending order (can skip levels)
- **Type Safety**: Functions can declare lock requirements validated at compile-time
- **Flexible Patterns**: Support for lock skipping and conditional acquisition

## Code Architecture

- `src/core/ironGuardSystem.ts` - Main async locking system with IronGuardManager singleton
- `src/core/ironGuardTypes.ts` - Advanced TypeScript types for function constraints
- `src/examples/` - Demonstrations of usage patterns
- `tests/` - Custom test runner (Node v16 compatibility)

## Development Notes

- Uses advanced TypeScript features: conditional types, template literals, branded types
- Runtime mutual exclusion prevents actual race conditions
- All lock operations are async with proper resource disposal
- Examples run sequentially to avoid deadlock demonstrations

## Testing Guidelines

### Runtime Tests (`tests/*.node.test.ts`)
- Use Node.js test runner with `assert` for assertions
- Include compile-time failure examples as commented code with `// ❌` markers
- **Example Pattern**:
  ```typescript
  test('should prevent invalid operations via compile-time', async () => {
    // ❌ Compile-time errors: These would fail TypeScript compilation
    // const ctx = await createLockContext().acquire(LOCK_3);
    // const invalid = await ctx.acquire(LOCK_1); // Lower level after higher
    // const duplicate = await ctx.acquire(LOCK_3); // Duplicate acquisition
    
    // ✅ Valid operations for comparison
    const validCtx = await createLockContext().acquire(LOCK_1);
    const validNext = await validCtx.acquire(LOCK_3);
    validNext.dispose();
  });
  ```
- Structure: Single-line comments for easy uncomment testing
- Categories: Lock ordering violations, duplicate acquisitions, invalid usage patterns

### Compile-Time Tests (`scripts/test-compile-time.js`)
- Automated validation that invalid patterns are rejected by TypeScript
- Add both invalid (should fail) and valid (should pass) test cases
- Invalid tests verify TypeScript prevents incorrect usage
- Valid tests ensure the test mechanism itself works correctly
- Run with: `npm run test:compile`