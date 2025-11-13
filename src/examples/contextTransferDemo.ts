#!/usr/bin/env npx tsx

/**
 * IronGuard Context Transfer and Compile-Time Validation Example
 * 
 * This example demonstrates advanced IronGuard features:
 * - Type-safe function parameters with compile-time lock validation
 * - Context transfer between functions with preserved lock state
 * - Read/write lock mode preservation through function calls
 * - Lock escalation patterns (read → write → dispose)
 * - Complex workflow orchestration with chained function calls
 * 
 * Key Features Showcased:
 * - Type constraints for compile-time safety
 * - Runtime lock validation with graceful error handling
 * - Mixed lock acquisition patterns (read + write combinations)
 * - Function parameter constraints that prevent invalid contexts
 */

import { 
  createLockContext, 
  LOCK_1, 
  LOCK_2, 
  LOCK_3, 
  LOCK_4, 
  LOCK_5,
  type LockContext,
  type Contains,
  type LockLevel
} from '../core';

// =============================================================================
// FUNCTION DEFINITIONS - Context-aware functions with lock requirements
// =============================================================================

/**
 * Processes user data - demonstrates compile-time lock validation
 * Only accepts contexts that contain LOCK_2 (enforced at compile time)
 */
async function processUserData<T extends readonly LockLevel[]>(
  context: Contains<T, 2> extends true ? LockContext<T> : never
): Promise<LockContext<any>> {
  console.log(`   📊 processUserData() called with: ${context.toString()}`);
  
  const heldLocks = context.getHeldLocks();
  console.log(`      Held locks: ${heldLocks.join(', ')}`);
  
  // Type system guarantees LOCK_2 is present, but we can verify for demonstration
  if (context.hasLock(LOCK_2)) {
    console.log(`      ✅ LOCK_2 confirmed - processing user data...`);
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log(`      ✅ User data processed successfully`);
  } else {
    // This should never happen due to compile-time validation
    console.log(`      ❌ UNEXPECTED: LOCK_2 not found despite type validation!`);
    throw new Error('LOCK_2 required for processUserData()');
  }
  
  return context;
}

/**
 * Validates and saves data - requires both LOCK_1 and LOCK_3
 * Demonstrates runtime validation for multiple lock requirements
 */
async function validateAndSave(context: LockContext<any>): Promise<LockContext<any>> {
  console.log(`   💾 validateAndSave() called with: ${context.toString()}`);
  
  const hasLock1 = context.hasLock(LOCK_1);
  const hasLock3 = context.hasLock(LOCK_3);
  
  if (hasLock1 && hasLock3) {
    console.log(`      ✅ Both LOCK_1 and LOCK_3 held - proceeding with validation`);
    await new Promise(resolve => setTimeout(resolve, 50));
    console.log(`      Data validated and saved successfully`);
  } else {
    console.log(`      ⚠️  Missing required locks - LOCK_1: ${hasLock1}, LOCK_3: ${hasLock3}`);
  }
  
  return context;
}

/**
 * Performs audit operations - demonstrates high-level lock usage
 * Works with audit-level locks (LOCK_4, LOCK_5) when available
 */
async function performAudit(context: LockContext<any>): Promise<LockContext<any>> {
  console.log(`   🔍 performAudit() called with: ${context.toString()}`);
  
  const heldLocks = context.getHeldLocks();
  const highLevelLocks = heldLocks.filter((lock: number) => lock >= 4);
  
  if (highLevelLocks.length > 0) {
    console.log(`      ✅ Auditing with high-level locks: ${highLevelLocks.join(', ')}`);
    await new Promise(resolve => setTimeout(resolve, 75));
    console.log(`      Audit completed successfully`);
  } else {
    console.log(`      ⚠️  No high-level locks available for audit`);
  }
  
  return context;
}

/**
 * Demonstrates lock escalation from read to write mode
 * Shows proper disposal and re-acquisition patterns
 */
async function escalateWorkflow(context: LockContext<any>): Promise<void> {
  console.log(`   🔄 escalateWorkflow() starting with: ${context.toString()}`);
  
  if (context.hasLock(LOCK_2)) {
    console.log(`      📖 Have LOCK_2, performing read operations...`);
    await new Promise(resolve => setTimeout(resolve, 50));
    
    console.log(`      📖 Read context disposed`);
    context.dispose();
    
    console.log(`      🔄 Escalating to write lock...`);
    const writeCtx = await createLockContext().acquireWrite(LOCK_2);
    console.log(`      ✏️  Write context acquired: ${writeCtx.toString()}`);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    console.log(`      ✏️  Write operations completed`);
    console.log(`      ✏️  Write context disposed`);
    writeCtx.dispose();
  }
}

// =============================================================================
// DEMONSTRATION SCENARIOS
// =============================================================================

/**
 * Main demonstration function showcasing all context transfer patterns
 */
