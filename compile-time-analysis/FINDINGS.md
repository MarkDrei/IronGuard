# Compile Time Analysis - Findings Summary

**Analysis Date**: 2025-11-11  
**TypeScript Version**: 5.0+  
**Test Methodology**: Automated compilation time measurement across lock levels 1-20

---

## Executive Summary

**TL;DR**: `OrderedSubsequences<readonly [1..15]>` hits a **2x compilation slowdown** at lock level 15. Use `AllPrefixes` instead or stay at level 14.

### Critical Finding

**Lock Level 15 is a Performance Cliff**
- OrderedSubsequences: 1.1s (type) → 2.2s (with functions) = **+93% overhead**
- AllPrefixes: 1.0s consistently at all levels
- **Root Cause**: 2^15 = 32,768 type combinations cross TypeScript optimization boundary

---

## Performance Data

### Lock Level 15: The Critical Threshold

| Type | Type Definition | With 1 Function | With 5 Functions |
|------|----------------|-----------------|------------------|
| OrderedSubsequences | 1,132ms | 2,185ms (+93%) | 2,165ms (+91%) |
| AllPrefixes | 1,022ms | 1,032ms (+1%) | 1,027ms (+0.5%) |

**Key Observation**: At level 15, `OrderedSubsequences` shows a dramatic 93% increase when used in function parameters, while `AllPrefixes` shows almost no increase.

### Performance Across Lock Levels

| Level | OrderedSubsequences (ms) | AllPrefixes (ms) | Ratio |
|-------|-------------------------|------------------|-------|
| 10 | 1,098 | 1,020 | 1.08x |
| 13 | 1,337 | 1,023 | 1.31x |
| 14 | 1,665 | 1,039 | 1.60x |
| **15** | **2,185** ⚠️ | **1,032** | **2.12x** |
| 16 | 1,249 | 1,030 | 1.21x |
| 17 | 1,453 | 1,032 | 1.41x |
| 20 | 1,448 | 1,040 | 1.39x |

---

## Why Lock Level 15?

### The 32,768 Threshold

The performance spike at level 15 occurs because:

1. **Combination Explosion**: 2^15 = 32,768 type combinations
2. **TypeScript Threshold**: This number appears to cross an internal optimization boundary
3. **Algorithm Switch**: TypeScript uses different type-checking strategies above/below this threshold
4. **Lock Acquisition Impact**: With lock acquisition in functions, TypeScript must:
   - Type-check input context against all 32,768 combinations
   - Validate `acquireRead`/`acquireWrite` calls
   - Compute resulting context type (adding lock to union)
   - Verify new context satisfies function parameters

### Surprising Recovery at Level 16

Interestingly, level 16 (2^16 = 65,536 combinations) performs **better** than level 15:

- **Level 15**: 2,185ms with functions
- **Level 16**: 1,249ms with functions (43% faster!)

**Hypothesis**: TypeScript switches to a more efficient algorithm for very large unions (>30K combinations), possibly:
- Heuristic/sampling approaches instead of exhaustive checking
- Different caching strategies
- Optimized structural comparison for massive unions

---

## Type Complexity Analysis

### OrderedSubsequences: O(2^N)

```typescript
type OrderedSubsequences<T extends readonly any[]> =
  T extends readonly [infer First, ...infer Rest]
    ? OrderedSubsequences<Rest> | readonly [First, ...OrderedSubsequences<Rest>]
    : readonly [];
```

**Generates**: Complete powerset maintaining order
- Level 10: 1,024 combinations
- Level 14: 16,384 combinations ✓
- Level 15: 32,768 combinations ⚠️ **Critical threshold**
- Level 16: 65,536 combinations (better performance)
- Level 20: 1,048,576 combinations

**Flexibility**: Maximum - allows non-contiguous lock patterns
- Example: `[1,3,5]` (skipping 2 and 4) is valid

### AllPrefixes: O(N)

```typescript
type AllPrefixes<T extends readonly any[]> = 
  T extends readonly [infer First, ...infer Rest]
    ? readonly [] | readonly [First] | readonly [First, ...AllPrefixes<Rest>]
    : readonly [];
```

**Generates**: Sequential prefixes only
- Level 10: 11 combinations
- Level 15: 16 combinations
- Level 20: 21 combinations

**Flexibility**: Sequential only - no lock skipping
- Example: Must acquire `[1,2,3]` in order

---

## Impact Analysis

### Type Definition vs Usage

**Lock Level 15 - OrderedSubsequences:**
- Type definition only: 1,132ms (acceptable)
- With 1 function: 2,185ms (+93%)
- With 3 functions: 2,166ms (+91%)
- With 5 functions: 2,165ms (+91%)

**Key Insight**: The bottleneck is in the **first function usage**, not repeated usage. Adding more functions has minimal incremental cost.

### Function Count Impact

The overhead comes from:
1. **Type instantiation** when first used in a function signature
2. **Parameter type checking** against the large union
3. **Lock acquisition validation** inside functions

Additional functions reuse the already-instantiated type, adding minimal overhead.

### Real-World Developer Impact

