#!/usr/bin/env node
/**
 * Compile Time Analysis Script
 * 
 * This script measures TypeScript compilation times for different lock level configurations
 * to understand the performance impact of OrderedSubsequences and AllPrefixes types.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Result structure:
// {
//   lockLevel: number;
//   typeDefinitionOnly: number;  // Time to compile just the type definition
//   withFunctionUsage: number;   // Time to compile with function parameter usage
//   withMultipleFunctions: number; // Time to compile with multiple function usages
// }

const SCRIPT_DIR = __dirname;
const TEMP_DIR = path.join(SCRIPT_DIR, '../.tmp-compile-analysis');
const RESULTS_FILE = path.join(SCRIPT_DIR, 'results.json');
const REPORT_FILE = path.join(SCRIPT_DIR, 'analysis-report.md');

/**
 * Generate test file with just type definitions
 * All cases from 1 to lockLevel are included in the sequence
 * @param {number} lockLevel 
 * @returns {string}
 */
function generateTypeDefinitionFile(lockLevel) {
  // Generate definitions for ALL levels 1..lockLevel in the same file
  let parts = [];
  parts.push("import type { LockContext, OrderedSubsequences, AllPrefixes } from '../src/core';\n");

  for (let k = 1; k <= lockLevel; k++) {
    const seq = Array.from({ length: k }, (_, i) => i + 1).join(', ');
    parts.push(`// Level ${k}\n`);
    parts.push(`type TestOrderedSubsequences_${k} = OrderedSubsequences<readonly [${seq}]>;\n`);
    parts.push(`type TestAllPrefixes_${k} = AllPrefixes<readonly [${seq}]>;\n\n`);
  }

  // Export all to avoid tree-shaking
  parts.push('// Export types to ensure full type-checking across levels\n');
  parts.push('export type { ' + Array.from({ length: lockLevel }, (_, i) => `TestOrderedSubsequences_${i+1}, TestAllPrefixes_${i+1}`).join(', ') + ' };\n');

  return parts.join('');
}

/**
 * Generate test file with function usage
 * Function uses the type and acquires an additional lock inside
 * @param {number} lockLevel
 * @returns {string}
 */
function generateFunctionUsageFile(lockLevel) {
  // Generate multiple function usages for all levels 1..lockLevel inside same file
  let parts = [];
  parts.push("import { createLockContext } from '../src/core';\nimport type { LockContext, OrderedSubsequences, AllPrefixes } from '../src/core';\n\n");

  for (let k = 1; k <= lockLevel; k++) {
    const seq = Array.from({ length: k }, (_, i) => i + 1).join(', ');
    const nextLock = k + 1;
    parts.push(`// Level ${k}\n`);
    parts.push(`type TestOrderedSubsequences_${k} = OrderedSubsequences<readonly [${seq}]>;\n`);
    parts.push(`type TestAllPrefixes_${k} = AllPrefixes<readonly [${seq}]>;\n\n`);

    parts.push(`async function testFunction_${k}(context: LockContext<TestOrderedSubsequences_${k}>): Promise<void> {\n`);
    parts.push(`  const nextContext = await context.acquireRead(${nextLock});\n`);
    parts.push(`  console.log(nextContext.toString());\n`);
    parts.push(`  nextContext.dispose();\n`);
    parts.push(`}\n\n`);
  }

  // runTest calls each generated function to force type-checking
  parts.push('async function runTest() {\n  const ctx = createLockContext();\n');
  for (let k = 1; k <= lockLevel; k++) {
    parts.push(`  await testFunction_${k}(ctx as any);\n`);
  }
  parts.push('  ctx.dispose();\n}\n\n');

  parts.push('export { ' + Array.from({ length: lockLevel }, (_, i) => `testFunction_${i+1}`).join(', ') + ', runTest };\n');
  parts.push('export type { ' + Array.from({ length: lockLevel }, (_, i) => `TestOrderedSubsequences_${i+1}, TestAllPrefixes_${i+1}`).join(', ') + ' };\n');

  return parts.join('');
}

/**
 * Generate test file with multiple function usages
 * Each function acquires an additional lock and is actually called
 * @param {number} lockLevel
 * @returns {string}
 */
