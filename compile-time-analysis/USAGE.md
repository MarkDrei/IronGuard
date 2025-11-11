# Compile Time Analysis - Usage Guide

This tool analyzes TypeScript compilation performance for IronGuard's `OrderedSubsequences` and `AllPrefixes` types across different lock levels.

## Quick Start

### Run the Analysis

```bash
# Run complete analysis (tests lock levels 1-20, takes ~10 minutes)
npm run analyze:all

# Or run individual analyses
npm run analyze:compile-time  # Full analysis across all lock levels
npm run analyze:level15        # Detailed analysis of level 15 threshold
```

### View Results

```bash
# View findings summary
cat compile-time-analysis/FINDINGS.md

# View raw performance data
cat compile-time-analysis/results.json
```

## What Gets Analyzed

For each lock level (1-20), the tool measures TypeScript compilation time in three scenarios:

1. **Type Definition Only**: Just defining `OrderedSubsequences` and `AllPrefixes` types
2. **With Function Usage**: Using the type as a function parameter
3. **Multiple Functions**: Using the type in multiple function signatures with lock acquisition

### Example Test Code

```typescript
// Level 15 test
type TestType = OrderedSubsequences<readonly [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]>;

async function testFunction(context: LockContext<TestType>): Promise<void> {
  const nextCtx = await context.acquireRead(16);  // Acquire next lock
  console.log(nextCtx.toString());
  nextCtx.dispose();
}

async function runTest() {
  const ctx = createLockContext();
  await testFunction(ctx);  // Actually call the function
  ctx.dispose();
}
```

## Understanding the Results

### Key Metrics

- **Compilation Time**: Time in milliseconds for TypeScript to type-check the code
- **Growth Factor**: How much time increases as lock level increases
- **Function Overhead**: Additional time when using types in function parameters vs just defining them

### Performance Categories

- ✅ **< 1s**: Excellent
- ✅ **1-2s**: Good
- ⚠️ **2-3s**: Acceptable but noticeable
- ❌ **> 3s**: Significant impact on developer experience

## Quick Decision Guide

### Which Type Should I Use?

```
Need flexible lock patterns (lock skipping)?
├─ YES → How many lock levels?
│        ├─ 1-14 locks → Use OrderedSubsequences ✓
│        ├─ 15 locks → AVOID OrderedSubsequences! ⚠️
│        │             Options:
│        │             • Redesign with fewer levels
│        │             • Use AllPrefixes instead
│        │             • Use specific ValidLockXContext types
│        └─ 16-20 locks → Carefully consider
│                         (40% slower than AllPrefixes)
│
└─ NO → Use AllPrefixes
         ✓ Fast at all levels (1-20+)
         ✓ Predictable performance
```

### Type Comparison

| Feature | OrderedSubsequences | AllPrefixes |
|---------|-------------------|-------------|
| **Complexity** | O(2^N) - Exponential | O(N) - Linear |
| **Flexibility** | Allows lock skipping | Sequential only |
| **Performance** | Degrades at level 15 | Consistent ~1s |
| **Max Level** | Recommended: 14 | Recommended: 20+ |
| **Use Case** | Non-contiguous patterns | Sequential acquisition |

## Recommendations by Use Case

### Interactive Development (< 1s target)
- **Use**: `AllPrefixes` up to level 20
- **Avoid**: `OrderedSubsequences` at level 15+

### CI/CD Builds (< 3s target)
- **Use**: `OrderedSubsequences` up to level 14
- **Use**: `AllPrefixes` for any level

### One-off Type Checks (< 5s target)
- **Use**: `OrderedSubsequences` up to level 14
- **Acceptable**: Level 15 if absolutely necessary

## Migration Guide

### If Currently Using OrderedSubsequences at Level 15+

**Option 1: Switch to AllPrefixes** (Easiest)
```typescript
// Before: Slow compile
- type MyLocks = OrderedSubsequences<readonly [1,2,...,15]>;
+ type MyLocks = AllPrefixes<readonly [1,2,...,15]>;

// Trade-off: Lose lock skipping ability
```

**Option 2: Reduce to 14 Locks** (Keep flexibility)
```typescript
// Before: 15 levels
- type MyLocks = OrderedSubsequences<readonly [1,2,...,15]>;
+ type MyLocks = OrderedSubsequences<readonly [1,2,...,14]>;

// Trade-off: Fewer lock levels
```

**Option 3: Split into Groups** (For many locks)
```typescript
// Split into logical hierarchies
type DatabaseLocks = OrderedSubsequences<readonly [1,2,3,4,5]>;
type CacheLocks = OrderedSubsequences<readonly [6,7,8,9,10]>;
type NetworkLocks = OrderedSubsequences<readonly [11,12,13,14]>;

// Trade-off: More complex architecture
```

**Option 4: Use Specific Types** (Best performance)
```typescript
// Instead of flexible union
- async function myFunc(ctx: LockContext<FlexibleUnion>) { }

// Use specific type
+ async function myFunc<T extends readonly LockLevel[]>(
+   ctx: ValidLock5Context<T>
+ ) { }

// Trade-off: Less flexible function signature
```

## Troubleshooting

### Analysis Takes Too Long
- Reduce the number of lock levels tested in the script
- Adjust timeout values in the scripts
- Run only the quick analysis: `npm run analyze:compile-time`

### Results Don't Match Expectations
- Ensure TypeScript version is 5.0+
- Clear any TypeScript caches: `rm -rf node_modules/.cache`
- Check that no other processes are consuming CPU

### Want to Test Different Lock Levels
Edit the lock level arrays in:
- `compile-time-analysis/compile-time-analysis.js` - line with `const lockLevels = [...]`
- `compile-time-analysis/detailed-analysis-level15.js` - line with `const lockLevels = [...]`

## Advanced Usage

### Custom Test Scenarios

Edit `compile-time-analysis.js` to add custom scenarios:

```javascript
function generateCustomScenario(lockLevel) {
  const sequence = Array.from({ length: lockLevel }, (_, i) => i + 1).join(', ');
  return `
    // Your custom test code here
    type CustomType = OrderedSubsequences<readonly [${sequence}]>;
    // ... add your test functions
  `;
}
```

### Measuring Specific Patterns

Create a standalone test file:

```typescript
// test-pattern.ts
import type { LockContext, OrderedSubsequences } from './src/core';

type MyPattern = OrderedSubsequences<readonly [1,2,3,4,5,6,7,8,9,10]>;

async function testMyPattern(ctx: LockContext<MyPattern>): Promise<void> {
  // Your pattern usage
}
```

Then measure:
```bash
time npx tsc --noEmit --skipLibCheck test-pattern.ts
```

## Integration with CI/CD

Add to your CI pipeline:

```yaml
# .github/workflows/ci.yml
- name: Check compile performance
  run: |
    npm run analyze:compile-time
    # Parse results and fail if compilation > 3s at level 15
```

## Further Reading

- See `FINDINGS.md` for detailed performance analysis
- See `results.json` for raw timing data
- Check TypeScript Performance Wiki: https://github.com/microsoft/TypeScript/wiki/Performance
