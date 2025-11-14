# IronGuard Nullable Context Patterns Guide

This guide covers advanced nullable context patterns and HasLock constraints introduced in IronGuard, complementing the standard lock ordering features covered in the [Quick Start Guide](quick-start.md).

## Overview

IronGuard provides two advanced constraint patterns for flexible lock management:

- **NullableLocksAtMost**: Nullable contexts for conditional lock level thresholds
- **HasLockContext**: Simple lock presence verification

## NullableLocksAtMostX Types

### What Are They?

NullableLocksAtMostX types represent contexts that can be either `LockContext<THeld>` or `null`, based on whether the maximum held lock is within a threshold.

```typescript
type NullableLocksAtMost10<THeld extends readonly LockLevel[]> =
  MaxHeldLock<THeld> extends 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
    ? LockContext<THeld>
    : null;
```

### Available Types

- `NullableLocksAtMost10` - Locks 0-10 (1,024 combinations)
- `NullableLocksAtMost11` - Locks 0-11 (2,048 combinations)
- `NullableLocksAtMost12` - Locks 0-12 (4,096 combinations)
- `NullableLocksAtMost13` - Locks 0-13 (8,192 combinations)
- `NullableLocksAtMost14` - Locks 0-14 (16,384 combinations)
- `NullableLocksAtMost15` - Locks 0-15 (32,768 combinations) ⚠️ Performance impact

### Basic Usage

```typescript
import { createLockContext, LOCK_8, LOCK_12, type NullableLocksAtMost10, type LockLevel } from './src/core';

function processWithMaxLock10<THeld extends readonly LockLevel[]>(
  ctx: NullableLocksAtMost10<THeld>
): void {
  if (ctx !== null) {
    // TypeScript knows ctx is LockContext<THeld> here
    console.log(`Processing with locks: [${ctx.getHeldLocks()}]`);
  } else {
    console.log('Context exceeds lock level 10');
  }
}

// ✅ Valid: LOCK_8 ≤ 10
const ctx8 = await createLockContext().acquireWrite(LOCK_8);
processWithMaxLock10(ctx8);

// ❌ Compile error: LOCK_12 > 10
const ctx12 = await createLockContext().acquireWrite(LOCK_12);
// processWithMaxLock10(ctx12);  // Error!

// Must explicitly handle invalid case:
processWithMaxLock10(null as NullableLocksAtMost10<readonly [12]>);
```

### When to Use

1. **Plugin Systems**: Restrict plugin access to lower-privilege locks
   ```typescript
   function pluginHook<THeld extends readonly LockLevel[]>(
     ctx: NullableLocksAtMost10<THeld>,
     pluginName: string
   ): void {
     if (ctx !== null) {
       // Plugin can run with safe locks
       executePlugin(pluginName, ctx);
     } else {
       console.log(`Plugin ${pluginName} skipped - high privilege context`);
     }
   }
   ```

2. **Middleware with Boundaries**: Accept only certain lock levels
   ```typescript
   function middleware<THeld extends readonly LockLevel[]>(
     ctx: NullableLocksAtMost12<THeld>
   ): void {
     if (ctx !== null) {
       // Middleware operates within safe bounds
       performMiddlewareLogic(ctx);
     }
   }
   ```

3. **Conditional Processing**: Handle different lock levels differently
   ```typescript
   function conditionalProcessor<THeld extends readonly LockLevel[]>(
     ctx: NullableLocksAtMost11<THeld>
   ): void {
     if (ctx !== null) {
       const locks = ctx.getHeldLocks();
       console.log(`Standard processing for: [${locks}]`);
     } else {
       console.log('Elevated privileges detected - special handling required');
     }
   }
   ```

## HasLockXContext Types

### What Are They?

HasLockXContext types ensure that a specific lock is present in the context, regardless of other locks.

```typescript
type HasLock3Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 3> extends true
    ? LockContext<THeld>
    : 'IronGuard: Context must hold LOCK_3';
```

### Available Types

All 15 lock levels are supported:
- `HasLock1Context` through `HasLock15Context`

### Basic Usage

