# Compile-time Testi### Test Coverage

### Lock Violations Detected
- **Ordering**: LOCK_3 → LOCK_1, LOCK_4 → LOCK_2, complex sequences, high locks
- **Duplicates**: LOCK_1 twice, LOCK_3 twice, high lock duplicates  
- **Usage**: Using non-held locks, empty context violations
- **Parameters**: Invalid `ValidLock3Context` usage with composable types
- **Rollback**: Rollback to non-held locks, invalid rollback operations
- **High Locks**: LOCK_6 through LOCK_15 ordering and duplication violations
- **Context Transfer**: Invalid context passing to functions with lock requirements
- **Composable Types**: All 15 ValidLockXContext types with descriptive errors

### Composable Types Validation
The new composable ValidLockContext system is fully tested:
- **Building blocks**: `HasLock`, `CanAcquireLockX`, `MaxHeldLock` validation
- **All 15 levels**: `ValidLock1Context` through `ValidLock15Context`
- **Error messages**: "Cannot acquire lock 3 when holding lock 8. Locks must be acquired in order."
- **Hierarchical composition**: `CanAcquireLock5` builds on `CanAcquireLock4`, etc.

### Current Status
- **21 negative tests**: Invalid patterns that should fail compilation
- **10 positive tests**: Valid code patterns to verify testing infrastructure  
- **Total**: 31/31 tests passing ✅rovides automated testing to verify TypeScript correctly prevents invalid lock operations at compile-time.

## Quick Start

```bash
npm run test:all        # All tests (runtime + compile-time)
npm run test:compile    # Compile-time validation only
npm run test           # Runtime tests only
```

## How It Works

The automated script (`scripts/test-compile-time.js`) creates temporary TypeScript files and attempts to compile them:

- ✅ **Invalid code** → Compilation fails → Test passes
- ❌ **Invalid code** → Compilation succeeds → Test fails (catches broken validation)
- ✅ **Valid code** → Compilation succeeds → Test passes ("test the test")

## Test Coverage

### Lock Violations Detected
- **Ordering**: LOCK_3 → LOCK_1, LOCK_4 → LOCK_2, complex sequences, high locks
- **Duplicates**: LOCK_1 twice, LOCK_3 twice, high lock duplicates
- **Usage**: Using non-held locks, empty context violations
- **Parameters**: Invalid `ValidLock3Context` usage, missing required locks
- **Rollback**: Rollback to non-held locks, invalid rollback operations
- **High Locks**: LOCK_6 through LOCK_15 ordering and duplication violations
- **Context Transfer**: Invalid context passing to functions with lock requirements

### Current Status
- **21 negative tests**: Invalid patterns that should fail compilation
- **10 positive tests**: Valid code patterns to verify testing infrastructure
- **Total**: 31/31 tests passing

## Adding New Tests

Edit `scripts/test-compile-time.js`:

```javascript
// Add to invalidCodeTests array
{
  name: 'Your test description',
  code: `
import { createLockContext, LOCK_1 } from '../src/core';
async function test() {
  // Invalid code that should fail compilation
}
`
}
```

## Integration

Perfect for CI/CD:

```yaml
- name: Validate Lock Safety
  run: npm run test:all
```

This ensures both runtime behavior and compile-time type safety are automatically validated.