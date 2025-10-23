/**
 * IronGuard Composable Types Demo
 * 
 * Demonstrates the new composable ValidLockContext types system:
 * - All 15 levels of ValidLockXContext types
 * - Building block types (HasLock, CanAcquireLockX, etc.)
 * - Hierarchical composition and error prevention
 * - Real-world usage patterns
 */

import { 
  createLockContext, 
  LOCK_1, LOCK_2, LOCK_3, LOCK_5, LOCK_8, LOCK_10, LOCK_15 
} from '../core';

import type { 
  ValidLock1Context, ValidLock2Context, ValidLock3Context, ValidLock5Context,
  ValidLock8Context, ValidLock10Context, ValidLock15Context,
  HasLock, CanAcquireLock3, MaxHeldLock
} from '../core';

// =============================================================================
// EXAMPLE FUNCTIONS WITH COMPOSABLE TYPE CONSTRAINTS
// =============================================================================

/**
 * Example function that requires lock 1 (lowest level)
 * Uses ValidLock1Context which accepts:
 * - Empty contexts (can acquire lock 1)
 * - Contexts that already have lock 1
 */
function basicOperation<THeld extends readonly any[]>(
  context: ValidLock1Context<THeld> extends string ? never : ValidLock1Context<THeld>
): string {
  return `Basic operation completed with: ${context.toString()}`;
}

/**
 * Example function that requires lock 3 (mid-level)
 * Uses ValidLock3Context which accepts:
 * - Empty contexts (can acquire lock 3)
 * - Contexts with locks 1, 2, or 1&2 (can acquire lock 3)
 * - Contexts that already have lock 3
 * - Rejects contexts with higher locks (4+) without lock 3
 */
function dataProcessing<THeld extends readonly any[]>(
  context: ValidLock3Context<THeld> extends string ? never : ValidLock3Context<THeld>
): string {
  return `Data processing with lock 3 context: ${context.toString()}`;
}

/**
 * Example function that requires lock 10 (high-level)
 * Uses ValidLock10Context which accepts:
 * - Empty contexts (can acquire lock 10)
 * - Contexts with any lower locks (can acquire lock 10)
 * - Contexts that already have lock 10
 * - Rejects contexts with higher locks (11+) without lock 10
 */
function auditOperation<THeld extends readonly any[]>(
  context: ValidLock10Context<THeld> extends string ? never : ValidLock10Context<THeld>
): string {
  return `Audit operation with high-level access: ${context.toString()}`;
}

/**
 * Example function that requires lock 15 (maximum level)
 * Uses ValidLock15Context which accepts any valid context since 15 is the highest
 */
function systemAdminOperation<THeld extends readonly any[]>(
  context: ValidLock15Context<THeld> extends string ? never : ValidLock15Context<THeld>
): string {
  return `System admin operation with maximum privileges: ${context.toString()}`;
}

// =============================================================================
// DEMONSTRATION FUNCTIONS
// =============================================================================

async function demonstrateComposableTypes(): Promise<void> {
  console.log('\n🧩 IronGuard Composable ValidLockContext Types Demo');
  console.log('=======================================================\n');

  // 1️⃣ BASIC LEVEL FUNCTIONS
  console.log('1️⃣ BASIC LEVEL OPERATIONS (Lock 1)');
  console.log('------------------------------------');
  
  // Empty context can be used with lock 1 functions
  const emptyCtx = createLockContext();
  console.log(`✅ Empty context: ${basicOperation(emptyCtx)}`);
  emptyCtx.dispose();
  
  // Context with lock 1 can be used
  const ctx1 = await createLockContext().acquireWrite(LOCK_1);
  console.log(`✅ Has lock 1: ${basicOperation(ctx1)}`);
  ctx1.dispose();

  // 2️⃣ MID-LEVEL FUNCTIONS  
  console.log('\n2️⃣ MID-LEVEL OPERATIONS (Lock 3)');
  console.log('----------------------------------');
  
  // Various contexts that work with lock 3 functions
  const emptyCtx3 = createLockContext();
  console.log(`✅ Empty → Lock 3: ${dataProcessing(emptyCtx3)}`);
  emptyCtx3.dispose();
  
  const ctx1for3 = await createLockContext().acquireWrite(LOCK_1);
  console.log(`✅ Lock 1 → Lock 3: ${dataProcessing(ctx1for3)}`);
  ctx1for3.dispose();
  
  const ctx12for3 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_2));
  console.log(`✅ Locks 1,2 → Lock 3: ${dataProcessing(ctx12for3)}`);
  ctx12for3.dispose();
  
  const ctx3direct = await createLockContext().acquireWrite(LOCK_3);
  console.log(`✅ Has lock 3: ${dataProcessing(ctx3direct)}`);
  ctx3direct.dispose();

  // 3️⃣ HIGH-LEVEL FUNCTIONS
  console.log('\n3️⃣ HIGH-LEVEL OPERATIONS (Lock 10)');
  console.log('------------------------------------');
  
  // High-level operations work with many context types
  const emptyCtx10 = createLockContext();
  console.log(`✅ Empty → Lock 10: ${auditOperation(emptyCtx10)}`);
  emptyCtx10.dispose();
  
  const ctx135for10 = await createLockContext()
    .acquireWrite(LOCK_1)
    .then(c => c.acquireWrite(LOCK_3))
    .then(c => c.acquireWrite(LOCK_5));
  console.log(`✅ Locks 1,3,5 → Lock 10: ${auditOperation(ctx135for10)}`);
  ctx135for10.dispose();
  
  const ctx10direct = await createLockContext().acquireWrite(LOCK_10);
  console.log(`✅ Has lock 10: ${auditOperation(ctx10direct)}`);
  ctx10direct.dispose();

  // 4️⃣ MAXIMUM LEVEL FUNCTIONS
  console.log('\n4️⃣ MAXIMUM LEVEL OPERATIONS (Lock 15)');
  console.log('---------------------------------------');
  
  // Maximum level accepts any valid context
  const emptyCtx15 = createLockContext();
  console.log(`✅ Empty → Lock 15: ${systemAdminOperation(emptyCtx15)}`);
  emptyCtx15.dispose();
  
  const ctx158for15 = await createLockContext()
    .acquireWrite(LOCK_1)
    .then(c => c.acquireWrite(LOCK_5))
    .then(c => c.acquireWrite(LOCK_8));
  console.log(`✅ Locks 1,5,8 → Lock 15: ${systemAdminOperation(ctx158for15)}`);
  ctx158for15.dispose();
  
  const ctx15direct = await createLockContext().acquireWrite(LOCK_15);
  console.log(`✅ Has lock 15: ${systemAdminOperation(ctx15direct)}`);
  ctx15direct.dispose();
}