```typescript
import { createLockContext, LOCK_1, LOCK_3, LOCK_5, type HasLock3Context, type LockLevel } from './src/core';

function processWithLock3<THeld extends readonly LockLevel[]>(
  ctx: HasLock3Context<THeld> extends string ? never : HasLock3Context<THeld>
): void {
  // TypeScript guarantees LOCK_3 is present
  console.log(`Processing with guaranteed LOCK_3: [${ctx.getHeldLocks()}]`);
}

// ✅ Valid: Context has LOCK_3
const ctx3 = await createLockContext().acquireWrite(LOCK_3);
processWithLock3(ctx3);

// ✅ Valid: Context has LOCK_3 (plus others)
const ctx135 = await createLockContext()
  .acquireWrite(LOCK_1)
  .then(c => c.acquireWrite(LOCK_3))
  .then(c => c.acquireWrite(LOCK_5));
processWithLock3(ctx135);

// ❌ Compile error: Context doesn't have LOCK_3
const ctx1 = await createLockContext().acquireWrite(LOCK_1);
// processWithLock3(ctx1);  // Error: Context must hold LOCK_3
```

### When to Use

1. **Resource-Specific Operations**: Ensure specific lock for resource access
   ```typescript
   import type { HasLock3Context, HasLock5Context, HasLock8Context } from './src/core';
   
   // Database operations require LOCK_3
   function databaseQuery<THeld extends readonly LockLevel[]>(
     ctx: HasLock3Context<THeld> extends string ? never : HasLock3Context<THeld>,
     query: string
   ): void {
     // Guaranteed to have LOCK_3 (database lock)
     executeQuery(query);
   }
   
   // File operations require LOCK_5
   function fileOperation<THeld extends readonly LockLevel[]>(
     ctx: HasLock5Context<THeld> extends string ? never : HasLock5Context<THeld>,
     filename: string
   ): void {
     // Guaranteed to have LOCK_5 (file lock)
     writeFile(filename);
   }
   
   // Network operations require LOCK_8
   function networkRequest<THeld extends readonly LockLevel[]>(
     ctx: HasLock8Context<THeld> extends string ? never : HasLock8Context<THeld>,
     endpoint: string
   ): void {
     // Guaranteed to have LOCK_8 (network lock)
     callEndpoint(endpoint);
   }
   ```

2. **Privilege-Based Operations**: Different locks for different privilege levels
   ```typescript
   import type { HasLock10Context, HasLock15Context } from './src/core';
   
   // Audit operations require LOCK_10
   function auditLog<THeld extends readonly LockLevel[]>(
     ctx: HasLock10Context<THeld> extends string ? never : HasLock10Context<THeld>,
     message: string
   ): void {
     // Audit logging with LOCK_10
     writeAuditLog(message);
   }
   
   // Admin operations require LOCK_15
   function adminOperation<THeld extends readonly LockLevel[]>(
     ctx: HasLock15Context<THeld> extends string ? never : HasLock15Context<THeld>,
     operation: string
   ): void {
     // Highest privilege operations
     executeAdminCommand(operation);
   }
   ```

3. **Function Composition**: Chain operations with specific lock requirements
   ```typescript
   async function complexWorkflow<THeld extends readonly LockLevel[]>(
     baseCtx: HasLock3Context<THeld> extends string ? never : HasLock3Context<THeld>
   ): Promise<void> {
     // Start with LOCK_3
     databaseQuery(baseCtx, 'SELECT * FROM users');
     
     // Acquire LOCK_5 for file operations
     const ctx5 = await (baseCtx as any).acquireWrite(LOCK_5);
     fileOperation(ctx5, 'export.json');
     
     // Acquire LOCK_8 for network operations
     const ctx8 = await ctx5.acquireWrite(LOCK_8);
     networkRequest(ctx8, '/api/sync');
     
     ctx8.dispose();
   }
   ```

## Type Comparison Chart

| Type | Purpose | Lock Requirement | Usage Pattern |
|------|---------|-----------------|---------------|
| `LocksAtMost5` | Accept any combination ≤ 5 | Any ordered combo | Flexible functions |
| `NullableLocksAtMost10` | Conditional acceptance ≤ 10 | Max lock ≤ 10 | Conditional logic |
| `HasLock3Context` | Require specific lock | Must have LOCK_3 | Resource operations |
| `ValidLock3Context` | Can acquire or has LOCK_3 | Can acquire or has | Function requirements |