function generateMultipleFunctionsFile(lockLevel) {
  // Generate a dense file that creates many interdependent functions across all levels
  let parts = [];
  parts.push("import { createLockContext } from '../src/core';\nimport type { LockContext, OrderedSubsequences, AllPrefixes } from '../src/core';\n\n");

  for (let k = 1; k <= lockLevel; k++) {
    const seq = Array.from({ length: k }, (_, i) => i + 1).join(', ');
    const nextLock = k + 1;
    const nextLock2 = k + 2;
    const nextLock3 = k + 3;

    parts.push(`// Level ${k}\n`);
    parts.push(`type TestOrderedSubsequences_${k} = OrderedSubsequences<readonly [${seq}]>;\n`);
    parts.push(`type TestAllPrefixes_${k} = AllPrefixes<readonly [${seq}]>;\n\n`);

    parts.push(`async function testFunction1_${k}(context: LockContext<TestOrderedSubsequences_${k}>): Promise<void> {\n`);
    parts.push(`  const nextCtx = await context.acquireRead(${nextLock});\n  console.log(nextCtx.toString());\n  nextCtx.dispose();\n}\n\n`);

    parts.push(`async function testFunction2_${k}(context: LockContext<TestAllPrefixes_${k}>): Promise<void> {\n`);
    parts.push(`  const nextCtx = await context.acquireWrite(${nextLock});\n  console.log(nextCtx.toString());\n  nextCtx.dispose();\n}\n\n`);

    parts.push(`async function testFunction3_${k}(context: LockContext<TestOrderedSubsequences_${k}>): Promise<void> {\n`);
    parts.push(`  const nextCtx = await context.acquireRead(${nextLock2});\n  await testFunction1_${k}(nextCtx as any);\n  nextCtx.dispose();\n}\n\n`);

    parts.push(`async function testFunction4_${k}(context: LockContext<TestAllPrefixes_${k}>): Promise<void> {\n`);
    parts.push(`  const nextCtx = await context.acquireWrite(${nextLock2});\n  await testFunction2_${k}(nextCtx as any);\n  nextCtx.dispose();\n}\n\n`);

    parts.push(`async function testFunction5_${k}(ctx1: LockContext<TestOrderedSubsequences_${k}>, ctx2: LockContext<TestAllPrefixes_${k}>): Promise<void> {\n`);
    parts.push(`  const next1 = await ctx1.acquireRead(${nextLock3});\n  const next2 = await ctx2.acquireWrite(${nextLock3});\n  console.log(next1.toString(), next2.toString());\n  next1.dispose();\n  next2.dispose();\n}\n\n`);
  }

  // runAllTests to call a few functions per level
  parts.push('async function runAllTests() {\n  const ctx = createLockContext();\n');
  for (let k = 1; k <= lockLevel; k++) {
    parts.push(`  await testFunction1_${k}(ctx as any);\n`);
    parts.push(`  await testFunction2_${k}(ctx as any);\n`);
  }
  parts.push('  ctx.dispose();\n}\n\n');

  parts.push('export { runAllTests };\n');
  parts.push('export type { ' + Array.from({ length: lockLevel }, (_, i) => `TestOrderedSubsequences_${i+1}, TestAllPrefixes_${i+1}`).join(', ') + ' };\n');

  return parts.join('');
}

/**
 * Measure compilation time for a given file
 * @param {string} filePath
 * @param {number} iterations
 * @returns {number}
 */
function measureCompileTime(filePath, iterations = 3) {
  const times = [];
  
  // Warm-up compilation (not counted)
  try {
    execSync(`npx tsc --noEmit --skipLibCheck ${filePath}`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
      timeout: 120000  // 2 minute timeout
    });
  } catch (error) {
    // Check if it's a timeout or actual compilation error
    if (error.killed || error.signal === 'SIGTERM') {
      console.error(`⏱️  Timeout during warm-up for ${path.basename(filePath)}`);
      return -1; // Indicate timeout
    }
    // Ignore type errors, we're just measuring time
  }
  
  // Actual measurements
  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();
    try {
      execSync(`npx tsc --noEmit --skipLibCheck ${filePath}`, {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe',
        timeout: 120000  // 2 minute timeout
      });
    } catch (error) {
      // Check if it's a timeout
      if (error.killed || error.signal === 'SIGTERM') {
        console.error(`⏱️  Timeout during iteration ${i + 1} for ${path.basename(filePath)}`);
        return -1; // Indicate timeout
      }
      // Ignore type errors, we're just measuring compilation time
    }
    const endTime = Date.now();
    times.push(endTime - startTime);
  }
  
  // Return average time
  return times.reduce((a, b) => a + b, 0) / times.length;
}

