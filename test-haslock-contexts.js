"use strict";
/**
 * Example: HasLockXContext Types
 *
 * This example demonstrates the HasLockXContext types which provide simple
 * compile-time checks for lock presence. These types ensure that a specific
 * lock is held before a function can be called, regardless of other locks.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("./src/core");
// =============================================================================
// Example 1: Basic Lock Presence Check
// =============================================================================
function processWithLock3(ctx) {
    console.log('=== processWithLock3 ===');
    // TypeScript guarantees LOCK_3 is present
    ctx.useLock(core_1.LOCK_3, function () {
        console.log('✅ Processing with LOCK_3');
    });
    console.log("   Context holds: [".concat(ctx.getHeldLocks(), "]"));
    console.log();
}
function processWithLock5(ctx) {
    console.log('=== processWithLock5 ===');
    ctx.useLock(core_1.LOCK_5, function () {
        console.log('✅ Processing with LOCK_5');
    });
    console.log("   Context holds: [".concat(ctx.getHeldLocks(), "]"));
    console.log();
}
// =============================================================================
// Example 2: Multiple Lock Requirements
// =============================================================================
/**
 * Function requiring LOCK_3 and LOCK_8
 */
function processWithLocks3And8(ctx) {
    console.log('=== processWithLocks3And8 ===');
    console.log('✅ Processing with LOCK_3 and LOCK_8');
    console.log("   Context holds: [".concat(ctx.getHeldLocks(), "]"));
    ctx.useLock(core_1.LOCK_3, function () {
        console.log('   - Using LOCK_3');
    });
    ctx.useLock(core_1.LOCK_8, function () {
        console.log('   - Using LOCK_8');
    });
    console.log();
}
// =============================================================================
// Example 3: Real-world Use Cases
// =============================================================================
/**
 * Database operation requiring LOCK_3
 */
function databaseQuery(ctx, query) {
    console.log('=== Database Query ===');
    ctx.useLock(core_1.LOCK_3, function () {
        console.log("\u2705 Executing query: \"".concat(query, "\""));
        console.log("   Protected by LOCK_3 (database lock)");
    });
    console.log();
}
/**
 * File operation requiring LOCK_5
 */
function fileOperation(ctx, filename) {
    console.log('=== File Operation ===');
    ctx.useLock(core_1.LOCK_5, function () {
        console.log("\u2705 Writing to file: \"".concat(filename, "\""));
        console.log("   Protected by LOCK_5 (file lock)");
    });
    console.log();
}
/**
 * Network operation requiring LOCK_8
 */
function networkRequest(ctx, endpoint) {
    console.log('=== Network Request ===');
    ctx.useLock(core_1.LOCK_8, function () {
        console.log("\u2705 Calling endpoint: \"".concat(endpoint, "\""));
        console.log("   Protected by LOCK_8 (network lock)");
    });
    console.log();
}
/**
 * Admin operation requiring LOCK_15
 */