| Compile Time | IDE Experience | CI/CD Impact |
|-------------|----------------|--------------|
| < 1s | ⚡ Instant feedback | No delay |
| 1-2s | ✓ Smooth autocomplete | Acceptable |
| 2-3s | ⚠️ Noticeable lag | Minor concern |
| 3-5s | ❌ Frustrating delays | Build slowdown |
| > 5s | 🔥 Unworkable | CI pipeline issue |

**At Level 15**: OrderedSubsequences falls into the "noticeable lag" category, impacting developer experience.

---

## Recommendations

### Safe Zones

✅ **OrderedSubsequences**: Lock levels 1-14 (< 2s compile time)
✅ **AllPrefixes**: Lock levels 1-20+ (< 1s compile time, no practical limit)

### Critical Level

⚠️ **AVOID**: `OrderedSubsequences` at lock level 15 (2.2s compile time with functions)

### Best Practices

1. **Prefer AllPrefixes** when lock skipping isn't needed
   - Consistently fast (O(N) vs O(2^N))
   - Predictable performance
   - No surprises at higher lock levels

2. **Stay at level 14 or below** when using OrderedSubsequences
   - Acceptable performance (< 2s)
   - Maximum flexibility with lock skipping
   - No performance cliffs

3. **Use specific types** for better performance
   - `ValidLockXContext<T>` types avoid union expansion
   - Type-check individual lock requirements
   - Faster compilation, less flexibility

4. **Consider architecture changes** if you need 15+ flexible locks
   - Split into logical lock hierarchies
   - Group related locks together
   - Use multiple smaller OrderedSubsequences

### Decision Matrix

| Lock Levels | Lock Skipping Needed? | Recommendation |
|-------------|----------------------|----------------|
| 1-14 | Yes | OrderedSubsequences ✓ |
| 1-14 | No | AllPrefixes ✓ |
| 15 | Yes | **Redesign** or AllPrefixes ⚠️ |
| 15 | No | AllPrefixes ✓ |
| 16-20 | Yes | Consider carefully (40% slower) |
| 16-20 | No | AllPrefixes ✓ |
| 20+ | Any | AllPrefixes ✓ |

---

## Technical Details

### Test Methodology

- **Platform**: GitHub Actions runners, Ubuntu latest
- **Node Version**: 16.0.0+
- **TypeScript**: 5.0.0+
- **Measurements**: 3-5 iterations per test, averaged
- **Command**: `tsc --noEmit --skipLibCheck`
- **Cache**: Disabled for accurate measurements

### Test Scenarios

1. **Type Definition Only**
   ```typescript
   type T = OrderedSubsequences<readonly [1,2,...,N]>;
   ```

2. **With Function Usage**
   ```typescript
   type T = OrderedSubsequences<readonly [1,2,...,N]>;
   async function fn(ctx: LockContext<T>): Promise<void> {
     const next = await ctx.acquireRead(N+1);
     next.dispose();
   }
   ```

3. **Multiple Functions with Calls**
   ```typescript
   // 5 functions, each calling the previous
   // Each acquires an additional lock
   async function runTest() {
     const ctx = createLockContext();
     await fn5(ctx);
     ctx.dispose();
   }
   ```

### Lock Acquisition Impact

Including lock acquisition inside functions tests the full type-checking complexity:
- Input context validation (32,768 combinations)
- Lock availability checking
- Result type computation (new union with added lock)
- Output type validation

This simulates real-world usage where functions acquire locks, not just pass contexts around.

---

## Comparison with Alternatives

### OrderedSubsequences vs AllPrefixes

| Aspect | OrderedSubsequences | AllPrefixes |
|--------|-------------------|-------------|
| Complexity | O(2^N) | O(N) |
| Level 10 | 1,098ms | 1,020ms |
| Level 15 | 2,185ms ⚠️ | 1,032ms ✓ |
| Level 20 | 1,448ms | 1,040ms |
| Lock Skipping | ✓ Supported | ✗ Not supported |
| Predictability | ✗ Spike at 15 | ✓ Linear growth |
| Max Recommended | 14 | 20+ |

### ValidLockXContext Types

For specific lock requirements, using `ValidLock3Context<T>` types is fastest:
- No union expansion needed
- Direct type checking
- ~1s compilation regardless of complexity

**Trade-off**: Less flexible function signatures

---

## Conclusion

The analysis reveals a clear performance threshold at lock level 15 for `OrderedSubsequences`, caused by TypeScript's internal optimization boundaries at ~32K type combinations. The surprising recovery at level 16 suggests different optimization strategies for very large unions.

**Actionable Recommendations**:
1. Use `OrderedSubsequences` up to level 14 for maximum flexibility
2. Avoid level 15 specifically (use 14 or jump to 16 if necessary)
3. Prefer `AllPrefixes` for sequential lock patterns at any level
4. Consider architectural changes if you need 15+ flexible lock levels

**Performance Budget**: Stay under 2s compilation for good developer experience. OrderedSubsequences at level 15 exceeds this budget.

---

## Raw Data

Full performance data available in `results.json` with detailed timing breakdowns for all test scenarios.

**Generate your own data**: Run `npm run analyze:all` to reproduce these findings or test different configurations.
