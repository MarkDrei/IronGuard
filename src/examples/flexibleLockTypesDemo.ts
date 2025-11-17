/**
 * Flexible Lock Context Types Demo
 * 
 * This example demonstrates the LocksAtMost{N} types for creating
 * flexible function signatures that accept multiple lock states.
 * 
 * Key Concepts:
 * - LocksAtMost{N}: Pre-defined types accepting any ordered combination up to level N
 * - Lock skipping: Acquire [1,3] without [2]
 * - Maximum flexibility for plugin systems and adaptive code
 * - Read-only access pattern for flexible parameters
 */

import {
  createLockContext,
  LockContext,
  LOCK_1,
  LOCK_2,
  LOCK_3,
  LOCK_4,
  LOCK_5
} from '../core/ironGuardSystem';

import {
  type LocksAtMost4,
  type LocksAtMost5
} from '../core/ironGuardTypes';

// =============================================================================
// EXAMPLE 1: Complete Usage Pattern
// =============================================================================

/**
 * Function accepts any ordered combination of locks 1-5.
 * This demonstrates the typical pattern: receive flexible context,
 * inspect what's held, adapt behavior accordingly.
 */
async function processWithFlexibleContext(ctx: LockContext<LocksAtMost5>): Promise<void> {
  const locks = ctx.getHeldLocks();
  console.log(`  Processing with locks: [${locks}]`);
  
  // ✅ Valid: Can check which locks are held
  if (ctx.hasLock(LOCK_4)) {
    console.log('    ✓ Lock 4 is available - can perform advanced operations');
  }
  
  if (ctx.hasLock(LOCK_5)) {
    console.log('    ✓ Lock 5 is available - can perform critical operations');
  }
  
  if (locks.length === 0) {
    console.log('    ℹ No locks held - read-only mode');
  }
  
  // Note: Cannot acquire locks 1-5 here because we don't know what's already held
  // This would be a compile error:
  // const ctx5 = await ctx.acquireRead(LOCK_5); // ❌ Compile error
}

async function demoCompleteUsage(): Promise<void> {
  console.log('\n=== Complete Usage Example ===\n');
  
  // Start with empty context
  const ctx0 = createLockContext();
  
  // Acquire lock 4
  const ctx4 = await ctx0.acquireRead(LOCK_4);
  console.log('Step 1: Acquired lock 4');
  
  // Acquire lock 5 (higher than 4, so valid)
  const ctx5 = await ctx4.acquireRead(LOCK_5);
  console.log('Step 2: Acquired lock 5\n');
  
  // ✅ Pass [4, 5] context to flexible function
  await processWithFlexibleContext(ctx5);
  
  console.log('\nStep 3: Can also pass partial contexts:');
  await processWithFlexibleContext(ctx4); // Just [4]
  await processWithFlexibleContext(ctx0); // Empty []
  
  // Cleanup
  ctx5.dispose();
}

// =============================================================================
// EXAMPLE 2: Plugin System Use Case
// =============================================================================

/**
 * Plugin hook that adapts to whatever locks are available.
 * This is the primary use case for flexible lock types.
 */
async function pluginHook(
  ctx: LockContext<LocksAtMost4>,
  event: string
): Promise<void> {
  const locks = ctx.getHeldLocks();
  console.log(`  Plugin hook handling "${event}" with locks [${locks}]`);
  
  const lockArray = locks as readonly number[];
  
  if (locks.length === 0) {
    console.log('    → Read-only mode');
  } else if (lockArray.includes(LOCK_1) && lockArray.includes(LOCK_4)) {
    console.log('    → Full access mode (has critical locks 1 and 4)');
  } else {
    console.log('    → Partial access mode');
  }
}

async function demoPluginSystem(): Promise<void> {
  console.log('\n=== Plugin System Demo ===\n');
  
  // Plugin with minimal locks
  const ctx1 = await createLockContext().acquireRead(LOCK_1);
  await pluginHook(ctx1, 'user.login');
  ctx1.dispose();
  
  console.log();
  
  // Plugin with skip pattern [1, 4]
  const ctx0 = createLockContext();
  const ctx1b = await ctx0.acquireRead(LOCK_1);
  const ctx4 = await ctx1b.acquireRead(LOCK_4);
  await pluginHook(ctx4, 'admin.action');
  ctx4.dispose();
  
  console.log();
  
  // Plugin with no locks
  await pluginHook(createLockContext(), 'public.read');
}

// =============================================================================
// EXAMPLE 3: Lock Skipping Patterns
// =============================================================================

