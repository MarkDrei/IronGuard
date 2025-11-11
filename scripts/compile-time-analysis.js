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
const RESULTS_FILE = path.join(SCRIPT_DIR, '../doc/compile-time-analysis-results.json');
const REPORT_FILE = path.join(SCRIPT_DIR, '../doc/compile-time-analysis-report.md');

/**
 * Generate test file with just type definitions
 * @param {number} lockLevel 
 * @returns {string}
 */
function generateTypeDefinitionFile(lockLevel) {
  const sequence = Array.from({ length: lockLevel }, (_, i) => i + 1).join(', ');
  
  return `
import type { LockContext, OrderedSubsequences, AllPrefixes } from '../src/core';

// Type definition only - no usage
type TestOrderedSubsequences = OrderedSubsequences<readonly [${sequence}]>;
type TestAllPrefixes = AllPrefixes<readonly [${sequence}]>;

// Export to prevent tree-shaking
export type { TestOrderedSubsequences, TestAllPrefixes };
`;
}

/**
 * Generate test file with function usage
 * @param {number} lockLevel
 * @returns {string}
 */
function generateFunctionUsageFile(lockLevel) {
  const sequence = Array.from({ length: lockLevel }, (_, i) => i + 1).join(', ');
  
  return `
import type { LockContext, OrderedSubsequences, AllPrefixes } from '../src/core';

type TestOrderedSubsequences = OrderedSubsequences<readonly [${sequence}]>;
type TestAllPrefixes = AllPrefixes<readonly [${sequence}]>;

// Single function using the type
async function testFunction(
  context: LockContext<TestOrderedSubsequences>
): Promise<void> {
  console.log(context.toString());
}

// Export to prevent tree-shaking
export { testFunction };
export type { TestOrderedSubsequences, TestAllPrefixes };
`;
}

/**
 * Generate test file with multiple function usages
 * @param {number} lockLevel
 * @returns {string}
 */
function generateMultipleFunctionsFile(lockLevel) {
  const sequence = Array.from({ length: lockLevel }, (_, i) => i + 1).join(', ');
  
  return `
import type { LockContext, OrderedSubsequences, AllPrefixes } from '../src/core';

type TestOrderedSubsequences = OrderedSubsequences<readonly [${sequence}]>;
type TestAllPrefixes = AllPrefixes<readonly [${sequence}]>;

// Multiple functions using the type
async function testFunction1(
  context: LockContext<TestOrderedSubsequences>
): Promise<void> {
  console.log(context.toString());
}

async function testFunction2(
  context: LockContext<TestAllPrefixes>
): Promise<void> {
  console.log(context.toString());
}

async function testFunction3(
  context: LockContext<TestOrderedSubsequences>
): Promise<void> {
  const result = context.toString();
  return testFunction1(context);
}

async function testFunction4(
  context: LockContext<TestAllPrefixes>
): Promise<void> {
  return testFunction2(context);
}

async function testFunction5(
  ctx1: LockContext<TestOrderedSubsequences>,
  ctx2: LockContext<TestAllPrefixes>
): Promise<void> {
  await testFunction1(ctx1);
  await testFunction2(ctx2);
}

// Export to prevent tree-shaking
export { testFunction1, testFunction2, testFunction3, testFunction4, testFunction5 };
export type { TestOrderedSubsequences, TestAllPrefixes };
`;
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
  
  // Test lock levels from 1 to 20 (or until timeout)
  const lockLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  
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