export async function runContextTransferDemo(): Promise<void> {
  console.log('🔒 IronGuard Context Transfer & Compile-Time Validation Demo');
  console.log('============================================================\n');

  // Scenario 1: Basic context transfer with type safety
  console.log('1️⃣ BASIC CONTEXT TRANSFER');
  console.log('Type-safe function calls with compile-time validation\n');
  
  const basicCtx = await createLockContext().acquireRead(LOCK_2);
  console.log(`   Created context: ${basicCtx.toString()}`);
  await processUserData(basicCtx);
  basicCtx.dispose();
  console.log(`   ✅ Context successfully passed and returned\n`);

  // Scenario 2: Multiple lock requirements
  console.log('2️⃣ MULTIPLE LOCK REQUIREMENTS');
  console.log('Functions can require specific combinations of locks\n');
  
  const multiCtx = await createLockContext().acquireRead(LOCK_1);
  const multiCtx2 = await multiCtx.acquireWrite(LOCK_3);
  console.log(`   Created multi-lock context: ${multiCtx2.toString()}`);
  await validateAndSave(multiCtx2);
  multiCtx2.dispose();
  console.log(`   ✅ Multi-lock validation completed\n`);

  // Scenario 3: Missing lock handling
  console.log('3️⃣ CONTEXT TRANSFER WITH MISSING LOCKS');
  console.log('Functions handle missing lock requirements gracefully\n');
  
  const incompleteCtx = await createLockContext().acquireRead(LOCK_1);
  console.log(`   Created incomplete context: ${incompleteCtx.toString()}`);
  await validateAndSave(incompleteCtx);
  incompleteCtx.dispose();
  console.log(`   ✅ Graceful handling of missing locks\n`);

  // Scenario 4: Lock escalation pattern
  console.log('4️⃣ LOCK ESCALATION PATTERN');
  console.log('Read lock → dispose → write lock workflow\n');
  
  const readCtx = await createLockContext().acquireRead(LOCK_2);
  console.log(`   Created read context: ${readCtx.toString()}`);
  await escalateWorkflow(readCtx);
  console.log(`   ✅ Lock escalation workflow completed\n`);

  // Scenario 5: High-level lock operations
  console.log('5️⃣ HIGH-LEVEL LOCK OPERATIONS');
  console.log('Functions working with audit-level locks\n');
  
  const auditCtx = await createLockContext().acquireRead(LOCK_2);
  const auditCtx2 = await auditCtx.acquireWrite(LOCK_4);
  const auditCtx3 = await auditCtx2.acquireRead(LOCK_5);
  console.log(`   Created audit context: ${auditCtx3.toString()}`);
  await performAudit(auditCtx3);
  auditCtx3.dispose();
  console.log(`   ✅ High-level lock operations completed\n`);

  // Scenario 6: Complex workflow orchestration
  console.log('6️⃣ COMPLEX WORKFLOW DEMONSTRATION');
  console.log('Chaining multiple functions with context transfer\n');
  
  let workflowCtx = await createLockContext().acquireRead(LOCK_1);
  console.log(`   Step 1: ${workflowCtx.toString()}`);
  
  workflowCtx = await workflowCtx.acquireWrite(LOCK_2);
  console.log(`   Step 2: ${workflowCtx.toString()}`);
  
  workflowCtx = await workflowCtx.acquireRead(LOCK_3);
  console.log(`   Step 3: ${workflowCtx.toString()}`);
  
  // Chain function calls with context passing (explicit casts for workflow)
  let anyCtx: any = workflowCtx;
  anyCtx = await processUserData(anyCtx);
  anyCtx = await validateAndSave(anyCtx);
  anyCtx = await performAudit(anyCtx);
  
  (anyCtx as LockContext<any>).dispose();
  console.log(`   ✅ Complex workflow with context transfer completed\n`);

  // Summary
  console.log('🎉 CONTEXT TRANSFER BENEFITS DEMONSTRATED:');
  console.log('   ✓ Type-safe function parameters with compile-time validation');
  console.log('   ✓ Runtime lock availability checking with graceful handling');
  console.log('   ✓ Lock escalation patterns (read → write → dispose)');
  console.log('   ✓ Complex workflow orchestration with chained calls');
  console.log('   ✓ Mixed read/write modes preserved through function calls');
  console.log('   ✓ Compile-time prevention of invalid context passing');
  
  console.log('\n💡 COMPILE-TIME VALIDATION EXAMPLES:');
  console.log('   // ❌ These would fail TypeScript compilation:');
  console.log('   // const ctx1 = await createLockContext().acquireWrite(LOCK_1);');
  console.log('   // await processUserData(ctx1); // ERROR: requires LOCK_2');
  console.log('   //');
  console.log('   // ✅ These work correctly:');
  console.log('   // const ctx2 = await createLockContext().acquireWrite(LOCK_2);');
  console.log('   // await processUserData(ctx2); // OK: LOCK_2 present');
}

// Allow direct execution
if (require.main === module) {
  runContextTransferDemo().catch(console.error);
}