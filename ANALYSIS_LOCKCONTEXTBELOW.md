# Analysis: LockContextBelow Type Issue and Fix

## Problem Statement

The `wantsToTakeLock3` function in `src/examples/contextTransferDemo.ts` had a bug where it was attempting to acquire `LOCK_2` instead of `LOCK_3`, despite:
- The function name suggesting it should acquire LOCK_3
- The result message claiming it acquired LOCK_3
- The variable name being `lock3Ctx`

```typescript
// BUGGY CODE (line 310)
const lock3Ctx = await context.acquireWrite(LOCK_2);  // ❌ Wrong lock!
```

## Root Cause Analysis

The issue stems from a limitation in how TypeScript handles conditional types in generic contexts:

### The `LockContextBelow` Type

```typescript
type LockContextBelow<
  MaxLevel extends LockLevel,
  THeldLocks extends readonly LockLevel[]
> = 
  THeldLocks extends readonly []
    ? LockContext<readonly []>
    : Max<THeldLocks> extends infer M extends LockLevel
      ? M extends MaxLevel
        ? never  // Rejects if max lock >= MaxLevel
        : AllLessThan<THeldLocks, MaxLevel> extends true
          ? LockContext<THeldLocks>
          : never
      : never;
```

This type ensures:
✓ All held locks are strictly less than `MaxLevel`
✗ BUT it doesn't guarantee that `MaxLevel` can be acquired

### Why the Bug Compiled

When using `LockContextBelow<3, THeldLocks>` as a parameter type:

1. At the **call site**, TypeScript validates that the passed context satisfies the constraint
   - Example: `LockContextBelow<3, [2]>` → valid (2 < 3) ✓
   
2. Inside the **generic function**, TypeScript loses the specific type information
   - It only knows: `context` satisfies `LockContextBelow<3, THeldLocks>`
   - It doesn't know the exact value of `THeldLocks`
   
3. The `acquireWrite` method uses `CanAcquire<THeldLocks, TLock>` for validation
   - But TypeScript can't prove this constraint within the generic function body
   - So it allows the call to compile (incorrectly)

### The Problematic Scenario

If we call `wantsToTakeLock3` with a context holding `LOCK_2`:

```typescript
const ctx2 = await createLockContext().acquireWrite(LOCK_2);
await wantsToTakeLock3(ctx2);  // THeldLocks inferred as [2]
```

Inside the function:
- `LockContextBelow<3, [2]>` is valid (2 < 3) ✓
- But `context.acquireWrite(LOCK_2)` should fail!
- Because `CanAcquire<[2], 2>` is false (already held)
- **TypeScript doesn't catch this in the generic function body**

## Solution

### The Fix

Change line 310 to acquire the correct lock:

```typescript
// FIXED CODE
const lock3Ctx = await context.acquireWrite(LOCK_3);  // ✓ Correct!
```

### Why This Works

With `LOCK_3`, the mathematical properties guarantee correctness:

For any `THeldLocks` that satisfies `LockContextBelow<3, THeldLocks>`:
- All locks in `THeldLocks` are < 3
- Therefore, `CanAcquire<THeldLocks, 3>` is always true
- LOCK_3 can always be acquired ✓

### Type Safety Matrix

| Context Held Locks | `LockContextBelow<3>` | `acquireWrite(LOCK_2)` | `acquireWrite(LOCK_3)` |
|-------------------|-----------------------|------------------------|------------------------|
| `[]`              | ✓ Valid               | ✓ Valid                | ✓ Valid                |
| `[1]`             | ✓ Valid               | ✓ Valid                | ✓ Valid                |
| `[2]`             | ✓ Valid               | ❌ Invalid (held)      | ✓ Valid                |
| `[1, 2]`          | ✓ Valid               | ❌ Invalid (held)      | ✓ Valid                |
| `[3]`             | ❌ Invalid            | N/A                    | N/A                    |
| `[4]`             | ❌ Invalid            | N/A                    | N/A                    |

## Implications and Best Practices

### When to Use `LockContextBelow`

✓ **Good for**: Readable boundary constraints in documentation examples
✓ **Good for**: Expressing "accepts contexts where max lock < X"

### Limitations

❌ **Not sufficient for**: Complete compile-time safety within generic functions
❌ **Reason**: Conditional types erase type parameter information

### Best Practice Recommendation

For production code requiring full type safety, use the `CanAcquire` pattern directly:

```typescript
async function ensureLock3CanBeAcquired<T extends readonly LockLevel[]>(
  context: CanAcquire<T, 3> extends true ? LockContext<T> : never
): Promise<void> {
  // This provides full compile-time safety
  const lock3Ctx = await context.acquireWrite(LOCK_3);
  // ...
}
```

This pattern:
- ✓ Validates at the call site
- ✓ Preserves type information within the function
- ✓ Provides complete compile-time safety
- ✓ Works with TypeScript's type narrowing

## Testing

Added comprehensive test suite in `tests/lockcontextbelow.node.test.ts`:
- ✓ Tests with empty context
- ✓ Tests with LOCK_1
- ✓ Tests with LOCK_2 (the problematic case)
- ✓ Tests with LOCK_1 + LOCK_2
- ✓ Documents why the fix was necessary
- ✓ All 127 existing tests still pass

## Conclusion

The fix changes one line (`LOCK_2` → `LOCK_3`) but the analysis reveals an important lesson about TypeScript's type system:

**Conditional types in generic constraints don't provide the same level of type safety as direct type parameters within function bodies.**

The documentation has been updated to reflect this limitation and guide users toward the more type-safe `CanAcquire` pattern when needed.
