/**
 * Example: NullableLocksAtMost Types
 * 
 * This example demonstrates the nullable lock context pattern where functions
 * can accept contexts conditionally based on the locks held. The nullable pattern
 * provides compile-time safety while allowing flexible signatures that handle
 * both valid and invalid contexts.
 */

import {
  createLockContext,
  LOCK_1,
  LOCK_5,
  LOCK_8,
  LOCK_10,
  LOCK_12,
  LOCK_15,
  type LockContext,
  type LockLevel,
  type NullableLocksAtMost10,
  type NullableLocksAtMost12,
  type NullableLocksAtMost15
} from './src/core';

// =============================================================================
// Example 1: Basic Nullable Pattern
// =============================================================================

function processWithNullableLock10<THeld extends readonly LockLevel[]>(
  ctx: NullableLocksAtMost10<THeld>
): void {
  console.log('=== processWithNullableLock10 ===');
  
  if (ctx !== null) {
    // After null check, TypeScript knows ctx is LockContext<THeld>
    const locks = ctx.getHeldLocks();
    console.log(`✅ Valid context with locks: [${locks}]`);
    console.log(`   Can safely use the context`);
  } else {
    console.log('❌ Context is null - locks exceed level 10');
  }
  console.log();
}

// =============================================================================
// Example 2: Multiple Lock Level Thresholds
// =============================================================================

function processWithNullableLock12<THeld extends readonly LockLevel[]>(
  ctx: NullableLocksAtMost12<THeld>
): void {
  console.log('=== processWithNullableLock12 ===');
  
  if (ctx !== null) {
    const locks = ctx.getHeldLocks();
    console.log(`✅ Valid context with locks: [${locks}]`);
  } else {
    console.log('❌ Context is null - locks exceed level 12');
  }
  console.log();
}

function processWithNullableLock15<THeld extends readonly LockLevel[]>(
  ctx: NullableLocksAtMost15<THeld>
): void {
  console.log('=== processWithNullableLock15 ===');
  
  if (ctx !== null) {
    const locks = ctx.getHeldLocks();
    console.log(`✅ Valid context with locks: [${locks}]`);
  } else {
    console.log('❌ Context is null - locks exceed level 15');
  }
  console.log();
}

// =============================================================================
// Example 3: Real-world Use Case - Plugin System
// =============================================================================

/**
 * A plugin hook that only accepts contexts with locks up to level 10.
 * This ensures plugins can't interfere with high-privilege operations.
 */
function pluginHook<THeld extends readonly LockLevel[]>(
  ctx: NullableLocksAtMost10<THeld>,
  pluginName: string
): void {
  console.log(`=== Plugin: ${pluginName} ===`);
  
  if (ctx !== null) {
    console.log(`✅ Plugin ${pluginName} can run with locks: [${ctx.getHeldLocks()}]`);
    // Plugin logic here
  } else {
    console.log(`⚠️  Plugin ${pluginName} skipped - high privilege context detected`);
  }
  console.log();
}

// =============================================================================
// Main Demo
// =============================================================================

async function main() {
  console.log('IronGuard: NullableLocksAtMost Examples\n');
  console.log('========================================\n');

  // Example 1: Valid contexts (locks ≤ 10)
  console.log('--- Example 1: Valid Contexts ---\n');
  
  const ctx1 = await createLockContext().acquireWrite(LOCK_1);
  processWithNullableLock10(ctx1);
  
  const ctx5 = await createLockContext().acquireWrite(LOCK_5);
  processWithNullableLock10(ctx5);
  
  const ctx8 = await createLockContext().acquireWrite(LOCK_8);
  processWithNullableLock10(ctx8);
  
  const ctx10 = await createLockContext().acquireWrite(LOCK_10);
  processWithNullableLock10(ctx10);

  // Example 2: Invalid context (locks > 10)
  console.log('--- Example 2: Invalid Context (> 10) ---\n');
  
  const ctx12 = await createLockContext().acquireWrite(LOCK_12);
  // TypeScript prevents: processWithNullableLock10(ctx12);
  // Error: Argument of type 'LockContext<readonly [12]>' is not assignable to parameter of type 'null'
  
  // Must explicitly pass null for invalid contexts
  processWithNullableLock10(null as NullableLocksAtMost10<readonly [12]>);

  // Example 3: Different thresholds
  console.log('--- Example 3: Different Thresholds ---\n');
  
  processWithNullableLock12(ctx10);  // ✅ 10 ≤ 12
  processWithNullableLock12(ctx12);  // ✅ 12 ≤ 12
  
  const ctx15 = await createLockContext().acquireWrite(LOCK_15);
  processWithNullableLock12(null as NullableLocksAtMost12<readonly [15]>);  // ❌ 15 > 12
  processWithNullableLock15(ctx15);  // ✅ 15 ≤ 15

  // Example 4: Plugin system
  console.log('--- Example 4: Plugin System ---\n');
  
  pluginHook(ctx5, 'DataValidator');
  pluginHook(ctx8, 'CacheManager');
  pluginHook(null as NullableLocksAtMost10<readonly [12]>, 'AdminPlugin');
  pluginHook(null as NullableLocksAtMost10<readonly [15]>, 'SecurityPlugin');

  // Cleanup
  ctx1.dispose();
  ctx5.dispose();
  ctx8.dispose();
  ctx10.dispose();
  ctx12.dispose();
  ctx15.dispose();

  console.log('========================================');
  console.log('✅ All examples completed successfully!');
}

// =============================================================================
// Key Takeaways
// =============================================================================

console.log(`
Key Takeaways:
--------------

1. Nullable Pattern Benefits:
   - Compile-time safety for lock level constraints
   - Explicit null handling for invalid contexts
   - Flexible function signatures

2. When to Use:
   - Plugin systems with privilege boundaries
   - Middleware that only accepts certain lock levels
   - Functions that need to gracefully handle invalid contexts

3. Comparison with LocksAtMost:
   - LocksAtMost: Accepts ANY combination up to N ([], [1], [2], ..., [1,2,...,N])
   - NullableLocksAtMost: Context or null based on MaxHeldLock ≤ N
   - Use LocksAtMost for flexible acceptance
   - Use NullableLocksAtMost for conditional acceptance with null handling

4. Compile-time Safety:
   - TypeScript prevents passing invalid contexts (locks > threshold)
   - Must explicitly pass null for invalid contexts
   - Forces developer awareness of lock level constraints
`);

main().catch(console.error);
