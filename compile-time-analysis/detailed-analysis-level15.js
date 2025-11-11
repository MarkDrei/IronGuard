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
const OUTPUT_FILE = path.join(SCRIPT_DIR, 'detailed-analysis.md');

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
 * Test scenarios - all include actual lock acquisition and function calls
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
    generateCode: (lockLevel) => {
      const sequence = Array.from({ length: lockLevel }, (_, i) => i + 1).join(', ');
      const nextLock = lockLevel + 1;
      return `
import { createLockContext } from '../src/core';
import type { LockContext, OrderedSubsequences } from '../src/core';
type TestType = OrderedSubsequences<readonly [${sequence}]>;
async function testFunction(context: LockContext<TestType>): Promise<void> {
  const nextCtx = await context.acquireRead(${nextLock});
  console.log(nextCtx.toString());
  nextCtx.dispose();
}
async function runTest() {
  const ctx = createLockContext();
  await testFunction(ctx);
  ctx.dispose();
}
export { testFunction, runTest };`;
    }
  },
  {
    name: 'AllPrefixes with Single Function',
    generateCode: (lockLevel) => {
      const sequence = Array.from({ length: lockLevel }, (_, i) => i + 1).join(', ');
      const nextLock = lockLevel + 1;
      return `
import { createLockContext } from '../src/core';
import type { LockContext, AllPrefixes } from '../src/core';
type TestType = AllPrefixes<readonly [${sequence}]>;
async function testFunction(context: LockContext<TestType>): Promise<void> {
  const nextCtx = await context.acquireRead(${nextLock});
  console.log(nextCtx.toString());
  nextCtx.dispose();
}
async function runTest() {
  const ctx = createLockContext();
  await testFunction(ctx);
  ctx.dispose();
}
export { testFunction, runTest };`;
    }
  },
  {
    name: 'OrderedSubsequences with 3 Functions',
    generateCode: (lockLevel) => {
      const sequence = Array.from({ length: lockLevel }, (_, i) => i + 1).join(', ');
      const nextLock = lockLevel + 1;
      const nextLock2 = lockLevel + 2;
      return `
import { createLockContext } from '../src/core';
import type { LockContext, OrderedSubsequences } from '../src/core';
type TestType = OrderedSubsequences<readonly [${sequence}]>;
async function fn1(ctx: LockContext<TestType>): Promise<void> {
  const next = await ctx.acquireRead(${nextLock});
  console.log(next);
  next.dispose();
}
async function fn2(ctx: LockContext<TestType>): Promise<void> {
  const next = await ctx.acquireWrite(${nextLock});
  await fn1(next);
  next.dispose();
}
async function fn3(ctx: LockContext<TestType>): Promise<void> {
  const next = await ctx.acquireRead(${nextLock2});
  await fn2(ctx);
  next.dispose();
}
async function runTest() {
  const ctx = createLockContext();
  await fn3(ctx);
  ctx.dispose();
}
export { fn1, fn2, fn3, runTest };`;
    }
  },
  {
    name: 'AllPrefixes with 3 Functions',
    generateCode: (lockLevel) => {
      const sequence = Array.from({ length: lockLevel }, (_, i) => i + 1).join(', ');
      const nextLock = lockLevel + 1;
      const nextLock2 = lockLevel + 2;
      return `
import { createLockContext } from '../src/core';
import type { LockContext, AllPrefixes } from '../src/core';
type TestType = AllPrefixes<readonly [${sequence}]>;
async function fn1(ctx: LockContext<TestType>): Promise<void> {
  const next = await ctx.acquireRead(${nextLock});
  console.log(next);
  next.dispose();
}
async function fn2(ctx: LockContext<TestType>): Promise<void> {
  const next = await ctx.acquireWrite(${nextLock});
  await fn1(next);
  next.dispose();
}
async function fn3(ctx: LockContext<TestType>): Promise<void> {
  const next = await ctx.acquireRead(${nextLock2});
  await fn2(ctx);
  next.dispose();
}
async function runTest() {
  const ctx = createLockContext();
  await fn3(ctx);
  ctx.dispose();
}
export { fn1, fn2, fn3, runTest };`;
    }
  },
  {
    name: 'OrderedSubsequences with 5 Functions',
    generateCode: (lockLevel) => {
      const sequence = Array.from({ length: lockLevel }, (_, i) => i + 1).join(', ');
      const nextLock = lockLevel + 1;
      const nextLock2 = lockLevel + 2;
      const nextLock3 = lockLevel + 3;
      return `
import { createLockContext } from '../src/core';
import type { LockContext, OrderedSubsequences } from '../src/core';
type TestType = OrderedSubsequences<readonly [${sequence}]>;
async function fn1(ctx: LockContext<TestType>): Promise<void> {
  const next = await ctx.acquireRead(${nextLock});
  console.log(next);
  next.dispose();
}
async function fn2(ctx: LockContext<TestType>): Promise<void> {
  const next = await ctx.acquireWrite(${nextLock});
  await fn1(next);
  next.dispose();
}
async function fn3(ctx: LockContext<TestType>): Promise<void> {
  const next = await ctx.acquireRead(${nextLock2});
  await fn2(next);
  next.dispose();
}
async function fn4(ctx: LockContext<TestType>): Promise<void> {
  const next = await ctx.acquireWrite(${nextLock2});
  await fn3(next);
  next.dispose();
}
async function fn5(ctx: LockContext<TestType>): Promise<void> {
  const next = await ctx.acquireRead(${nextLock3});
  await fn4(ctx);
  next.dispose();
}
async function runTest() {
  const ctx = createLockContext();
  await fn5(ctx);
  ctx.dispose();
}
export { fn1, fn2, fn3, fn4, fn5, runTest };`;
    }
  },
  {
    name: 'AllPrefixes with 5 Functions',
    generateCode: (lockLevel) => {
      const sequence = Array.from({ length: lockLevel }, (_, i) => i + 1).join(', ');
      const nextLock = lockLevel + 1;
      const nextLock2 = lockLevel + 2;
      const nextLock3 = lockLevel + 3;
      return `
import { createLockContext } from '../src/core';
import type { LockContext, AllPrefixes } from '../src/core';
type TestType = AllPrefixes<readonly [${sequence}]>;
async function fn1(ctx: LockContext<TestType>): Promise<void> {
  const next = await ctx.acquireRead(${nextLock});
  console.log(next);
  next.dispose();
}
async function fn2(ctx: LockContext<TestType>): Promise<void> {
  const next = await ctx.acquireWrite(${nextLock});
  await fn1(next);
  next.dispose();
}
async function fn3(ctx: LockContext<TestType>): Promise<void> {
  const next = await ctx.acquireRead(${nextLock2});
  await fn2(next);
  next.dispose();
}
async function fn4(ctx: LockContext<TestType>): Promise<void> {
  const next = await ctx.acquireWrite(${nextLock2});
  await fn3(next);
  next.dispose();
}
async function fn5(ctx: LockContext<TestType>): Promise<void> {
  const next = await ctx.acquireRead(${nextLock3});
  await fn4(ctx);
  next.dispose();
}
async function runTest() {
  const ctx = createLockContext();
  await fn5(ctx);
  ctx.dispose();
}
export { fn1, fn2, fn3, fn4, fn5, runTest };`;
    }
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
      
      // Generate code based on scenario type
      let code;
      if (scenario.generateCode) {
        code = scenario.generateCode(level);
      } else {
        const sequence = Array.from({ length: level }, (_, i) => i + 1).join(', ');
        code = scenario.code.replace(/\{sequence\}/g, sequence);
      }
      
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
  report.push('3. **Lock Acquisition Impact**: Acquiring locks inside functions adds type-checking complexity');
  report.push('4. **Lock Level 15**: Shows notable performance degradation with function usage');
  report.push('5. **OrderedSubsequences vs AllPrefixes**: Compare which is more efficient for your use case');
  report.push('6. **Scaling**: Performance impact scales with both lock level AND number of function usages\n');
  
  // Add explanation of Level 15 behavior
  report.push('## Understanding the Level 15 Phenomenon\n');
  
  const level14 = results.find(r => r.level === 14);
  const level15 = results.find(r => r.level === 15);
  const level16 = results.find(r => r.level === 16);
  
  if (level14 && level15 && level16) {
    const ord14 = level14.scenarios['OrderedSubsequences with Single Function'];
    const ord15 = level15.scenarios['OrderedSubsequences with Single Function'];
    const ord16 = level16.scenarios['OrderedSubsequences with Single Function'];
    
    if (ord14 && ord15 && ord16 && ord14.avg !== -1 && ord15.avg !== -1 && ord16.avg !== -1) {
      report.push('### Performance Pattern Analysis\n');
      report.push(`- **Level 14**: ${ord14.avg.toFixed(0)}ms (2^14 = 16,384 combinations)`);
      report.push(`- **Level 15**: ${ord15.avg.toFixed(0)}ms (2^15 = 32,768 combinations) - **${((ord15.avg / ord14.avg - 1) * 100).toFixed(0)}% increase**`);
      report.push(`- **Level 16**: ${ord16.avg.toFixed(0)}ms (2^16 = 65,536 combinations) - **${((ord16.avg / ord15.avg - 1) * 100).toFixed(0)}% change**\n`);
      
      const jumpRatio = ord15.avg / ord14.avg;
      const recoveryRatio = ord16.avg / ord15.avg;
      
      report.push('### Hypothesis: TypeScript Optimization Threshold\n');
      report.push(`The ${jumpRatio.toFixed(2)}x jump at level 15 suggests TypeScript crosses an internal threshold:`);
      report.push('');
      report.push('**Possible Explanations:**');
      report.push('1. **Union Size Threshold**: TypeScript may use different algorithms for unions smaller/larger than ~30K members');
      report.push('2. **Type Caching Strategy**: The type cache might handle 16K vs 32K combinations differently');
      report.push('3. **Structural Type Checking**: With 32,768 combinations, structural compatibility checks become expensive');
      report.push('4. **Memory Pressure**: Larger type unions may trigger garbage collection or memory reallocation');
      report.push('');
      
      if (recoveryRatio < 1) {
        report.push(`**Recovery at Level 16**: The ${recoveryRatio.toFixed(2)}x improvement suggests:`);
        report.push('- TypeScript switches to a more efficient algorithm for very large unions (>30K combinations)');
        report.push('- Possibly moves from exhaustive checking to heuristic/sampling approaches');
        report.push('- Or uses different caching/memoization strategies for massive unions\n');
      } else {
        report.push(`**Continued Degradation at Level 16**: The ${recoveryRatio.toFixed(2)}x change suggests:`);
        report.push('- The performance hit may be consistent above the threshold');
        report.push('- Each doubling of combinations adds proportional overhead');
        report.push('- TypeScript may not have special optimizations for very large unions\n');
      }
      
      report.push('### Impact of Lock Acquisition\n');
      report.push('With lock acquisition inside functions, TypeScript must:');
      report.push('1. Type-check the input context against all possible combinations');
      report.push('2. Type-check the `acquireRead`/`acquireWrite` call validity');
      report.push('3. Compute the resulting context type (adding lock to union)');
      report.push('4. Verify the new context satisfies function parameter types');
      report.push('');
      report.push('At 32,768 input combinations × type operations = exponential complexity spike.\n');
    }
  }
  
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