function adminOperation(ctx, operation) {
    console.log('=== Admin Operation ===');
    ctx.useLock(core_1.LOCK_15, function () {
        console.log("\u2705 Executing admin operation: \"".concat(operation, "\""));
        console.log("   Protected by LOCK_15 (highest privilege)");
    });
    console.log();
}
// =============================================================================
// Example 4: Chaining Operations
// =============================================================================
function chainedOperations(baseCtx) {
    return __awaiter(this, void 0, void 0, function () {
        var ctx5, ctx8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('=== Chained Operations ===');
                    console.log('Starting with LOCK_3');
                    // First operation with LOCK_3
                    databaseQuery(baseCtx, 'SELECT * FROM users');
                    return [4 /*yield*/, baseCtx.acquireWrite(core_1.LOCK_5)];
                case 1:
                    ctx5 = _a.sent();
                    fileOperation(ctx5, 'users.json');
                    return [4 /*yield*/, ctx5.acquireWrite(core_1.LOCK_8)];
                case 2:
                    ctx8 = _a.sent();
                    networkRequest(ctx8, '/api/sync');
                    console.log('✅ All chained operations completed');
                    console.log();
                    ctx8.dispose();
                    return [2 /*return*/];
            }
        });
    });
}
// =============================================================================
// Main Demo
// =============================================================================
function main() {
    return __awaiter(this, void 0, void 0, function () {
        function processWithLock10(ctx) {
            console.log('✅ Processing with LOCK_10');
            console.log("   Context holds: [".concat(ctx.getHeldLocks(), "]"));
        }
        function processWithLock12(ctx) {
            console.log('✅ Processing with LOCK_12');
            console.log("   Context holds: [".concat(ctx.getHeldLocks(), "]"));
        }
        var ctx3, ctx5, ctx135, ctx358, ctx8, ctx15, ctx10, ctx12;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('IronGuard: HasLockXContext Examples\n');
                    console.log('========================================\n');
                    // Example 1: Basic usage
                    console.log('--- Example 1: Basic Lock Presence ---\n');
                    return [4 /*yield*/, (0, core_1.createLockContext)().acquireWrite(core_1.LOCK_3)];
                case 1:
                    ctx3 = _a.sent();
                    processWithLock3(ctx3);
                    return [4 /*yield*/, (0, core_1.createLockContext)().acquireWrite(core_1.LOCK_5)];
                case 2:
                    ctx5 = _a.sent();
                    processWithLock5(ctx5);
                    // Example 2: Context with multiple locks
                    console.log('--- Example 2: Multiple Locks ---\n');
                    return [4 /*yield*/, (0, core_1.createLockContext)()
                            .acquireWrite(core_1.LOCK_1)
                            .then(function (c) { return c.acquireWrite(core_1.LOCK_3); })
                            .then(function (c) { return c.acquireWrite(core_1.LOCK_5); })];
                case 3:
                    ctx135 = _a.sent();
                    processWithLock3(ctx135); // ✅ Has LOCK_3
                    processWithLock5(ctx135); // ✅ Has LOCK_5
                    return [4 /*yield*/, (0, core_1.createLockContext)()
                            .acquireWrite(core_1.LOCK_3)
                            .then(function (c) { return c.acquireWrite(core_1.LOCK_5); })
                            .then(function (c) { return c.acquireWrite(core_1.LOCK_8); })];
                case 4:
                    ctx358 = _a.sent();
                    processWithLocks3And8(ctx358); // ✅ Has both LOCK_3 and LOCK_8
                    // Example 3: Real-world operations
                    console.log('--- Example 3: Real-world Operations ---\n');
                    databaseQuery(ctx3, 'UPDATE users SET active=1');
                    fileOperation(ctx5, 'backup.dat');
                    return [4 /*yield*/, (0, core_1.createLockContext)().acquireWrite(core_1.LOCK_8)];
                case 5:
                    ctx8 = _a.sent();
                    networkRequest(ctx8, '/api/status');
                    return [4 /*yield*/, (0, core_1.createLockContext)().acquireWrite(core_1.LOCK_15)];
                case 6:
                    ctx15 = _a.sent();
                    adminOperation(ctx15, 'Reset system configuration');
                    // Example 4: Chained operations
                    console.log('--- Example 4: Chained Operations ---\n');
                    return [4 /*yield*/, chainedOperations(ctx3)];
                case 7:
                    _a.sent();
                    // Example 5: High-level locks
                    console.log('--- Example 5: High-level Locks (10-15) ---\n');
                    return [4 /*yield*/, (0, core_1.createLockContext)().acquireWrite(core_1.LOCK_10)];
                case 8:
                    ctx10 = _a.sent();
                    processWithLock10(ctx10);
                    console.log();
                    return [4 /*yield*/, (0, core_1.createLockContext)().acquireWrite(core_1.LOCK_12)];
                case 9:
                    ctx12 = _a.sent();
                    processWithLock12(ctx12);
                    console.log();
                    // Cleanup
                    ctx3.dispose();
                    ctx5.dispose();
                    ctx135.dispose();
                    ctx358.dispose();
                    ctx8.dispose();
                    ctx15.dispose();
                    ctx10.dispose();
                    ctx12.dispose();
                    console.log('========================================');
                    console.log('✅ All examples completed successfully!');
                    return [2 /*return*/];
            }
        });
    });
}
// =============================================================================
// Compile-time Violations (Commented Out)
// =============================================================================
/*
// ❌ These would cause TypeScript compilation errors:

async function demonstrateErrors() {
  const ctx1 = await createLockContext().acquireWrite(LOCK_1);
  
  // Error: Context must hold LOCK_3
  processWithLock3(ctx1);
  
  // Error: Context must hold LOCK_5
  processWithLock5(ctx1);
  
  const ctx3 = await createLockContext().acquireWrite(LOCK_3);
  
  // Error: Context must hold LOCK_8
  processWithLocks3And8(ctx3);
}
*/
// =============================================================================
// Key Takeaways
// =============================================================================
console.log("\nKey Takeaways:\n--------------\n\n1. HasLockXContext Benefits:\n   - Simple boolean check: \"Does this context have lock X?\"\n   - Compile-time validation\n   - Clear function requirements\n   - Works regardless of other locks held\n\n2. When to Use:\n   - Functions that require a specific lock to be present\n   - Resource-specific operations (database, file, network)\n   - Privilege-level operations (admin, user, guest)\n   - When you don't care about lock ordering, just presence\n\n3. Comparison with ValidLockXContext:\n   - ValidLockXContext: Can acquire OR already has lock X\n   - HasLockXContext: Must already have lock X\n   - Use ValidLockX when function might acquire the lock\n   - Use HasLockX when lock must be pre-acquired\n\n4. Real-world Usage:\n   - Database operations: HasLock3Context\n   - File operations: HasLock5Context\n   - Network operations: HasLock8Context\n   - Admin operations: HasLock15Context\n\n5. Type Safety:\n   - TypeScript prevents calling functions without required locks\n   - Compile-time errors with descriptive messages\n   - No runtime overhead\n");
main().catch(console.error);