## Pattern Comparison

### LocksAtMost vs NullableLocksAtMost

```typescript
// LocksAtMost: Accepts ANY combination up to level
function processA<THeld extends LocksAtMost5>(ctx: LockContext<THeld>): void {
  // Accepts: [], [1], [2], ..., [1,2,3,4,5]
}

// NullableLocksAtMost: Context OR null based on MaxHeldLock
function processB<THeld extends readonly LockLevel[]>(
  ctx: NullableLocksAtMost10<THeld>
): void {
  if (ctx !== null) {
    // MaxHeldLock ≤ 10
  }
}
```

**Choose LocksAtMost when**: You want to accept all combinations up to a level  
**Choose NullableLocksAtMost when**: You need explicit null handling for invalid contexts

### ValidLockXContext vs HasLockXContext

```typescript
// ValidLockXContext: Can acquire OR already has
function processC<THeld extends readonly LockLevel[]>(
  ctx: ValidLock3Context<THeld> extends string ? never : ValidLock3Context<THeld>
): void {
  // Accepts: empty, [1], [2], [3], etc.
  // Can potentially acquire LOCK_3
}

// HasLockXContext: Must already have the lock
function processD<THeld extends readonly LockLevel[]>(
  ctx: HasLock3Context<THeld> extends string ? never : HasLock3Context<THeld>
): void {
  // Accepts only contexts with LOCK_3: [3], [1,3], [3,5], etc.
}
```

**Choose ValidLockX when**: Function might acquire the lock  
**Choose HasLockX when**: Lock must be pre-acquired

## Best Practices

### 1. Choosing the Right Type

```typescript
// ✅ Good: Use HasLockX for guaranteed lock presence
function databaseOp<T extends readonly LockLevel[]>(
  ctx: HasLock3Context<T> extends string ? never : HasLock3Context<T>
) {
  // No need to check - LOCK_3 is guaranteed
}

// ✅ Good: Use NullableLocksAtMost for conditional acceptance
function pluginHook<T extends readonly LockLevel[]>(
  ctx: NullableLocksAtMost10<T>
) {
  if (ctx !== null) {
    // Safe plugin execution
  } else {
    // Skip or alternative handling
  }
}
```

### 2. Error Messages

```typescript
// ✅ Clear error messages from type system
const ctx12 = await createLockContext().acquireWrite(LOCK_12);

// Error at compile time:
// Argument of type 'LockContext<readonly [12]>' is not assignable to parameter of type 'null'
processWithMaxLock10(ctx12);  // NullableLocksAtMost10 expects null for [12]

// Error at compile time:
// Context must hold LOCK_3
processWithLock3(ctx1);  // HasLock3Context requires LOCK_3
```

### 3. Combining Patterns

```typescript
// Combine HasLock and Nullable patterns for complex requirements
function complexOperation<THeld extends readonly LockLevel[]>(
  ctx: HasLock3Context<THeld> extends string 
    ? never 
    : NullableLocksAtMost10<THeld> extends null
      ? never
      : LockContext<THeld>
): void {
  // Requires: Has LOCK_3 AND max lock ≤ 10
  console.log('Complex operation with LOCK_3 and max lock 10');
}

// ✅ Valid: Has LOCK_3, max lock is 8
const ctx38 = await createLockContext()
  .acquireWrite(LOCK_3)
  .then(c => c.acquireWrite(LOCK_8));
complexOperation(ctx38);

// ❌ Invalid: Has LOCK_3 but max lock is 12
const ctx312 = await createLockContext()
  .acquireWrite(LOCK_3)
  .then(c => c.acquireWrite(LOCK_12));
// complexOperation(ctx312);  // Compile error
```

## Performance Considerations

### Compilation Performance

Higher-level NullableLocksAtMost types have increasing compile-time costs:

