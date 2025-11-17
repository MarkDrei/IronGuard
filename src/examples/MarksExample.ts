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
    console.log('║   IronGuard Feature Overview Demo    ║');
    console.log('╚══════════════════════════════════════╝');
    
    await validPath();

     console.log('\n╔══════════════════════════════════════╗');
    console.log('║           useLock version            ║');
    console.log('╚══════════════════════════════════════╝');

    await validPathWithUseLockPattern();
}

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
           ctx_1_3.releaseLock(LOCK_3);
        }
    
    } finally {
        ctx_1.dispose(); // releass all locks
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
        // ❌ COMPILE-TIME ERROR: Uncommenting this would fail TypeScript compilation
        // withLock6.releaseLock(LOCK_1); // cannot release LOCK_1, as this is not legal for all possible variants of held locks
        // withLock6.releaseLock(LOCK_2); // cannot release LOCK_2, as this is not legal for all possible variants of held locks
        // withLock6.releaseLock(LOCK_3); // cannot release LOCK_3, as this is not legal for all possible variants of held locks
        // withLock6.releaseLock(LOCK_4); // cannot release LOCK_4, as this is not legal for all possible variants of held locks
        // withLock6.releaseLock(LOCK_5); // cannot release LOCK_5, as this is not legal for all possible variants of held locks

        withLock6.releaseLock(LOCK_6);
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

        // Check if we can actually acquire LOCK_11. This is just paranoia, the type system already guarantees this.
        if (ctx.getMaxHeldLock() <= 10) {
            const safeCtx = ctx as unknown as LockContext<readonly [10]>;
            const withLock11 = await safeCtx.acquireWrite(LOCK_11);
            try {
                console.log(`    step 3 >>> acquired LOCK_11: [${withLock11.getHeldLocks()}]`);
            } finally {
                withLock11.releaseLock(LOCK_11);
            } 
        }
    } // else case cannot happen unless user does unsafe casts
}

async function validPathWithUseLockPattern(): Promise<void> {
    const ctx0 = createLockContext();

    await ctx0.useLockWithAcquire(LOCK_1, async (ctx1) => {
        console.log(`Step 1a (useLock) >>> current locks: [${ctx1.getHeldLocks()}]`);
        await ctx1.useLockWithAcquire(LOCK_3, async (ctx1_3) => {
            console.log(`  Step 1b (useLock) >>> current locks: [${ctx1_3.getHeldLocks()}]`);
            await middleProcessorUseLock(ctx1_3);
            }
        );
        console.log(`Step 1a (useLock) <<< current locks: [${ctx1.getHeldLocks()}]`);

    });
}

async function middleProcessorUseLock(context: LockContext<LocksAtMost5>): Promise<void> {
    // ❌ COMPILE-TIME ERROR: Uncommenting this would fail TypeScript compilation
    // context.useLockWithAcquire(LOCK_1, (ctx) => {}); // cannot acquire LOCK_1 - LOCK_5
    // context.useLockWithAcquire(LOCK_2, (ctx) => {}); // cannot acquire LOCK_1 - LOCK_5
    // context.useLockWithAcquire(LOCK_3, (ctx) => {}); // cannot acquire LOCK_1 - LOCK_5
    // context.useLockWithAcquire(LOCK_4, (ctx) => {}); // cannot acquire LOCK_1 - LOCK_5
    // context.useLockWithAcquire(LOCK_5, (ctx) => {}); // cannot acquire LOCK_1 - LOCK_5

    await context.useLockWithAcquire(LOCK_6, async (withLock6) => {
        console.log(`  Step 2 (useLock) >>> current locks: [${withLock6.getHeldLocks()}]`);
        await finalProcessor(withLock6);
        console.log(`  Step 2 (useLock) <<< current locks: [${withLock6.getHeldLocks()}]`);
    });
}


