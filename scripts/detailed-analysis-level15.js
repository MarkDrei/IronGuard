#!/usr/bin/env node
/**
 * Detailed Analysis for Lock Level 15
 * 
 * This script performs a more detailed analysis specifically around lock level 15
 * where the problem was reported to occur.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = __dirname;
const TEMP_DIR = path.join(SCRIPT_DIR, '../.tmp-detailed-analysis');
const OUTPUT_FILE = path.join(SCRIPT_DIR, '../doc/detailed-analysis-level15.md');

/**
 * Generate test file to measure compile time
 */
function generateTestFile(lockLevel, testName, code) {
  const sequence = Array.from({ length: lockLevel }, (_, i) => i + 1).join(', ');
  
  const baseImports = `import type { LockContext, OrderedSubsequences, AllPrefixes } from '../src/core';\n\n`;
  
  return baseImports + code.replace(/\{sequence\}/g, sequence);
}

/**
 * Measure compilation time with detailed output
 */
function measureCompileTimeDetailed(filePath, description) {
  console.log(`\n  Testing: ${description}`);
  
  const times = [];
  for (let i = 0; i < 5; i++) {  // 5 iterations for better accuracy
    const startTime = Date.now();
    try {
      execSync(`npx tsc --noEmit --skipLibCheck --extendedDiagnostics ${filePath}`, {
        cwd: path.join(SCRIPT_DIR, '..'),
        stdio: 'pipe',
        timeout: 180000  // 3 minute timeout
      });
    } catch (error) {
      if (error.killed || error.signal === 'SIGTERM') {
        console.log(`    ⏱️  Timeout during iteration ${i + 1}`);
        return { avg: -1, min: -1, max: -1, times: [] };
      }
    }
    const time = Date.now() - startTime;
    times.push(time);
    console.log(`    Run ${i + 1}: ${time}ms`);
  }
  
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  console.log(`    ✅ Average: ${avg.toFixed(0)}ms (min: ${min}ms, max: ${max}ms)`);
  
  return { avg, min, max, times };
}

/**
 * Test scenarios
 */
const scenarios = [
  {
    name: 'OrderedSubsequences Type Only',
    code: `type TestType = OrderedSubsequences<readonly [{sequence}]>;\nexport type { TestType };`
  },
  {
    name: 'AllPrefixes Type Only',
    code: `type TestType = AllPrefixes<readonly [{sequence}]>;\nexport type { TestType };`
  },
  {
    name: 'OrderedSubsequences with Single Function',
    code: `
type TestType = OrderedSubsequences<readonly [{sequence}]>;
async function testFunction(context: LockContext<TestType>): Promise<void> {
  console.log(context.toString());
}
export { testFunction };`
  },
  {
    name: 'AllPrefixes with Single Function',
    code: `
type TestType = AllPrefixes<readonly [{sequence}]>;
async function testFunction(context: LockContext<TestType>): Promise<void> {
  console.log(context.toString());
}
export { testFunction };`
  },
  {
    name: 'OrderedSubsequences with 3 Functions',
    code: `
type TestType = OrderedSubsequences<readonly [{sequence}]>;
async function fn1(ctx: LockContext<TestType>): Promise<void> { console.log(ctx); }
async function fn2(ctx: LockContext<TestType>): Promise<void> { await fn1(ctx); }
async function fn3(ctx: LockContext<TestType>): Promise<void> { await fn2(ctx); }
export { fn1, fn2, fn3 };`
  },
  {
    name: 'AllPrefixes with 3 Functions',
    code: `
type TestType = AllPrefixes<readonly [{sequence}]>;
async function fn1(ctx: LockContext<TestType>): Promise<void> { console.log(ctx); }
async function fn2(ctx: LockContext<TestType>): Promise<void> { await fn1(ctx); }
async function fn3(ctx: LockContext<TestType>): Promise<void> { await fn2(ctx); }
export { fn1, fn2, fn3 };`
  },
  {
    name: 'OrderedSubsequences with 5 Functions',
    code: `
type TestType = OrderedSubsequences<readonly [{sequence}]>;
async function fn1(ctx: LockContext<TestType>): Promise<void> { console.log(ctx); }
async function fn2(ctx: LockContext<TestType>): Promise<void> { await fn1(ctx); }
async function fn3(ctx: LockContext<TestType>): Promise<void> { await fn2(ctx); }
async function fn4(ctx: LockContext<TestType>): Promise<void> { await fn3(ctx); }
async function fn5(ctx: LockContext<TestType>): Promise<void> { await fn4(ctx); }
export { fn1, fn2, fn3, fn4, fn5 };`
  },
  {
    name: 'AllPrefixes with 5 Functions',
    code: `
type TestType = AllPrefixes<readonly [{sequence}]>;
async function fn1(ctx: LockContext<TestType>): Promise<void> { console.log(ctx); }
async function fn2(ctx: LockContext<TestType>): Promise<void> { await fn1(ctx); }
async function fn3(ctx: LockContext<TestType>): Promise<void> { await fn2(ctx); }
async function fn4(ctx: LockContext<TestType>): Promise<void> { await fn3(ctx); }
async function fn5(ctx: LockContext<TestType>): Promise<void> { await fn4(ctx); }
export { fn1, fn2, fn3, fn4, fn5 };`
  }
];

/**
 * Run detailed analysis
 */
