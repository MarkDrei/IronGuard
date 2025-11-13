"use strict";
/**
 * IronGuard: Unbreakable Runtime + Compile-Time Lock Protection System
 *
 * Features:
 * - Runtime mutual exclusion (only one thread can hold each lock)
 * - Compile-time lock ordering validation (prevents deadlocks)
 * - Flexible acquisition patterns (skip locks: 1→3, 1→5)
 * - Type-safe function composition with lock constraints
 * - Configurable lock levels (easily change from 5 to any number)
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOCK_15 = exports.LOCK_14 = exports.LOCK_13 = exports.LOCK_12 = exports.LOCK_11 = exports.LOCK_10 = exports.LOCK_9 = exports.LOCK_8 = exports.LOCK_7 = exports.LOCK_6 = exports.LOCK_5 = exports.LOCK_4 = exports.LOCK_3 = exports.LOCK_2 = exports.LOCK_1 = exports.LockContext = void 0;
exports.createLockContext = createLockContext;
// Lock constants - all 15 locks available
var LOCK_1 = 1;
exports.LOCK_1 = LOCK_1;
var LOCK_2 = 2;
exports.LOCK_2 = LOCK_2;
var LOCK_3 = 3;
exports.LOCK_3 = LOCK_3;
var LOCK_4 = 4;
exports.LOCK_4 = LOCK_4;
var LOCK_5 = 5;
exports.LOCK_5 = LOCK_5;
var LOCK_6 = 6;
exports.LOCK_6 = LOCK_6;
var LOCK_7 = 7;
exports.LOCK_7 = LOCK_7;
var LOCK_8 = 8;
exports.LOCK_8 = LOCK_8;
var LOCK_9 = 9;
exports.LOCK_9 = LOCK_9;
var LOCK_10 = 10;
exports.LOCK_10 = LOCK_10;
var LOCK_11 = 11;
exports.LOCK_11 = LOCK_11;
var LOCK_12 = 12;
exports.LOCK_12 = LOCK_12;
var LOCK_13 = 13;
exports.LOCK_13 = LOCK_13;
var LOCK_14 = 14;
exports.LOCK_14 = LOCK_14;
var LOCK_15 = 15;
exports.LOCK_15 = LOCK_15;
// Global lock manager for runtime read/write lock management with writer preference
// Automatically supports any configured lock levels
var IronGuardManager = /** @class */ (function () {
    function IronGuardManager() {
        this.readerCounts = new Map();
        this.activeWriters = new Set();
        this.pendingWriters = new Map();
        this.pendingReaders = new Map();
    }
    IronGuardManager.getInstance = function () {
        if (!IronGuardManager.instance) {
            IronGuardManager.instance = new IronGuardManager();
        }
        return IronGuardManager.instance;
    };
    // Acquire a read lock - allows concurrent readers unless writer is waiting/active
    IronGuardManager.prototype.acquireReadLock = function (lock) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.activeWriters.has(lock) || this.hasPendingWriters(lock))) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.waitInReaderQueue(lock)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 0];
                    case 2:
                        // Grant read lock
                        this.incrementReaderCount(lock);
                        return [2 /*return*/];
                }
            });
        });
    };
    // Acquire a write lock - waits for all readers and other writers, has preference
    IronGuardManager.prototype.acquireWriteLock = function (lock) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Add to pending writers queue (establishes writer preference)
                        this.addToPendingWriter(lock);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, , 5, 6]);
                        _a.label = 2;
                    case 2:
                        if (!(this.hasActiveReaders(lock) || this.activeWriters.has(lock))) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.waitInWriterQueue(lock)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 2];
                    case 4:
                        // Grant write lock
                        this.activeWriters.add(lock);
                        return [3 /*break*/, 6];
                    case 5:
                        // Remove from pending queue
                        this.removeFromPendingWriters(lock);
                        return [7 /*endfinally*/];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    // Release a read lock
    IronGuardManager.prototype.releaseReadLock = function (lock) {
        var currentCount = this.readerCounts.get(lock) || 0;
        if (currentCount <= 1) {
            this.readerCounts.delete(lock);
        }
        else {
            this.readerCounts.set(lock, currentCount - 1);
        }
        // If no more readers, notify waiting writers
        if (!this.hasActiveReaders(lock)) {
            this.notifyWaitingWriters(lock);
        }
    };
    // Release a write lock
    IronGuardManager.prototype.releaseWriteLock = function (lock) {
        this.activeWriters.delete(lock);
        // Notify waiting writers first (writer preference), then readers
        if (this.hasPendingWriters(lock)) {
            this.notifyWaitingWriters(lock);
        }
        else {
            this.notifyWaitingReaders(lock);
        }
    };
    // Helper methods
    IronGuardManager.prototype.hasActiveReaders = function (lock) {
        return (this.readerCounts.get(lock) || 0) > 0;
    };
    IronGuardManager.prototype.hasPendingWriters = function (lock) {
        var queue = this.pendingWriters.get(lock);
        return queue !== undefined && queue.length > 0;
    };
    IronGuardManager.prototype.incrementReaderCount = function (lock) {
        var currentCount = this.readerCounts.get(lock) || 0;
        this.readerCounts.set(lock, currentCount + 1);
    };
    IronGuardManager.prototype.addToPendingWriter = function (lock) {
        // We'll add the actual resolver in waitInWriterQueue
        if (!this.pendingWriters.has(lock)) {
            this.pendingWriters.set(lock, []);
        }
    };
    IronGuardManager.prototype.removeFromPendingWriters = function (lock) {
        // Remove current writer from pending queue
        var queue = this.pendingWriters.get(lock);
        if (queue && queue.length > 0) {
            queue.shift();
        }
    };
    IronGuardManager.prototype.waitInReaderQueue = function (lock) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve) {
                        if (!_this.pendingReaders.has(lock)) {
                            _this.pendingReaders.set(lock, []);
                        }
                        var queue = _this.pendingReaders.get(lock);
                        if (queue) {
                            queue.push(resolve);
                        }
                    })];
            });
        });
    };
    IronGuardManager.prototype.waitInWriterQueue = function (lock) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve) {
                        if (!_this.pendingWriters.has(lock)) {
                            _this.pendingWriters.set(lock, []);
                        }
                        var queue = _this.pendingWriters.get(lock);
                        if (queue) {
                            queue.push(resolve);
                        }
                    })];
            });
        });
    };
    IronGuardManager.prototype.notifyWaitingWriters = function (lock) {
        var writerQueue = this.pendingWriters.get(lock);
        if (writerQueue && writerQueue.length > 0) {
            var nextWriter = writerQueue[0]; // Don't shift yet - will be removed in removeFromPendingWriters
            if (nextWriter) {
                nextWriter();
            }
        }
    };
    IronGuardManager.prototype.notifyWaitingReaders = function (lock) {
        var readerQueue = this.pendingReaders.get(lock);
        if (readerQueue && readerQueue.length > 0) {
            // Wake up all waiting readers
            var readers = readerQueue.splice(0);
            readers.forEach(function (resolve) { return resolve(); });
        }
    };
    // Debug method to check current lock state
    IronGuardManager.prototype.getGlobalLocks = function () {
        var pendingWriterCounts = new Map();
        for (var _i = 0, _a = this.pendingWriters; _i < _a.length; _i++) {
            var _b = _a[_i], lock = _b[0], queue = _b[1];
            if (queue.length > 0) {
                pendingWriterCounts.set(lock, queue.length);
            }
        }
        return {
            readers: new Map(this.readerCounts),
            writers: new Set(this.activeWriters),
            pendingWriters: pendingWriterCounts
        };
    };
    return IronGuardManager;
}());
var LockContext = /** @class */ (function () {
    function LockContext(heldLocks, lockModes) {
        this.lockModes = new Map();
        this.manager = IronGuardManager.getInstance();
        this.heldLocks = heldLocks;
        if (lockModes) {
            this.lockModes = new Map(lockModes);
        }
    }
    // Acquire a read lock - COMPILE-TIME ONLY enforcement with runtime read/write semantics
    LockContext.prototype.acquireRead = function (lock) {
        return __awaiter(this, void 0, void 0, function () {
            var newLockModes;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // Runtime read lock acquisition
                    return [4 /*yield*/, this.manager.acquireReadLock(lock)];
                    case 1:
                        // Runtime read lock acquisition
                        _a.sent();
                        newLockModes = new Map(this.lockModes);
                        newLockModes.set(lock, 'read');
                        return [2 /*return*/, new LockContext(__spreadArray(__spreadArray([], this.heldLocks, true), [lock], false), newLockModes)];
                }
            });
        });
    };
    // Acquire a write lock - COMPILE-TIME ONLY enforcement with runtime read/write semantics
    LockContext.prototype.acquireWrite = function (lock) {
        return __awaiter(this, void 0, void 0, function () {
            var newLockModes;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // Runtime write lock acquisition
                    return [4 /*yield*/, this.manager.acquireWriteLock(lock)];
                    case 1:
                        // Runtime write lock acquisition
                        _a.sent();
                        newLockModes = new Map(this.lockModes);
                        newLockModes.set(lock, 'write');
                        return [2 /*return*/, new LockContext(__spreadArray(__spreadArray([], this.heldLocks, true), [lock], false), newLockModes)];
                }
            });
        });
    };
    // Use a lock - COMPILE-TIME ONLY enforcement
    LockContext.prototype.useLock = function (lock, operation) {
        operation();
    };
    // Rollback to a previous lock level - COMPILE-TIME ONLY enforcement
    LockContext.prototype.rollbackTo = function (targetLock) {
        // Find the index of the target lock
        var targetIndex = this.heldLocks.indexOf(targetLock);
        if (targetIndex === -1) {
            throw new Error("Cannot rollback to lock ".concat(targetLock, ": not held"));
        }
        // Identify locks to release (everything after the target)
        var locksToRelease = this.heldLocks.slice(targetIndex + 1);
        // Release the higher-level locks with appropriate mode
        for (var _i = 0, locksToRelease_1 = locksToRelease; _i < locksToRelease_1.length; _i++) {
            var lock = locksToRelease_1[_i];
            var mode = this.lockModes.get(lock);
            if (mode === 'read') {
                this.manager.releaseReadLock(lock);
            }
            else {
                this.manager.releaseWriteLock(lock);
            }
        }
        // Create new context with locks up to and including target
        var newLocks = this.heldLocks.slice(0, targetIndex + 1);
        var newLockModes = new Map();
        for (var _a = 0, newLocks_1 = newLocks; _a < newLocks_1.length; _a++) {
            var lock = newLocks_1[_a];
            var mode = this.lockModes.get(lock);
            if (mode) {
                newLockModes.set(lock, mode);
            }
        }
        return new LockContext(newLocks, newLockModes);
    };
    // Check if a specific lock is held
    LockContext.prototype.hasLock = function (lock) {
        return this.heldLocks.includes(lock);
    };
    LockContext.prototype.getHeldLocks = function () {
        return this.heldLocks;
    };
    // Release all locks held by this context (cleanup)
    LockContext.prototype.dispose = function () {
        for (var _i = 0, _a = this.heldLocks; _i < _a.length; _i++) {
            var lock = _a[_i];
            var mode = this.lockModes.get(lock);
            if (mode === 'read') {
                this.manager.releaseReadLock(lock);
            }
            else {
                this.manager.releaseWriteLock(lock);
            }
        }
    };
    // Get the mode of a specific held lock
    LockContext.prototype.getLockMode = function (lock) {
        return this.lockModes.get(lock);
    };
    LockContext.prototype.toString = function () {
        var _this = this;
        var globalState = this.manager.getGlobalLocks();
        var readerSummary = Array.from(globalState.readers.entries())
            .map(function (_a) {
            var lock = _a[0], count = _a[1];
            return "".concat(lock, "R:").concat(count);
        })
            .join(', ');
        var writerSummary = Array.from(globalState.writers)
            .map(function (lock) { return "".concat(lock, "W"); })
            .join(', ');
        var locksSummary = this.heldLocks
            .map(function (lock) {
            var mode = _this.lockModes.get(lock);
            return "".concat(lock).concat(mode === 'read' ? 'R' : 'W');
        })
            .join(', ');
        var globalSummary = [readerSummary, writerSummary].filter(function (s) { return s; }).join(', ');
        return "LockContext[".concat(locksSummary, "] (global: [").concat(globalSummary, "])");
    };
    return LockContext;
}());
exports.LockContext = LockContext;
function createLockContext() {
    return new LockContext([]);
}
