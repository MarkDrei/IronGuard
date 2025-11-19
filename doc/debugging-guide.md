# IronGuard Debugging Guide

IronGuard provides optional debug mode for capturing stack traces of lock acquisitions, helping you identify where locks are being held in complex applications.

## Enabling Debug Mode

Debug mode is disabled by default to minimize runtime overhead. Enable it when you need to debug lock contention or deadlocks:

```typescript
import { IronGuardManager } from '@markdrei/ironguard-typescript-locks';

// Enable debug mode to capture stack traces
IronGuardManager.getInstance().enableDebugMode();

// Your lock operations here...

// Disable when done debugging
IronGuardManager.getInstance().disableDebugMode();
```

## Inspecting Lock State

Use `getGlobalLocks()` to inspect current lock state including stack traces:

```typescript
const debugInfo = IronGuardManager.getInstance().getGlobalLocks();

console.log('Active writers:', debugInfo.writers);
console.log('Active readers:', debugInfo.readers);
console.log('Pending writers:', debugInfo.pendingWriters);

// When debug mode is enabled, these contain stack traces:
if (debugInfo.writerStacks) {
  console.log('Writer stack traces:', debugInfo.writerStacks);
}
if (debugInfo.readerStacks) {
  console.log('Reader stack traces:', debugInfo.readerStacks);
}
```

## Example Output

```javascript
{
  readers: Map(1) { 2 => 1 },           // LOCK_2 has 1 reader
  writers: Set(1) { 1 },                // LOCK_1 has 1 writer
  pendingWriters: Map(0) {},            // No pending writers
  readerStacks: Map(1) {                // Stack traces for readers
    2 => [
      'Error\n' +
      '    at IronGuardManager.acquireReadLock (file.js:65:27)\n' +
      '    at LockContext.acquireRead (file.js:217:28)\n' +
      '    at myFunction (myapp.js:42:15)\n' +
      '    ...'
    ]
  },
  writerStacks: Map(1) {                // Stack traces for writers
    1 => 'Error\n' +
      '    at IronGuardManager.acquireWriteLock (file.js:80:31)\n' +
      '    at LockContext.acquireWrite (file.js:223:28)\n' +
      '    at anotherFunction (myapp.js:15:22)\n' +
      '    ...'
  }
}
```

## Runtime Impact

- **Disabled by default**: No performance impact in production
- **Minimal overhead when enabled**: Only captures stack traces during lock acquisition
- **Memory usage**: Proportional to number of active locks, not total acquisitions
- **Automatic cleanup**: Stack traces are removed when locks are released

## Use Cases

- **Debugging deadlocks**: Identify which code paths are holding locks
- **Performance analysis**: Find lock contention hotspots
- **Testing**: Verify lock usage patterns in complex scenarios
- **Development**: Understand lock flow in multi-threaded applications

## Complete Example

See `src/examples/debug-demo.ts` for a complete working example that demonstrates debug mode functionality.