/**
 * Run analysis for a specific lock level
 * @param {number} lockLevel
 * @returns {object|null}
 */
function analyzeLockLevel(lockLevel) {
  console.log(`\n📊 Analyzing lock level ${lockLevel}...`);
  
  // Create temp directory if it doesn't exist
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  
  // Generate test files
  const typeDefFile = path.join(TEMP_DIR, `test-typedef-${lockLevel}.ts`);
  const funcUsageFile = path.join(TEMP_DIR, `test-function-${lockLevel}.ts`);
  const multipleFuncsFile = path.join(TEMP_DIR, `test-multiple-${lockLevel}.ts`);
  
  fs.writeFileSync(typeDefFile, generateTypeDefinitionFile(lockLevel));
  fs.writeFileSync(funcUsageFile, generateFunctionUsageFile(lockLevel));
  fs.writeFileSync(multipleFuncsFile, generateMultipleFunctionsFile(lockLevel));
  
  // Measure compilation times
  console.log(`  ⏱️  Measuring type definition only...`);
  const typeDefTime = measureCompileTime(typeDefFile);
  
  if (typeDefTime === -1) {
    console.log(`  ⚠️  Timeout at lock level ${lockLevel} - stopping analysis`);
    return null;
  }
  
  console.log(`  ⏱️  Measuring with function usage...`);
  const funcUsageTime = measureCompileTime(funcUsageFile);
  
  if (funcUsageTime === -1) {
    console.log(`  ⚠️  Timeout at lock level ${lockLevel} - stopping analysis`);
    return null;
  }
  
  console.log(`  ⏱️  Measuring with multiple functions...`);
  const multipleFuncsTime = measureCompileTime(multipleFuncsFile);
  
  if (multipleFuncsTime === -1) {
    console.log(`  ⚠️  Timeout at lock level ${lockLevel} - stopping analysis`);
    return null;
  }
  
  console.log(`  ✅ Type definition: ${typeDefTime.toFixed(0)}ms`);
  console.log(`  ✅ With function: ${funcUsageTime.toFixed(0)}ms`);
  console.log(`  ✅ Multiple functions: ${multipleFuncsTime.toFixed(0)}ms`);
  
  return {
    lockLevel,
    typeDefinitionOnly: typeDefTime,
    withFunctionUsage: funcUsageTime,
    withMultipleFunctions: multipleFuncsTime
  };
}

/**
 * Generate markdown report from results
 * @param {Array} results
 * @returns {string}
 */