async function demoLockSkipping(): Promise<void> {
  console.log('\n=== Lock Skipping Patterns ===\n');
  
  const process = async (ctx: LockContext<LocksAtMost4>, description: string) => {
    const locks = ctx.getHeldLocks();
    console.log(`  ${description}: [${locks}]`);
  };
  
  // Pattern 1: Skip middle locks [1, 4]
  const ctx0a = createLockContext();
  const ctx1a = await ctx0a.acquireRead(LOCK_1);
  const ctx4a = await ctx1a.acquireRead(LOCK_4);
  await process(ctx4a, 'Skip middle (1→4)');
  ctx4a.dispose();
  
  // Pattern 2: Start in middle [2, 3]
  const ctx0b = createLockContext();
  const ctx2b = await ctx0b.acquireRead(LOCK_2);
  const ctx3b = await ctx2b.acquireRead(LOCK_3);
  await process(ctx3b, 'Start in middle (2→3)');
  ctx3b.dispose();
  
  // Pattern 3: Odd locks [1, 3]
  const ctx0c = createLockContext();
  const ctx1c = await ctx0c.acquireRead(LOCK_1);
  const ctx3c = await ctx1c.acquireRead(LOCK_3);
  await process(ctx3c, 'Odd locks (1→3)');
  ctx3c.dispose();
  
  // Pattern 4: Even locks [2, 4]
  const ctx0d = createLockContext();
  const ctx2d = await ctx0d.acquireRead(LOCK_2);
  const ctx4d = await ctx2d.acquireRead(LOCK_4);
  await process(ctx4d, 'Even locks (2→4)');
  ctx4d.dispose();
  
  console.log('\n  ✓ All patterns are valid with LocksAtMost4!');
}

// =============================================================================
// EXAMPLE 4: Compile-Time Safety
// =============================================================================

async function demoCompileTimeSafety(): Promise<void> {
  console.log('\n=== Compile-Time Safety Demo ===\n');
  
  console.log('The following patterns are prevented at compile-time:\n');
  
  console.log('❌ Cannot acquire locks within the LocksAtMost range:');
  console.log('   async function fn(ctx: LockContext<LocksAtMost5>) {');
  console.log('     await ctx.acquireRead(LOCK_3); // ❌ Compile error');
  console.log('   }');
  console.log('   Reason: Lock 3 might already be held by caller\n');
  
  console.log('❌ Cannot violate lock ordering:');
  console.log('   const ctx3 = await ctx0.acquireRead(LOCK_3);');
  console.log('   const ctx1 = await ctx3.acquireRead(LOCK_1); // ❌ Compile error');
  console.log('   Reason: Cannot acquire lower lock after higher\n');
  
  console.log('❌ Cannot acquire duplicate locks:');
  console.log('   const ctx1 = await ctx0.acquireRead(LOCK_1);');
  console.log('   const ctx1b = await ctx1.acquireRead(LOCK_1); // ❌ Compile error');
  console.log('   Reason: Lock 1 is already held\n');
  
  console.log('✅ Valid patterns:');
  const ctx0 = createLockContext();
  const ctx1 = await ctx0.acquireRead(LOCK_1);
  const ctx3 = await ctx1.acquireRead(LOCK_3);
  console.log(`   Ordered acquisition [1, 3]: ${ctx3.getHeldLocks()}`);
  
  async function flexible(ctx: LockContext<LocksAtMost5>): Promise<void> {
    console.log(`   Flexible function accepts: [${ctx.getHeldLocks()}]`);
  }
  await flexible(ctx3);
  
  ctx3.dispose();
}

// =============================================================================
// EXAMPLE 5: Pre-defined Types Overview
// =============================================================================

async function demoPreDefinedTypes(): Promise<void> {
  console.log('\n=== Pre-defined Types (LocksAtMost1-9) ===\n');
  
  console.log('Available pre-defined types:');
  console.log('  • LocksAtMost1 through LocksAtMost9');
  console.log('  • Each accepts any ordered combination up to that level');
  console.log('  • Optimized for compilation performance\n');
  
  console.log('For higher levels, create custom types:');
  console.log('  type LocksAtMost10 = OrderedSubsequences<readonly [1,2,3,4,5,6,7,8,9,10]>;\n');
  
  console.log('Performance note:');
  console.log('  • Types are O(2^N) complexity');
  console.log('  • Level 9: 512 combinations (fast)');
  console.log('  • Level 14: 16,384 combinations (acceptable)');
  console.log('  • Level 15+: May slow compilation on some systems');
}

// =============================================================================
// Main Demo Runner
// =============================================================================

export async function runFlexibleLockTypesDemo(): Promise<void> {
  console.log('\n'.repeat(2));
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║      Flexible Lock Context Types Demo - IronGuard            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  try {
    await demoCompleteUsage();
    await demoPluginSystem();
    await demoLockSkipping();
    await demoCompileTimeSafety();
    await demoPreDefinedTypes();
    
    console.log('\n'.repeat(2));
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  Demo completed successfully!');
    console.log('  See doc/context-transfer-patterns.md for detailed documentation');
    console.log('═══════════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  runFlexibleLockTypesDemo()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