- **Levels 10-11**: Minimal impact (~1.1s compile time)
- **Levels 12-13**: Moderate impact (~1.4s compile time)
- **Level 14**: Noticeable impact (~1.7s compile time)
- **Level 15**: Significant impact (~2.2s compile time) ⚠️

**Recommendation**: Use levels 10-14 for normal development. Only use level 15 if necessary.

### Runtime Performance

All constraint types have **zero runtime overhead** - they are purely compile-time constructs:

```typescript
// No runtime cost - just TypeScript type checking
function processWithLock10<T extends readonly LockLevel[]>(
  ctx: NullableLocksAtMost10<T>
): void {
  // Checking ctx !== null has standard runtime cost
  if (ctx !== null) {
    // Type narrowing is free - compile-time only
    ctx.getHeldLocks();
  }
}
```

## Common Patterns

### Pattern 1: Plugin System with Privilege Boundaries

```typescript
function registerPlugin<THeld extends readonly LockLevel[]>(
  name: string,
  handler: (ctx: NullableLocksAtMost10<THeld>) => void
): void {
  // Plugins can only access locks up to level 10
  console.log(`Registered plugin: ${name}`);
}

registerPlugin('DataValidator', (ctx) => {
  if (ctx !== null) {
    // Plugin logic with restricted privileges
  }
});
```

### Pattern 2: Resource-Specific Operations

```typescript
// Define resource lock mappings
const RESOURCE_LOCKS = {
  DATABASE: 3,
  FILE_SYSTEM: 5,
  NETWORK: 8,
  AUDIT: 10,
  ADMIN: 15
} as const;

// Type-safe resource operations
import type { HasLock3Context, HasLock5Context, HasLock8Context } from './src/core';

function accessDatabase<T extends readonly LockLevel[]>(
  ctx: HasLock3Context<T> extends string ? never : HasLock3Context<T>
) { /* ... */ }

function accessFiles<T extends readonly LockLevel[]>(
  ctx: HasLock5Context<T> extends string ? never : HasLock5Context<T>
) { /* ... */ }

function accessNetwork<T extends readonly LockLevel[]>(
  ctx: HasLock8Context<T> extends string ? never : HasLock8Context<T>
) { /* ... */ }
```

### Pattern 3: Conditional Processing Pipeline

```typescript
async function processingPipeline<THeld extends readonly LockLevel[]>(
  ctx: NullableLocksAtMost12<THeld>
): Promise<void> {
  if (ctx !== null) {
    // Standard pipeline
    await stage1(ctx);
    await stage2(ctx);
    await stage3(ctx);
  } else {
    // High-privilege alternative pipeline
    console.log('Using elevated privilege pipeline');
    await elevatedProcessing();
  }
}
```

## Testing Your Code

### Compile-Time Validation

Run compile-time tests to verify type constraints:

```bash
npm run test:compile  # Includes NullableLocksAtMost and HasLockContext tests
```

### Runtime Testing

Test nullable handling:

```typescript
import { test } from 'node:test';
import assert from 'node:assert';

test('NullableLocksAtMost10 accepts valid contexts', async () => {
  const ctx8 = await createLockContext().acquireWrite(LOCK_8);
  
  function needsMax10<T extends readonly LockLevel[]>(
    ctx: NullableLocksAtMost10<T>
  ): boolean {
    return ctx !== null;
  }
  
  assert.strictEqual(needsMax10(ctx8), true);
  ctx8.dispose();
});
```

## Next Steps

- Review the [Quick Start Guide](quick-start.md) for basic lock usage
- Explore [Flexible Lock Types](flexible-lock-types.md) for LocksAtMost patterns
- Study [Compile-time Testing](compile-time-testing.md) for type validation
- Run examples: `npm run examples`

## Summary

**NullableLocksAtMostX**: Use for conditional acceptance with explicit null handling
- Levels 10-15 available
- Compile-time safety with nullable pattern
- Perfect for plugin systems and middleware

**HasLockXContext**: Use for guaranteed lock presence
- All 15 levels supported
- Simple boolean check: "Does this have lock X?"
- Ideal for resource-specific operations

Both patterns provide **zero runtime overhead** with full compile-time safety! 🎉
