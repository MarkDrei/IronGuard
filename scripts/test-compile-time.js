#!/usr/bin/env node

/**
 * IronGuard Compile-time Validation Script
 * 
 * This script tests that invalid code patterns are correctly rejected at compile-time.
 * It creates temporary test files and attempts to compile them, verifying:
 * 
 * 1. Invalid code patterns fail compilation (negative tests)
 * 2. Valid code patterns compile successfully (positive tests - "test the test")
 * 
 * The positive tests ensure our compilation setup is working correctly.
 * If they fail, it indicates an issue with our testing infrastructure.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Test cases - code that should fail compilation
const invalidCodeTests = [
  {
    name: 'Lock ordering violation: LOCK_3 → LOCK_1',
    code: `
import { createLockContext, LOCK_1, LOCK_3 } from 'src/core';
async function test() {
  const ctx3 = await createLockContext().acquireWrite(LOCK_3);
  const invalid = await ctx3.acquireWrite(LOCK_1); // Should fail: 3 → 1
}
`
  },
  {
    name: 'Lock ordering violation: LOCK_4 → LOCK_2',
    code: `
import { createLockContext, LOCK_2, LOCK_4 } from 'src/core';
async function test() {
  const ctx4 = await createLockContext().acquireWrite(LOCK_4);
  const invalid = await ctx4.acquireWrite(LOCK_2); // Should fail: 4 → 2
}
`
  },
  {
    name: 'Lock ordering violation: LOCK_5 → LOCK_3',
    code: `
import { createLockContext, LOCK_3, LOCK_5 } from 'src/core';
async function test() {
  const ctx5 = await createLockContext().acquireWrite(LOCK_5);
  const invalid = await ctx5.acquireWrite(LOCK_3); // Should fail: 5 → 3
}
`
  },
  {
    name: 'Duplicate lock acquisition: LOCK_1',
    code: `
import { createLockContext, LOCK_1 } from 'src/core';
async function test() {
  const ctx1 = await createLockContext().acquireWrite(LOCK_1);
  const duplicate = await ctx1.acquireWrite(LOCK_1); // Should fail: duplicate
}
`
  },
  {
    name: 'Duplicate lock acquisition: LOCK_3',
    code: `
import { createLockContext, LOCK_3 } from 'src/core';
async function test() {
  const ctx3 = await createLockContext().acquireWrite(LOCK_3);
  const duplicate = await ctx3.acquireWrite(LOCK_3); // Should fail: duplicate
}
`
  },
  {
    name: 'Using non-held lock: LOCK_2 from LOCK_1 context',
    code: `
import { createLockContext, LOCK_1, LOCK_2 } from 'src/core';
async function test() {
  const ctx1 = await createLockContext().acquireWrite(LOCK_1);
  ctx1.useLock(LOCK_2, () => {}); // Should fail: don't have LOCK_2
}
`
  },
  {
    name: 'Using lock from empty context',
    code: `
import { createLockContext, LOCK_1 } from 'src/core';
async function test() {
  const empty = createLockContext();
  empty.useLock(LOCK_1, () => {}); // Should fail: no locks held
}
`
  },
  {
    name: 'Function requires LOCK_2 but only has LOCK_1',
    code: `
import { createLockContext, LOCK_1 } from 'src/core';
import type { Contains, LockContext, LockLevel } from 'src/core';
function requiresLock2<THeld extends readonly LockLevel[]>(
  context: Contains<THeld, 2> extends true ? LockContext<THeld> : never
): string { return 'ok'; }
async function test() {
  const ctx1 = await createLockContext().acquireWrite(LOCK_1);
  requiresLock2(ctx1); // Should fail: missing LOCK_2
}
`
  },
  {
    name: 'Complex ordering violation: LOCK_2,LOCK_3 → LOCK_1',
    code: `
import { createLockContext, LOCK_1, LOCK_2, LOCK_3 } from 'src/core';
async function test() {
  const ctx23 = await createLockContext().acquireWrite(LOCK_2).then(c => c.acquireWrite(LOCK_3));
  const invalid = await ctx23.acquireWrite(LOCK_1); // Should fail: 2,3 → 1
}
`
  },
  {
    name: 'High lock ordering violation: LOCK_12 → LOCK_8',
    code: `
import { createLockContext, LOCK_8, LOCK_12 } from 'src/core';
async function test() {
  const ctx12 = await createLockContext().acquireWrite(LOCK_12);
  const invalid = await ctx12.acquireWrite(LOCK_8); // Should fail: 12 → 8
}
`
  },
  // ❌ Rollback to non-held lock
  {
    name: 'Rollback to non-held lock: LOCK_2',
    code: `
import { createLockContext, LOCK_1, LOCK_2, LOCK_3 } from 'src/core';
async function test() {
  const ctx13 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_3));
  const invalid = ctx13.rollbackTo(LOCK_2); // Should fail: LOCK_2 not held
}
`
  },
  {
    name: 'Rollback to higher lock: LOCK_5',
    code: `
import { createLockContext, LOCK_1, LOCK_3, LOCK_5 } from 'src/core';
async function test() {
  const ctx13 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_3));
  const invalid = ctx13.rollbackTo(LOCK_5); // Should fail: LOCK_5 not held
}
`
  },
  {
    name: 'Rollback on empty context',
    code: `
import { createLockContext, LOCK_1 } from 'src/core';
async function test() {
  const empty = createLockContext();
  const invalid = empty.rollbackTo(LOCK_1); // Should fail: no locks held
}
`
  },
  {
    name: 'Rollback to skipped lock',
    code: `
import { createLockContext, LOCK_1, LOCK_2, LOCK_5 } from 'src/core';
async function test() {
  const ctx15 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_5));
  const invalid = ctx15.rollbackTo(LOCK_2); // Should fail: LOCK_2 skipped, not held
}
`
  },
  {
    name: 'High lock ordering violation: LOCK_15 → LOCK_6',
    code: `
import { createLockContext, LOCK_6, LOCK_15 } from 'src/core';
async function test() {
  const ctx15 = await createLockContext().acquireWrite(LOCK_15);
  const invalid = await ctx15.acquireWrite(LOCK_6); // Should fail: 15 → 6
}
`
  },
  {
    name: 'Duplicate high lock acquisition: LOCK_10',
    code: `
import { createLockContext, LOCK_10 } from 'src/core';
async function test() {
  const ctx10 = await createLockContext().acquireWrite(LOCK_10);
  const invalid = await ctx10.acquireWrite(LOCK_10); // Should fail: duplicate
}
`
  },
  {
    name: 'High lock mixed ordering violation: LOCK_9 → LOCK_4',
    code: `
import { createLockContext, LOCK_4, LOCK_9 } from 'src/core';
async function test() {
  const ctx9 = await createLockContext().acquireWrite(LOCK_9);
  const invalid = await ctx9.acquireWrite(LOCK_4); // Should fail: 9 → 4
}
`
  },
  // Release lock - invalid patterns
  {
    name: 'releaseLock: Cannot release non-held lock LOCK_3',
    code: `
import { createLockContext, LOCK_1, LOCK_2, LOCK_3 } from 'src/core';
async function test() {
  const ctx12 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_2));
  const invalid = ctx12.releaseLock(LOCK_3); // Should fail: LOCK_3 not held
}
`
  },
  {
    name: 'releaseLock: Cannot release from empty context',
    code: `
import { createLockContext, LOCK_1 } from 'src/core';
async function test() {
  const empty = createLockContext();
  const invalid = empty.releaseLock(LOCK_1); // Should fail: no locks held
}
`
  },
  {
    name: 'releaseLock: Cannot release LOCK_5 from context [1,2,3]',
    code: `
import { createLockContext, LOCK_1, LOCK_2, LOCK_3, LOCK_5 } from 'src/core';
async function test() {
  const ctx123 = await createLockContext()
    .acquireWrite(LOCK_1)
    .then(c => c.acquireWrite(LOCK_2))
    .then(c => c.acquireWrite(LOCK_3));
  const invalid = ctx123.releaseLock(LOCK_5); // Should fail: LOCK_5 not held
}
`
  },
  {
    name: 'releaseLock: Cannot release LOCK_4 from context [1,3]',
    code: `
import { createLockContext, LOCK_1, LOCK_3, LOCK_4 } from 'src/core';
async function test() {
  const ctx13 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_3));
  const invalid = ctx13.releaseLock(LOCK_4); // Should fail: LOCK_4 not held (skipped)
}
`
  },
  {
    name: 'releaseLock: Cannot release high lock LOCK_15 from context [10,12]',
    code: `
import { createLockContext, LOCK_10, LOCK_12, LOCK_15 } from 'src/core';
async function test() {
  const ctx1012 = await createLockContext().acquireWrite(LOCK_10).then(c => c.acquireWrite(LOCK_12));
  const invalid = ctx1012.releaseLock(LOCK_15); // Should fail: LOCK_15 not held
}
`
  },
  {
    name: 'releaseLock: Cannot release same lock twice',
    code: `
import { createLockContext, LOCK_1, LOCK_2, LOCK_3 } from 'src/core';
async function test() {
  const ctx123 = await createLockContext()
    .acquireWrite(LOCK_1)
    .then(c => c.acquireWrite(LOCK_2))
    .then(c => c.acquireWrite(LOCK_3));
  const ctx13 = ctx123.releaseLock(LOCK_2);
  const invalid = ctx13.releaseLock(LOCK_2); // Should fail: LOCK_2 already released
}
`
  },
  // LocksAtMost flexible types - invalid patterns
  {
    name: 'LocksAtMost5: Cannot acquire lock within range',
    code: `
import { createLockContext, LOCK_3, type LockContext, type LocksAtMost5 } from 'src/core';
async function processWithFlexibleContext(ctx: LockContext<LocksAtMost5>): Promise<void> {
  const invalid = await ctx.acquireWrite(LOCK_3); // Should fail: might already hold LOCK_3
}
`
  },
  {
    name: 'LocksAtMost3: Cannot acquire LOCK_1',
    code: `
import { createLockContext, LOCK_1, type LockContext, type LocksAtMost3 } from 'src/core';
async function plugin(ctx: LockContext<LocksAtMost3>): Promise<void> {
  const invalid = await ctx.acquireWrite(LOCK_1); // Should fail: might already hold LOCK_1
}
`
  },
  {
    name: 'LocksAtMost4: Cannot acquire LOCK_2',
    code: `
import { createLockContext, LOCK_2, type LockContext, type LocksAtMost4 } from 'src/core';
async function middleware(ctx: LockContext<LocksAtMost4>): Promise<void> {
  const invalid = await ctx.acquireWrite(LOCK_2); // Should fail: might already hold LOCK_2
}
`
  },
  {
    name: 'LocksAtMost5: Cannot acquire LOCK_5',
    code: `
import { createLockContext, LOCK_5, type LockContext, type LocksAtMost5 } from 'src/core';
async function handler(ctx: LockContext<LocksAtMost5>): Promise<void> {
  const invalid = await ctx.acquireWrite(LOCK_5); // Should fail: might already hold LOCK_5
}
`
  },
  {
    name: 'LocksAtMost3: Context [4] cannot be passed',
    code: `
import { createLockContext, LOCK_4, type LockContext, type LocksAtMost3 } from 'src/core';
async function needsAtMost3(ctx: LockContext<LocksAtMost3>): Promise<void> {}
async function test() {
  const ctx4 = await createLockContext().acquireWrite(LOCK_4);
  await needsAtMost3(ctx4); // Should fail: [4] is not in LocksAtMost3
}
`
  },
  {
    name: 'LocksAtMost2: Context [3] cannot be passed',
    code: `
import { createLockContext, LOCK_3, type LockContext, type LocksAtMost2 } from 'src/core';
async function needsAtMost2(ctx: LockContext<LocksAtMost2>): Promise<void> {}
async function test() {
  const ctx3 = await createLockContext().acquireWrite(LOCK_3);
  await needsAtMost2(ctx3); // Should fail: [3] is not in LocksAtMost2
}
`
  },
  {
    name: 'LocksAtMost4: Context [1,5] cannot be passed',
    code: `
import { createLockContext, LOCK_1, LOCK_5, type LockContext, type LocksAtMost4 } from 'src/core';
async function needsAtMost4(ctx: LockContext<LocksAtMost4>): Promise<void> {}
async function test() {
  const ctx15 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_5));
  await needsAtMost4(ctx15); // Should fail: [1,5] has lock 5 which is > 4
}
`
  },
  // NullableLocksAtMost types - invalid patterns
  {
    name: 'NullableLocksAtMost10: Context [12] cannot be passed',
    code: `
import { createLockContext, LOCK_12, type NullableLocksAtMost10, type LockLevel } from 'src/core';
function needsAtMost10<T extends readonly LockLevel[]>(ctx: NullableLocksAtMost10<T>): void {}
async function test() {
  const ctx12 = await createLockContext().acquireWrite(LOCK_12);
  needsAtMost10(ctx12); // Should fail: 12 > 10
}
`
  },
  {
    name: 'NullableLocksAtMost12: Context [15] cannot be passed',
    code: `
import { createLockContext, LOCK_15, type NullableLocksAtMost12, type LockLevel } from 'src/core';
function needsAtMost12<T extends readonly LockLevel[]>(ctx: NullableLocksAtMost12<T>): void {}
async function test() {
  const ctx15 = await createLockContext().acquireWrite(LOCK_15);
  needsAtMost12(ctx15); // Should fail: 15 > 12
}
`
  },
  {
    name: 'NullableLocksAtMost11: Context [14] cannot be passed',
    code: `
import { createLockContext, LOCK_14, type NullableLocksAtMost11, type LockLevel } from 'src/core';
function needsAtMost11<T extends readonly LockLevel[]>(ctx: NullableLocksAtMost11<T>): void {}
async function test() {
  const ctx14 = await createLockContext().acquireWrite(LOCK_14);
  needsAtMost11(ctx14); // Should fail: 14 > 11
}
`
  },
  // HasLockContext types - invalid patterns
  {
    name: 'HasLock3Context: Context [1] cannot be passed',
    code: `
import { createLockContext, LOCK_1, type HasLock3Context, type LockLevel } from 'src/core';
function needsLock3<T extends readonly LockLevel[]>(
  ctx: HasLock3Context<T> extends string ? never : HasLock3Context<T>
): void {}
async function test() {
  const ctx1 = await createLockContext().acquireWrite(LOCK_1);
  needsLock3(ctx1); // Should fail: doesn't have LOCK_3
}
`
  },
  {
    name: 'HasLock5Context: Context [3] cannot be passed',
    code: `
import { createLockContext, LOCK_3, type HasLock5Context, type LockLevel } from 'src/core';
function needsLock5<T extends readonly LockLevel[]>(
  ctx: HasLock5Context<T> extends string ? never : HasLock5Context<T>
): void {}
async function test() {
  const ctx3 = await createLockContext().acquireWrite(LOCK_3);
  needsLock5(ctx3); // Should fail: doesn't have LOCK_5
}
`
  },
  {
    name: 'HasLock10Context: Context [8] cannot be passed',
    code: `
import { createLockContext, LOCK_8, type HasLock10Context, type LockLevel } from 'src/core';
function needsLock10<T extends readonly LockLevel[]>(
  ctx: HasLock10Context<T> extends string ? never : HasLock10Context<T>
): void {}
async function test() {
  const ctx8 = await createLockContext().acquireWrite(LOCK_8);
  needsLock10(ctx8); // Should fail: doesn't have LOCK_10
}
`
  },
  {
    name: 'HasLock15Context: Context [12] cannot be passed',
    code: `
import { createLockContext, LOCK_12, type HasLock15Context, type LockLevel } from 'src/core';
function needsLock15<T extends readonly LockLevel[]>(
  ctx: HasLock15Context<T> extends string ? never : HasLock15Context<T>
): void {}
async function test() {
  const ctx12 = await createLockContext().acquireWrite(LOCK_12);
  needsLock15(ctx12); // Should fail: doesn't have LOCK_15
}
`
  },
  {
    name: 'HasLock8Context: Empty context cannot be passed',
    code: `
import { createLockContext, type HasLock8Context, type LockLevel } from 'src/core';
function needsLock8<T extends readonly LockLevel[]>(
  ctx: HasLock8Context<T> extends string ? never : HasLock8Context<T>
): void {}
async function test() {
  const empty = createLockContext();
  needsLock8(empty); // Should fail: doesn't have LOCK_8
}
`
  },
  // useLock - invalid patterns
  {
    name: 'useLock: Cannot use non-held lock LOCK_2 from context [1]',
    code: `
import { createLockContext, LOCK_1, LOCK_2 } from 'src/core';
async function test() {
  const ctx1 = await createLockContext().acquireWrite(LOCK_1);
  ctx1.useLock(LOCK_2, () => {}); // Should fail: LOCK_2 not held
}
`
  },
  {
    name: 'useLock: Cannot use LOCK_5 from context [1,3]',
    code: `
import { createLockContext, LOCK_1, LOCK_3, LOCK_5 } from 'src/core';
async function test() {
  const ctx13 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_3));
  ctx13.useLock(LOCK_5, () => {}); // Should fail: LOCK_5 not held
}
`
  },
  {
    name: 'useLock: Cannot use LOCK_1 from empty context',
    code: `
import { createLockContext, LOCK_1 } from 'src/core';
async function test() {
  const empty = createLockContext();
  empty.useLock(LOCK_1, () => {}); // Should fail: no locks held
}
`
  },
  {
    name: 'useLock: Cannot use LOCK_10 from context [5,8]',
    code: `
import { createLockContext, LOCK_5, LOCK_8, LOCK_10 } from 'src/core';
async function test() {
  const ctx58 = await createLockContext().acquireWrite(LOCK_5).then(c => c.acquireWrite(LOCK_8));
  ctx58.useLock(LOCK_10, () => {}); // Should fail: LOCK_10 not held
}
`
  },
  {
    name: 'useLock: Cannot use skipped lock LOCK_2 from context [1,3]',
    code: `
import { createLockContext, LOCK_1, LOCK_2, LOCK_3 } from 'src/core';
async function test() {
  const ctx13 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_3));
  ctx13.useLock(LOCK_2, () => {}); // Should fail: LOCK_2 was skipped
}
`
  },
  // useLockWithAcquire - invalid patterns
  {
    name: 'useLockWithAcquire: Cannot acquire lower lock LOCK_1 from context [3]',
    code: `
import { createLockContext, LOCK_1, LOCK_3 } from 'src/core';
async function test() {
  const ctx3 = await createLockContext().acquireWrite(LOCK_3);
  await ctx3.useLockWithAcquire(LOCK_1, async () => {}); // Should fail: 3 → 1 violates order
}
`
  },
  {
    name: 'useLockWithAcquire: Cannot acquire LOCK_2 from context [5]',
    code: `
import { createLockContext, LOCK_2, LOCK_5 } from 'src/core';
async function test() {
  const ctx5 = await createLockContext().acquireWrite(LOCK_5);
  await ctx5.useLockWithAcquire(LOCK_2, async () => {}); // Should fail: 5 → 2 violates order
}
`
  },
  {
    name: 'useLockWithAcquire: Cannot acquire duplicate lock LOCK_3',
    code: `
import { createLockContext, LOCK_3 } from 'src/core';
async function test() {
  const ctx3 = await createLockContext().acquireWrite(LOCK_3);
  await ctx3.useLockWithAcquire(LOCK_3, async () => {}); // Should fail: duplicate acquisition
}
`
  },
  {
    name: 'useLockWithAcquire: Cannot acquire LOCK_4 from context [1,4]',
    code: `
import { createLockContext, LOCK_1, LOCK_4 } from 'src/core';
async function test() {
  const ctx14 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_4));
  await ctx14.useLockWithAcquire(LOCK_4, async () => {}); // Should fail: duplicate
}
`
  },
  {
    name: 'useLockWithAcquire: Cannot acquire LOCK_8 from context [2,10]',
    code: `
import { createLockContext, LOCK_2, LOCK_8, LOCK_10 } from 'src/core';
async function test() {
  const ctx210 = await createLockContext().acquireWrite(LOCK_2).then(c => c.acquireWrite(LOCK_10));
  await ctx210.useLockWithAcquire(LOCK_8, async () => {}); // Should fail: 10 → 8 violates order
}
`
  },
  {
    name: 'useLockWithAcquire: Cannot acquire LOCK_1 from context [2,5,8]',
    code: `
import { createLockContext, LOCK_1, LOCK_2, LOCK_5, LOCK_8 } from 'src/core';
async function test() {
  const ctx258 = await createLockContext()
    .acquireWrite(LOCK_2)
    .then(c => c.acquireWrite(LOCK_5))
    .then(c => c.acquireWrite(LOCK_8));
  await ctx258.useLockWithAcquire(LOCK_1, async () => {}); // Should fail: 2,5,8 → 1
}
`
  }
];

// Test cases - code that should compile successfully (to verify our test mechanism)
// These tests ensure our compilation setup is working correctly - if these fail,
// it indicates a problem with our testing infrastructure rather than the IronGuard system
const validCodeTests = [
  {
    name: 'Sanity check: Basic TypeScript compilation',
    code: `
// Simple valid TypeScript code to verify our compilation mechanism works
const message: string = "Hello, IronGuard!";
const numbers: number[] = [1, 2, 3, 4, 5];

interface TestInterface {
  id: number;
  name: string;
}

function processData(data: TestInterface): string {
  return \`Processing: \${data.name} (ID: \${data.id})\`;
}

const testData: TestInterface = { id: 1, name: "Test" };
const result = processData(testData);

// If this doesn't compile, our test infrastructure has issues
export { message, numbers, processData };
`
  },
  {
    name: 'Valid lock ordering: Sequential acquisition',
    code: `
import { createLockContext, LOCK_1, LOCK_2, LOCK_3, LOCK_4, LOCK_5 } from 'src/core';
async function test() {
  // Valid sequential lock acquisition
  const ctx = createLockContext();
  const ctx1 = await ctx.acquireWrite(LOCK_1);
  const ctx12 = await ctx1.acquireWrite(LOCK_2);
  const ctx123 = await ctx12.acquireWrite(LOCK_3);
  const ctx1234 = await ctx123.acquireWrite(LOCK_4);
  const ctx12345 = await ctx1234.acquireWrite(LOCK_5);
  
  // Clean up
  ctx12345.dispose();
}
`
  },
  {
    name: 'Valid lock skipping patterns',
    code: `
import { createLockContext, LOCK_1, LOCK_3, LOCK_5 } from 'src/core';
async function test() {
  // Valid lock skipping: 1 → 3
  const ctx1 = await createLockContext().acquireWrite(LOCK_1);
  const ctx13 = await ctx1.acquireWrite(LOCK_3);
  ctx13.dispose();
  
  // Valid lock skipping: 1 → 5
  const ctx1b = await createLockContext().acquireWrite(LOCK_1);
  const ctx15 = await ctx1b.acquireWrite(LOCK_5);
  ctx15.dispose();
  
  // Valid direct acquisition
  const ctx5 = await createLockContext().acquireWrite(LOCK_5);
  ctx5.dispose();
}
`
  },
  {
    name: 'Valid lock usage patterns',
    code: `
import { createLockContext, LOCK_1, LOCK_2, LOCK_3 } from 'src/core';
async function test() {
  const ctx123 = await createLockContext()
    .acquireWrite(LOCK_1)
    .then(c => c.acquireWrite(LOCK_2))
    .then(c => c.acquireWrite(LOCK_3));
  
  // Using held locks is valid
  ctx123.useLock(LOCK_1, () => console.log('Using LOCK_1'));
  ctx123.useLock(LOCK_2, () => console.log('Using LOCK_2'));
  ctx123.useLock(LOCK_3, () => console.log('Using LOCK_3'));
  
  // Check lock state
  const hasLock1 = ctx123.hasLock(LOCK_1);
  const hasLock2 = ctx123.hasLock(LOCK_2);
  const hasLock3 = ctx123.hasLock(LOCK_3);
  
  ctx123.dispose();
}
`
  },
  {
    name: 'Valid function constraints',
    code: `
import { createLockContext, LOCK_1, LOCK_2, LOCK_3, LOCK_4 } from 'src/core';
import type { Contains, LockContext, LockLevel } from 'src/core';

function requiresLock2<THeld extends readonly LockLevel[]>(
  context: Contains<THeld, 2> extends true ? LockContext<THeld> : never
): string { return 'has lock 2'; }

function requiresLock1<THeld extends readonly LockLevel[]>(
  context: Contains<THeld, 1> extends true ? LockContext<THeld> : never
): string { return 'has lock 1'; }

async function test() {
  // Context with LOCK_2 satisfies requiresLock2
  const ctx2 = await createLockContext().acquireWrite(LOCK_2);
  const result2 = requiresLock2(ctx2);
  ctx2.dispose();
  
  // Context with LOCK_1 and LOCK_2 satisfies both
  const ctx12 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_2));
  const result1 = requiresLock1(ctx12);
  const result2b = requiresLock2(ctx12);
  ctx12.dispose();
  
  // Context with multiple locks satisfies individual requirements
  const ctx1234 = await createLockContext()
    .acquireWrite(LOCK_1)
    .then(c => c.acquireWrite(LOCK_2))
    .then(c => c.acquireWrite(LOCK_3))
    .then(c => c.acquireWrite(LOCK_4));
  const result1b = requiresLock1(ctx1234);
  const result2c = requiresLock2(ctx1234);
  ctx1234.dispose();
}
`
  },
  {
    name: 'Valid complex lock patterns',
    code: `
import { createLockContext, LOCK_1, LOCK_2, LOCK_4, LOCK_5 } from 'src/core';
async function test() {
  // Valid complex patterns
  const ctx14 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_4));
  ctx14.dispose();
  
  const ctx25 = await createLockContext().acquireWrite(LOCK_2).then(c => c.acquireWrite(LOCK_5));
  ctx25.dispose();
  
  const ctx145 = await createLockContext()
    .acquireWrite(LOCK_1)
    .then(c => c.acquireWrite(LOCK_4))
    .then(c => c.acquireWrite(LOCK_5));
  ctx145.dispose();
  
  // Direct high-level acquisition
  const ctx4 = await createLockContext().acquireWrite(LOCK_4);
  const ctx45 = await ctx4.acquireWrite(LOCK_5);
  ctx45.dispose();
}
`
  },
  {
    name: 'Valid type system interaction',
    code: `
import { createLockContext, LOCK_1, LOCK_3, LOCK_5 } from 'src/core';
import type { LockContext, LockLevel, Contains } from 'src/core';

async function test() {
  // Type system should work correctly for valid cases
  const ctx1 = await createLockContext().acquireWrite(LOCK_1);
  
  // These type checks should all pass
  const hasLock1: Contains<[1], 1> = true as const;
  
  // Valid acquisitions based on type system
  const ctx13 = await ctx1.acquireWrite(LOCK_3);
  ctx13.dispose();
  
  const ctx1b = await createLockContext().acquireWrite(LOCK_1);
  const ctx15 = await ctx1b.acquireWrite(LOCK_5);
  ctx15.dispose();
}
`
  },
  {
    name: 'Valid high lock operations',
    code: `
import { createLockContext, LOCK_6, LOCK_9, LOCK_12, LOCK_15 } from 'src/core';

async function test() {
  // Direct high lock acquisition
  const ctx9 = await createLockContext().acquireWrite(LOCK_9);
  ctx9.dispose();
  
  // High lock progression
  const ctx6 = await createLockContext().acquireWrite(LOCK_6);
  const ctx612 = await ctx6.acquireWrite(LOCK_12);
  const ctx61215 = await ctx612.acquireWrite(LOCK_15);
  ctx61215.dispose();
}
`
  },
  {
    name: 'Valid high lock skipping patterns',
    code: `
import { createLockContext, LOCK_2, LOCK_8, LOCK_13 } from 'src/core';

async function test() {
  // Large skip: 2 → 13
  const ctx2 = await createLockContext().acquireWrite(LOCK_2);
  const ctx213 = await ctx2.acquireWrite(LOCK_13);
  ctx213.dispose();
  
  // Medium skip: 8 direct
  const ctx8 = await createLockContext().acquireWrite(LOCK_8);
  ctx8.dispose();
}
`
  },
  // LocksAtMost flexible types - valid patterns
  {
    name: 'LocksAtMost5: Accept empty context',
    code: `
import { createLockContext, type LockContext, type LocksAtMost5 } from 'src/core';
async function processWithFlexibleContext(ctx: LockContext<LocksAtMost5>): Promise<void> {
  const locks = ctx.getHeldLocks();
  console.log(\`Processing with locks: [\${locks}]\`);
}
async function test() {
  const ctx = createLockContext();
  await processWithFlexibleContext(ctx); // Valid: [] is in LocksAtMost5
}
`
  },
  {
    name: 'LocksAtMost5: Accept [4,5] context',
    code: `
import { createLockContext, LOCK_4, LOCK_5, type LockContext, type LocksAtMost5 } from 'src/core';
async function processWithFlexibleContext(ctx: LockContext<LocksAtMost5>): Promise<void> {
  if (ctx.hasLock(LOCK_4)) {
    console.log('Has lock 4');
  }
}
async function test() {
  const ctx0 = createLockContext();
  const ctx4 = await ctx0.acquireWrite(LOCK_4);
  const ctx5 = await ctx4.acquireWrite(LOCK_5);
  await processWithFlexibleContext(ctx5); // Valid: [4,5] is in LocksAtMost5
  ctx5.dispose();
}
`
  },
  {
    name: 'LocksAtMost3: Accept skip pattern [1,3]',
    code: `
import { createLockContext, LOCK_1, LOCK_3, type LockContext, type LocksAtMost3 } from 'src/core';
async function plugin(ctx: LockContext<LocksAtMost3>): Promise<void> {
  const locks = ctx.getHeldLocks();
  console.log(\`Plugin with [\${locks}]\`);
}
async function test() {
  const ctx0 = createLockContext();
  const ctx1 = await ctx0.acquireWrite(LOCK_1);
  const ctx3 = await ctx1.acquireWrite(LOCK_3);
  await plugin(ctx3); // Valid: [1,3] is in LocksAtMost3
  ctx3.dispose();
}
`
  },
  {
    name: 'LocksAtMost4: Accept single lock [2]',
    code: `
import { createLockContext, LOCK_2, type LockContext, type LocksAtMost4 } from 'src/core';
async function middleware(ctx: LockContext<LocksAtMost4>): Promise<void> {
  const locks = ctx.getHeldLocks();
  return;
}
async function test() {
  const ctx2 = await createLockContext().acquireWrite(LOCK_2);
  await middleware(ctx2); // Valid: [2] is in LocksAtMost4
  ctx2.dispose();
}
`
  },
  {
    name: 'LocksAtMost5: Can acquire lock 6 and higher',
    code: `
import { createLockContext, LOCK_1, LOCK_5, LOCK_6, type LockContext, type LocksAtMost5 } from 'src/core';
async function processWithFlexibleContext(ctx: LockContext<LocksAtMost5>): Promise<void> {
  // Valid: can acquire locks ABOVE the LocksAtMost range
  const ctx6 = await ctx.acquireWrite(LOCK_6);
  ctx6.dispose();
}
async function test() {
  const ctx15 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_5));
  await processWithFlexibleContext(ctx15);
  ctx15.dispose();
}
`
  },
  {
    name: 'LocksAtMost3: Pass through different states',
    code: `
import { createLockContext, LOCK_1, LOCK_2, LOCK_3, type LockContext, type LocksAtMost3 } from 'src/core';
async function flexibleHandler(ctx: LockContext<LocksAtMost3>): Promise<string> {
  const locks = ctx.getHeldLocks() as readonly number[];
  if (locks.length === 0) return 'empty';
  if (locks.includes(3)) return 'has-3';
  return 'partial';
}
async function test() {
  // All valid patterns
  const result1 = await flexibleHandler(createLockContext());
  
  const ctx1 = await createLockContext().acquireWrite(LOCK_1);
  const result2 = await flexibleHandler(ctx1);
  ctx1.dispose();
  
  const ctx23 = await createLockContext().acquireWrite(LOCK_2).then(c => c.acquireWrite(LOCK_3));
  const result3 = await flexibleHandler(ctx23);
  ctx23.dispose();
  
  const ctx123 = await createLockContext()
    .acquireWrite(LOCK_1)
    .then(c => c.acquireWrite(LOCK_2))
    .then(c => c.acquireWrite(LOCK_3));
  const result4 = await flexibleHandler(ctx123);
  ctx123.dispose();
}
`
  },
  {
    name: 'LocksAtMost5: Chained context passing',
    code: `
import { createLockContext, LOCK_1, LOCK_3, LOCK_5, type LockContext, type LocksAtMost5 } from 'src/core';
async function stepOne(ctx: LockContext<LocksAtMost5>): Promise<void> {}
async function stepTwo(ctx: LockContext<LocksAtMost5>): Promise<void> {}
async function stepThree(ctx: LockContext<LocksAtMost5>): Promise<void> {}

async function test() {
  const ctx0 = createLockContext();
  const ctx1 = await ctx0.acquireWrite(LOCK_1);
  await stepOne(ctx1);
  
  const ctx3 = await ctx1.acquireWrite(LOCK_3);
  await stepTwo(ctx3);
  
  const ctx5 = await ctx3.acquireWrite(LOCK_5);
  await stepThree(ctx5);
  
  ctx5.dispose();
}
`
  },
  {
    name: 'LocksAtMost types with different levels',
    code: `
import { createLockContext, LOCK_1, LOCK_2, LOCK_3, LOCK_4, LOCK_5, 
         type LockContext, type LocksAtMost3, type LocksAtMost5 } from 'src/core';

async function smallPlugin(ctx: LockContext<LocksAtMost3>): Promise<void> {}
async function largePlugin(ctx: LockContext<LocksAtMost5>): Promise<void> {}

async function test() {
  const ctx2 = await createLockContext().acquireWrite(LOCK_2);
  
  // Valid: [2] fits in both LocksAtMost3 and LocksAtMost5
  await smallPlugin(ctx2);
  await largePlugin(ctx2);
  
  const ctx3 = await ctx2.acquireWrite(LOCK_3);
  
  // Valid: [2,3] fits in both
  await smallPlugin(ctx3);
  await largePlugin(ctx3);
  
  const ctx5 = await ctx3.acquireWrite(LOCK_5);
  
  // Valid: [2,3,5] only fits in LocksAtMost5
  await largePlugin(ctx5);
  
  ctx5.dispose();
}
`
  },
  // NullableLocksAtMost types - valid patterns
  {
    name: 'NullableLocksAtMost10: Accept context [8]',
    code: `
import { createLockContext, LOCK_8, type NullableLocksAtMost10, type LockLevel } from 'src/core';
function needsAtMost10<T extends readonly LockLevel[]>(ctx: NullableLocksAtMost10<T>): void {
  if (ctx !== null) {
    console.log('Valid context:', ctx.getHeldLocks());
  }
}
async function test() {
  const ctx8 = await createLockContext().acquireWrite(LOCK_8);
  needsAtMost10(ctx8); // Valid: 8 <= 10
  ctx8.dispose();
}
`
  },
  {
    name: 'NullableLocksAtMost12: Accept context [10]',
    code: `
import { createLockContext, LOCK_10, type NullableLocksAtMost12, type LockLevel } from 'src/core';
function needsAtMost12<T extends readonly LockLevel[]>(ctx: NullableLocksAtMost12<T>): void {
  if (ctx !== null) {
    console.log('Valid context:', ctx.getHeldLocks());
  }
}
async function test() {
  const ctx10 = await createLockContext().acquireWrite(LOCK_10);
  needsAtMost12(ctx10); // Valid: 10 <= 12
  ctx10.dispose();
}
`
  },
  {
    name: 'NullableLocksAtMost15: Accept context [15]',
    code: `
import { createLockContext, LOCK_15, type NullableLocksAtMost15, type LockLevel } from 'src/core';
function needsAtMost15<T extends readonly LockLevel[]>(ctx: NullableLocksAtMost15<T>): void {
  if (ctx !== null) {
    console.log('Valid context:', ctx.getHeldLocks());
  }
}
async function test() {
  const ctx15 = await createLockContext().acquireWrite(LOCK_15);
  needsAtMost15(ctx15); // Valid: 15 <= 15
  ctx15.dispose();
}
`
  },
  {
    name: 'NullableLocksAtMost11: Accept empty context',
    code: `
import { createLockContext, type NullableLocksAtMost11, type LockLevel } from 'src/core';
function needsAtMost11<T extends readonly LockLevel[]>(ctx: NullableLocksAtMost11<T>): void {
  if (ctx !== null) {
    console.log('Valid context:', ctx.getHeldLocks());
  }
}
async function test() {
  const empty = createLockContext();
  needsAtMost11(empty); // Valid: empty context (0 locks)
}
`
  },
  // HasLockContext types - valid patterns
  {
    name: 'HasLock3Context: Accept context [3]',
    code: `
import { createLockContext, LOCK_3, type HasLock3Context, type LockLevel } from 'src/core';
function needsLock3<T extends readonly LockLevel[]>(
  ctx: HasLock3Context<T> extends string ? never : HasLock3Context<T>
): void {
  // If this compiles, HasLock3Context<T> returned LockContext<T>
  console.log('Using context');
}
async function test() {
  const ctx3 = await createLockContext().acquireWrite(LOCK_3);
  needsLock3(ctx3); // Valid: has LOCK_3
  ctx3.dispose();
}
`
  },
  {
    name: 'HasLock5Context: Accept context [1,3,5]',
    code: `
import { createLockContext, LOCK_1, LOCK_3, LOCK_5, type HasLock5Context, type LockLevel } from 'src/core';
function needsLock5<T extends readonly LockLevel[]>(
  ctx: HasLock5Context<T> extends string ? never : HasLock5Context<T>
): void {
  console.log('Using context');
}
async function test() {
  const ctx135 = await createLockContext()
    .acquireWrite(LOCK_1)
    .then(c => c.acquireWrite(LOCK_3))
    .then(c => c.acquireWrite(LOCK_5));
  needsLock5(ctx135); // Valid: has LOCK_5
  ctx135.dispose();
}
`
  },
  {
    name: 'HasLock10Context: Accept context [10,12]',
    code: `
import { createLockContext, LOCK_10, LOCK_12, type HasLock10Context, type LockLevel } from 'src/core';
function needsLock10<T extends readonly LockLevel[]>(
  ctx: HasLock10Context<T> extends string ? never : HasLock10Context<T>
): void {
  console.log('Using context');
}
async function test() {
  const ctx1012 = await createLockContext()
    .acquireWrite(LOCK_10)
    .then(c => c.acquireWrite(LOCK_12));
  needsLock10(ctx1012); // Valid: has LOCK_10
  ctx1012.dispose();
}
`
  },
  {
    name: 'HasLock15Context: Accept context [15]',
    code: `
import { createLockContext, LOCK_15, type HasLock15Context, type LockLevel } from 'src/core';
function needsLock15<T extends readonly LockLevel[]>(
  ctx: HasLock15Context<T> extends string ? never : HasLock15Context<T>
): void {
  console.log('Using context');
}
async function test() {
  const ctx15 = await createLockContext().acquireWrite(LOCK_15);
  needsLock15(ctx15); // Valid: has LOCK_15
  ctx15.dispose();
}
`
  },
  {
    name: 'HasLock8Context: Accept context [5,8,10]',
    code: `
import { createLockContext, LOCK_5, LOCK_8, LOCK_10, type HasLock8Context, type LockLevel } from 'src/core';
function needsLock8<T extends readonly LockLevel[]>(
  ctx: HasLock8Context<T> extends string ? never : HasLock8Context<T>
): void {
  console.log('Using context');
}
async function test() {
  const ctx5810 = await createLockContext()
    .acquireWrite(LOCK_5)
    .then(c => c.acquireWrite(LOCK_8))
    .then(c => c.acquireWrite(LOCK_10));
  needsLock8(ctx5810); // Valid: has LOCK_8
  ctx5810.dispose();
}
`
  },
  // releaseLock - valid patterns
  {
    name: 'releaseLock: Release held lock LOCK_2 from context [1,2]',
    code: `
import { createLockContext, LOCK_1, LOCK_2 } from 'src/core';
async function test() {
  const ctx12 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_2));
  const ctx1 = ctx12.releaseLock(LOCK_2); // Valid: LOCK_2 is held
  ctx1.dispose();
}
`
  },
  {
    name: 'releaseLock: Release middle lock from context [1,2,3]',
    code: `
import { createLockContext, LOCK_1, LOCK_2, LOCK_3 } from 'src/core';
async function test() {
  const ctx123 = await createLockContext()
    .acquireWrite(LOCK_1)
    .then(c => c.acquireWrite(LOCK_2))
    .then(c => c.acquireWrite(LOCK_3));
  const ctx13 = ctx123.releaseLock(LOCK_2); // Valid: release middle lock
  ctx13.dispose();
}
`
  },
  {
    name: 'releaseLock: Release first lock from context [1,2,3]',
    code: `
import { createLockContext, LOCK_1, LOCK_2, LOCK_3 } from 'src/core';
async function test() {
  const ctx123 = await createLockContext()
    .acquireWrite(LOCK_1)
    .then(c => c.acquireWrite(LOCK_2))
    .then(c => c.acquireWrite(LOCK_3));
  const ctx23 = ctx123.releaseLock(LOCK_1); // Valid: release first lock
  ctx23.dispose();
}
`
  },
  {
    name: 'releaseLock: Release last lock from context [1,2,3]',
    code: `
import { createLockContext, LOCK_1, LOCK_2, LOCK_3 } from 'src/core';
async function test() {
  const ctx123 = await createLockContext()
    .acquireWrite(LOCK_1)
    .then(c => c.acquireWrite(LOCK_2))
    .then(c => c.acquireWrite(LOCK_3));
  const ctx12 = ctx123.releaseLock(LOCK_3); // Valid: release last lock
  ctx12.dispose();
}
`
  },
  {
    name: 'releaseLock: Temporary lock elevation pattern',
    code: `
import { createLockContext, LOCK_1, LOCK_2, LOCK_3, LOCK_4 } from 'src/core';
async function test() {
  const ctx123 = await createLockContext()
    .acquireWrite(LOCK_1)
    .then(c => c.acquireWrite(LOCK_2))
    .then(c => c.acquireWrite(LOCK_3));
  const ctx1234 = await ctx123.acquireWrite(LOCK_4); // Elevate
  const ctxBack = ctx1234.releaseLock(LOCK_4); // De-elevate
  ctxBack.dispose();
}
`
  },
  {
    name: 'releaseLock: Sequential releases',
    code: `
import { createLockContext, LOCK_1, LOCK_2, LOCK_3, LOCK_4, LOCK_5 } from 'src/core';
async function test() {
  const ctx12345 = await createLockContext()
    .acquireWrite(LOCK_1)
    .then(c => c.acquireWrite(LOCK_2))
    .then(c => c.acquireWrite(LOCK_3))
    .then(c => c.acquireWrite(LOCK_4))
    .then(c => c.acquireWrite(LOCK_5));
  const ctx1345 = ctx12345.releaseLock(LOCK_2);
  const ctx135 = ctx1345.releaseLock(LOCK_4);
  const ctx15 = ctx135.releaseLock(LOCK_3);
  ctx15.dispose();
}
`
  },
  {
    name: 'releaseLock: Works with read locks',
    code: `
import { createLockContext, LOCK_1, LOCK_2, LOCK_3 } from 'src/core';
async function test() {
  const ctx123R = await createLockContext()
    .acquireRead(LOCK_1)
    .then(c => c.acquireRead(LOCK_2))
    .then(c => c.acquireRead(LOCK_3));
  const ctx13R = ctx123R.releaseLock(LOCK_2);
  ctx13R.dispose();
}
`
  },
  {
    name: 'releaseLock: Works with mixed read/write locks',
    code: `
import { createLockContext, LOCK_1, LOCK_2, LOCK_3, LOCK_4 } from 'src/core';
async function test() {
  const ctxMixed = await createLockContext()
    .acquireRead(LOCK_1)
    .then(c => c.acquireWrite(LOCK_2))
    .then(c => c.acquireRead(LOCK_3))
    .then(c => c.acquireWrite(LOCK_4));
  const ctx134 = ctxMixed.releaseLock(LOCK_2);
  ctx134.dispose();
}
`
  },
  {
    name: 'releaseLock: Works with high lock numbers',
    code: `
import { createLockContext, LOCK_10, LOCK_12, LOCK_15 } from 'src/core';
async function test() {
  const ctx101215 = await createLockContext()
    .acquireWrite(LOCK_10)
    .then(c => c.acquireWrite(LOCK_12))
    .then(c => c.acquireWrite(LOCK_15));
  const ctx1015 = ctx101215.releaseLock(LOCK_12);
  ctx1015.dispose();
}
`
  },
  {
    name: 'releaseLock: Release from skip pattern [1,3,5]',
    code: `
import { createLockContext, LOCK_1, LOCK_3, LOCK_5 } from 'src/core';
async function test() {
  const ctx135 = await createLockContext()
    .acquireWrite(LOCK_1)
    .then(c => c.acquireWrite(LOCK_3))
    .then(c => c.acquireWrite(LOCK_5));
  const ctx15 = ctx135.releaseLock(LOCK_3); // Valid: can release any held lock
  ctx15.dispose();
}
`
  }
];

function runTest(testCase, shouldFail = true) {
  const tempDir = path.join(__dirname, 'temp-compile-tests');
  const tempFile = path.join(tempDir, `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.ts`);
  
  try {
    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Write test file
    fs.writeFileSync(tempFile, testCase.code);
    
    // Try to compile
    try {
      execSync(`npx tsc --target ES2020 --module ESNext --moduleResolution node --strict --noEmit --skipLibCheck --esModuleInterop --allowSyntheticDefaultImports --resolveJsonModule --baseUrl . ${tempFile}`, { 
        stdio: 'pipe',
        cwd: path.join(__dirname, '..')
      });
      
      // If we get here, compilation succeeded
      if (shouldFail) {
        console.error(`❌ FAIL: ${testCase.name}`);
        console.error(`   Expected compilation to fail, but it succeeded`);
        return false;
      } else {
        console.log(`✅ PASS: ${testCase.name}`);
        return true;
      }
    } catch (error) {
      // Compilation failed
      if (shouldFail) {
        console.log(`✅ PASS: ${testCase.name}`);
        console.log(`   Correctly rejected with: ${error.message.split('\\n')[0]}`);
        return true;
      } else {
        console.error(`❌ FAIL: ${testCase.name}`);
        console.error(`   Expected compilation to succeed, but it failed: ${error.message}`);
        return false;
      }
    }
  } finally {
    // Clean up
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

function main() {
  console.log('🔍 IronGuard Compile-time Validation Tests');
  console.log('==========================================\\n');
  
  let passed = 0;
  let total = 0;
  
  console.log('Testing invalid code (should fail compilation):');
  for (const testCase of invalidCodeTests) {
    total++;
    if (runTest(testCase, true)) {
      passed++;
    }
  }
  
  if (validCodeTests.length > 0) {
    console.log('\\nTesting valid code (should compile successfully):');
    for (const testCase of validCodeTests) {
      total++;
      if (runTest(testCase, false)) {
        passed++;
      }
    }
  }
  
  // Clean up temp directory
  const tempDir = path.join(__dirname, 'temp-compile-tests');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  
  console.log(`\\n📊 Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All compile-time validation tests passed!');
    process.exit(0);
  } else {
    console.log('💥 Some compile-time validation tests failed!');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}