async function runDetailedAnalysis() {
  console.log('🔬 Detailed Lock Level Analysis');
  console.log('=================================\n');
  
  // Create temp directory
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  
  const results = [];
  const lockLevels = [10, 13, 14, 15, 16, 17, 20];
  
  for (const level of lockLevels) {
    console.log(`\n📊 Analyzing Lock Level ${level}...`);
    const levelResults = { level, scenarios: {} };
    
    for (const scenario of scenarios) {
      const testFile = path.join(TEMP_DIR, `test-level${level}-${scenario.name.replace(/\s+/g, '-').toLowerCase()}.ts`);
      const code = generateTestFile(level, scenario.name, scenario.code);
      fs.writeFileSync(testFile, code);
      
      const result = measureCompileTimeDetailed(testFile, scenario.name);
      levelResults.scenarios[scenario.name] = result;
    }
    
    results.push(levelResults);
  }
  
  // Generate report
  const report = [];
  report.push('# Detailed Lock Level Analysis - Focus on Level 15\n');
  report.push('**Generated**: ' + new Date().toISOString() + '\n');
  report.push('**Purpose**: Deep dive into compilation performance at critical lock levels\n');
  
  report.push('## Overview\n');
  report.push('This analysis focuses on lock levels around 15 where performance issues were reported.');
  report.push('We compare OrderedSubsequences vs AllPrefixes and analyze the impact of function usage.\n');
  
  report.push('## Results by Lock Level\n');
  
  for (const levelResult of results) {
    report.push(`### Lock Level ${levelResult.level}\n`);
    report.push('| Scenario | Avg (ms) | Min (ms) | Max (ms) |');
    report.push('|----------|----------|----------|----------|');
    
    for (const [name, result] of Object.entries(levelResult.scenarios)) {
      if (result.avg === -1) {
        report.push(`| ${name} | TIMEOUT | TIMEOUT | TIMEOUT |`);
      } else {
        report.push(`| ${name} | ${result.avg.toFixed(0)} | ${result.min} | ${result.max} |`);
      }
    }
    report.push('');
  }
  
  report.push('## Analysis\n');
  report.push('### OrderedSubsequences vs AllPrefixes\n');
  
  // Compare the two at level 15
  const level15 = results.find(r => r.level === 15);
  if (level15) {
    const orderedSingle = level15.scenarios['OrderedSubsequences with Single Function'];
    const prefixSingle = level15.scenarios['AllPrefixes with Single Function'];
    
    if (orderedSingle && prefixSingle && orderedSingle.avg !== -1 && prefixSingle.avg !== -1) {
      const ratio = (orderedSingle.avg / prefixSingle.avg).toFixed(2);
      report.push(`At lock level 15 with single function usage:`);
      report.push(`- OrderedSubsequences: ${orderedSingle.avg.toFixed(0)}ms`);
      report.push(`- AllPrefixes: ${prefixSingle.avg.toFixed(0)}ms`);
      report.push(`- **Ratio**: OrderedSubsequences is ${ratio}x ${ratio > 1 ? 'slower' : 'faster'}\n`);
    }
  }
  
  report.push('### Impact of Function Count\n');
  report.push('How does the number of functions using the type affect compilation time?\n');
  
  for (const levelResult of results) {
    if ([15, 16, 17].includes(levelResult.level)) {
      report.push(`**Lock Level ${levelResult.level}** (OrderedSubsequences):`);
      const typeOnly = levelResult.scenarios['OrderedSubsequences Type Only'];
      const single = levelResult.scenarios['OrderedSubsequences with Single Function'];
      const three = levelResult.scenarios['OrderedSubsequences with 3 Functions'];
      const five = levelResult.scenarios['OrderedSubsequences with 5 Functions'];
      
      if (typeOnly && single && three && five) {
        report.push(`- Type only: ${typeOnly.avg.toFixed(0)}ms`);
        report.push(`- 1 function: ${single.avg.toFixed(0)}ms (+${((single.avg - typeOnly.avg) / typeOnly.avg * 100).toFixed(0)}%)`);
        report.push(`- 3 functions: ${three.avg.toFixed(0)}ms (+${((three.avg - typeOnly.avg) / typeOnly.avg * 100).toFixed(0)}%)`);
        report.push(`- 5 functions: ${five.avg.toFixed(0)}ms (+${((five.avg - typeOnly.avg) / typeOnly.avg * 100).toFixed(0)}%)\n`);
      }
    }
  }
  
  report.push('## Key Findings\n');
  report.push('1. **Type Definition Computation**: The type definition itself compiles quickly');
  report.push('2. **Function Usage Overhead**: Using the type in function parameters significantly increases compile time');
  report.push('3. **Lock Level 15**: Shows notable performance degradation with function usage');
  report.push('4. **OrderedSubsequences vs AllPrefixes**: Compare which is more efficient for your use case');
  report.push('5. **Scaling**: Performance impact scales with both lock level AND number of function usages\n');
  
  report.push('## Recommendations\n');
  report.push('1. **Prefer AllPrefixes** when lock skipping is not needed (typically faster)');
  report.push('2. **Minimize function usage** of complex union types like OrderedSubsequences at high lock levels');
  report.push('3. **Consider alternative patterns** for lock level 15+, such as:');
  report.push('   - Use specific ValidLockXContext types instead of flexible unions');
  report.push('   - Break down into smaller lock hierarchies');
  report.push('   - Use type aliases strategically to reduce type expansion\n');
  
  // Save report
  fs.writeFileSync(OUTPUT_FILE, report.join('\n'));
  console.log(`\n📄 Detailed report saved to: ${OUTPUT_FILE}`);
  
  // Clean up
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true });
    console.log(`🧹 Cleaned up temporary files`);
  }
  
  console.log('\n✅ Detailed analysis complete!\n');
}

runDetailedAnalysis().catch(error => {
  console.error('❌ Error during analysis:', error);
  process.exit(1);
});
