# Detailed Lock Level Analysis - Focus on Level 15

**Generated**: 2025-11-11T07:23:56.581Z

**Purpose**: Deep dive into compilation performance at critical lock levels

## Overview

This analysis focuses on lock levels around 15 where performance issues were reported.
We compare OrderedSubsequences vs AllPrefixes and analyze the impact of function usage.

## Results by Lock Level

### Lock Level 10

| Scenario | Avg (ms) | Min (ms) | Max (ms) |
|----------|----------|----------|----------|
| OrderedSubsequences Type Only | 1038 | 1029 | 1047 |
| AllPrefixes Type Only | 1026 | 1005 | 1049 |
| OrderedSubsequences with Single Function | 1098 | 1081 | 1110 |
| AllPrefixes with Single Function | 1020 | 1006 | 1034 |
| OrderedSubsequences with 3 Functions | 1105 | 1086 | 1119 |
| AllPrefixes with 3 Functions | 1027 | 1009 | 1038 |
| OrderedSubsequences with 5 Functions | 1108 | 1101 | 1113 |
| AllPrefixes with 5 Functions | 1035 | 1027 | 1044 |

### Lock Level 13

| Scenario | Avg (ms) | Min (ms) | Max (ms) |
|----------|----------|----------|----------|
| OrderedSubsequences Type Only | 1075 | 1061 | 1090 |
| AllPrefixes Type Only | 1021 | 1012 | 1034 |
| OrderedSubsequences with Single Function | 1337 | 1330 | 1349 |
| AllPrefixes with Single Function | 1023 | 1013 | 1031 |
| OrderedSubsequences with 3 Functions | 1324 | 1300 | 1334 |
| AllPrefixes with 3 Functions | 1036 | 1030 | 1045 |
| OrderedSubsequences with 5 Functions | 1334 | 1321 | 1353 |
| AllPrefixes with 5 Functions | 1017 | 1007 | 1021 |

### Lock Level 14

| Scenario | Avg (ms) | Min (ms) | Max (ms) |
|----------|----------|----------|----------|
| OrderedSubsequences Type Only | 1102 | 1092 | 1124 |
| AllPrefixes Type Only | 1026 | 1014 | 1035 |
| OrderedSubsequences with Single Function | 1665 | 1651 | 1684 |
| AllPrefixes with Single Function | 1039 | 1024 | 1048 |
| OrderedSubsequences with 3 Functions | 1650 | 1635 | 1675 |
| AllPrefixes with 3 Functions | 1029 | 1018 | 1044 |
| OrderedSubsequences with 5 Functions | 1640 | 1634 | 1648 |
| AllPrefixes with 5 Functions | 1038 | 1032 | 1048 |

### Lock Level 15

| Scenario | Avg (ms) | Min (ms) | Max (ms) |
|----------|----------|----------|----------|
| OrderedSubsequences Type Only | 1132 | 1115 | 1151 |
| AllPrefixes Type Only | 1022 | 1006 | 1030 |
| OrderedSubsequences with Single Function | 2185 | 2170 | 2198 |
| AllPrefixes with Single Function | 1032 | 1017 | 1042 |
| OrderedSubsequences with 3 Functions | 2166 | 2158 | 2177 |
| AllPrefixes with 3 Functions | 1021 | 1015 | 1028 |
| OrderedSubsequences with 5 Functions | 2165 | 2156 | 2177 |
| AllPrefixes with 5 Functions | 1027 | 1018 | 1043 |

### Lock Level 16

| Scenario | Avg (ms) | Min (ms) | Max (ms) |
|----------|----------|----------|----------|
| OrderedSubsequences Type Only | 1228 | 1218 | 1234 |
| AllPrefixes Type Only | 1033 | 1028 | 1038 |
| OrderedSubsequences with Single Function | 1249 | 1232 | 1267 |
| AllPrefixes with Single Function | 1030 | 1021 | 1039 |
| OrderedSubsequences with 3 Functions | 1249 | 1235 | 1265 |
| AllPrefixes with 3 Functions | 1029 | 1019 | 1045 |
| OrderedSubsequences with 5 Functions | 1256 | 1248 | 1270 |
| AllPrefixes with 5 Functions | 1037 | 1029 | 1044 |

### Lock Level 17

| Scenario | Avg (ms) | Min (ms) | Max (ms) |
|----------|----------|----------|----------|
| OrderedSubsequences Type Only | 1432 | 1416 | 1452 |
| AllPrefixes Type Only | 1032 | 1027 | 1040 |
| OrderedSubsequences with Single Function | 1453 | 1444 | 1472 |
| AllPrefixes with Single Function | 1032 | 1025 | 1044 |
| OrderedSubsequences with 3 Functions | 1475 | 1467 | 1483 |
| AllPrefixes with 3 Functions | 1035 | 1024 | 1048 |
| OrderedSubsequences with 5 Functions | 1484 | 1478 | 1489 |
| AllPrefixes with 5 Functions | 1040 | 1024 | 1063 |

### Lock Level 20

| Scenario | Avg (ms) | Min (ms) | Max (ms) |
|----------|----------|----------|----------|
| OrderedSubsequences Type Only | 1447 | 1431 | 1461 |
| AllPrefixes Type Only | 1023 | 1016 | 1032 |
| OrderedSubsequences with Single Function | 1448 | 1424 | 1472 |
| AllPrefixes with Single Function | 1040 | 1029 | 1049 |
| OrderedSubsequences with 3 Functions | 1454 | 1442 | 1475 |
| AllPrefixes with 3 Functions | 1033 | 1029 | 1038 |
| OrderedSubsequences with 5 Functions | 1458 | 1446 | 1470 |
| AllPrefixes with 5 Functions | 1042 | 1033 | 1053 |

## Analysis

### OrderedSubsequences vs AllPrefixes

At lock level 15 with single function usage:
- OrderedSubsequences: 2185ms
- AllPrefixes: 1032ms
- **Ratio**: OrderedSubsequences is 2.12x slower

### Impact of Function Count

How does the number of functions using the type affect compilation time?

**Lock Level 15** (OrderedSubsequences):
- Type only: 1132ms
- 1 function: 2185ms (+93%)
- 3 functions: 2166ms (+91%)
- 5 functions: 2165ms (+91%)

**Lock Level 16** (OrderedSubsequences):
- Type only: 1228ms
- 1 function: 1249ms (+2%)
- 3 functions: 1249ms (+2%)
- 5 functions: 1256ms (+2%)

**Lock Level 17** (OrderedSubsequences):
- Type only: 1432ms
- 1 function: 1453ms (+1%)
- 3 functions: 1475ms (+3%)
- 5 functions: 1484ms (+4%)

## Key Findings

1. **Type Definition Computation**: The type definition itself compiles quickly
2. **Function Usage Overhead**: Using the type in function parameters significantly increases compile time
3. **Lock Level 15**: Shows notable performance degradation with function usage
4. **OrderedSubsequences vs AllPrefixes**: Compare which is more efficient for your use case
5. **Scaling**: Performance impact scales with both lock level AND number of function usages

## Recommendations

1. **Prefer AllPrefixes** when lock skipping is not needed (typically faster)
2. **Minimize function usage** of complex union types like OrderedSubsequences at high lock levels
3. **Consider alternative patterns** for lock level 15+, such as:
   - Use specific ValidLockXContext types instead of flexible unions
   - Break down into smaller lock hierarchies
   - Use type aliases strategically to reduce type expansion
