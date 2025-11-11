# IronGuard Compile Time Analysis

This folder contains tools and documentation for analyzing TypeScript compilation performance of IronGuard's lock types.

## Quick Start

```bash
# Run complete analysis
npm run analyze:all

# View results
cat compile-time-analysis/FINDINGS.md
```

## Contents

- **`USAGE.md`** - Complete usage guide and documentation
- **`FINDINGS.md`** - Performance analysis summary and recommendations
- **`compile-time-analysis.js`** - Main analysis script (tests levels 1-20)
- **`detailed-analysis-level15.js`** - Deep dive into level 15 threshold
- **`results.json`** - Raw performance data (generated after running analysis)

## Key Finding

Lock level 15 causes a 2x compilation slowdown with `OrderedSubsequences`. Use `AllPrefixes` instead or stay at level 14.

## Documentation

- **Start here**: Read `USAGE.md` for how to run and interpret the analysis
- **Then read**: `FINDINGS.md` for detailed performance data and recommendations

## Requirements

- Node.js 16+
- TypeScript 5.0+
- ~10 minutes to run full analysis
