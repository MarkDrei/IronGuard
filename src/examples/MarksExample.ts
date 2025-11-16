/**
 * IronGuard Feature Overview - Compact Example
 * 
 * Demonstrates the key features of IronGuard in a concise, linear flow:
 * 
 * 1. Lock Acquisition & Passing: Start with LOCK_1, pass context to methods
 * 2. LocksAtMost Types: Flexible function parameters accepting multiple lock states
 * 3. NullableLocksAtMost Types: Conditional acceptance based on lock thresholds
 * 4. Compile-time Validation: TypeScript prevents invalid lock combinations
 * 5. Ascending Order: Locks must be acquired in increasing order (1→3→7)
 * 
 * Flow: entry (LOCK_1) → middleProcessor (+LOCK_3) → finalProcessor (+LOCK_7)
 */

import {
    createLockContext,
    LOCK_1,
    LOCK_2,
    LOCK_3,
    LOCK_4,
    LOCK_5,
    LOCK_6,
    LOCK_7,
    LOCK_12,
    type LockContext,
    LOCK_11
} from '../core/ironGuardSystem';
import type {
    IronLocks,
    LocksAtMost5,
    NullableLocksAtMost10
} from '../core/ironGuardTypes';



export async function runMarksExample(): Promise<void> {
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║   IronGuard Feature Overview Demo   ║');
    console.log('╚══════════════════════════════════════╝');
    
    await validPath();  
}

// Valid path: LOCK_1 → LOCK_3 → LOCK_7 (all ascending)
async function validPath(): Promise<void> {
    const ctx_1 = await createLockContext().acquireWrite(LOCK_1);
    try {
        // ❌ COMPILE-TIME ERROR: Uncommenting this would fail TypeScript compilation
        // await ctx_1.acquireWrite(LOCK_1); // cannot re-acquire LOCK_1
        
        
        
        console.log(`Step 1a >>> current locks: [${ctx_1.getHeldLocks()}]`);
        await middleProcessor(ctx_1);
        console.log(`Step 1a <<< current locks: [${ctx_1.getHeldLocks()}]`);


        const ctx_1_3 = await ctx_1.acquireWrite(LOCK_3);
        try {
            // ❌ COMPILE-TIME ERROR: Uncommenting this would fail TypeScript compilation
            // await ctx_1_3.acquireWrite(LOCK_2); // cannot acquire LOCK_2 after LOCK_3
            
            console.log(`Step 1b >>> current locks: [${ctx_1_3.getHeldLocks()}]`);
            await middleProcessor(ctx_1_3);
            console.log(`Step 1b <<< current locks: [${ctx_1.getHeldLocks()}]`);
        } finally {
           ctx_1_3.dispose();
        }
    
    } finally {
        ctx_1.dispose();
    }
}


// Step 2: Uses LocksAtMost5 - accepts any ordered combination of locks 1-5
// This demonstrates flexible function parameters
async function middleProcessor(context: LockContext<LocksAtMost5>): Promise<void> {
    
    // ❌ COMPILE-TIME ERROR: Uncommenting this would fail TypeScript compilation
    // await context.acquireWrite(LOCK_1); // cannot acquire LOCK_1 - LOCK_5
    // await context.acquireWrite(LOCK_2); // cannot acquire LOCK_1 - LOCK_5
    // await context.acquireWrite(LOCK_3); // cannot acquire LOCK_1 - LOCK_5
    // await context.acquireWrite(LOCK_4); // cannot acquire LOCK_1 - LOCK_5
    // await context.acquireWrite(LOCK_5); // cannot acquire LOCK_1 - LOCK_5
    
    const withLock6 = await context.acquireWrite(LOCK_6);
    try {
        console.log(`  Step 2 >>> current locks: [${withLock6.getHeldLocks()}]`);
        
        await finalProcessor(withLock6);
        
        console.log(`  Step 2 <<< current locks: [${withLock6.getHeldLocks()}]`);
    } finally {
        withLock6.dispose();
    }
}


// Step 3: Uses NullableLocksAtMost10 
async function finalProcessor<THeld extends IronLocks>(
  ctx: NullableLocksAtMost10<THeld>
): Promise<void> {
    
    if (ctx !== null) {
        // Context has locks ≤10, safe to use
        console.log(`    step 3 >>> current locks: [${ctx.getHeldLocks()}]`);
        console.log(`    step 3 >>> max held lock: [${ctx.getMaxHeldLock()}]`);

        // Check if we can actually acquire LOCK_11
        if (ctx.getMaxHeldLock() <= 6) {
            const safeCtx = ctx as unknown as LockContext<readonly [10]>;
            const withLock11 = await safeCtx.acquireWrite(LOCK_11);
            try {
                console.log(`    step 3 >>> acquired LOCK_11: [${withLock11.getHeldLocks()}]`);
            } finally {
                withLock11.dispose();
            } 
        }
    } // else case cannot happen unless user does unsafe casts
}


