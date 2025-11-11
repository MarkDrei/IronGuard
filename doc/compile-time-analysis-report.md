# IronGuard Compile Time Analysis Report

**Generated**: 2025-11-11T07:17:01.975Z

**Purpose**: Analyze TypeScript compilation performance for different lock levels

## Executive Summary

This report analyzes the compilation time impact of the `OrderedSubsequences` and `AllPrefixes` types
as the number of lock levels increases. The types generate exponential combinations (2^N for OrderedSubsequences),
which can significantly impact TypeScript compilation performance.

## Methodology

For each lock level, we measured compilation time in three scenarios:

1. **Type Definition Only**: Just defining the OrderedSubsequences and AllPrefixes types
2. **With Function Usage**: Using the type as a function parameter
3. **Multiple Functions**: Using the type in multiple function signatures

Each measurement was averaged over 3 iterations with a 2-minute timeout.

## Results

### Compilation Times by Lock Level

| Lock Level | Type Def Only (ms) | With Function (ms) | Multiple Functions (ms) | Growth Factor |
|------------|-------------------|-------------------|------------------------|---------------|
| 1 | 1030 | 1082 | 1067 | -x |
| 2 | 1030 | 1038 | 1015 | 1.00x |
| 3 | 1025 | 1027 | 1021 | 1.00x |
| 4 | 1043 | 1029 | 1010 | 1.02x |
| 5 | 1010 | 1019 | 1007 | 0.97x |
| 6 | 1013 | 1024 | 1035 | 1.00x |
| 7 | 1043 | 1045 | 1047 | 1.03x |
| 8 | 1019 | 1051 | 1058 | 0.98x |
| 9 | 1035 | 1054 | 1066 | 1.02x |
| 10 | 1023 | 1085 | 1090 | 0.99x |
| 11 | 1025 | 1124 | 1132 | 1.00x |
| 12 | 1030 | 1220 | 1214 | 1.01x |
| 13 | 1049 | 1321 | 1314 | 1.02x |
| 14 | 1088 | 1620 | 1649 | 1.04x |
| 15 | 1117 | 2162 | 2182 | 1.03x |
| 16 | 1233 | 1238 | 1242 | 1.10x |
| 17 | 1414 | 1432 | 1459 | 1.15x |
| 18 | 1436 | 1435 | 1428 | 1.02x |
| 19 | 1421 | 1428 | 1451 | 0.99x |
| 20 | 1439 | 1429 | 1456 | 1.01x |

### Analysis

- **1-second threshold**: Crossed at lock level 1 (1030ms)

#### Impact Analysis

- **Function usage overhead**: Average +10.4% compile time
- **Multiple functions overhead**: Average +10.7% compile time
- **Primary bottleneck**: Type definition computation

#### Exponential Growth

- **Average growth factor**: 1.02x per lock level
- **Theoretical complexity**: O(2^N) for OrderedSubsequences
- **Observed behavior**: Better than worst-case exponential

## Recommendations

### ✅ Recommended Maximum: Lock Level 20
- Compilation time: ~1439ms
- Impact: Minimal performance impact on development experience
- Use case: Suitable for most applications

## Optimization Strategies

1. **Use AllPrefixes instead of OrderedSubsequences** when lock skipping is not needed
   - AllPrefixes has O(N) complexity vs O(2^N) for OrderedSubsequences
2. **Limit lock levels** to the recommended maximum
3. **Use specific lock types** (e.g., ValidLock3Context) instead of flexible types when possible
4. **Consider lock level grouping** if you need many locks (e.g., group related locks)

## Conclusion

For optimal development experience, limit 
OrderedSubsequences usage to lock level 20 or below. 
If more lock levels are needed, prefer AllPrefixes or use specific ValidLockXContext types.
