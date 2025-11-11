# Compile Time Analysis Documentation

This directory contains comprehensive analysis of TypeScript compilation performance for IronGuard's type system.

## Quick Start

To run the complete analysis:

```bash
# Run full analysis (tests lock levels 1-20)
npm run analyze:compile-time

# Or run the scripts directly
node scripts/compile-time-analysis.js
node scripts/detailed-analysis-level15.js
```

## Reports

### 📊 [Comprehensive Report](./compile-time-analysis-comprehensive-report.md)
The main report with all findings, recommendations, and conclusions. **Start here** for a complete understanding.

**Key Findings**:
- Lock level 15 is a critical threshold for `OrderedSubsequences` (2x slowdown)
- `AllPrefixes` performs consistently well at all lock levels
- Recommended maximum: Level 14 for `OrderedSubsequences`, 20+ for `AllPrefixes`

### 📈 [Initial Analysis Report](./compile-time-analysis-report.md)
First-pass analysis covering lock levels 1-20 with basic metrics.

### 🔬 [Detailed Level 15 Analysis](./detailed-analysis-level15.md)
Deep dive into the critical lock level 15 threshold, comparing `OrderedSubsequences` vs `AllPrefixes` with different function usage patterns.

### 📉 [Raw Performance Data](./compile-time-analysis-results.json)
Machine-readable JSON data with all timing measurements.

## Understanding the Analysis

### What We Measured

For each lock level (1-20), we measured compilation time in three scenarios:

1. **Type Definition Only**: Just defining the types
2. **With Function Usage**: Using the type as a function parameter
3. **Multiple Functions**: Using the type in multiple function signatures

### Key Metrics

- **Compilation Time**: Time for TypeScript to check the code (milliseconds)
- **Growth Factor**: How much compilation time increases per lock level
- **Function Overhead**: Additional time when using types in functions vs just defining them

### The Two Type Strategies

#### OrderedSubsequences
- **Complexity**: O(2^N) - exponential
- **Flexibility**: Maximum - allows lock skipping
- **Performance**: Degrades at level 15
- **Use case**: When you need non-contiguous lock patterns

#### AllPrefixes
- **Complexity**: O(N) - linear
- **Flexibility**: Sequential locks only
- **Performance**: Consistent ~1s at all levels
- **Use case**: When locks are acquired in strict sequence

## Running Your Own Analysis

### Prerequisites
```bash
npm install
```

### Customizing the Analysis

Edit `scripts/compile-time-analysis.js` to:
- Test different lock level ranges
- Add more test scenarios
- Adjust timeout values
- Modify iteration counts

Edit `scripts/detailed-analysis-level15.js` to:
- Focus on different lock levels
- Add custom test scenarios
- Adjust measurement precision

### Adding to package.json

```json
{
  "scripts": {
    "analyze:compile-time": "node scripts/compile-time-analysis.js",
    "analyze:level15": "node scripts/detailed-analysis-level15.js",
    "analyze:all": "npm run analyze:compile-time && npm run analyze:level15"
  }
}
```

## Interpreting Results

### Good Performance
- ✅ < 1s: Excellent
- ✅ 1-2s: Good
- ⚠️ 2-3s: Acceptable

### Concerning Performance
- ⚠️ 3-5s: Noticeable slowdown
- ❌ > 5s: Significant impact on developer experience
- ❌ > 10s: Unacceptable for interactive development

### What to Do If Performance Is Poor

1. **Switch to AllPrefixes** if lock skipping isn't needed
2. **Reduce lock levels** to stay under the threshold
3. **Use specific types** like `ValidLock3Context` instead of flexible unions
4. **Split lock hierarchies** into smaller, logical groups
5. **Consider architectural changes** to reduce lock complexity

## Background

### Why Does This Matter?

Slow TypeScript compilation affects:
- **Developer experience**: Slow autocomplete and error checking in IDEs
- **CI/CD pipelines**: Longer build times
- **Code quality**: Developers may disable type checking if it's too slow

### The Problem with Exponential Types

`OrderedSubsequences<readonly [1,2,3,...,N]>` generates 2^N type combinations. This means:
- Level 10: 1,024 combinations
- Level 15: 32,768 combinations ⚠️
- Level 20: 1,048,576 combinations

TypeScript must evaluate all these possibilities when checking function parameter compatibility, leading to performance issues.

### Why Level 15 Specifically?

The 32,768 combinations at level 15 appear to hit an internal threshold in TypeScript's type checker where it changes optimization strategies. Interestingly, level 16 performs better, suggesting TypeScript uses different algorithms for very large union types.

## Contributing

To add more analysis:

1. Create a new analysis script in `scripts/`
2. Follow the existing patterns for measuring compilation time
3. Generate a markdown report in `doc/`
4. Update this README with links to your new report

## References

- [TypeScript Performance Wiki](https://github.com/microsoft/TypeScript/wiki/Performance)
- [TypeScript Deep Dive: Type System Performance](https://basarat.gitbook.io/typescript/type-system)
- [IronGuard Repository](https://github.com/MarkDrei/IronGuard)