function generateReport(results) {
  const report = [];
  
  report.push('# IronGuard Compile Time Analysis Report\n');
  report.push('**Generated**: ' + new Date().toISOString() + '\n');
  report.push('**Purpose**: Analyze TypeScript compilation performance for different lock levels\n');
  
  report.push('## Executive Summary\n');
  report.push('This report analyzes the compilation time impact of the `OrderedSubsequences` and `AllPrefixes` types');
  report.push('as the number of lock levels increases. The types generate exponential combinations (2^N for OrderedSubsequences),');
  report.push('which can significantly impact TypeScript compilation performance.\n');
  
  report.push('## Methodology\n');
  report.push('For each lock level, we measured compilation time in three scenarios:\n');
  report.push('1. **Type Definition Only**: Just defining the OrderedSubsequences and AllPrefixes types');
  report.push('2. **With Function Usage**: Using the type as a function parameter');
  report.push('3. **Multiple Functions**: Using the type in multiple function signatures\n');
  report.push('Each measurement was averaged over 3 iterations with a 2-minute timeout.\n');
  
  report.push('## Results\n');
  report.push('### Compilation Times by Lock Level\n');
  report.push('| Lock Level | Type Def Only (ms) | With Function (ms) | Multiple Functions (ms) | Growth Factor |');
  report.push('|------------|-------------------|-------------------|------------------------|---------------|');
  
  results.forEach((result, idx) => {
    const growthFactor = idx > 0 
      ? (result.typeDefinitionOnly / results[idx - 1].typeDefinitionOnly).toFixed(2)
      : '-';
    
    report.push(`| ${result.lockLevel} | ${result.typeDefinitionOnly.toFixed(0)} | ${result.withFunctionUsage.toFixed(0)} | ${result.withMultipleFunctions.toFixed(0)} | ${growthFactor}x |`);
  });
  
  report.push('\n### Analysis\n');
  
  // Find thresholds
  const threshold1s = results.find(r => r.typeDefinitionOnly > 1000);
  const threshold5s = results.find(r => r.typeDefinitionOnly > 5000);
  const threshold10s = results.find(r => r.typeDefinitionOnly > 10000);
  
  if (threshold1s) {
    report.push(`- **1-second threshold**: Crossed at lock level ${threshold1s.lockLevel} (${threshold1s.typeDefinitionOnly.toFixed(0)}ms)`);
  }
  if (threshold5s) {
    report.push(`- **5-second threshold**: Crossed at lock level ${threshold5s.lockLevel} (${threshold5s.typeDefinitionOnly.toFixed(0)}ms)`);
  }
  if (threshold10s) {
    report.push(`- **10-second threshold**: Crossed at lock level ${threshold10s.lockLevel} (${threshold10s.typeDefinitionOnly.toFixed(0)}ms)`);
  }
  
  report.push('\n#### Impact Analysis\n');
  
  // Calculate average overhead of function usage
  const avgTypeDefTime = results.reduce((sum, r) => sum + r.typeDefinitionOnly, 0) / results.length;
  const avgFuncTime = results.reduce((sum, r) => sum + r.withFunctionUsage, 0) / results.length;
  const avgMultiTime = results.reduce((sum, r) => sum + r.withMultipleFunctions, 0) / results.length;
  
  const funcOverhead = ((avgFuncTime - avgTypeDefTime) / avgTypeDefTime * 100).toFixed(1);
  const multiOverhead = ((avgMultiTime - avgTypeDefTime) / avgTypeDefTime * 100).toFixed(1);
  
  report.push(`- **Function usage overhead**: Average +${funcOverhead}% compile time`);
  report.push(`- **Multiple functions overhead**: Average +${multiOverhead}% compile time`);
  report.push(`- **Primary bottleneck**: ${Math.abs(parseFloat(funcOverhead)) < 50 ? 'Type definition computation' : 'Type usage in functions'}\n`);
  
  report.push('#### Exponential Growth\n');
  if (results.length >= 3) {
    const avgGrowth = results.slice(1).reduce((sum, r, idx) => {
      const growth = r.typeDefinitionOnly / results[idx].typeDefinitionOnly;
      return sum + growth;
    }, 0) / (results.length - 1);
    
    report.push(`- **Average growth factor**: ${avgGrowth.toFixed(2)}x per lock level`);
    report.push(`- **Theoretical complexity**: O(2^N) for OrderedSubsequences`);
    report.push(`- **Observed behavior**: ${avgGrowth >= 1.8 ? 'Consistent with exponential growth' : 'Better than worst-case exponential'}\n`);
  }
  
  report.push('## Recommendations\n');
  
  // Find acceptable threshold (e.g., under 2 seconds)
  const acceptableLevel = results.filter(r => r.typeDefinitionOnly < 2000).pop();
  const warningLevel = results.filter(r => r.typeDefinitionOnly < 5000).pop();
  
  if (acceptableLevel) {
    report.push(`### ✅ Recommended Maximum: Lock Level ${acceptableLevel.lockLevel}`);
    report.push(`- Compilation time: ~${acceptableLevel.typeDefinitionOnly.toFixed(0)}ms`);
    report.push(`- Impact: Minimal performance impact on development experience`);
    report.push(`- Use case: Suitable for most applications\n`);
  }
  
  if (warningLevel && warningLevel.lockLevel > (acceptableLevel?.lockLevel || 0)) {
    report.push(`### ⚠️  Warning Zone: Lock Levels ${(acceptableLevel?.lockLevel || 0) + 1}-${warningLevel.lockLevel}`);
    report.push(`- Compilation time: ${(acceptableLevel?.typeDefinitionOnly || 0).toFixed(0)}-${warningLevel.typeDefinitionOnly.toFixed(0)}ms`);
    report.push(`- Impact: Noticeable but acceptable for specific use cases`);
    report.push(`- Use case: Use only if you specifically need this many lock levels\n`);
  }
  
  const unacceptableLevel = results.find(r => r.typeDefinitionOnly > 5000);
  if (unacceptableLevel) {
    report.push(`### ❌ Not Recommended: Lock Level ${unacceptableLevel.lockLevel}+`);
    report.push(`- Compilation time: >${unacceptableLevel.typeDefinitionOnly.toFixed(0)}ms`);
    report.push(`- Impact: Significant performance degradation`);
    report.push(`- Alternative: Consider using AllPrefixes instead of OrderedSubsequences, or restructure to use fewer lock levels\n`);
  }
  
  report.push('## Optimization Strategies\n');
  report.push('1. **Use AllPrefixes instead of OrderedSubsequences** when lock skipping is not needed');
  report.push('   - AllPrefixes has O(N) complexity vs O(2^N) for OrderedSubsequences');
  report.push('2. **Limit lock levels** to the recommended maximum');
  report.push('3. **Use specific lock types** (e.g., ValidLock3Context) instead of flexible types when possible');
  report.push('4. **Consider lock level grouping** if you need many locks (e.g., group related locks)\n');
  
  report.push('## Conclusion\n');
  if (acceptableLevel) {
    report.push(`For optimal development experience, limit `);
    report.push(`OrderedSubsequences usage to lock level ${acceptableLevel.lockLevel} or below. `);
    report.push(`If more lock levels are needed, prefer AllPrefixes or use specific ValidLockXContext types.\n`);
  }
  
  return report.join('\n');
}

