# IronGuard - TypeScript Lock Order System

This is a TypeScript project that implements compile-time lock order violation detection with runtime mutual exclusion.
Compile time safety is the primary goal, no simplifications which would compromise that are allowed.

## Project Context

- **Purpose**: Prevent deadlocks through compile-time validation and race conditions through runtime mutual exclusion
- **Core Technology**: Advanced TypeScript type system with conditional types, template literals, and recursive types
- **Runtime**: Async/await with singleton lock manager for true mutual exclusion

## Key Concepts

- **Lock Levels**: 1-15 representing increasing privilege levels
- **Lock Ordering**: Must acquire locks in ascending order (can skip levels)
- **Type Safety**: Functions can declare lock requirements validated at compile-time

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

When creating or updating tests, always include compile-time failure examples as commented code:

- **Structure**: Use single-line comments (`//`) for easy uncomment testing
- **Format**: Organize invalid code in clearly marked blocks with explanatory comments
- **Purpose**: Allow quick verification that TypeScript correctly prevents invalid operations
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
- **Quick Testing**: Remove `//` from commented lines to verify compilation failures
- **Categories**: Include examples for lock ordering violations, duplicate acquisitions, and invalid usage patterns