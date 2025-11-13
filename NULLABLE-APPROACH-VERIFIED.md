# Nullable Approach: Verified Understanding

## Your Understanding is 100% CORRECT! ✅

### Question 1: Do I get compile-time errors when passing wrong contexts?

**YES!** ✅

```typescript
const ctx5 = await createLockContext().acquireWrite(LOCK_5);

processData(ctx5);  // ❌ COMPILE ERROR!
// Error: Argument of type 'LockContext<readonly [5]>' 
//        is not assignable to parameter of type 'null'
```

**Why this happens:**
1. `ctx5` has type: `LockContext<readonly [5]>`
2. `NullableValidLock3<readonly [5]>` evaluates to: `null`
   - Because `CanAcquireLock3<[5]>` = `false`
3. TypeScript sees: trying to pass `LockContext<[5]>` where `null` is expected
4. **Compile error!** The code won't build.

### Question 2: Can I be sure ctx is never null inside my function (unless explicitly given)?

**YES!** ✅

```typescript
function processData<THeld extends readonly LockLevel[]>(
  ctx: NullableValidLock3<THeld>
): void {
  if (ctx !== null) {
    // At this point, you are GUARANTEED that:
    // 1. ctx is a valid LockContext<THeld>
    // 2. ctx can acquire lock 3 OR already has lock 3
    // 3. It is NOT an invalid context (those are blocked at compile-time)
    
    const locks = ctx.getHeldLocks();  // ✅ Always works
    // ctx is fully usable here!
  } else {
    // ctx is null
    // This can ONLY happen if the user explicitly passed null
    // Invalid contexts (like ctx5) cannot reach here because they don't compile
  }
}
```

## The Two Possible States Inside Your Function

### State 1: `ctx !== null` (non-null)
- **Meaning**: A valid context was passed
- **Guarantee**: The context can acquire lock 3 OR already has lock 3
- **How**: TypeScript verified this at compile-time
- **Cannot be**: An invalid context (blocked at compilation)

### State 2: `ctx === null`
- **Meaning**: User explicitly passed `null`
- **How**: `processData(null as NullableValidLock3<readonly [5]>)`
- **This is intentional**: User chose to pass null
- **Cannot be**: An accidentally passed invalid context

## Complete Type Safety Flow

```typescript
// Invalid context
const ctx5 = await createLockContext().acquireWrite(LOCK_5);

// ❌ This does NOT compile (TypeScript error)
processData(ctx5);

// ✅ Valid contexts compile fine
processData(createLockContext());           // Empty - can acquire lock 3
processData(await ctx.acquireWrite(LOCK_1)); // Has lock 1 - can acquire lock 3
processData(await ctx.acquireWrite(LOCK_3)); // Has lock 3 - already has it

// ⚠️ User can explicitly pass null (must be intentional)
processData(null as NullableValidLock3<readonly [5]>);
```

## Summary

✅ **Compile-time safety**: Invalid contexts cause errors at compile-time
✅ **Runtime safety**: Inside function, non-null ctx is ALWAYS valid
✅ **Explicit null handling**: null can ONLY come from explicit user input
✅ **No surprises**: You will never receive an invalid context as non-null

## Your Understanding: VERIFIED ✅

> "With the Nullable approach, I do get compile time errors when I pass in a wrong context"

**CORRECT!** ✅ TypeScript prevents compilation.

> "So in my called function, I can be sure it is never null, or the user explicitly gave null as an input"

**CORRECT!** ✅ After `if (ctx !== null)`, it's guaranteed valid. If null, user passed it explicitly.

## Comparison with LocksAtMost3

Both approaches are **equally safe** at compile-time. The difference is in ergonomics:

| Aspect | Nullable Approach | LocksAtMost3 |
|--------|------------------|--------------|
| Compile-time safety | ✅ Equal | ✅ Equal |
| Context usability | ✅ Yes (after null check) | ✅ Yes (always) |
| Null handling code | ⚠️ Required | ✅ Not needed |
| Explicit null option | ✅ Available | ❌ Not applicable |
| Code clarity | Good | Slightly better |

**Use Nullable if:** You want to distinguish "valid context" from "explicitly no context"

**Use LocksAtMost3 if:** You just want valid contexts, period (simpler)
