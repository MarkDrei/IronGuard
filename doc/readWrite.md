# Read/Write Lock Extension Plan Analysis

## Executive Summary

The proposed extension to add read/write semantics to IronGuard is **architecturally sound** but requires careful design decisions to maintain the system's core guarantees. This document analyzes the feasibility, identifies potential issues, and proposes solutions.

## Current System Analysis

### Strengths of Current Design
- **Compile-time lock ordering validation** prevents deadlocks
- **Runtime mutual exclusion** prevents race conditions
- **Type-safe lock level progression** (1→2→3→4→5 or skipping allowed)
- **Flexible acquisition patterns** support complex scenarios
- **Clean separation** between compile-time (ordering) and runtime (mutual exclusion) concerns

### Current Runtime Behavior
```typescript
// Current: Mutual exclusion on each lock level
const ctx1 = await createLockContext().acquireWrite(LOCK_3); // Blocks until LOCK_3 available
const ctx2 = await createLockContext().acquireWrite(LOCK_3); // Waits for ctx1 to release
```

## Proposed Read/Write Extension

### Core Concept
- Keep **lock levels as integers** (1, 2, 3, 4, 5)
- Add **read/write modes** for each level: `acquireRead(LOCK_3)` vs `acquireWrite(LOCK_3)`
- Maintain **identical compile-time ordering rules**
- Change **runtime behavior** to allow concurrent reads

### Proposed API
```typescript
// Proposed API extensions
const readerCtx1 = await createLockContext().acquireRead(LOCK_3);  // ✓ Granted
const readerCtx2 = await createLockContext().acquireRead(LOCK_3);  // ✓ Granted (concurrent)
const writerCtx = await createLockContext().acquireWrite(LOCK_3);  // ⏳ Waits for readers

// Ordering still enforced
const ctx = await createLockContext().acquireRead(LOCK_1);
const invalid = await ctx.acquireRead(LOCK_1);  // ❌ Compile error: duplicate
const valid = await ctx.acquireWrite(LOCK_3);   // ✓ Valid: 1 < 3
```

## Detailed Analysis

### ✅ Strengths of the Plan

1. **Preserves Compile-Time Guarantees**
   - Lock ordering validation remains identical
   - Deadlock prevention is maintained
   - Type system complexity doesn't increase

2. **Clean Separation of Concerns**
   - Compile-time: ordering validation (unchanged)
   - Runtime: concurrency control (enhanced)

3. **Incremental Enhancement**
   - Existing code continues to work
   - New functionality is additive

4. **Writer Preference Design**
   - Prevents writer starvation
   - Standard pattern in concurrent systems

### ⚠️ Critical Issues Identified

#### 1. **API Consistency Problem**
**Issue**: Current `acquire()` method becomes ambiguous
```typescript
// Current API
const ctx = await createLockContext().acquireWrite(LOCK_3);

// Proposed: What does this mean now?
// Option A: Defaults to write lock (breaking change)
// Option B: Compilation error (forces explicit choice)
// Option C: Deprecate and require acquireRead/acquireWrite
```

**Decision**: acquire() method has been removed - only explicit acquireRead/acquireWrite methods are supported

#### 2. **Lock Upgrade/Downgrade Complexity**
**Issue**: What happens when a reader wants to become a writer?
```typescript
const reader = await createLockContext().acquireRead(LOCK_3);
// Can reader.acquireWrite(LOCK_3) upgrade? Or is this a duplicate lock error?
```

**Decision**: Prohibit both - treat as separate acquisitions

#### 3. **Mixed Lock Mode Ordering**
**Issue**: How do read/write modes interact in ordering validation?
```typescript
const ctx1 = await createLockContext().acquireRead(LOCK_2);
const ctx2 = await ctx1.acquireWrite(LOCK_3);  // Valid?
const ctx3 = await ctx2.acquireRead(LOCK_4);   // Valid?
```

**Decision**: Ordering should be **mode-agnostic** - only lock levels matter for deadlock prevention.

#### 4. **Runtime State Complexity**
**Current**: Simple `Set<LockLevel>` tracks held locks
**Proposed**: Need to track:
- Active readers per lock level
- Pending writers per lock level  
- Writer preference queues

#### 5. **Type System Integration**
**Issue**: How do read/write modes integrate with existing constraint types?
```typescript
// Current
type ValidLock3Context<THeld> = /* checks if can acquire LOCK_3 */

// Proposed: Need separate constraints?
type ValidLock3ReadContext<THeld> = /* ... */
type ValidLock3WriteContext<THeld> = /* ... */
```

### 🔧 Implementation Challenges

#### 1. **IronGuardManager Rewrite**
Current implementation needs complete overhaul:
```typescript
// Current: Simple mutual exclusion
private globalLocks = new Set<LockLevel>();

// Proposed: Complex reader/writer tracking
private readLocks = new Map<LockLevel, number>();      // reader count
private writeLocks = new Set<LockLevel>();             // active writers
private readerQueues = new Map<LockLevel, Promise[]>(); // waiting readers
private writerQueues = new Map<LockLevel, Promise[]>(); // waiting writers
```

#### 2. **Context State Tracking**
Need to track read/write mode for each held lock:
```typescript
// Current
private heldLocks: THeldLocks;

// Proposed
private heldLocks: THeldLocks;
private lockModes: Map<LockLevel, 'read' | 'write'>;
```

