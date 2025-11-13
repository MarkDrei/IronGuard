"use strict";
/**
 * Example: NullableLocksAtMost Types
 *
 * This example demonstrates the nullable lock context pattern where functions
 * can accept contexts conditionally based on the locks held. The nullable pattern
 * provides compile-time safety while allowing flexible signatures that handle
 * both valid and invalid contexts.
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
// Example 1: Basic Nullable Pattern
// =============================================================================
function processWithNullableLock10(ctx) {
    console.log('=== processWithNullableLock10 ===');
    if (ctx !== null) {
        // After null check, TypeScript knows ctx is LockContext<THeld>
        var locks = ctx.getHeldLocks();
        console.log("\u2705 Valid context with locks: [".concat(locks, "]"));
        console.log("   Can safely use the context");
    }
    else {
        console.log('❌ Context is null - locks exceed level 10');
    }
    console.log();
}
// =============================================================================
// Example 2: Multiple Lock Level Thresholds
// =============================================================================
function processWithNullableLock12(ctx) {
    console.log('=== processWithNullableLock12 ===');
    if (ctx !== null) {
        var locks = ctx.getHeldLocks();
        console.log("\u2705 Valid context with locks: [".concat(locks, "]"));
    }
    else {
        console.log('❌ Context is null - locks exceed level 12');
    }
    console.log();
}
function processWithNullableLock15(ctx) {
    console.log('=== processWithNullableLock15 ===');
    if (ctx !== null) {
        var locks = ctx.getHeldLocks();
        console.log("\u2705 Valid context with locks: [".concat(locks, "]"));
    }
    else {
        console.log('❌ Context is null - locks exceed level 15');
    }
    console.log();
}
// =============================================================================
// Example 3: Real-world Use Case - Plugin System
// =============================================================================
/**
 * A plugin hook that only accepts contexts with locks up to level 10.
 * This ensures plugins can't interfere with high-privilege operations.
 */
function pluginHook(ctx, pluginName) {
    console.log("=== Plugin: ".concat(pluginName, " ==="));
    if (ctx !== null) {
        console.log("\u2705 Plugin ".concat(pluginName, " can run with locks: [").concat(ctx.getHeldLocks(), "]"));
        // Plugin logic here
    }
    else {
        console.log("\u26A0\uFE0F  Plugin ".concat(pluginName, " skipped - high privilege context detected"));
    }
    console.log();
}
// =============================================================================
// Main Demo
// =============================================================================
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var ctx1, ctx5, ctx8, ctx10, ctx12, ctx15;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('IronGuard: NullableLocksAtMost Examples\n');
                    console.log('========================================\n');
                    // Example 1: Valid contexts (locks ≤ 10)
                    console.log('--- Example 1: Valid Contexts ---\n');
                    return [4 /*yield*/, (0, core_1.createLockContext)().acquireWrite(core_1.LOCK_1)];
                case 1:
                    ctx1 = _a.sent();
                    processWithNullableLock10(ctx1);
                    return [4 /*yield*/, (0, core_1.createLockContext)().acquireWrite(core_1.LOCK_5)];
                case 2:
                    ctx5 = _a.sent();
                    processWithNullableLock10(ctx5);
                    return [4 /*yield*/, (0, core_1.createLockContext)().acquireWrite(core_1.LOCK_8)];
                case 3:
                    ctx8 = _a.sent();
                    processWithNullableLock10(ctx8);
                    return [4 /*yield*/, (0, core_1.createLockContext)().acquireWrite(core_1.LOCK_10)];
                case 4:
                    ctx10 = _a.sent();
                    processWithNullableLock10(ctx10);
                    // Example 2: Invalid context (locks > 10)
                    console.log('--- Example 2: Invalid Context (> 10) ---\n');
                    return [4 /*yield*/, (0, core_1.createLockContext)().acquireWrite(core_1.LOCK_12)];
                case 5:
                    ctx12 = _a.sent();
                    // TypeScript prevents: processWithNullableLock10(ctx12);
                    // Error: Argument of type 'LockContext<readonly [12]>' is not assignable to parameter of type 'null'
                    // Must explicitly pass null for invalid contexts
                    processWithNullableLock10(null);
                    // Example 3: Different thresholds
                    console.log('--- Example 3: Different Thresholds ---\n');
                    processWithNullableLock12(ctx10); // ✅ 10 ≤ 12
                    processWithNullableLock12(ctx12); // ✅ 12 ≤ 12
                    return [4 /*yield*/, (0, core_1.createLockContext)().acquireWrite(core_1.LOCK_15)];
                case 6:
                    ctx15 = _a.sent();
                    processWithNullableLock12(null); // ❌ 15 > 12
                    processWithNullableLock15(ctx15); // ✅ 15 ≤ 15
                    // Example 4: Plugin system
                    console.log('--- Example 4: Plugin System ---\n');
                    pluginHook(ctx5, 'DataValidator');
                    pluginHook(ctx8, 'CacheManager');
                    pluginHook(null, 'AdminPlugin');
                    pluginHook(null, 'SecurityPlugin');
                    // Cleanup
                    ctx1.dispose();
                    ctx5.dispose();
                    ctx8.dispose();
                    ctx10.dispose();
                    ctx12.dispose();
                    ctx15.dispose();
                    console.log('========================================');
                    console.log('✅ All examples completed successfully!');
                    return [2 /*return*/];
            }
        });
    });
}
// =============================================================================
// Key Takeaways
// =============================================================================
console.log("\nKey Takeaways:\n--------------\n\n1. Nullable Pattern Benefits:\n   - Compile-time safety for lock level constraints\n   - Explicit null handling for invalid contexts\n   - Flexible function signatures\n\n2. When to Use:\n   - Plugin systems with privilege boundaries\n   - Middleware that only accepts certain lock levels\n   - Functions that need to gracefully handle invalid contexts\n\n3. Comparison with LocksAtMost:\n   - LocksAtMost: Accepts ANY combination up to N ([], [1], [2], ..., [1,2,...,N])\n   - NullableLocksAtMost: Context or null based on MaxHeldLock \u2264 N\n   - Use LocksAtMost for flexible acceptance\n   - Use NullableLocksAtMost for conditional acceptance with null handling\n\n4. Compile-time Safety:\n   - TypeScript prevents passing invalid contexts (locks > threshold)\n   - Must explicitly pass null for invalid contexts\n   - Forces developer awareness of lock level constraints\n");
main().catch(console.error);