async function demonstrateComposableChaining(): Promise<void> {
  console.log('\n🔗 COMPOSABLE FUNCTION CHAINING');
  console.log('================================\n');

  // Progressive lock acquisition with function chaining
  console.log('Progressive acquisition with function calls:');
  
  // Start with empty context
  const emptyCtx = createLockContext();
  console.log(`📍 Starting: ${emptyCtx.toString()}`);
  
  // Call lock 1 function, then acquire lock 1
  console.log(`   ${basicOperation(emptyCtx)}`);
  const ctx1 = await emptyCtx.acquireWrite(LOCK_1);
  console.log(`📍 After Lock 1: ${ctx1.toString()}`);
  
  // Call lock 3 function, then acquire lock 3
  console.log(`   ${dataProcessing(ctx1)}`);
  const ctx13 = await ctx1.acquireWrite(LOCK_3);
  console.log(`📍 After Lock 3: ${ctx13.toString()}`);
  
  // Call high-level function, then acquire lock 10
  console.log(`   ${auditOperation(ctx13)}`);
  const ctx1310 = await ctx13.acquireWrite(LOCK_10);
  console.log(`📍 After Lock 10: ${ctx1310.toString()}`);
  
  // Call maximum level function
  console.log(`   ${systemAdminOperation(ctx1310)}`);
  
  ctx1310.dispose();
}

async function demonstrateTypeComposition(): Promise<void> {
  console.log('\n🧬 TYPE SYSTEM COMPOSITION');
  console.log('===========================\n');

  console.log('The composable type system provides:');
  console.log('✓ Building blocks: HasLock<T, Level>, CanAcquireLockX<T>, MaxHeldLock<T>');
  console.log('✓ Hierarchical composition: CanAcquireLock3 builds on CanAcquireLock2');
  console.log('✓ Flexible constraints: ValidLockXContext = HasLock OR CanAcquire');
  console.log('✓ Clear error messages: "Cannot acquire lock X when holding lock Y"');
  console.log('✓ All 15 lock levels: ValidLock1Context through ValidLock15Context');

  console.log('\n💡 COMPILE-TIME PREVENTION EXAMPLES:');
  console.log('     // ❌ These would fail TypeScript compilation:');
  console.log('     // const ctx4 = await createLockContext().acquireWrite(LOCK_4);');
  console.log('     // dataProcessing(ctx4); // "Cannot acquire lock 3 when holding lock 4"');
  console.log('     //');
  console.log('     // const ctx15 = await createLockContext().acquireWrite(LOCK_15);');
  console.log('     // basicOperation(ctx15); // "Lock 1 can only be acquired on empty context"');
  console.log('     //');
  console.log('     // ✅ These work correctly:');
  console.log('     // const ctx2 = await createLockContext().acquireWrite(LOCK_2);');
  console.log('     // dataProcessing(ctx2); // OK: can acquire lock 3 from lock 2');
}

// =============================================================================
// MAIN DEMO FUNCTION
// =============================================================================

export async function runComposableTypesDemo(): Promise<void> {
  try {
    await demonstrateComposableTypes();
    await demonstrateComposableChaining();
    await demonstrateTypeComposition();
    
    console.log('\n🎉 COMPOSABLE TYPES BENEFITS:');
    console.log('   ✓ Reusable building blocks (HasLock, CanAcquireLockX)');
    console.log('   ✓ Hierarchical composition (each level builds on previous)');
    console.log('   ✓ Descriptive error messages for invalid combinations');
    console.log('   ✓ All 15 lock levels supported with consistent patterns');
    console.log('   ✓ Easy to extend and maintain type system');
    console.log('   ✓ Compile-time validation prevents runtime errors');
    
  } catch (error) {
    console.error('❌ Error in composable types demo:', error);
  }
}

// Run if called directly
if (require.main === module) {
  runComposableTypesDemo();
}