#### 3. **Disposal Complexity**
```typescript
dispose(): void {
  for (const [lock, mode] of this.lockModes) {
    if (mode === 'read') {
      this.manager.releaseReadLock(lock);
    } else {
      this.manager.releaseWriteLock(lock);
    }
  }
}
```

## Recommended Design Solutions

### 1. **API Design**
```typescript
// Explicit read/write methods (deprecate acquire)
class LockContext<THeldLocks extends readonly LockLevel[]> {
  async acquireRead<TLock extends LockLevel>(
    lock: CanAcquire<THeldLocks, TLock> extends true ? TLock : never
  ): Promise<LockContext<[...THeldLocks, TLock]>>

  async acquireWrite<TLock extends LockLevel>(
    lock: CanAcquire<THeldLocks, TLock> extends true ? TLock : never  
  ): Promise<LockContext<[...THeldLocks, TLock]>>
}
```

### 2. **Runtime Manager Design**
```typescript
class IronGuardManager {
  private readerCounts = new Map<LockLevel, number>();
  private activeWriters = new Set<LockLevel>();
  private pendingWriters = new Map<LockLevel, Array<() => void>>();
  private pendingReaders = new Map<LockLevel, Array<() => void>>();

  async acquireReadLock(lock: LockLevel): Promise<void> {
    // If writer active or pending, wait
    while (this.activeWriters.has(lock) || this.hasPendingWriters(lock)) {
      await this.waitInReaderQueue(lock);
    }
    
    this.incrementReaderCount(lock);
  }

  async acquireWriteLock(lock: LockLevel): Promise<void> {
    // Add to writer queue (establishes preference)
    this.addToPendingWriters(lock);
    
    // Wait for all readers and other writers to finish
    while (this.hasReaders(lock) || this.activeWriters.has(lock)) {
      await this.waitInWriterQueue(lock);
    }
    
    this.activeWriters.add(lock);
    this.removeFromPendingWriters(lock);
  }
}
```

### 3. **Type System Integration**
Keep existing constraint types unchanged - they work for both read and write locks since ordering rules are identical.

## Migration Strategy

### Phase 1: Core Implementation
1. Implement new runtime manager with read/write semantics
2. Add `acquireRead()` and `acquireWrite()` methods
3. Maintain `acquire()` as alias to `acquireWrite()`

### Phase 2: Testing & Validation
1. Comprehensive test suite for read/write scenarios
2. Deadlock prevention validation

### Phase 3: Documentation & Examples
1. Best practices documentation

### Phase 4 (Completed): Remove acquire()
✅ **Completed**: The legacy `acquire()` method has been removed. Only explicit `acquireRead()` and `acquireWrite()` methods are supported.

### Phase 5 (Completed): Composable ValidLockContext Types
✅ **Completed**: Enhanced the type system with composable building blocks:

#### New Composable Architecture
```typescript
// Building block types (reusable across all 15 lock levels)
type HasLock<THeld, Level> = Contains<THeld, Level>;
type MaxHeldLock<THeld> = /* gets highest held lock */;
type CanAcquireLockX<THeld> = /* hierarchical composition */;

// ValidLockContext types now composable and descriptive
type ValidLock3Context<THeld> = 
  HasLock<THeld, 3> extends true 
    ? LockContext<THeld>  // Already has LOCK_3
    : CanAcquireLock3<THeld> extends true 
      ? LockContext<THeld>  // Can acquire LOCK_3
      : 'IronGuard: Cannot acquire lock 3 when holding lock X';
```

#### Benefits Achieved
- **All 15 lock levels**: `ValidLock1Context` through `ValidLock15Context`
- **Hierarchical composition**: `CanAcquireLock3` builds on `CanAcquireLock2`
- **Descriptive errors**: "Cannot acquire lock 3 when holding lock 8" 
- **Maintainable**: Adding new lock levels requires minimal code
- **Read/write agnostic**: Works with both `acquireRead()` and `acquireWrite()`

## Risk Assessment

### Low Risk ✅
- **Compile-time ordering**: Unchanged, well-tested
- **Type system**: No breaking changes to constraint types

### Medium Risk ⚠️
- **Runtime complexity**: Significant increase in state management
- **Performance impact**: More complex lock acquisition logic
- **Testing surface**: Much larger test matrix

### High Risk 🚨
- **Correctness**: Writer preference implementation must be bulletproof
- **Deadlock potential**: Complex queuing could introduce new deadlock scenarios
- **Edge cases**: Reader/writer transitions, cleanup on exceptions

## Conclusion

The read/write lock extension is **technically feasible and architecturally sound**. The key insight is that compile-time ordering validation remains completely unchanged, while only the runtime mutual exclusion system needs enhancement.

**Critical Success Factors**:
1. **Explicit API**: Force choice between read/write modes
2. **Writer preference**: Prevent writer starvation
3. **Mode-agnostic ordering**: Lock levels determine ordering, not read/write mode
4. **Comprehensive testing**: Focus on concurrent scenarios and edge cases

**Recommendation**: Proceed with implementation, starting with the runtime manager redesign and comprehensive test coverage for concurrent access patterns.
