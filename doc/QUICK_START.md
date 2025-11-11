# Compile Time Analysis - Quick Start Guide

> **TL;DR**: Lock level 15 causes 2x compile slowdown with `OrderedSubsequences`. Use `AllPrefixes` instead or stay at level 14.

## 🚀 Quick Start

### Run the Analysis
```bash
npm run analyze:all
```

### View the Results
```bash
# Visual guide (START HERE)
cat doc/compile-time-visual-summary.md

# Comprehensive report
cat doc/compile-time-analysis-comprehensive-report.md

# Deep dive into level 15
cat doc/detailed-analysis-level15.md
```

## 📊 Key Findings (30 Second Version)

### The Problem
Using `OrderedSubsequences` at lock level 15 causes TypeScript compilation to slow down by 2x:
- **Levels 1-14**: ~1.6s compile time ✅
- **Level 15**: ~2.2s compile time ⚠️ (2x slower than expected)
- **Levels 16-20**: ~1.4s compile time ✅ (recovers but still slower than AllPrefixes)

### The Solution
```typescript
// ❌ Slow at level 15
type Slow = OrderedSubsequences<readonly [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]>;

// ✅ Fast at any level
type Fast = AllPrefixes<readonly [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]>;
```

## 🎯 What Should I Use?

| Scenario | Recommendation |
|----------|----------------|
| Need lock skipping & ≤14 locks | `OrderedSubsequences` |
| Need lock skipping & ≥15 locks | Redesign or use `AllPrefixes` |
| Sequential locks only | `AllPrefixes` (always) |
| Maximum flexibility needed | `ValidLockXContext<T>` types |

## 🔍 Understanding the Types

### OrderedSubsequences
**What it does**: Generates all possible ordered combinations
```typescript
OrderedSubsequences<[1,2,3]> = [] | [1] | [2] | [3] | [1,2] | [1,3] | [2,3] | [1,2,3]
```
**Combinations**: 2^N (exponential)  
**Use when**: You need flexibility to skip locks

### AllPrefixes
**What it does**: Generates sequential prefixes only
```typescript
AllPrefixes<[1,2,3]> = [] | [1] | [1,2] | [1,2,3]
```
**Combinations**: N+1 (linear)  
**Use when**: Locks are always acquired in order

## 📈 Performance Comparison

```
Lock Level    OrderedSubsequences    AllPrefixes    Difference
    10              1.1s                1.0s            10%
    14              1.7s                1.0s            70%
    15              2.2s                1.0s           120% ⚠️
    20              1.4s                1.0s            40%
```

## ⚡ Performance Impact

### On Development
- **< 1s**: No noticeable impact, instant feedback
- **1-2s**: Slight delay, acceptable
- **2-3s**: Noticeable lag in IDE autocomplete ⚠️
- **> 3s**: Frustrating developer experience ❌

### On CI/CD
- Adds 1-2 seconds to build time at level 15
- Multiplied across all build steps
- Can add minutes to full CI pipeline

## 🛠️ Migration Guide

### If Using OrderedSubsequences at Level 15+

**Option 1**: Switch to AllPrefixes (Easiest)
```typescript
// Change one line
- type MyLocks = OrderedSubsequences<readonly [1,2,...,15]>;
+ type MyLocks = AllPrefixes<readonly [1,2,...,15]>;
```

**Option 2**: Reduce to 14 locks (Best performance with flexibility)
```typescript
// Use only 14 levels
type MyLocks = OrderedSubsequences<readonly [1,2,...,14]>;
```

**Option 3**: Split into groups (For many locks)
```typescript
type Group1 = OrderedSubsequences<readonly [1,2,3,4,5]>;
type Group2 = OrderedSubsequences<readonly [6,7,8,9,10]>;
type Group3 = OrderedSubsequences<readonly [11,12,13,14]>;
```

## 🎓 Learning More

### Read Next
1. **Visual Summary** (`doc/compile-time-visual-summary.md`) - Charts and decision trees
2. **Comprehensive Report** (`doc/compile-time-analysis-comprehensive-report.md`) - Full analysis
3. **Level 15 Deep Dive** (`doc/detailed-analysis-level15.md`) - Why level 15 is special

### Run Your Own Analysis
```bash
# Full analysis (10 minutes)
npm run analyze:all

# Quick test of specific level
node scripts/compile-time-analysis.js
```

### Understand the Code
- `src/core/ironGuardSystem.ts` - Type definitions
- `src/examples/contextTransferDemo.ts` - Usage examples

## 💡 Best Practices

1. **Default to AllPrefixes** unless you specifically need lock skipping
2. **Stay at 14 locks or below** when using OrderedSubsequences
3. **Measure before scaling** - run the analysis if you add more locks
4. **Consider alternatives** at level 15+ (see migration guide)
5. **Monitor CI times** - watch for compile time regressions

## ❓ FAQ

**Q: Why does level 15 specifically slow down?**  
A: The 2^15 = 32,768 combinations hit a threshold in TypeScript's type checker where it changes optimization strategies.

**Q: Why does level 16 recover?**  
A: TypeScript appears to use different optimizations for very large union types (65,536+ combinations).

**Q: Should I never use OrderedSubsequences?**  
A: No! It's great for levels 1-14. Just be aware of the level 15 threshold.

**Q: Can this be fixed in TypeScript?**  
A: Potentially, but it's a complex optimization tradeoff. Better to work within current constraints.

**Q: What if I need 20 flexible lock levels?**  
A: Consider redesigning your lock architecture into smaller hierarchies or using AllPrefixes with manual validation.

## 🚨 Common Mistakes

❌ Using OrderedSubsequences at level 15 without measuring  
❌ Assuming compile time scales linearly  
❌ Not considering AllPrefixes as an alternative  
❌ Adding locks without checking performance impact  

✅ Measure compile times when adding locks  
✅ Use AllPrefixes by default  
✅ Stay at level 14 or below for OrderedSubsequences  
✅ Run analysis tools before committing changes  

## 📞 Getting Help

1. Read the comprehensive report
2. Run the analysis tools yourself
3. Check the visual summary for quick reference
4. Open an issue if you find new patterns

---

**Last Updated**: 2025-11-11  
**Analysis Version**: 1.0  
**TypeScript Version Tested**: 5.0+