/**
 * Main analysis function
 */
async function runAnalysis() {
  console.log('🔬 IronGuard Compile Time Analysis');
  console.log('==================================\n');
  
  const results = [];
  
  // Test lock levels from 1 to MAX_LEVEL (or until timeout)
  // You can override via environment variable MAX_LEVEL (e.g., MAX_LEVEL=12)
  const maxLevelEnv = parseInt(process.env.MAX_LEVEL || '', 10);
  const maxLevel = Number.isFinite(maxLevelEnv) && maxLevelEnv > 0 ? maxLevelEnv : 12;
  const lockLevels = Array.from({ length: maxLevel }, (_, i) => i + 1);
  
  for (const level of lockLevels) {
    const result = analyzeLockLevel(level);
    if (result === null) {
      console.log(`\n⚠️  Stopping analysis at lock level ${level} due to timeout\n`);
      break;
    }
    results.push(result);
    
    // Stop if compilation takes more than 60 seconds
    if (result.typeDefinitionOnly > 60000) {
      console.log(`\n⚠️  Stopping analysis - compilation time exceeded 60 seconds\n`);
      break;
    }
  }
  
  if (results.length === 0) {
    console.error('❌ No results collected - analysis failed');
    process.exit(1);
  }
  
  // Save results
  const docDir = path.dirname(RESULTS_FILE);
  if (!fs.existsSync(docDir)) {
    fs.mkdirSync(docDir, { recursive: true });
  }
  
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to: ${RESULTS_FILE}`);
  
  // Generate and save report
  const report = generateReport(results);
  fs.writeFileSync(REPORT_FILE, report);
  console.log(`📄 Report saved to: ${REPORT_FILE}`);
  
  // Clean up temp files
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true });
    console.log(`🧹 Cleaned up temporary files`);
  }
  
  console.log('\n✅ Analysis complete!');
  console.log(`\nView the full report at: ${REPORT_FILE}\n`);
}

// Run the analysis
runAnalysis().catch(error => {
  console.error('❌ Error during analysis:', error);
  process.exit(1);
});
