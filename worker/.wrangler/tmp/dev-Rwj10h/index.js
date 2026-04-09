var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// .wrangler/tmp/bundle-nx862E/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
var init_strip_cf_connecting_ip_header = __esm({
  ".wrangler/tmp/bundle-nx862E/strip-cf-connecting-ip-header.js"() {
    "use strict";
    __name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
    globalThis.fetch = new Proxy(globalThis.fetch, {
      apply(target, thisArg, argArray) {
        return Reflect.apply(target, thisArg, [
          stripCfConnectingIPHeader.apply(null, argArray)
        ]);
      }
    });
  }
});

// node_modules/unenv/dist/runtime/_internal/utils.mjs
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
var init_utils = __esm({
  "node_modules/unenv/dist/runtime/_internal/utils.mjs"() {
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name(createNotImplementedError, "createNotImplementedError");
    __name(notImplemented, "notImplemented");
    __name(notImplementedClass, "notImplementedClass");
  }
});

// node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin, _performanceNow, nodeTiming, PerformanceEntry, PerformanceMark, PerformanceMeasure, PerformanceResourceTiming, PerformanceObserverEntryList, Performance, PerformanceObserver, performance;
var init_performance = __esm({
  "node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs"() {
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_utils();
    _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
    _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
    nodeTiming = {
      name: "node",
      entryType: "node",
      startTime: 0,
      duration: 0,
      nodeStart: 0,
      v8Start: 0,
      bootstrapComplete: 0,
      environment: 0,
      loopStart: 0,
      loopExit: 0,
      idleTime: 0,
      uvMetricsInfo: {
        loopCount: 0,
        events: 0,
        eventsWaiting: 0
      },
      detail: void 0,
      toJSON() {
        return this;
      }
    };
    PerformanceEntry = class {
      __unenv__ = true;
      detail;
      entryType = "event";
      name;
      startTime;
      constructor(name, options) {
        this.name = name;
        this.startTime = options?.startTime || _performanceNow();
        this.detail = options?.detail;
      }
      get duration() {
        return _performanceNow() - this.startTime;
      }
      toJSON() {
        return {
          name: this.name,
          entryType: this.entryType,
          startTime: this.startTime,
          duration: this.duration,
          detail: this.detail
        };
      }
    };
    __name(PerformanceEntry, "PerformanceEntry");
    PerformanceMark = /* @__PURE__ */ __name(class PerformanceMark2 extends PerformanceEntry {
      entryType = "mark";
      constructor() {
        super(...arguments);
      }
      get duration() {
        return 0;
      }
    }, "PerformanceMark");
    PerformanceMeasure = class extends PerformanceEntry {
      entryType = "measure";
    };
    __name(PerformanceMeasure, "PerformanceMeasure");
    PerformanceResourceTiming = class extends PerformanceEntry {
      entryType = "resource";
      serverTiming = [];
      connectEnd = 0;
      connectStart = 0;
      decodedBodySize = 0;
      domainLookupEnd = 0;
      domainLookupStart = 0;
      encodedBodySize = 0;
      fetchStart = 0;
      initiatorType = "";
      name = "";
      nextHopProtocol = "";
      redirectEnd = 0;
      redirectStart = 0;
      requestStart = 0;
      responseEnd = 0;
      responseStart = 0;
      secureConnectionStart = 0;
      startTime = 0;
      transferSize = 0;
      workerStart = 0;
      responseStatus = 0;
    };
    __name(PerformanceResourceTiming, "PerformanceResourceTiming");
    PerformanceObserverEntryList = class {
      __unenv__ = true;
      getEntries() {
        return [];
      }
      getEntriesByName(_name, _type) {
        return [];
      }
      getEntriesByType(type) {
        return [];
      }
    };
    __name(PerformanceObserverEntryList, "PerformanceObserverEntryList");
    Performance = class {
      __unenv__ = true;
      timeOrigin = _timeOrigin;
      eventCounts = /* @__PURE__ */ new Map();
      _entries = [];
      _resourceTimingBufferSize = 0;
      navigation = void 0;
      timing = void 0;
      timerify(_fn, _options) {
        throw createNotImplementedError("Performance.timerify");
      }
      get nodeTiming() {
        return nodeTiming;
      }
      eventLoopUtilization() {
        return {};
      }
      markResourceTiming() {
        return new PerformanceResourceTiming("");
      }
      onresourcetimingbufferfull = null;
      now() {
        if (this.timeOrigin === _timeOrigin) {
          return _performanceNow();
        }
        return Date.now() - this.timeOrigin;
      }
      clearMarks(markName) {
        this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
      }
      clearMeasures(measureName) {
        this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
      }
      clearResourceTimings() {
        this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
      }
      getEntries() {
        return this._entries;
      }
      getEntriesByName(name, type) {
        return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
      }
      getEntriesByType(type) {
        return this._entries.filter((e) => e.entryType === type);
      }
      mark(name, options) {
        const entry = new PerformanceMark(name, options);
        this._entries.push(entry);
        return entry;
      }
      measure(measureName, startOrMeasureOptions, endMark) {
        let start;
        let end;
        if (typeof startOrMeasureOptions === "string") {
          start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
          end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
        } else {
          start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
          end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
        }
        const entry = new PerformanceMeasure(measureName, {
          startTime: start,
          detail: {
            start,
            end
          }
        });
        this._entries.push(entry);
        return entry;
      }
      setResourceTimingBufferSize(maxSize) {
        this._resourceTimingBufferSize = maxSize;
      }
      addEventListener(type, listener, options) {
        throw createNotImplementedError("Performance.addEventListener");
      }
      removeEventListener(type, listener, options) {
        throw createNotImplementedError("Performance.removeEventListener");
      }
      dispatchEvent(event) {
        throw createNotImplementedError("Performance.dispatchEvent");
      }
      toJSON() {
        return this;
      }
    };
    __name(Performance, "Performance");
    PerformanceObserver = class {
      __unenv__ = true;
      _callback = null;
      constructor(callback) {
        this._callback = callback;
      }
      takeRecords() {
        return [];
      }
      disconnect() {
        throw createNotImplementedError("PerformanceObserver.disconnect");
      }
      observe(options) {
        throw createNotImplementedError("PerformanceObserver.observe");
      }
      bind(fn) {
        return fn;
      }
      runInAsyncScope(fn, thisArg, ...args) {
        return fn.call(thisArg, ...args);
      }
      asyncId() {
        return 0;
      }
      triggerAsyncId() {
        return 0;
      }
      emitDestroy() {
        return this;
      }
    };
    __name(PerformanceObserver, "PerformanceObserver");
    __publicField(PerformanceObserver, "supportedEntryTypes", []);
    performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();
  }
});

// node_modules/unenv/dist/runtime/node/perf_hooks.mjs
var init_perf_hooks = __esm({
  "node_modules/unenv/dist/runtime/node/perf_hooks.mjs"() {
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_performance();
  }
});

// node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
var init_performance2 = __esm({
  "node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs"() {
    init_perf_hooks();
    globalThis.performance = performance;
    globalThis.Performance = Performance;
    globalThis.PerformanceEntry = PerformanceEntry;
    globalThis.PerformanceMark = PerformanceMark;
    globalThis.PerformanceMeasure = PerformanceMeasure;
    globalThis.PerformanceObserver = PerformanceObserver;
    globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
    globalThis.PerformanceResourceTiming = PerformanceResourceTiming;
  }
});

// node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default;
var init_noop = __esm({
  "node_modules/unenv/dist/runtime/mock/noop.mjs"() {
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    noop_default = Object.assign(() => {
    }, { __unenv__: true });
  }
});

// node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";
var _console, _ignoreErrors, _stderr, _stdout, log, info, trace, debug, table, error, warn, createTask, clear, count, countReset, dir, dirxml, group, groupEnd, groupCollapsed, profile, profileEnd, time, timeEnd, timeLog, timeStamp, Console, _times, _stdoutErrorHandler, _stderrErrorHandler;
var init_console = __esm({
  "node_modules/unenv/dist/runtime/node/console.mjs"() {
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_noop();
    init_utils();
    _console = globalThis.console;
    _ignoreErrors = true;
    _stderr = new Writable();
    _stdout = new Writable();
    log = _console?.log ?? noop_default;
    info = _console?.info ?? log;
    trace = _console?.trace ?? info;
    debug = _console?.debug ?? log;
    table = _console?.table ?? log;
    error = _console?.error ?? log;
    warn = _console?.warn ?? error;
    createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
    clear = _console?.clear ?? noop_default;
    count = _console?.count ?? noop_default;
    countReset = _console?.countReset ?? noop_default;
    dir = _console?.dir ?? noop_default;
    dirxml = _console?.dirxml ?? noop_default;
    group = _console?.group ?? noop_default;
    groupEnd = _console?.groupEnd ?? noop_default;
    groupCollapsed = _console?.groupCollapsed ?? noop_default;
    profile = _console?.profile ?? noop_default;
    profileEnd = _console?.profileEnd ?? noop_default;
    time = _console?.time ?? noop_default;
    timeEnd = _console?.timeEnd ?? noop_default;
    timeLog = _console?.timeLog ?? noop_default;
    timeStamp = _console?.timeStamp ?? noop_default;
    Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
    _times = /* @__PURE__ */ new Map();
    _stdoutErrorHandler = noop_default;
    _stderrErrorHandler = noop_default;
  }
});

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole, assert, clear2, context, count2, countReset2, createTask2, debug2, dir2, dirxml2, error2, group2, groupCollapsed2, groupEnd2, info2, log2, profile2, profileEnd2, table2, time2, timeEnd2, timeLog2, timeStamp2, trace2, warn2, console_default;
var init_console2 = __esm({
  "node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs"() {
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_console();
    workerdConsole = globalThis["console"];
    ({
      assert,
      clear: clear2,
      context: (
        // @ts-expect-error undocumented public API
        context
      ),
      count: count2,
      countReset: countReset2,
      createTask: (
        // @ts-expect-error undocumented public API
        createTask2
      ),
      debug: debug2,
      dir: dir2,
      dirxml: dirxml2,
      error: error2,
      group: group2,
      groupCollapsed: groupCollapsed2,
      groupEnd: groupEnd2,
      info: info2,
      log: log2,
      profile: profile2,
      profileEnd: profileEnd2,
      table: table2,
      time: time2,
      timeEnd: timeEnd2,
      timeLog: timeLog2,
      timeStamp: timeStamp2,
      trace: trace2,
      warn: warn2
    } = workerdConsole);
    Object.assign(workerdConsole, {
      Console,
      _ignoreErrors,
      _stderr,
      _stderrErrorHandler,
      _stdout,
      _stdoutErrorHandler,
      _times
    });
    console_default = workerdConsole;
  }
});

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
var init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console = __esm({
  "node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console"() {
    init_console2();
    globalThis.console = console_default;
  }
});

// node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime;
var init_hrtime = __esm({
  "node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs"() {
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
      const now = Date.now();
      const seconds = Math.trunc(now / 1e3);
      const nanos = now % 1e3 * 1e6;
      if (startTime) {
        let diffSeconds = seconds - startTime[0];
        let diffNanos = nanos - startTime[0];
        if (diffNanos < 0) {
          diffSeconds = diffSeconds - 1;
          diffNanos = 1e9 + diffNanos;
        }
        return [diffSeconds, diffNanos];
      }
      return [seconds, nanos];
    }, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
      return BigInt(Date.now() * 1e6);
    }, "bigint") });
  }
});

// node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
import { Socket } from "node:net";
var ReadStream;
var init_read_stream = __esm({
  "node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs"() {
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    ReadStream = class extends Socket {
      fd;
      constructor(fd) {
        super();
        this.fd = fd;
      }
      isRaw = false;
      setRawMode(mode) {
        this.isRaw = mode;
        return this;
      }
      isTTY = false;
    };
    __name(ReadStream, "ReadStream");
  }
});

// node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
import { Socket as Socket2 } from "node:net";
var WriteStream;
var init_write_stream = __esm({
  "node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs"() {
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    WriteStream = class extends Socket2 {
      fd;
      constructor(fd) {
        super();
        this.fd = fd;
      }
      clearLine(dir3, callback) {
        callback && callback();
        return false;
      }
      clearScreenDown(callback) {
        callback && callback();
        return false;
      }
      cursorTo(x, y, callback) {
        callback && typeof callback === "function" && callback();
        return false;
      }
      moveCursor(dx, dy, callback) {
        callback && callback();
        return false;
      }
      getColorDepth(env2) {
        return 1;
      }
      hasColors(count3, env2) {
        return false;
      }
      getWindowSize() {
        return [this.columns, this.rows];
      }
      columns = 80;
      rows = 24;
      isTTY = false;
    };
    __name(WriteStream, "WriteStream");
  }
});

// node_modules/unenv/dist/runtime/node/tty.mjs
var init_tty = __esm({
  "node_modules/unenv/dist/runtime/node/tty.mjs"() {
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_read_stream();
    init_write_stream();
  }
});

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";
var Process;
var init_process = __esm({
  "node_modules/unenv/dist/runtime/node/internal/process/process.mjs"() {
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_tty();
    init_utils();
    Process = class extends EventEmitter {
      env;
      hrtime;
      nextTick;
      constructor(impl) {
        super();
        this.env = impl.env;
        this.hrtime = impl.hrtime;
        this.nextTick = impl.nextTick;
        for (const prop of [...Object.getOwnPropertyNames(Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
          const value = this[prop];
          if (typeof value === "function") {
            this[prop] = value.bind(this);
          }
        }
      }
      emitWarning(warning, type, code) {
        console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
      }
      emit(...args) {
        return super.emit(...args);
      }
      listeners(eventName) {
        return super.listeners(eventName);
      }
      #stdin;
      #stdout;
      #stderr;
      get stdin() {
        return this.#stdin ??= new ReadStream(0);
      }
      get stdout() {
        return this.#stdout ??= new WriteStream(1);
      }
      get stderr() {
        return this.#stderr ??= new WriteStream(2);
      }
      #cwd = "/";
      chdir(cwd2) {
        this.#cwd = cwd2;
      }
      cwd() {
        return this.#cwd;
      }
      arch = "";
      platform = "";
      argv = [];
      argv0 = "";
      execArgv = [];
      execPath = "";
      title = "";
      pid = 200;
      ppid = 100;
      get version() {
        return "";
      }
      get versions() {
        return {};
      }
      get allowedNodeEnvironmentFlags() {
        return /* @__PURE__ */ new Set();
      }
      get sourceMapsEnabled() {
        return false;
      }
      get debugPort() {
        return 0;
      }
      get throwDeprecation() {
        return false;
      }
      get traceDeprecation() {
        return false;
      }
      get features() {
        return {};
      }
      get release() {
        return {};
      }
      get connected() {
        return false;
      }
      get config() {
        return {};
      }
      get moduleLoadList() {
        return [];
      }
      constrainedMemory() {
        return 0;
      }
      availableMemory() {
        return 0;
      }
      uptime() {
        return 0;
      }
      resourceUsage() {
        return {};
      }
      ref() {
      }
      unref() {
      }
      umask() {
        throw createNotImplementedError("process.umask");
      }
      getBuiltinModule() {
        return void 0;
      }
      getActiveResourcesInfo() {
        throw createNotImplementedError("process.getActiveResourcesInfo");
      }
      exit() {
        throw createNotImplementedError("process.exit");
      }
      reallyExit() {
        throw createNotImplementedError("process.reallyExit");
      }
      kill() {
        throw createNotImplementedError("process.kill");
      }
      abort() {
        throw createNotImplementedError("process.abort");
      }
      dlopen() {
        throw createNotImplementedError("process.dlopen");
      }
      setSourceMapsEnabled() {
        throw createNotImplementedError("process.setSourceMapsEnabled");
      }
      loadEnvFile() {
        throw createNotImplementedError("process.loadEnvFile");
      }
      disconnect() {
        throw createNotImplementedError("process.disconnect");
      }
      cpuUsage() {
        throw createNotImplementedError("process.cpuUsage");
      }
      setUncaughtExceptionCaptureCallback() {
        throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
      }
      hasUncaughtExceptionCaptureCallback() {
        throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
      }
      initgroups() {
        throw createNotImplementedError("process.initgroups");
      }
      openStdin() {
        throw createNotImplementedError("process.openStdin");
      }
      assert() {
        throw createNotImplementedError("process.assert");
      }
      binding() {
        throw createNotImplementedError("process.binding");
      }
      permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
      report = {
        directory: "",
        filename: "",
        signal: "SIGUSR2",
        compact: false,
        reportOnFatalError: false,
        reportOnSignal: false,
        reportOnUncaughtException: false,
        getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
        writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
      };
      finalization = {
        register: /* @__PURE__ */ notImplemented("process.finalization.register"),
        unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
        registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
      };
      memoryUsage = Object.assign(() => ({
        arrayBuffers: 0,
        rss: 0,
        external: 0,
        heapTotal: 0,
        heapUsed: 0
      }), { rss: () => 0 });
      mainModule = void 0;
      domain = void 0;
      send = void 0;
      exitCode = void 0;
      channel = void 0;
      getegid = void 0;
      geteuid = void 0;
      getgid = void 0;
      getgroups = void 0;
      getuid = void 0;
      setegid = void 0;
      seteuid = void 0;
      setgid = void 0;
      setgroups = void 0;
      setuid = void 0;
      _events = void 0;
      _eventsCount = void 0;
      _exiting = void 0;
      _maxListeners = void 0;
      _debugEnd = void 0;
      _debugProcess = void 0;
      _fatalException = void 0;
      _getActiveHandles = void 0;
      _getActiveRequests = void 0;
      _kill = void 0;
      _preload_modules = void 0;
      _rawDebug = void 0;
      _startProfilerIdleNotifier = void 0;
      _stopProfilerIdleNotifier = void 0;
      _tickCallback = void 0;
      _disconnect = void 0;
      _handleQueue = void 0;
      _pendingMessage = void 0;
      _channel = void 0;
      _send = void 0;
      _linkedBinding = void 0;
    };
    __name(Process, "Process");
  }
});

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess, getBuiltinModule, exit, platform, nextTick, unenvProcess, abort, addListener, allowedNodeEnvironmentFlags, hasUncaughtExceptionCaptureCallback, setUncaughtExceptionCaptureCallback, loadEnvFile, sourceMapsEnabled, arch, argv, argv0, chdir, config, connected, constrainedMemory, availableMemory, cpuUsage, cwd, debugPort, dlopen, disconnect, emit, emitWarning, env, eventNames, execArgv, execPath, finalization, features, getActiveResourcesInfo, getMaxListeners, hrtime3, kill, listeners, listenerCount, memoryUsage, on, off, once, pid, ppid, prependListener, prependOnceListener, rawListeners, release, removeAllListeners, removeListener, report, resourceUsage, setMaxListeners, setSourceMapsEnabled, stderr, stdin, stdout, title, throwDeprecation, traceDeprecation, umask, uptime, version, versions, domain, initgroups, moduleLoadList, reallyExit, openStdin, assert2, binding, send, exitCode, channel, getegid, geteuid, getgid, getgroups, getuid, setegid, seteuid, setgid, setgroups, setuid, permission, mainModule, _events, _eventsCount, _exiting, _maxListeners, _debugEnd, _debugProcess, _fatalException, _getActiveHandles, _getActiveRequests, _kill, _preload_modules, _rawDebug, _startProfilerIdleNotifier, _stopProfilerIdleNotifier, _tickCallback, _disconnect, _handleQueue, _pendingMessage, _channel, _send, _linkedBinding, _process, process_default;
var init_process2 = __esm({
  "node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs"() {
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_hrtime();
    init_process();
    globalProcess = globalThis["process"];
    getBuiltinModule = globalProcess.getBuiltinModule;
    ({ exit, platform, nextTick } = getBuiltinModule(
      "node:process"
    ));
    unenvProcess = new Process({
      env: globalProcess.env,
      hrtime,
      nextTick
    });
    ({
      abort,
      addListener,
      allowedNodeEnvironmentFlags,
      hasUncaughtExceptionCaptureCallback,
      setUncaughtExceptionCaptureCallback,
      loadEnvFile,
      sourceMapsEnabled,
      arch,
      argv,
      argv0,
      chdir,
      config,
      connected,
      constrainedMemory,
      availableMemory,
      cpuUsage,
      cwd,
      debugPort,
      dlopen,
      disconnect,
      emit,
      emitWarning,
      env,
      eventNames,
      execArgv,
      execPath,
      finalization,
      features,
      getActiveResourcesInfo,
      getMaxListeners,
      hrtime: hrtime3,
      kill,
      listeners,
      listenerCount,
      memoryUsage,
      on,
      off,
      once,
      pid,
      ppid,
      prependListener,
      prependOnceListener,
      rawListeners,
      release,
      removeAllListeners,
      removeListener,
      report,
      resourceUsage,
      setMaxListeners,
      setSourceMapsEnabled,
      stderr,
      stdin,
      stdout,
      title,
      throwDeprecation,
      traceDeprecation,
      umask,
      uptime,
      version,
      versions,
      domain,
      initgroups,
      moduleLoadList,
      reallyExit,
      openStdin,
      assert: assert2,
      binding,
      send,
      exitCode,
      channel,
      getegid,
      geteuid,
      getgid,
      getgroups,
      getuid,
      setegid,
      seteuid,
      setgid,
      setgroups,
      setuid,
      permission,
      mainModule,
      _events,
      _eventsCount,
      _exiting,
      _maxListeners,
      _debugEnd,
      _debugProcess,
      _fatalException,
      _getActiveHandles,
      _getActiveRequests,
      _kill,
      _preload_modules,
      _rawDebug,
      _startProfilerIdleNotifier,
      _stopProfilerIdleNotifier,
      _tickCallback,
      _disconnect,
      _handleQueue,
      _pendingMessage,
      _channel,
      _send,
      _linkedBinding
    } = unenvProcess);
    _process = {
      abort,
      addListener,
      allowedNodeEnvironmentFlags,
      hasUncaughtExceptionCaptureCallback,
      setUncaughtExceptionCaptureCallback,
      loadEnvFile,
      sourceMapsEnabled,
      arch,
      argv,
      argv0,
      chdir,
      config,
      connected,
      constrainedMemory,
      availableMemory,
      cpuUsage,
      cwd,
      debugPort,
      dlopen,
      disconnect,
      emit,
      emitWarning,
      env,
      eventNames,
      execArgv,
      execPath,
      exit,
      finalization,
      features,
      getBuiltinModule,
      getActiveResourcesInfo,
      getMaxListeners,
      hrtime: hrtime3,
      kill,
      listeners,
      listenerCount,
      memoryUsage,
      nextTick,
      on,
      off,
      once,
      pid,
      platform,
      ppid,
      prependListener,
      prependOnceListener,
      rawListeners,
      release,
      removeAllListeners,
      removeListener,
      report,
      resourceUsage,
      setMaxListeners,
      setSourceMapsEnabled,
      stderr,
      stdin,
      stdout,
      title,
      throwDeprecation,
      traceDeprecation,
      umask,
      uptime,
      version,
      versions,
      // @ts-expect-error old API
      domain,
      initgroups,
      moduleLoadList,
      reallyExit,
      openStdin,
      assert: assert2,
      binding,
      send,
      exitCode,
      channel,
      getegid,
      geteuid,
      getgid,
      getgroups,
      getuid,
      setegid,
      seteuid,
      setgid,
      setgroups,
      setuid,
      permission,
      mainModule,
      _events,
      _eventsCount,
      _exiting,
      _maxListeners,
      _debugEnd,
      _debugProcess,
      _fatalException,
      _getActiveHandles,
      _getActiveRequests,
      _kill,
      _preload_modules,
      _rawDebug,
      _startProfilerIdleNotifier,
      _stopProfilerIdleNotifier,
      _tickCallback,
      _disconnect,
      _handleQueue,
      _pendingMessage,
      _channel,
      _send,
      _linkedBinding
    };
    process_default = _process;
  }
});

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
var init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process = __esm({
  "node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process"() {
    init_process2();
    globalThis.process = process_default;
  }
});

// wrangler-modules-watch:wrangler:modules-watch
var init_wrangler_modules_watch = __esm({
  "wrangler-modules-watch:wrangler:modules-watch"() {
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
  }
});

// node_modules/wrangler/templates/modules-watch-stub.js
var init_modules_watch_stub = __esm({
  "node_modules/wrangler/templates/modules-watch-stub.js"() {
    init_wrangler_modules_watch();
  }
});

// src/types/index.ts
var ROLE_RANK;
var init_types = __esm({
  "src/types/index.ts"() {
    "use strict";
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    ROLE_RANK = {
      OWNER: 4,
      ADMIN: 3,
      MOD: 2,
      TRAINEE: 1
    };
  }
});

// src/middleware/auth.ts
var auth_exports = {};
__export(auth_exports, {
  auditLog: () => auditLog,
  clearCookie: () => clearCookie,
  corsHeaders: () => corsHeaders,
  err: () => err,
  getCookie: () => getCookie,
  getIP: () => getIP,
  handleOptions: () => handleOptions,
  json: () => json,
  requireAuth: () => requireAuth,
  requireRole: () => requireRole,
  setCookie: () => setCookie,
  signJWT: () => signJWT,
  verifyJWT: () => verifyJWT
});
function b64url(input) {
  const str = typeof input === "string" ? input : String.fromCharCode(...new Uint8Array(input));
  return btoa(str).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64urlDecode(s) {
  return atob(s.replace(/-/g, "+").replace(/_/g, "/"));
}
async function signJWT(payload, secret) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return `${data}.${b64url(sig)}`;
}
async function verifyJWT(token, secret) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3)
      return null;
    const [header, body, sig] = parts;
    const data = `${header}.${body}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const sigBytes = Uint8Array.from(b64urlDecode(sig), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(data));
    if (!valid)
      return null;
    const payload = JSON.parse(b64urlDecode(body));
    if (payload.exp < Math.floor(Date.now() / 1e3))
      return null;
    return payload;
  } catch {
    return null;
  }
}
function setCookie(name, value, maxAgeSeconds) {
  return `${name}=${value}; HttpOnly; Secure; SameSite=None; Path=/api; Max-Age=${maxAgeSeconds}`;
}
function clearCookie(name) {
  return `${name}=; HttpOnly; Secure; SameSite=None; Path=/api; Max-Age=0`;
}
function getCookie(request, name) {
  const header = request.headers.get("Cookie") ?? "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}
function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400"
  };
}
function handleOptions(origin) {
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}
function json(data, status = 200, origin = "https://bwrp.net", extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
      ...extraHeaders
    }
  });
}
function err(message, status = 400, origin = "https://bwrp.net") {
  return json({ error: message }, status, origin);
}
async function requireAuth(request, env2) {
  const token = getCookie(request, "bwrp_access");
  if (!token)
    return err("Kein Authentifizierungs-Token", 401);
  const payload = await verifyJWT(token, env2.JWT_SECRET);
  if (!payload)
    return err("Ung\xFCltiges oder abgelaufenes Token", 401);
  return payload;
}
function requireRole(user, minRole) {
  if (ROLE_RANK[user.role] < ROLE_RANK[minRole]) {
    return err(`Zugriff verweigert. Mindestrang: ${minRole}`, 403);
  }
  return null;
}
async function auditLog(db, userId, action, resource, resourceId, metadata, ip) {
  await db.prepare("INSERT INTO audit_logs (user_id, action, resource, resource_id, metadata, ip) VALUES (?, ?, ?, ?, ?, ?)").bind(userId, action, resource, resourceId ?? null, metadata ? JSON.stringify(metadata) : null, ip ?? null).run();
}
function getIP(request) {
  return request.headers.get("CF-Connecting-IP") ?? "unknown";
}
var init_auth = __esm({
  "src/middleware/auth.ts"() {
    "use strict";
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_types();
    __name(b64url, "b64url");
    __name(b64urlDecode, "b64urlDecode");
    __name(signJWT, "signJWT");
    __name(verifyJWT, "verifyJWT");
    __name(setCookie, "setCookie");
    __name(clearCookie, "clearCookie");
    __name(getCookie, "getCookie");
    __name(corsHeaders, "corsHeaders");
    __name(handleOptions, "handleOptions");
    __name(json, "json");
    __name(err, "err");
    __name(requireAuth, "requireAuth");
    __name(requireRole, "requireRole");
    __name(auditLog, "auditLog");
    __name(getIP, "getIP");
  }
});

// .wrangler/tmp/bundle-nx862E/middleware-loader.entry.ts
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// .wrangler/tmp/bundle-nx862E/middleware-insertion-facade.js
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/index.ts
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
init_auth();

// src/middleware/rateLimit.ts
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
init_auth();
async function checkRateLimit(env2, ip, bucket, maxRequests, windowSecs) {
  const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
  try {
    const windowIndex = Math.floor(Date.now() / (windowSecs * 1e3));
    const key = `${ip}:${bucket}:${windowIndex}`;
    const row = await env2.DATABASE.prepare(`
        INSERT INTO rate_limits (key, count, window_start)
        VALUES (?, 1, ?)
        ON CONFLICT(key) DO UPDATE SET count = count + 1
        RETURNING count
      `).bind(key, windowIndex).first();
    const count3 = row?.count ?? 1;
    if (count3 > maxRequests) {
      const resetAt = (windowIndex + 1) * windowSecs;
      const retryAfter = resetAt - Math.floor(Date.now() / 1e3);
      return new Response(
        JSON.stringify({ error: "Zu viele Anfragen. Bitte sp\xE4ter erneut versuchen." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(origin),
            "Retry-After": String(Math.max(1, retryAfter)),
            "X-RateLimit-Limit": String(maxRequests),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(resetAt)
          }
        }
      );
    }
    if (Math.random() < 0.01) {
      await env2.DATABASE.prepare("DELETE FROM rate_limits WHERE window_start < ?").bind(windowIndex - 2).run().catch(() => {
      });
    }
    return null;
  } catch (e) {
    console.error("[RateLimit] DB error:", e.message);
    return null;
  }
}
__name(checkRateLimit, "checkRateLimit");

// src/controllers/AuthController.ts
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/services/AuthService.ts
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
init_auth();
var ROBLOX_TOKEN_URL = "https://apis.roblox.com/oauth/v1/token";
var ROBLOX_USERINFO = "https://apis.roblox.com/oauth/v1/userinfo";
var ALLOWED_ROLES = {
  "Group Owner": "OWNER",
  "Ownership Team": "OWNER",
  "Projektleitung": "OWNER",
  "Projektverwaltung": "OWNER",
  "Management": "ADMIN",
  "Teamverwaltung": "ADMIN",
  "Head Administrator": "ADMIN",
  "Administrator": "ADMIN",
  "Junior Administrator": "TRAINEE",
  "Head Game Moderator": "MOD",
  "Game Moderator": "MOD"
};
var _AuthService = class {
  constructor(env2) {
    this.env = env2;
  }
  async exchangeCode(code, redirectUri) {
    const params = new URLSearchParams({
      client_id: "1185800266267472506",
      client_secret: this.env.ROBLOX_AUTH_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri
    });
    const tokenRes = await fetch(ROBLOX_TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString() });
    if (!tokenRes.ok)
      throw new Error(`Token-Austausch fehlgeschlagen`);
    const { access_token } = await tokenRes.json();
    const userRes = await fetch(ROBLOX_USERINFO, { headers: { Authorization: `Bearer ${access_token}` } });
    if (!userRes.ok)
      throw new Error("Userinfo-Abruf fehlgeschlagen");
    const u = await userRes.json();
    return { robloxId: u.sub, username: u.preferred_username ?? u.name ?? "Unbekannt", picture: u.picture ?? null };
  }
  async getRobloxRole(robloxId) {
    try {
      const res = await fetch(`https://groups.roblox.com/v2/users/${robloxId}/groups/roles`, { headers: _AuthService.ROBLOX_HEADERS });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(`[Roblox/groups] ${res.status}: ${body.slice(0, 200)}`);
        return null;
      }
      const data = await res.json();
      const grp = data.data.find((g) => g.group.id === Number(this.env.ROBLOX_GROUP_ID));
      return grp ? ALLOWED_ROLES[grp.role.name] ?? null : null;
    } catch {
      return null;
    }
  }
  async upsertUser(robloxId, username, avatarUrl, role, hwid) {
    const existing = await this.env.DATABASE.prepare("SELECT id, hwid FROM users WHERE roblox_id = ?").bind(robloxId).first();
    if (existing) {
      if (existing.hwid && existing.hwid !== hwid) {
        throw new Error("Login von einem anderen Ger\xE4t abgelehnt. HWID stimmt nicht \xFCberein.");
      }
      const newHwid = existing.hwid ? existing.hwid : hwid;
      await this.env.DATABASE.prepare(`UPDATE users SET username=?, avatar_url=?, role=?, hwid=?, last_seen=datetime('now') WHERE id=?`).bind(username, avatarUrl, role, newHwid, existing.id).run();
    } else {
      await this.env.DATABASE.prepare(`INSERT INTO users (roblox_id, username, avatar_url, role, hwid, last_seen) VALUES (?, ?, ?, ?, ?, datetime('now'))`).bind(robloxId, username, avatarUrl, role, hwid).run();
    }
    const user = await this.env.DATABASE.prepare("SELECT * FROM users WHERE roblox_id = ?").bind(robloxId).first();
    if (!user)
      throw new Error("Benutzer konnte nicht angelegt werden");
    return user;
  }
  // Returns Set-Cookie header strings for both tokens
  async createSession(user, request) {
    const now = Math.floor(Date.now() / 1e3);
    const jti = crypto.randomUUID();
    const [accessToken, refreshToken] = await Promise.all([
      signJWT({ sub: String(user.id), robloxId: user.roblox_id, username: user.username, role: user.role, iat: now, exp: now + 15 * 60 }, this.env.JWT_SECRET),
      signJWT({ sub: String(user.id), jti, iat: now, exp: now + 7 * 24 * 60 * 60 }, this.env.JWT_SECRET)
    ]);
    await this.env.DATABASE.prepare("INSERT INTO sessions (user_id, refresh_token, ip, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)").bind(user.id, refreshToken, getIP(request), request.headers.get("User-Agent"), new Date((now + 7 * 86400) * 1e3).toISOString()).run();
    return {
      accessCookie: setCookie("bwrp_access", accessToken, 15 * 60),
      refreshCookie: setCookie("bwrp_refresh", refreshToken, 7 * 86400)
    };
  }
  async refreshAccessToken(refreshToken) {
    const payload = await verifyJWT(refreshToken, this.env.JWT_SECRET);
    if (!payload)
      return null;
    const session = await this.env.DATABASE.prepare("SELECT user_id FROM sessions WHERE refresh_token = ? AND expires_at > datetime('now')").bind(refreshToken).first();
    if (!session)
      return null;
    const user = await this.env.DATABASE.prepare("SELECT * FROM users WHERE id = ?").bind(session.user_id).first();
    if (!user)
      return null;
    const now = Math.floor(Date.now() / 1e3);
    return signJWT({ sub: String(user.id), robloxId: user.roblox_id, username: user.username, role: user.role, iat: now, exp: now + 15 * 60 }, this.env.JWT_SECRET);
  }
  async logout(refreshToken) {
    await this.env.DATABASE.prepare("DELETE FROM sessions WHERE refresh_token = ?").bind(refreshToken).run();
  }
};
var AuthService = _AuthService;
__name(AuthService, "AuthService");
__publicField(AuthService, "ROBLOX_HEADERS", {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9"
});

// src/controllers/AuthController.ts
init_auth();
var AuthController = class {
  static async login(request, env2) {
    let body;
    try {
      body = await request.json();
    } catch {
      return err("Ung\xFCltiger JSON-Body");
    }
    const { code, redirect_uri, hwid } = body;
    if (!code)
      return err("Fehlender OAuth-Code");
    if (!hwid)
      return err("Fehlender Ger\xE4te-Fingerabdruck (HWID)");
    const svc = new AuthService(env2);
    try {
      const roblox = await svc.exchangeCode(code, redirect_uri ?? "https://bwrp.net/team");
      const role = await svc.getRobloxRole(roblox.robloxId);
      if (!role)
        return err("Zugriff verweigert: Rang unzureichend oder kein Gruppenmitglied", 403);
      const user = await svc.upsertUser(roblox.robloxId, roblox.username, roblox.picture, role, hwid);
      const cookies = await svc.createSession(user, request);
      await auditLog(env2.DATABASE, user.id, "LOGIN", "sessions", void 0, { ip: getIP(request) }, getIP(request));
      const loginHeaders = new Headers({
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": env2.ALLOWED_ORIGIN,
        "Access-Control-Allow-Credentials": "true"
      });
      loginHeaders.append("Set-Cookie", cookies.accessCookie);
      loginHeaders.append("Set-Cookie", cookies.refreshCookie);
      return new Response(JSON.stringify({
        success: true,
        user: { id: user.id, username: user.username, role: user.role, avatarUrl: user.avatar_url }
      }), { status: 200, headers: loginHeaders });
    } catch (e) {
      return err(e.message, 500, env2.ALLOWED_ORIGIN ?? "https://bwrp.net");
    }
  }
  static async refresh(request, env2) {
    const refreshToken = getCookie(request, "bwrp_refresh");
    if (!refreshToken)
      return err("Kein Refresh-Token", 401);
    const svc = new AuthService(env2);
    const newAccess = await svc.refreshAccessToken(refreshToken);
    if (!newAccess)
      return err("Refresh-Token ung\xFCltig oder abgelaufen", 401);
    const { setCookie: setCookie2 } = await Promise.resolve().then(() => (init_auth(), auth_exports));
    const accessCookie = (await Promise.resolve().then(() => (init_auth(), auth_exports))).setCookie("bwrp_access", newAccess, 15 * 60);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": env2.ALLOWED_ORIGIN,
        "Access-Control-Allow-Credentials": "true",
        "Set-Cookie": accessCookie
      }
    });
  }
  static async logout(request, env2) {
    const refreshToken = getCookie(request, "bwrp_refresh");
    if (refreshToken) {
      const svc = new AuthService(env2);
      await svc.logout(refreshToken);
    }
    const logoutHeaders = new Headers({
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": env2.ALLOWED_ORIGIN,
      "Access-Control-Allow-Credentials": "true"
    });
    logoutHeaders.append("Set-Cookie", clearCookie("bwrp_access"));
    logoutHeaders.append("Set-Cookie", clearCookie("bwrp_refresh"));
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: logoutHeaders });
  }
};
__name(AuthController, "AuthController");

// src/controllers/StaffController.ts
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
init_auth();
var StaffController = class {
  // GET /api/staff/me
  static async me(_request, env2, user) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const row = await env2.DATABASE.prepare("SELECT id, username, avatar_url, role, last_seen, created_at FROM users WHERE id = ?").bind(Number(user.sub)).first();
    if (!row)
      return err("Benutzer nicht gefunden", 404, origin);
    return json({ user: row }, 200, origin);
  }
  // GET /api/staff/sessions
  static async sessions(request, env2, user) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const { results } = await env2.DATABASE.prepare("SELECT id, ip, user_agent, expires_at, created_at FROM sessions WHERE user_id = ? ORDER BY created_at DESC").bind(Number(user.sub)).all();
    return json({ sessions: results }, 200, origin);
  }
  // GET /api/staff/roster  (all staff members)
  static async roster(_request, env2, _user) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const { results } = await env2.DATABASE.prepare("SELECT id, roblox_id, username, avatar_url, role, last_seen FROM users ORDER BY role DESC, username ASC").all();
    return json({ roster: results }, 200, origin);
  }
  // GET /api/staff/status  (server_status rows)
  static async status(_request, env2, _user) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const { results } = await env2.DATABASE.prepare("SELECT service, status, updated_at FROM server_status ORDER BY id ASC").all();
    return json({ status: results }, 200, origin);
  }
  // GET /api/staff/stats  (aggregated stats for the current user)
  static async stats(_request, env2, user) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const userId = Number(user.sub);
    const [shiftRow, weekRow, casesRow] = await Promise.all([
      env2.DATABASE.prepare(`SELECT COUNT(*) as total_shifts,
                         COALESCE(SUM(duration_seconds),0) as total_seconds,
                         COALESCE(SUM(cases_count),0) as total_cases,
                         COALESCE(SUM(bans_count),0)  as total_bans
                  FROM shifts WHERE user_id = ? AND status = 'ENDED'`).bind(userId).first(),
      env2.DATABASE.prepare(`SELECT COALESCE(SUM(duration_seconds),0) as week_seconds,
                         COALESCE(SUM(cases_count),0) as week_cases
                  FROM shifts WHERE user_id = ? AND status = 'ENDED'
                    AND end_time >= datetime('now', '-7 days')`).bind(userId).first(),
      env2.DATABASE.prepare(`SELECT COUNT(*) as cases_filed FROM cases WHERE moderator_id = ?`).bind(userId).first()
    ]);
    return json({
      total_shifts: shiftRow?.total_shifts ?? 0,
      total_seconds: shiftRow?.total_seconds ?? 0,
      total_cases: shiftRow?.total_cases ?? 0,
      total_bans: shiftRow?.total_bans ?? 0,
      week_seconds: weekRow?.week_seconds ?? 0,
      week_cases: weekRow?.week_cases ?? 0,
      cases_filed: casesRow?.cases_filed ?? 0
    }, 200, origin);
  }
  // GET /api/staff/activity  (recent 20 audit logs — MOD+ only)
  static async activity(_request, env2, user) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const bad = requireRole(user, "MOD");
    if (bad)
      return bad;
    const { results } = await env2.DATABASE.prepare(`SELECT a.action, a.resource, a.resource_id, a.created_at, u.username
                FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id
                ORDER BY a.id DESC LIMIT 20`).all();
    return json({ activity: results }, 200, origin);
  }
};
__name(StaffController, "StaffController");

// src/controllers/ModerationController.ts
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/services/ModerationService.ts
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/services/DiscordService.ts
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var TYPE_COLOR = {
  WARN: 14854144,
  KICK: 3900150,
  BAN: 15680580,
  PERMBAN: 8330525
};
var TYPE_EMOJI = {
  WARN: "\u26A0\uFE0F",
  KICK: "\u{1F462}",
  BAN: "\u{1F528}",
  PERMBAN: "\u2620\uFE0F"
};
function formatDuration(seconds) {
  if (!seconds)
    return "\u2013";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
__name(formatDuration, "formatDuration");
var DiscordService = class {
  constructor(env2) {
    this.env = env2;
  }
  async send(payload) {
    if (!this.env.DISCORD_WEBHOOK_URL)
      return;
    await fetch(this.env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }
  // ── Case Embed ────────────────────────────────────────────────────────────
  async sendCaseEmbed(c, moderatorName) {
    const evidence = c.evidence ? JSON.parse(c.evidence) : [];
    await this.send({
      embeds: [{
        title: `${TYPE_EMOJI[c.type] ?? "\u{1F4CB}"} Neuer Fall | ${c.incident_id}`,
        color: TYPE_COLOR[c.type] ?? 7434618,
        fields: [
          { name: "Spieler", value: `\`${c.target_username}\` (ID: ${c.target_roblox_id})`, inline: true },
          { name: "Moderator", value: `\`${moderatorName}\``, inline: true },
          { name: "Ma\xDFnahme", value: `\`${c.type}${c.duration_days ? ` \u2013 ${c.duration_days} Tage` : ""}\``, inline: true },
          { name: "Begr\xFCndung", value: c.reason },
          ...evidence.length ? [{ name: "Beweise", value: evidence.join("\n") }] : [],
          ...c.notes ? [{ name: "Notizen", value: c.notes }] : []
        ],
        footer: { text: "BWRP Staff Panel" },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }]
    });
  }
  // ── Shift End Embed ───────────────────────────────────────────────────────
  async sendShiftEmbed(shift, username) {
    await this.send({
      embeds: [{
        title: "\u{1F550} Schicht beendet",
        color: 1096065,
        fields: [
          { name: "Mitarbeiter", value: `\`${username}\``, inline: true },
          { name: "Dauer", value: `\`${formatDuration(shift.duration_seconds)}\``, inline: true },
          { name: "_ _", value: "_ _", inline: true },
          { name: "F\xE4lle", value: `\`${shift.cases_count}\``, inline: true },
          { name: "Bans", value: `\`${shift.bans_count}\``, inline: true },
          { name: "Verwarnungen", value: `\`${shift.warns_count}\``, inline: true },
          { name: "Kicks", value: `\`${shift.kicks_count}\``, inline: true },
          ...shift.notes ? [{ name: "Notizen", value: shift.notes }] : []
        ],
        footer: { text: "BWRP Staff Panel" },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }]
    });
  }
  // ── Cloud Kick ────────────────────────────────────────────────────────────
  async sendCloudKick(opts) {
    await this.send({ embeds: [{
      title: "\u{1F9B5}  Player Kicked (Open Cloud)",
      color: 16096779,
      fields: [
        { name: "Player", value: `**${opts.targetUsername}** \xB7 \`${opts.targetId}\``, inline: true },
        { name: "Issued by", value: `\`${opts.issuedBy}\``, inline: true },
        { name: "Reason", value: opts.reason }
      ],
      footer: { text: "BWRP Game Panel" },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }] });
  }
  // ── Cloud Ban ─────────────────────────────────────────────────────────────
  async sendCloudBan(opts) {
    const duration = opts.durationDays ? `${opts.durationDays} Tag(e)` : "**Permanent**";
    await this.send({ embeds: [{
      title: "\u{1F528}  Player Banned (Open Cloud)",
      color: 15680580,
      fields: [
        { name: "Player", value: `**${opts.targetUsername}** \xB7 \`${opts.targetId}\``, inline: true },
        { name: "Duration", value: duration, inline: true },
        { name: "Issued by", value: `\`${opts.issuedBy}\``, inline: true },
        { name: "Internal Reason", value: opts.reason },
        { name: "Display Reason", value: opts.displayReason }
      ],
      footer: { text: "BWRP Game Panel" },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }] });
  }
  // ── Cloud Unban ───────────────────────────────────────────────────────────
  async sendCloudUnban(opts) {
    await this.send({ embeds: [{
      title: "\u2705  Player Unbanned (Open Cloud)",
      color: 1096065,
      fields: [
        { name: "Player", value: `**${opts.targetUsername}** \xB7 \`${opts.targetId}\``, inline: true },
        { name: "Issued by", value: `\`${opts.issuedBy}\``, inline: true }
      ],
      footer: { text: "BWRP Game Panel" },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }] });
  }
  // ── Generic Alert ─────────────────────────────────────────────────────────
  async sendAlert(title2, description, color = 14854144) {
    await this.send({
      embeds: [{
        title: title2,
        description,
        color,
        footer: { text: "BWRP Staff Panel" },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }]
    });
  }
};
__name(DiscordService, "DiscordService");

// src/services/ModerationService.ts
var ModerationService = class {
  constructor(env2) {
    this.env = env2;
    this.discord = new DiscordService(env2);
  }
  discord;
  // ── Generate Incident ID ──────────────────────────────────────────────────
  async generateIncidentId() {
    const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "");
    const count3 = await this.env.DATABASE.prepare("SELECT COUNT(*) as c FROM cases WHERE created_at >= date('now')").first();
    const seq = String((count3?.c ?? 0) + 1).padStart(3, "0");
    return `CASE-${date}-${seq}`;
  }
  // ── Create Case ───────────────────────────────────────────────────────────
  async createCase(input) {
    const incidentId = await this.generateIncidentId();
    await this.env.DATABASE.prepare(`INSERT INTO cases
        (incident_id, target_roblox_id, target_username, moderator_id, type, reason, evidence, notes, duration_days)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
      incidentId,
      input.targetRobloxId,
      input.targetUsername,
      input.moderatorId,
      input.type,
      input.reason,
      input.evidence ? JSON.stringify(input.evidence) : null,
      input.notes ?? null,
      input.durationDays ?? null
    ).run();
    const newCase = await this.env.DATABASE.prepare("SELECT * FROM cases WHERE incident_id = ?").bind(incidentId).first();
    if (!newCase)
      throw new Error("Fall konnte nicht angelegt werden");
    await this.discord.sendCaseEmbed(newCase, input.moderatorName).catch(console.warn);
    return newCase;
  }
  // ── Get Cases for Player ──────────────────────────────────────────────────
  async getCasesByPlayer(targetRobloxId) {
    const { results } = await this.env.DATABASE.prepare(`SELECT c.*, u.username as moderator_username
                FROM cases c
                LEFT JOIN users u ON c.moderator_id = u.id
                WHERE c.target_roblox_id = ?
                ORDER BY c.created_at DESC`).bind(targetRobloxId).all();
    return results;
  }
  // ── Update Case Notes ─────────────────────────────────────────────────────
  async updateCase(caseId, patch) {
    if (patch.notes !== void 0) {
      await this.env.DATABASE.prepare("UPDATE cases SET notes = ? WHERE id = ?").bind(patch.notes, caseId).run();
    }
    if (patch.evidence !== void 0) {
      await this.env.DATABASE.prepare("UPDATE cases SET evidence = ? WHERE id = ?").bind(JSON.stringify(patch.evidence), caseId).run();
    }
  }
};
__name(ModerationService, "ModerationService");

// src/controllers/ModerationController.ts
init_auth();
var ModerationController = class {
  // GET /api/moderation/all?type=&search=&limit=50&offset=0
  static async getAllCases(request, env2, user) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const bad = requireRole(user, "TRAINEE");
    if (bad)
      return bad;
    const url = new URL(request.url);
    const type = url.searchParams.get("type") ?? "";
    const search = url.searchParams.get("search") ?? "";
    const limit = Math.min(Math.max(1, parseInt(url.searchParams.get("limit") ?? "50")), 100);
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0"));
    const conditions = [];
    const binds = [];
    if (type) {
      conditions.push("c.type = ?");
      binds.push(type);
    }
    if (search) {
      conditions.push("c.target_username LIKE ?");
      binds.push(`%${search}%`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { results } = await env2.DATABASE.prepare(`SELECT c.*, u.username as moderator_username
                FROM cases c LEFT JOIN users u ON c.moderator_id = u.id
                ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`).bind(...binds, limit, offset).all();
    const countRow = await env2.DATABASE.prepare(`SELECT COUNT(*) as total FROM cases c ${where}`).bind(...binds).first();
    return json({ cases: results, total: countRow?.total ?? 0, limit, offset }, 200, origin);
  }
  // GET /api/moderation/cases/:playerId
  static async getCases(request, env2, user, params) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const bad = requireRole(user, "TRAINEE");
    if (bad)
      return bad;
    const svc = new ModerationService(env2);
    const cases = await svc.getCasesByPlayer(params.playerId);
    return json({ cases }, 200, origin);
  }
  // POST /api/moderation/cases
  static async createCase(request, env2, user) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const bad = requireRole(user, "MOD");
    if (bad)
      return bad;
    let body;
    try {
      body = await request.json();
    } catch {
      return err("Ung\xFCltiger JSON-Body", 400, origin);
    }
    const { targetRobloxId, targetUsername, type, reason } = body;
    if (!targetRobloxId || !targetUsername || !type || !reason)
      return err("Pflichtfelder: targetRobloxId, targetUsername, type, reason", 400, origin);
    const VALID_TYPES = ["WARN", "KICK", "BAN", "PERMBAN"];
    if (!VALID_TYPES.includes(type))
      return err(`Ung\xFCltiger Typ. Erlaubt: ${VALID_TYPES.join(", ")}`, 400, origin);
    const svc = new ModerationService(env2);
    const newCase = await svc.createCase({
      targetRobloxId,
      targetUsername,
      moderatorId: Number(user.sub),
      moderatorName: user.username,
      type,
      reason,
      evidence: body.evidence,
      notes: body.notes,
      durationDays: body.durationDays
    });
    await auditLog(env2.DATABASE, Number(user.sub), "CASE_CREATE", "cases", newCase.incident_id, { type, targetRobloxId }, getIP(request));
    return json({ case: newCase }, 201, origin);
  }
  // PATCH /api/moderation/cases/:caseId
  static async updateCase(request, env2, user, params) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const bad = requireRole(user, "MOD");
    if (bad)
      return bad;
    let body;
    try {
      body = await request.json();
    } catch {
      return err("Ung\xFCltiger JSON-Body", 400, origin);
    }
    const svc = new ModerationService(env2);
    await svc.updateCase(Number(params.caseId), body);
    await auditLog(env2.DATABASE, Number(user.sub), "CASE_UPDATE", "cases", params.caseId, {}, getIP(request));
    return json({ success: true }, 200, origin);
  }
};
__name(ModerationController, "ModerationController");

// src/controllers/ShiftController.ts
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/services/ShiftService.ts
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var ShiftService = class {
  constructor(env2) {
    this.env = env2;
    this.discord = new DiscordService(env2);
  }
  discord;
  // ── Start Shift ───────────────────────────────────────────────────────────
  async startShift(userId) {
    const existing = await this.env.DATABASE.prepare("SELECT id FROM shifts WHERE user_id = ? AND status = 'ACTIVE'").bind(userId).first();
    if (existing) {
      await this.endShift(userId, { cases_count: 0, bans_count: 0, warns_count: 0, kicks_count: 0, notes: null });
    }
    await this.env.DATABASE.prepare(`INSERT INTO shifts (user_id, start_time, status) VALUES (?, datetime('now'), 'ACTIVE')`).bind(userId).run();
    const shift = await this.env.DATABASE.prepare("SELECT * FROM shifts WHERE user_id = ? AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1").bind(userId).first();
    if (!shift)
      throw new Error("Schicht konnte nicht gestartet werden");
    return shift;
  }
  // ── End Shift ─────────────────────────────────────────────────────────────
  async endShift(userId, metrics) {
    const active = await this.env.DATABASE.prepare("SELECT * FROM shifts WHERE user_id = ? AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1").bind(userId).first();
    if (!active)
      throw new Error("Keine aktive Schicht gefunden");
    const startMs = new Date(active.start_time).getTime();
    const endMs = Date.now();
    const duration = Math.floor((endMs - startMs) / 1e3);
    await this.env.DATABASE.prepare(`UPDATE shifts SET
        end_time         = datetime('now'),
        duration_seconds = ?,
        cases_count      = ?,
        bans_count       = ?,
        warns_count      = ?,
        kicks_count      = ?,
        notes            = ?,
        status           = 'ENDED'
        WHERE id = ?`).bind(
      duration,
      metrics.cases_count,
      metrics.bans_count,
      metrics.warns_count,
      metrics.kicks_count,
      metrics.notes,
      active.id
    ).run();
    const completed = await this.env.DATABASE.prepare("SELECT * FROM shifts WHERE id = ?").bind(active.id).first();
    if (!completed)
      throw new Error("Schicht-Update fehlgeschlagen");
    const user = await this.env.DATABASE.prepare("SELECT username FROM users WHERE id = ?").bind(userId).first();
    await this.discord.sendShiftEmbed(completed, user?.username ?? "Unbekannt").catch(console.warn);
    return completed;
  }
  // ── Get Active Shift ──────────────────────────────────────────────────────
  async getActiveShift(userId) {
    return this.env.DATABASE.prepare("SELECT * FROM shifts WHERE user_id = ? AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1").bind(userId).first();
  }
  // ── Analytics ─────────────────────────────────────────────────────────────
  async getAnalytics() {
    const { results } = await this.env.DATABASE.prepare(`SELECT
          u.username,
          u.role,
          COUNT(s.id)            as total_shifts,
          SUM(s.duration_seconds) as total_seconds,
          SUM(s.cases_count)     as total_cases,
          SUM(s.bans_count)      as total_bans
        FROM shifts s
        JOIN users u ON s.user_id = u.id
        WHERE s.status = 'ENDED'
          AND s.end_time >= datetime('now', '-30 days')
        GROUP BY u.id
        ORDER BY total_seconds DESC`).all();
    return results;
  }
};
__name(ShiftService, "ShiftService");

// src/controllers/ShiftController.ts
init_auth();
var ShiftController = class {
  // POST /api/shifts/start
  static async start(request, env2, user) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const bad = requireRole(user, "MOD");
    if (bad)
      return bad;
    const svc = new ShiftService(env2);
    const shift = await svc.startShift(Number(user.sub));
    await auditLog(env2.DATABASE, Number(user.sub), "SHIFT_START", "shifts", String(shift.id), {}, getIP(request));
    return json({ shift }, 201, origin);
  }
  // POST /api/shifts/end
  static async end(request, env2, user) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const bad = requireRole(user, "MOD");
    if (bad)
      return bad;
    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const svc = new ShiftService(env2);
    const shift = await svc.endShift(Number(user.sub), {
      cases_count: body.cases_count ?? 0,
      bans_count: body.bans_count ?? 0,
      warns_count: body.warns_count ?? 0,
      kicks_count: body.kicks_count ?? 0,
      notes: body.notes ?? null
    });
    await auditLog(env2.DATABASE, Number(user.sub), "SHIFT_END", "shifts", String(shift.id), { duration: shift.duration_seconds }, getIP(request));
    return json({ shift }, 200, origin);
  }
  // GET /api/shifts/active
  static async active(_request, env2, _user) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const svc = new ShiftService(env2);
    const shift = await svc.getActiveShift(Number(_user.sub));
    return json({ shift }, 200, origin);
  }
  // GET /api/shifts/analytics
  static async analytics(_request, env2, user) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const bad = requireRole(user, "ADMIN");
    if (bad)
      return bad;
    const svc = new ShiftService(env2);
    const result = await svc.getAnalytics();
    return json({ analytics: result }, 200, origin);
  }
  // GET /api/shifts/all  — full shift log for management (ADMIN+)
  static async all(request, env2, user) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const bad = requireRole(user, "ADMIN");
    if (bad)
      return bad;
    const url = new URL(request.url);
    const limit = Math.min(Math.max(1, parseInt(url.searchParams.get("limit") ?? "50")), 100);
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0"));
    const sortBy = ["total_shifts", "total_seconds", "total_cases", "total_bans"].includes(url.searchParams.get("sortBy") ?? "") ? url.searchParams.get("sortBy") : "total_seconds";
    const userId = url.searchParams.get("userId");
    const mode = url.searchParams.get("mode") ?? "summary";
    if (mode === "summary") {
      const where = userId ? "WHERE s.user_id = ? AND s.status = 'ENDED'" : "WHERE s.status = 'ENDED'";
      const params = userId ? [userId] : [];
      const { results } = await env2.DATABASE.prepare(`
        SELECT
          u.id            AS user_id,
          u.username,
          u.role,
          COUNT(s.id)             AS total_shifts,
          COALESCE(SUM(s.duration_seconds), 0) AS total_seconds,
          COALESCE(SUM(s.cases_count), 0)      AS total_cases,
          COALESCE(SUM(s.bans_count), 0)       AS total_bans,
          COALESCE(SUM(s.warns_count), 0)      AS total_warns,
          COALESCE(SUM(s.kicks_count), 0)      AS total_kicks,
          MAX(s.end_time)         AS last_shift
        FROM users u
        LEFT JOIN shifts s ON s.user_id = u.id AND s.status = 'ENDED'
        GROUP BY u.id
        ORDER BY ${sortBy} DESC
        LIMIT ? OFFSET ?
      `).bind(...params, limit, offset).all();
      const total = await env2.DATABASE.prepare("SELECT COUNT(*) AS c FROM users").first();
      return json({ shifts: results, total: total?.c ?? 0, limit, offset, mode }, 200, origin);
    } else {
      const where = userId ? "WHERE s.user_id = ?" : "";
      const params = userId ? [userId] : [];
      const [rows, total] = await Promise.all([
        env2.DATABASE.prepare(`
          SELECT s.*, u.username, u.role
          FROM shifts s JOIN users u ON s.user_id = u.id
          ${where}
          ORDER BY s.start_time DESC
          LIMIT ? OFFSET ?
        `).bind(...params, limit, offset).all(),
        env2.DATABASE.prepare(`SELECT COUNT(*) AS c FROM shifts s ${where}`).bind(...params).first()
      ]);
      return json({ shifts: rows.results, total: total?.c ?? 0, limit, offset, mode }, 200, origin);
    }
  }
};
__name(ShiftController, "ShiftController");

// src/controllers/RobloxController.ts
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
init_auth();
var ROBLOX_USERS_API = "https://users.roblox.com/v1";
var ROBLOX_GROUPS_API = "https://groups.roblox.com/v1";
var ROBLOX_GAMES_API = "https://games.roblox.com/v1";
var ROBLOX_FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9"
};
async function robloxFetch(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { ...ROBLOX_FETCH_HEADERS, ...init.headers ?? {} }
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[Roblox] ${init.method ?? "GET"} ${url} \u2192 ${res.status}: ${body.slice(0, 300)}`);
  }
  return res;
}
__name(robloxFetch, "robloxFetch");
async function resolveUsername(username) {
  try {
    const res = await robloxFetch(
      `https://api.roblox.com/users/get-by-username?username=${encodeURIComponent(username)}`
    );
    if (res.ok) {
      const raw = await res.text();
      const data = JSON.parse(raw);
      console.log(`[Roblox] legacy lookup "${username}":`, raw.slice(0, 200));
      const id = typeof data["Id"] === "number" ? data["Id"] : 0;
      if (id > 0)
        return { type: "found", userId: String(id) };
      return { type: "notFound" };
    }
  } catch (e) {
    console.error("[Roblox] legacy lookup threw:", e.message);
  }
  try {
    const res = await robloxFetch(`${ROBLOX_USERS_API}/usernames/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.data?.length > 0)
        return { type: "found", userId: String(data.data[0].id) };
      return { type: "notFound" };
    }
  } catch (e) {
    console.error("[Roblox] v1 POST lookup threw:", e.message);
  }
  return { type: "apiError" };
}
__name(resolveUsername, "resolveUsername");
var RobloxController = class {
  // GET /api/roblox/player/:identifier  (username or numeric ID)
  static async getPlayer(request, env2, user, params) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const id = params.identifier;
    if (!id)
      return err("Kein Identifier angegeben", 400, origin);
    try {
      let userId;
      if (/^\d+$/.test(id)) {
        userId = id;
      } else {
        const result = await resolveUsername(id);
        if (result.type === "notFound")
          return err("Spieler nicht gefunden", 404, origin);
        if (result.type === "apiError")
          return err("Roblox-API nicht erreichbar", 502, origin);
        userId = result.userId;
      }
      const [profileRes, thumbRes] = await Promise.all([
        robloxFetch(`${ROBLOX_USERS_API}/users/${userId}`),
        robloxFetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`)
      ]);
      if (!profileRes.ok)
        return err("Spieler nicht gefunden", 404, origin);
      const profile3 = await profileRes.json();
      let avatarUrl = "";
      if (thumbRes.ok) {
        const thumbData = await thumbRes.json();
        avatarUrl = thumbData.data?.[0]?.imageUrl ?? "";
      }
      return json({
        id: profile3.id,
        username: profile3.name,
        displayName: profile3.displayName,
        description: profile3.description,
        created: profile3.created,
        isBanned: profile3.isBanned,
        avatarUrl,
        profileUrl: `https://www.roblox.com/users/${profile3.id}/profile`
      }, 200, origin);
    } catch (e) {
      return err("Roblox-API-Fehler: " + e.message, 502, origin);
    }
  }
  // GET /api/roblox/group/roles  – All roles in the configured Roblox group
  static async getGroupRoles(_request, env2, _user) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    try {
      const res = await robloxFetch(`${ROBLOX_GROUPS_API}/groups/${env2.ROBLOX_GROUP_ID}/roles`);
      if (!res.ok)
        return err("Roblox Groups API nicht erreichbar", 502, origin);
      return json(await res.json(), 200, origin);
    } catch (e) {
      return err("Gruppen-API-Fehler: " + e.message, 502, origin);
    }
  }
  // GET /api/roblox/group/roles/:roleId/users  – Members of a specific role (with avatar URLs)
  static async getGroupRoleUsers(_request, env2, _user, params) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    if (!params.roleId || !/^\d+$/.test(params.roleId))
      return err("Ung\xFCltige roleId", 400, origin);
    try {
      const res = await robloxFetch(
        `${ROBLOX_GROUPS_API}/groups/${env2.ROBLOX_GROUP_ID}/roles/${params.roleId}/users?sortOrder=Asc&limit=100`
      );
      if (!res.ok)
        return err("Roblox Groups API nicht erreichbar", 502, origin);
      const data = await res.json();
      const members = data.data ?? [];
      const thumbnailMap = {};
      if (members.length) {
        try {
          const ids = members.map((m) => m.userId).join(",");
          const thumbRes = await robloxFetch(
            `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${ids}&size=150x150&format=Png&isCircular=false`
          );
          if (thumbRes.ok) {
            const thumbData = await thumbRes.json();
            thumbData.data.forEach((t) => {
              if (t.state === "Completed")
                thumbnailMap[t.targetId] = t.imageUrl;
            });
          }
        } catch {
        }
      }
      return json({
        data: members.map((m) => ({ ...m, avatarUrl: thumbnailMap[m.userId] ?? null }))
      }, 200, origin);
    } catch (e) {
      return err("Mitglieder-API-Fehler: " + e.message, 502, origin);
    }
  }
  // GET /api/roblox/servers  – Live server list (uses Place ID, not Universe ID)
  static async getServers(_request, env2, _user) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const placeId = env2.ROBLOX_PLACE_ID;
    if (!placeId)
      return err("ROBLOX_PLACE_ID nicht konfiguriert", 503, origin);
    try {
      const res = await robloxFetch(
        `${ROBLOX_GAMES_API}/games/${placeId}/servers/Public?sortOrder=Desc&limit=25&excludeFullGames=false`
      );
      if (!res.ok)
        return err("Roblox-Server-API nicht erreichbar", 502, origin);
      const data = await res.json();
      const servers = (data.data ?? []).map((s, i) => ({
        index: i + 1,
        jobId: s.id,
        players: s.playing,
        maxPlayers: s.maxPlayers,
        ping: Math.round(s.ping ?? 0),
        fps: Math.round(s.fps ?? 0)
      }));
      const totalPlayers = servers.reduce((sum, s) => sum + s.players, 0);
      return json({ servers, totalPlayers, serverCount: servers.length }, 200, origin);
    } catch (e) {
      return err("Server-Abfrage fehlgeschlagen: " + e.message, 502, origin);
    }
  }
};
__name(RobloxController, "RobloxController");

// src/controllers/WatchlistController.ts
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
init_auth();
var WatchlistController = class {
  // GET /api/watchlist
  static async getAll(_request, env2, user) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const bad = requireRole(user, "TRAINEE");
    if (bad)
      return bad;
    const { results } = await env2.DATABASE.prepare("SELECT * FROM watchlist ORDER BY created_at DESC").all();
    return json({ watchlist: results }, 200, origin);
  }
  // GET /api/watchlist/check/:robloxId
  static async check(_request, env2, user, params) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const bad = requireRole(user, "TRAINEE");
    if (bad)
      return bad;
    const entry = await env2.DATABASE.prepare("SELECT * FROM watchlist WHERE player_roblox_id = ? ORDER BY id DESC LIMIT 1").bind(params.robloxId).first();
    return json({ flagged: !!entry, entry: entry ?? null }, 200, origin);
  }
  // POST /api/watchlist
  static async add(request, env2, user) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const bad = requireRole(user, "MOD");
    if (bad)
      return bad;
    let body;
    try {
      body = await request.json();
    } catch {
      return err("Ung\xFCltiger JSON-Body", 400, origin);
    }
    const { playerRobloxId, playerUsername, reason } = body;
    if (!playerRobloxId || !playerUsername || !reason)
      return err("Pflichtfelder: playerRobloxId, playerUsername, reason", 400, origin);
    await env2.DATABASE.prepare("INSERT INTO watchlist (player_roblox_id, player_username, reason, added_by_id, added_by_username) VALUES (?, ?, ?, ?, ?)").bind(playerRobloxId, playerUsername, reason, Number(user.sub), user.username).run();
    await auditLog(env2.DATABASE, Number(user.sub), "WATCHLIST_ADD", "watchlist", playerRobloxId, { playerUsername, reason }, getIP(request));
    return json({ success: true }, 201, origin);
  }
  // DELETE /api/watchlist/:id
  static async remove(request, env2, user, params) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const bad = requireRole(user, "MOD");
    if (bad)
      return bad;
    await env2.DATABASE.prepare("DELETE FROM watchlist WHERE id = ?").bind(Number(params.id)).run();
    await auditLog(env2.DATABASE, Number(user.sub), "WATCHLIST_REMOVE", "watchlist", params.id, {}, getIP(request));
    return json({ success: true }, 200, origin);
  }
};
__name(WatchlistController, "WatchlistController");

// src/controllers/CloudController.ts
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
init_auth();

// src/services/RobloxCloudService.ts
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var CLOUD_BASE = "https://apis.roblox.com";
var RobloxCloudService = class {
  universeId;
  apiKey;
  origin;
  constructor(env2) {
    this.universeId = env2.ROBLOX_UNIVERSE_ID;
    this.apiKey = env2.ROBLOX_CLOUD_KEY ?? "";
    this.origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
  }
  requireKey() {
    if (!this.apiKey)
      throw new Error("ROBLOX_CLOUD_KEY ist nicht konfiguriert. Bitte als Wrangler Secret hinterlegen.");
  }
  // ─── MessagingService ──────────────────────────────────────────────────────
  /**
   * Publish a JSON message to a MessagingService topic.
   * All live servers subscribed to the topic will receive it.
   * @param topic  e.g. "StaffPanelUpdates"
   * @param data   Any JSON-serialisable payload
   */
  async publishMessage(topic, data) {
    this.requireKey();
    const url = `${CLOUD_BASE}/messaging-service/v1/universes/${this.universeId}/topics/${encodeURIComponent(topic)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: JSON.stringify(data) })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`MessagingService Fehler ${res.status}: ${text}`);
    }
  }
  // ─── User Restrictions (native Roblox Bans) ────────────────────────────────
  /**
   * Permanently or temporarily ban a user at the universe level.
   * @param userId     Roblox user ID (number)
   * @param reason     Visible reason string
   * @param displayReason  Player-visible reason (shown on kick screen)
   * @param duration   ISO 8601 duration string e.g. "P7D" (7 days), null = permanent
   */
  async banUser(params) {
    this.requireKey();
    const { userId, reason, displayReason, duration } = params;
    const url = `${CLOUD_BASE}/cloud/v2/universes/${this.universeId}/user-restrictions/${userId}`;
    const body = {
      gameJoinRestriction: {
        active: true,
        privateReason: reason,
        displayReason,
        excludeAltAccounts: false,
        inherited: true
      }
    };
    if (duration)
      body.gameJoinRestriction.duration = duration;
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`UserRestrictions Fehler ${res.status}: ${text}`);
    }
  }
  /**
   * Remove an active ban / user restriction.
   */
  async unbanUser(userId) {
    this.requireKey();
    const url = `${CLOUD_BASE}/cloud/v2/universes/${this.universeId}/user-restrictions/${userId}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        gameJoinRestriction: { active: false }
      })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Unban Fehler ${res.status}: ${text}`);
    }
  }
  /**
   * Get current restriction status for a user.
   */
  async getRestriction(userId) {
    this.requireKey();
    const url = `${CLOUD_BASE}/cloud/v2/universes/${this.universeId}/user-restrictions/${userId}`;
    const res = await fetch(url, {
      headers: { "x-api-key": this.apiKey }
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GetRestriction Fehler ${res.status}: ${text}`);
    }
    return res.json();
  }
};
__name(RobloxCloudService, "RobloxCloudService");

// src/controllers/CloudController.ts
init_types();
var CloudController = class {
  // ─── POST /api/cloud/kick ──────────────────────────────────────────────────
  /**
   * Sends a kick signal via MessagingService to all live servers.
   * The in-game script must be subscribed to the "StaffPanelUpdates" topic.
   * Body: { targetRobloxId, targetUsername, reason }
   */
  static async kick(request, env2, user) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    if (ROLE_RANK[user.role] < ROLE_RANK["MOD"])
      return err("Keine Berechtigung", 403, origin);
    const body = await request.json().catch(() => ({}));
    const { targetRobloxId, targetUsername, reason } = body;
    if (!targetRobloxId || !reason)
      return err("targetRobloxId und reason sind Pflichtfelder", 400, origin);
    if (isNaN(Number(targetRobloxId)) || Number(targetRobloxId) <= 0)
      return err("targetRobloxId muss eine g\xFCltige Roblox-ID sein", 400, origin);
    try {
      const cloud = new RobloxCloudService(env2);
      await cloud.publishMessage("StaffPanelUpdates", {
        type: "KICK",
        targetId: Number(targetRobloxId),
        reason,
        issuedBy: user.username,
        issuedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      await auditLog(env2.DATABASE, Number(user.sub), "CLOUD_KICK", "users", String(targetRobloxId), { targetUsername, reason }, getIP(request));
      new DiscordService(env2).sendCloudKick({ issuedBy: user.username, targetUsername: targetUsername ?? String(targetRobloxId), targetId: targetRobloxId, reason }).catch((e) => console.error("[Discord] kick webhook:", e.message));
      return json({ success: true, message: `Kick-Signal f\xFCr ${targetUsername ?? targetRobloxId} gesendet.` }, 200, origin);
    } catch (e) {
      return err(e.message, 503, origin);
    }
  }
  // ─── POST /api/cloud/ban ───────────────────────────────────────────────────
  /**
   * Natively bans a user at universe level via Open Cloud UserRestrictions.
   * Body: { targetRobloxId, targetUsername, reason, displayReason, durationDays? }
   */
  static async ban(request, env2, user) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    if (ROLE_RANK[user.role] < ROLE_RANK["MOD"])
      return err("Keine Berechtigung", 403, origin);
    const body = await request.json().catch(() => ({}));
    const { targetRobloxId, targetUsername, reason, displayReason, durationDays } = body;
    if (!targetRobloxId || !reason)
      return err("targetRobloxId und reason sind Pflichtfelder", 400, origin);
    if (isNaN(Number(targetRobloxId)) || Number(targetRobloxId) <= 0)
      return err("targetRobloxId muss eine g\xFCltige Roblox-ID sein", 400, origin);
    if (durationDays !== void 0 && durationDays !== null && (isNaN(Number(durationDays)) || Number(durationDays) < 1))
      return err("durationDays muss eine positive Zahl sein", 400, origin);
    try {
      const cloud = new RobloxCloudService(env2);
      const duration = durationDays ? `P${durationDays}D` : null;
      await cloud.banUser({
        userId: Number(targetRobloxId),
        reason,
        displayReason: displayReason || reason,
        duration
      });
      await cloud.publishMessage("StaffPanelUpdates", {
        type: "KICK",
        targetId: Number(targetRobloxId),
        reason: `[GEBANNT] ${displayReason || reason}`,
        issuedBy: user.username,
        issuedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      await auditLog(env2.DATABASE, Number(user.sub), "CLOUD_BAN", "users", String(targetRobloxId), { targetUsername, reason, durationDays }, getIP(request));
      new DiscordService(env2).sendCloudBan({ issuedBy: user.username, targetUsername: targetUsername ?? String(targetRobloxId), targetId: targetRobloxId, reason, displayReason: displayReason || reason, durationDays: durationDays ?? null }).catch((e) => console.error("[Discord] ban webhook:", e.message));
      return json({ success: true, message: `${targetUsername ?? targetRobloxId} wurde gesperrt.` }, 200, origin);
    } catch (e) {
      return err(e.message, 503, origin);
    }
  }
  // ─── POST /api/cloud/unban ─────────────────────────────────────────────────
  /**
   * Removes a native universe ban via Open Cloud.
   * Body: { targetRobloxId, targetUsername }
   */
  static async unban(request, env2, user) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    if (ROLE_RANK[user.role] < ROLE_RANK["ADMIN"])
      return err("Nur ADMIN+ kann entbannen", 403, origin);
    const body = await request.json().catch(() => ({}));
    const { targetRobloxId, targetUsername } = body;
    if (!targetRobloxId)
      return err("targetRobloxId ist ein Pflichtfeld", 400, origin);
    if (isNaN(Number(targetRobloxId)) || Number(targetRobloxId) <= 0)
      return err("targetRobloxId muss eine g\xFCltige Roblox-ID sein", 400, origin);
    try {
      const cloud = new RobloxCloudService(env2);
      await cloud.unbanUser(Number(targetRobloxId));
      await auditLog(env2.DATABASE, Number(user.sub), "CLOUD_UNBAN", "users", String(targetRobloxId), { targetUsername }, getIP(request));
      new DiscordService(env2).sendCloudUnban({ issuedBy: user.username, targetUsername: targetUsername ?? String(targetRobloxId), targetId: targetRobloxId }).catch((e) => console.error("[Discord] unban webhook:", e.message));
      return json({ success: true, message: `${targetUsername ?? targetRobloxId} wurde entsperrt.` }, 200, origin);
    } catch (e) {
      return err(e.message, 503, origin);
    }
  }
  // ─── GET /api/cloud/restriction/:userId ────────────────────────────────────
  /**
   * Checks the current ban/restriction state of a user.
   */
  static async getRestriction(request, env2, user, params) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    if (ROLE_RANK[user.role] < ROLE_RANK["MOD"])
      return err("Keine Berechtigung", 403, origin);
    const { userId } = params;
    if (!userId)
      return err("userId fehlt", 400, origin);
    try {
      const cloud = new RobloxCloudService(env2);
      const data = await cloud.getRestriction(Number(userId));
      return json(data, 200, origin);
    } catch (e) {
      return err(e.message, 503, origin);
    }
  }
};
__name(CloudController, "CloudController");

// src/controllers/DatabaseController.ts
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
init_auth();
init_types();
var DatabaseController = class {
  static owner(user, origin) {
    if (ROLE_RANK[user.role] < ROLE_RANK["OWNER"]) {
      return err("Nur OWNER darf auf das Datenbank-Panel zugreifen", 403, origin);
    }
    return null;
  }
  // ── GET /api/db/stats ──────────────────────────────────────────────────────
  static async stats(request, env2, user) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const bad = DatabaseController.owner(user, origin);
    if (bad)
      return bad;
    const tables = ["users", "sessions", "cases", "shifts", "audit_logs", "watchlist", "rate_limits"];
    const results = {};
    await Promise.all(tables.map(async (t) => {
      const row = await env2.DATABASE.prepare(`SELECT COUNT(*) AS c FROM ${t}`).first();
      results[t] = row?.c ?? 0;
    }));
    return json({ tables: results }, 200, origin);
  }
  // ── GET /api/db/users ──────────────────────────────────────────────────────
  static async listUsers(request, env2, user) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const bad = DatabaseController.owner(user, origin);
    if (bad)
      return bad;
    const url = new URL(request.url);
    const limit = Math.min(Math.max(1, parseInt(url.searchParams.get("limit") ?? "50")), 100);
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0"));
    const search = (url.searchParams.get("search") ?? "").trim();
    const where = search ? `WHERE username LIKE ? OR roblox_id LIKE ?` : "";
    const params = search ? [`%${search}%`, `%${search}%`] : [];
    const [rows, total] = await Promise.all([
      env2.DATABASE.prepare(`SELECT id, roblox_id, username, avatar_url, role, last_seen, created_at FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all(),
      env2.DATABASE.prepare(`SELECT COUNT(*) AS c FROM users ${where}`).bind(...params).first()
    ]);
    return json({ users: rows.results, total: total?.c ?? 0, limit, offset }, 200, origin);
  }
  // ── PATCH /api/db/users/:id ────────────────────────────────────────────────
  static async updateUser(request, env2, user, params) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const bad = DatabaseController.owner(user, origin);
    if (bad)
      return bad;
    const targetId = parseInt(params.id);
    if (isNaN(targetId) || targetId <= 0)
      return err("Ung\xFCltige User-ID", 400, origin);
    if (targetId === Number(user.sub))
      return err("Eigene Rolle kann nicht ge\xE4ndert werden", 400, origin);
    const body = await request.json().catch(() => ({}));
    const { role } = body;
    if (!role || !["OWNER", "ADMIN", "MOD", "TRAINEE"].includes(role)) {
      return err("Ung\xFCltige Rolle. Erlaubt: OWNER, ADMIN, MOD, TRAINEE", 400, origin);
    }
    const existing = await env2.DATABASE.prepare("SELECT id, username FROM users WHERE id = ?").bind(targetId).first();
    if (!existing)
      return err("User nicht gefunden", 404, origin);
    await env2.DATABASE.prepare("UPDATE users SET role = ? WHERE id = ?").bind(role, targetId).run();
    await auditLog(env2.DATABASE, Number(user.sub), "DB_UPDATE_USER_ROLE", "users", String(targetId), { username: existing.username, newRole: role }, getIP(request));
    return json({ success: true, message: `Rolle von ${existing.username} auf ${role} gesetzt.` }, 200, origin);
  }
  // ── DELETE /api/db/users/:id ───────────────────────────────────────────────
  static async deleteUser(request, env2, user, params) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const bad = DatabaseController.owner(user, origin);
    if (bad)
      return bad;
    const targetId = parseInt(params.id);
    if (isNaN(targetId) || targetId <= 0)
      return err("Ung\xFCltige User-ID", 400, origin);
    if (targetId === Number(user.sub))
      return err("Eigener Account kann nicht gel\xF6scht werden", 400, origin);
    const existing = await env2.DATABASE.prepare("SELECT id, username FROM users WHERE id = ?").bind(targetId).first();
    if (!existing)
      return err("User nicht gefunden", 404, origin);
    await env2.DATABASE.prepare("DELETE FROM users WHERE id = ?").bind(targetId).run();
    await auditLog(env2.DATABASE, Number(user.sub), "DB_DELETE_USER", "users", String(targetId), { username: existing.username }, getIP(request));
    return json({ success: true, message: `User ${existing.username} (ID ${targetId}) gel\xF6scht.` }, 200, origin);
  }
  // ── GET /api/db/cases ──────────────────────────────────────────────────────
  static async listCases(request, env2, user) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const bad = DatabaseController.owner(user, origin);
    if (bad)
      return bad;
    const url = new URL(request.url);
    const limit = Math.min(Math.max(1, parseInt(url.searchParams.get("limit") ?? "50")), 100);
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0"));
    const search = (url.searchParams.get("search") ?? "").trim();
    const where = search ? `WHERE c.target_username LIKE ? OR c.target_roblox_id LIKE ? OR c.incident_id LIKE ?` : "";
    const bindParams = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];
    const [rows, total] = await Promise.all([
      env2.DATABASE.prepare(`
        SELECT c.*, u.username AS moderator_username
        FROM cases c LEFT JOIN users u ON c.moderator_id = u.id
        ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?
      `).bind(...bindParams, limit, offset).all(),
      env2.DATABASE.prepare(`SELECT COUNT(*) AS c FROM cases c ${where}`).bind(...bindParams).first()
    ]);
    return json({ cases: rows.results, total: total?.c ?? 0, limit, offset }, 200, origin);
  }
  // ── PATCH /api/db/cases/:id ────────────────────────────────────────────────
  static async updateCase(request, env2, user, params) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const bad = DatabaseController.owner(user, origin);
    if (bad)
      return bad;
    const caseId = parseInt(params.id);
    if (isNaN(caseId) || caseId <= 0)
      return err("Ung\xFCltige Case-ID", 400, origin);
    const body = await request.json().catch(() => ({}));
    const { active, notes, reason } = body;
    const existing = await env2.DATABASE.prepare("SELECT id FROM cases WHERE id = ?").bind(caseId).first();
    if (!existing)
      return err("Case nicht gefunden", 404, origin);
    const sets = [];
    const vals = [];
    if (active !== void 0) {
      sets.push("active = ?");
      vals.push(active ? 1 : 0);
    }
    if (notes !== void 0) {
      sets.push("notes = ?");
      vals.push(notes ?? null);
    }
    if (reason !== void 0 && typeof reason === "string" && reason.trim()) {
      sets.push("reason = ?");
      vals.push(reason.trim());
    }
    if (sets.length === 0)
      return err("Keine Felder zum Aktualisieren angegeben", 400, origin);
    vals.push(caseId);
    await env2.DATABASE.prepare(`UPDATE cases SET ${sets.join(", ")} WHERE id = ?`).bind(...vals).run();
    await auditLog(env2.DATABASE, Number(user.sub), "DB_UPDATE_CASE", "cases", String(caseId), body, getIP(request));
    return json({ success: true }, 200, origin);
  }
  // ── DELETE /api/db/cases/:id ───────────────────────────────────────────────
  static async deleteCase(request, env2, user, params) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const bad = DatabaseController.owner(user, origin);
    if (bad)
      return bad;
    const caseId = parseInt(params.id);
    if (isNaN(caseId) || caseId <= 0)
      return err("Ung\xFCltige Case-ID", 400, origin);
    const existing = await env2.DATABASE.prepare("SELECT id, incident_id FROM cases WHERE id = ?").bind(caseId).first();
    if (!existing)
      return err("Case nicht gefunden", 404, origin);
    await env2.DATABASE.prepare("DELETE FROM cases WHERE id = ?").bind(caseId).run();
    await auditLog(env2.DATABASE, Number(user.sub), "DB_DELETE_CASE", "cases", String(caseId), { incident_id: existing.incident_id }, getIP(request));
    return json({ success: true, message: `Case #${caseId} (${existing.incident_id}) gel\xF6scht.` }, 200, origin);
  }
  // ── GET /api/db/sessions ───────────────────────────────────────────────────
  static async listSessions(request, env2, user) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const bad = DatabaseController.owner(user, origin);
    if (bad)
      return bad;
    const url = new URL(request.url);
    const limit = Math.min(Math.max(1, parseInt(url.searchParams.get("limit") ?? "50")), 100);
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0"));
    const [rows, total] = await Promise.all([
      env2.DATABASE.prepare(`
        SELECT s.id, s.user_id, s.ip, s.user_agent, s.expires_at, s.created_at, u.username, u.role
        FROM sessions s LEFT JOIN users u ON s.user_id = u.id
        WHERE s.expires_at > datetime('now')
        ORDER BY s.created_at DESC LIMIT ? OFFSET ?
      `).bind(limit, offset).all(),
      env2.DATABASE.prepare(`SELECT COUNT(*) AS c FROM sessions WHERE expires_at > datetime('now')`).first()
    ]);
    return json({ sessions: rows.results, total: total?.c ?? 0, limit, offset }, 200, origin);
  }
  // ── DELETE /api/db/sessions/:id ────────────────────────────────────────────
  static async deleteSession(request, env2, user, params) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const bad = DatabaseController.owner(user, origin);
    if (bad)
      return bad;
    const sessionId = parseInt(params.id);
    if (isNaN(sessionId) || sessionId <= 0)
      return err("Ung\xFCltige Session-ID", 400, origin);
    const existing = await env2.DATABASE.prepare("SELECT id, user_id FROM sessions WHERE id = ?").bind(sessionId).first();
    if (!existing)
      return err("Session nicht gefunden", 404, origin);
    await env2.DATABASE.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
    await auditLog(env2.DATABASE, Number(user.sub), "DB_REVOKE_SESSION", "sessions", String(sessionId), { user_id: existing.user_id }, getIP(request));
    return json({ success: true, message: `Session #${sessionId} widerrufen.` }, 200, origin);
  }
  // ── GET /api/db/audit-logs ─────────────────────────────────────────────────
  static async listAuditLogs(request, env2, user) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const bad = DatabaseController.owner(user, origin);
    if (bad)
      return bad;
    const url = new URL(request.url);
    const limit = Math.min(Math.max(1, parseInt(url.searchParams.get("limit") ?? "50")), 100);
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0"));
    const action = (url.searchParams.get("action") ?? "").trim();
    const where = action ? `WHERE a.action LIKE ?` : "";
    const params = action ? [`%${action}%`] : [];
    const [rows, total] = await Promise.all([
      env2.DATABASE.prepare(`
        SELECT a.id, a.action, a.resource, a.resource_id, a.metadata, a.ip, a.created_at,
               u.username AS actor_username, u.role AS actor_role
        FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id
        ${where} ORDER BY a.created_at DESC LIMIT ? OFFSET ?
      `).bind(...params, limit, offset).all(),
      env2.DATABASE.prepare(`SELECT COUNT(*) AS c FROM audit_logs a ${where}`).bind(...params).first()
    ]);
    return json({ logs: rows.results, total: total?.c ?? 0, limit, offset }, 200, origin);
  }
  // ── GET /api/db/server-status ──────────────────────────────────────────────
  static async listServerStatus(request, env2, user) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const bad = DatabaseController.owner(user, origin);
    if (bad)
      return bad;
    const rows = await env2.DATABASE.prepare("SELECT * FROM server_status ORDER BY service ASC").all();
    return json({ services: rows.results }, 200, origin);
  }
  // ── PATCH /api/db/server-status/:service ──────────────────────────────────
  static async updateServerStatus(request, env2, user, params) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const bad = DatabaseController.owner(user, origin);
    if (bad)
      return bad;
    const service = decodeURIComponent(params.service ?? "").trim();
    if (!service)
      return err("Service-Name fehlt", 400, origin);
    const body = await request.json().catch(() => ({}));
    const { status } = body;
    const allowed = ["OPERATIONAL", "DEGRADED", "OUTAGE", "MAINTENANCE", "UNKNOWN", "ONLINE", "OFFLINE", "SYNCED", "ERROR"];
    if (!status || !allowed.includes(status)) {
      return err(`Ung\xFCltiger Status. Erlaubt: ${allowed.join(", ")}`, 400, origin);
    }
    const existing = await env2.DATABASE.prepare("SELECT id FROM server_status WHERE service = ?").bind(service).first();
    if (!existing) {
      await env2.DATABASE.prepare(`INSERT INTO server_status (service, status, updated_at) VALUES (?, ?, datetime('now'))`).bind(service, status).run();
    } else {
      await env2.DATABASE.prepare(`UPDATE server_status SET status = ?, updated_at = datetime('now') WHERE service = ?`).bind(status, service).run();
    }
    await auditLog(env2.DATABASE, Number(user.sub), "DB_UPDATE_STATUS", "server_status", service, { status }, getIP(request));
    return json({ success: true }, 200, origin);
  }
  // ── DELETE /api/db/rate-limits ─────────────────────────────────────────────
  static async clearRateLimits(request, env2, user) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const bad = DatabaseController.owner(user, origin);
    if (bad)
      return bad;
    const { meta } = await env2.DATABASE.prepare("DELETE FROM rate_limits").run();
    await auditLog(env2.DATABASE, Number(user.sub), "DB_CLEAR_RATE_LIMITS", "rate_limits", null, { rowsDeleted: meta?.changes ?? 0 }, getIP(request));
    return json({ success: true, rowsDeleted: meta?.changes ?? 0 }, 200, origin);
  }
};
__name(DatabaseController, "DatabaseController");

// src/controllers/ManagementController.ts
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
init_auth();
init_types();
var ManagementController = class {
  static checkAccess(user, origin) {
    if (ROLE_RANK[user.role] < ROLE_RANK["ADMIN"]) {
      return err("Zugriff verweigert: Management-Bereich (ADMIN+ erforderlich)", 403, origin);
    }
    return null;
  }
  // ── GET /api/mgmt/users ──────────────────────────────────────────────────
  static async listStaff(request, env2, user) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const bad = ManagementController.checkAccess(user, origin);
    if (bad)
      return bad;
    const rows = await env2.DATABASE.prepare(`
      SELECT id, roblox_id, username, avatar_url, role, hwid, last_seen, created_at
      FROM users
      ORDER BY created_at DESC
    `).all();
    const staff = rows.results.map((r) => ({
      id: r.id,
      roblox_id: r.roblox_id,
      username: r.username,
      avatarUrl: r.avatar_url,
      role: r.role,
      last_seen: r.last_seen,
      created_at: r.created_at,
      hwidLocked: !!r.hwid
    }));
    return json({ staff }, 200, origin);
  }
  // ── PATCH /api/mgmt/users/:id/hwid-reset ────────────────────────────────
  static async resetHwid(request, env2, user, params) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const bad = ManagementController.checkAccess(user, origin);
    if (bad)
      return bad;
    const targetId = parseInt(params.id);
    if (isNaN(targetId) || targetId <= 0)
      return err("Ung\xFCltige User-ID", 400, origin);
    const existing = await env2.DATABASE.prepare("SELECT id, username, hwid FROM users WHERE id = ?").bind(targetId).first();
    if (!existing)
      return err("User nicht gefunden", 404, origin);
    if (!existing.hwid)
      return err("HWID ist bereits zur\xFCckgesetzt", 400, origin);
    await env2.DATABASE.prepare("UPDATE users SET hwid = NULL WHERE id = ?").bind(targetId).run();
    await auditLog(env2.DATABASE, Number(user.sub), "MGMT_RESET_HWID", "users", String(targetId), { username: existing.username }, getIP(request));
    return json({ success: true, message: `HWID-Sperre von ${existing.username} aufgehoben.` }, 200, origin);
  }
  // ── PATCH /api/mgmt/users/:id/role ───────────────────────────────────────
  static async updateRole(request, env2, user, params) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const bad = ManagementController.checkAccess(user, origin);
    if (bad)
      return bad;
    const targetId = parseInt(params.id);
    if (isNaN(targetId) || targetId <= 0)
      return err("Ung\xFCltige User-ID", 400, origin);
    const body = await request.json().catch(() => ({}));
    const { role } = body;
    const allowedRoles = ["OWNER", "ADMIN", "MOD", "TRAINEE"];
    if (!role || !allowedRoles.includes(role)) {
      return err("Ung\xFCltige Rolle angesagt.", 400, origin);
    }
    if (targetId === Number(user.sub)) {
      return err("Eigene Rolle kann nicht ge\xE4ndert werden", 400, origin);
    }
    const targetUser = await env2.DATABASE.prepare("SELECT id, username, role FROM users WHERE id = ?").bind(targetId).first();
    if (!targetUser)
      return err("User nicht gefunden", 404, origin);
    const myRank = ROLE_RANK[user.role];
    const targetRank = ROLE_RANK[targetUser.role];
    const newRank = ROLE_RANK[role];
    if (user.role !== "OWNER" && targetRank >= myRank) {
      return err("Du kannst die Rolle dieses Nutzers nicht \xE4ndern, da sein aktueller Rang zu hoch ist.", 403, origin);
    }
    if (user.role !== "OWNER" && newRank >= myRank) {
      return err("Du kannst niemanden auf deinen eigenen oder einen h\xF6heren Rang bef\xF6rdern.", 403, origin);
    }
    await env2.DATABASE.prepare("UPDATE users SET role = ? WHERE id = ?").bind(role, targetId).run();
    await auditLog(env2.DATABASE, Number(user.sub), "MGMT_UPDATE_ROLE", "users", String(targetId), { username: targetUser.username, oldRole: targetUser.role, newRole: role }, getIP(request));
    return json({ success: true, message: `Rolle von ${targetUser.username} auf ${role} ge\xE4ndert.` }, 200, origin);
  }
};
__name(ManagementController, "ManagementController");

// src/utils/docs.ts
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function renderDocs(_env) {
  const html = `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BWRP API // Reference</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Oswald:wght@500;700&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"><\/script>
    <script src="https://cdn.tailwindcss.com"><\/script>
    <link rel="icon" type="image/x-icon" href="https://media.discordapp.net/attachments/957378235891597365/1491540474031374426/BWRPNeuwebp.png?ex=69d810d0&is=69d6bf50&hm=9926d55732ec01e277859cf487aec47dfc08d1cfd0be6de0808c8eaecf339231&=&format=webp&quality=lossless">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'tac-dark':   '#050505',
                        'tac-panel':  '#0a0a0a',
                        'tac-card':   '#0d0d0d',
                        'tac-border': 'rgba(255,255,255,0.06)',
                        'tac-amber':  '#e2a800',
                        'tac-red':    '#ef4444',
                        'tac-green':  '#10b981',
                        'tac-blue':   '#3b82f6',
                        'tac-purple': '#a855f7',
                        'tac-muted':  '#52525b',
                    },
                    fontFamily: {
                        'sans':    ['Inter', 'sans-serif'],
                        'display': ['Oswald', 'sans-serif'],
                        'mono':    ['JetBrains Mono', 'monospace'],
                    }
                }
            }
        }
    <\/script>
    <style>
        body { background: #050505; color: #a1a1aa; }

        /* Endpoint cards */
        .ep { background: #0d0d0d; border: 1px solid rgba(255,255,255,0.06); }
        .ep-header { cursor: pointer; user-select: none; transition: background 0.15s; }
        .ep-header:hover { background: rgba(255,255,255,0.03); }
        .ep-body { display: none; border-top: 1px solid rgba(255,255,255,0.06); }
        .ep.open .ep-body { display: block; }
        .ep.open .ep-chevron { transform: rotate(180deg); }
        .ep-chevron { transition: transform 0.2s; }

        /* Method badges */
        .m-get    { color:#10b981; border-color:rgba(16,185,129,.25); background:rgba(16,185,129,.07); }
        .m-post   { color:#3b82f6; border-color:rgba(59,130,246,.25); background:rgba(59,130,246,.07); }
        .m-patch  { color:#e2a800; border-color:rgba(226,168,0,.25);  background:rgba(226,168,0,.07);  }
        .m-delete { color:#ef4444; border-color:rgba(239,68,68,.25);  background:rgba(239,68,68,.07);  }

        /* Auth badges */
        .auth-pub   { color:#10b981; border-color:rgba(16,185,129,.2);  background:rgba(16,185,129,.06); }
        .auth-user  { color:#3b82f6; border-color:rgba(59,130,246,.2);  background:rgba(59,130,246,.06); }
        .auth-mod   { color:#e2a800; border-color:rgba(226,168,0,.2);   background:rgba(226,168,0,.06);  }
        .auth-admin { color:#ef4444; border-color:rgba(239,68,68,.2);   background:rgba(239,68,68,.06);  }

        /* Code blocks */
        pre { background:#000; border:1px solid rgba(255,255,255,0.06); padding:.85rem 1rem; font-size:.72rem; line-height:1.6; overflow-x:auto; border-radius:2px; }

        /* Params / body tables */
        .param-table { width:100%; font-family:'JetBrains Mono',monospace; font-size:.7rem; border-collapse:collapse; }
        .param-table th { color:#52525b; text-transform:uppercase; letter-spacing:.1em; padding:.5rem .75rem; text-align:left; border-bottom:1px solid rgba(255,255,255,0.06); font-weight:500; }
        .param-table td { padding:.5rem .75rem; border-bottom:1px solid rgba(255,255,255,0.04); vertical-align:top; }
        .param-table tr:last-child td { border-bottom:none; }
        .param-name { color:#93c5fd; font-weight:600; }
        .param-type { color:#71717a; }
        .param-req  { color:#ef4444; font-weight:700; font-size:.65rem; }
        .param-opt  { color:#3f3f46; font-size:.65rem; }
        .param-desc { color:#a1a1aa; }

        /* Section divider */
        .section-divider { display:flex; align-items:center; gap:1rem; margin-bottom:1.75rem; }
        .section-divider h3 { font-family:'Oswald',sans-serif; font-size:1.25rem; font-weight:700; color:#fff; text-transform:uppercase; letter-spacing:.1em; white-space:nowrap; }
        .section-divider .line { flex:1; height:1px; background:rgba(255,255,255,0.06); }

        /* Sidebar */
        .nav-link { display:flex; align-items:center; gap:.65rem; padding:.5rem .75rem; font-family:'JetBrains Mono',monospace; font-size:.68rem; color:#52525b; transition:all .15s; border-left:2px solid transparent; text-decoration:none; }
        .nav-link:hover { color:#a1a1aa; }
        .nav-link.active { color:#e2a800; border-left-color:#e2a800; background:rgba(226,168,0,.05); }
        .nav-count { margin-left:auto; background:rgba(255,255,255,.05); color:#3f3f46; font-size:.6rem; padding:.1rem .4rem; border-radius:2px; }
        .nav-link.active .nav-count { background:rgba(226,168,0,.15); color:#e2a800; }

        /* Notes */
        .note { font-family:'JetBrains Mono',monospace; font-size:.7rem; background:rgba(59,130,246,.06); border:1px solid rgba(59,130,246,.15); color:#93c5fd; padding:.6rem .85rem; margin-bottom:1rem; }
        .note-warn { background:rgba(226,168,0,.05); border-color:rgba(226,168,0,.15); color:#fbbf24; }
        .note-danger { background:rgba(239,68,68,.05); border-color:rgba(239,68,68,.15); color:#fca5a5; }

        ::-webkit-scrollbar { width:3px; height:3px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#1c1c1c; }

        /* Try-it panels */
        .try-panel { margin-top:1rem; border:1px solid rgba(16,185,129,.2); background:rgba(16,185,129,.03); }
        .try-panel-header { display:flex; align-items:center; gap:.75rem; padding:.6rem .85rem; border-bottom:1px solid rgba(16,185,129,.15); }
        .try-panel-header span { font-family:'JetBrains Mono',monospace; font-size:.65rem; color:#10b981; text-transform:uppercase; letter-spacing:.1em; font-weight:700; }
        .try-input { background:#000; border:1px solid rgba(255,255,255,.08); color:#e4e4e7; font-family:'JetBrains Mono',monospace; font-size:.72rem; padding:.4rem .6rem; outline:none; min-width:180px; flex:1; }
        .try-input:focus { border-color:rgba(16,185,129,.5); }
        .try-run { background:rgba(16,185,129,.15); border:1px solid rgba(16,185,129,.4); color:#10b981; font-family:'JetBrains Mono',monospace; font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; padding:.35rem .9rem; cursor:pointer; transition:all .15s; white-space:nowrap; }
        .try-run:hover { background:rgba(16,185,129,.25); }
        .try-run:disabled { opacity:.4; cursor:not-allowed; }
        .try-output { display:none; padding:.75rem .85rem; border-top:1px solid rgba(255,255,255,.04); }
        .try-output pre { margin:0; background:#000; border:none; font-size:.68rem; max-height:220px; overflow-y:auto; }
        .try-status-ok { color:#10b981; font-family:'JetBrains Mono',monospace; font-size:.65rem; font-weight:700; }
        .try-status-err { color:#ef4444; font-family:'JetBrains Mono',monospace; font-size:.65rem; font-weight:700; }
    </style>
</head>
<body class="flex min-h-screen font-sans">

<!-- \u2500\u2500 MOBILE HEADER \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
<header class="fixed top-0 inset-x-0 h-14 border-b border-tac-border bg-tac-panel/90 backdrop-blur-md z-[60] flex items-center justify-between px-5 md:hidden">
    <div class="flex items-center gap-2.5">
        <i data-lucide="terminal" class="w-4 h-4 text-tac-amber"></i>
        <span class="font-display font-bold text-white tracking-widest text-base uppercase">API DOCS</span>
    </div>
    <button id="mob-toggle" class="p-1.5 text-tac-muted hover:text-white transition-colors">
        <i data-lucide="menu" class="w-5 h-5"></i>
    </button>
</header>

<!-- \u2500\u2500 SIDEBAR \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
<aside id="sidebar" class="fixed inset-y-0 left-0 w-60 bg-tac-panel border-r border-tac-border flex flex-col z-50 -translate-x-full md:translate-x-0 transition-transform duration-200">
    <!-- Logo -->
    <div class="h-14 flex items-center px-5 border-b border-tac-border gap-2.5 shrink-0">
        <div class="absolute left-0 top-0 h-14 w-0.5 bg-tac-amber"></div>
        <i data-lucide="terminal" class="w-4 h-4 text-tac-amber"></i>
        <span class="font-display text-base font-bold tracking-widest text-white uppercase">BWRP API</span>
    </div>

    <!-- Meta -->
    <div class="px-4 py-3 border-b border-tac-border font-mono text-[10px] space-y-1.5">
        <div class="flex justify-between">
            <span class="text-tac-muted">BASE URL</span>
            <span class="text-tac-amber">https://bwrp.net/api</span>
        </div>
        <div class="flex justify-between">
            <span class="text-tac-muted">AUTH</span>
            <span class="text-zinc-300">HttpOnly Cookies</span>
        </div>
        <div class="flex justify-between">
            <span class="text-tac-muted">STATUS</span>
            <span class="text-tac-green flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 bg-tac-green rounded-full animate-pulse inline-block"></span>ONLINE
            </span>
        </div>
    </div>

    <!-- Nav -->
    <nav class="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        <p class="font-mono text-[9px] text-tac-muted tracking-[.2em] uppercase px-2 pb-2 pt-1">Endpoints</p>
        <a href="#auth"       class="nav-link"><i data-lucide="lock"       class="w-3.5 h-3.5 shrink-0"></i>Authentication<span class="nav-count">3</span></a>
        <a href="#staff"      class="nav-link"><i data-lucide="users"      class="w-3.5 h-3.5 shrink-0"></i>Staff Panel<span class="nav-count">6</span></a>
        <a href="#watchlist"  class="nav-link"><i data-lucide="eye"        class="w-3.5 h-3.5 shrink-0"></i>Watchlist<span class="nav-count">4</span></a>
        <a href="#moderation" class="nav-link"><i data-lucide="gavel"      class="w-3.5 h-3.5 shrink-0"></i>Moderation<span class="nav-count">4</span></a>
        <a href="#shifts"     class="nav-link"><i data-lucide="clock"      class="w-3.5 h-3.5 shrink-0"></i>Shifts<span class="nav-count">4</span></a>
        <a href="#roblox"     class="nav-link"><i data-lucide="database"   class="w-3.5 h-3.5 shrink-0"></i>Roblox Proxy<span class="nav-count">4</span></a>
        <a href="#cloud"      class="nav-link"><i data-lucide="cloud"      class="w-3.5 h-3.5 shrink-0"></i>Open Cloud<span class="nav-count">4</span></a>

        <p class="font-mono text-[9px] text-tac-muted tracking-[.2em] uppercase px-2 pb-2 pt-4">Reference</p>
        <a href="#auth-model" class="nav-link"><i data-lucide="key-round"  class="w-3.5 h-3.5 shrink-0"></i>Auth Model</a>
        <a href="#errors"     class="nav-link"><i data-lucide="triangle-alert" class="w-3.5 h-3.5 shrink-0"></i>Error Codes</a>
    </nav>

    <!-- Back -->
    <div class="p-3 border-t border-tac-border shrink-0">
        <a href="/team" class="flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-mono text-tac-muted border border-tac-border hover:text-white hover:border-white/10 transition-all uppercase tracking-widest">
            <i data-lucide="arrow-left" class="w-3 h-3"></i>Back to Panel
        </a>
    </div>
</aside>

<!-- \u2500\u2500 MAIN \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
<main class="flex-1 md:ml-60 min-w-0 pt-14 md:pt-0">

    <!-- Top bar -->
    <div class="sticky top-0 z-40 h-14 border-b border-tac-border bg-tac-panel/80 backdrop-blur-md hidden md:flex items-center justify-between px-8">
        <div class="flex items-center gap-5 font-mono text-[10px]">
            <span class="flex items-center gap-1.5 text-tac-green">
                <span class="w-1.5 h-1.5 rounded-full bg-tac-green animate-pulse inline-block"></span>ONLINE
            </span>
            <span class="text-tac-muted">|</span>
            <span class="text-tac-muted">BASE: <span class="text-white">https://bwrp.net/api</span></span>
            <span class="text-tac-muted">|</span>
            <span class="text-tac-muted">25 ENDPOINTS</span>
        </div>
        <div id="clock" class="font-mono text-[10px] text-tac-muted tabular-nums"></div>
    </div>

    <div class="px-6 md:px-10 py-10 max-w-5xl mx-auto w-full">

        <!-- Page title -->
        <div class="mb-10">
            <h1 class="font-display text-3xl font-bold text-white tracking-wider uppercase mb-1">API Reference</h1>
            <p class="font-mono text-[11px] text-tac-muted">BWRP Staff Panel \xB7 Cloudflare Workers \xB7 D1 \xB7 Roblox OAuth 2.0</p>
        </div>

        <!-- \u2550\u2550 AUTH MODEL \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->
        <section id="auth-model" class="mb-12 scroll-mt-20">
            <div class="section-divider">
                <i data-lucide="key-round" class="w-4 h-4 text-tac-amber shrink-0"></i>
                <h3>Auth Model</h3>
                <div class="line"></div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="bg-tac-card border border-tac-border p-4 font-mono text-[11px] space-y-1.5">
                    <p class="text-tac-muted text-[9px] uppercase tracking-widest mb-2">Access Token</p>
                    <p class="text-zinc-300">Cookie: <span class="text-tac-amber">bwrp_access</span></p>
                    <p class="text-tac-muted">HttpOnly \xB7 Secure \xB7 SameSite=None</p>
                    <p class="text-tac-muted">TTL: <span class="text-white">15 minutes</span></p>
                </div>
                <div class="bg-tac-card border border-tac-border p-4 font-mono text-[11px] space-y-1.5">
                    <p class="text-tac-muted text-[9px] uppercase tracking-widest mb-2">Refresh Token</p>
                    <p class="text-zinc-300">Cookie: <span class="text-tac-amber">bwrp_refresh</span></p>
                    <p class="text-tac-muted">HttpOnly \xB7 Secure \xB7 SameSite=None</p>
                    <p class="text-tac-muted">TTL: <span class="text-white">7 days</span></p>
                </div>
                <div class="bg-tac-card border border-tac-border p-4 font-mono text-[11px] space-y-1.5">
                    <p class="text-tac-muted text-[9px] uppercase tracking-widest mb-2">Role Hierarchy</p>
                    <p><span class="text-tac-red font-bold">OWNER</span> <span class="text-tac-muted">&gt;</span> <span class="text-tac-red">ADMIN</span> <span class="text-tac-muted">&gt;</span> <span class="text-tac-amber">MOD</span></p>
                    <p class="text-tac-muted">Determined by Roblox group rank</p>
                    <p class="text-tac-muted">Group: <span class="text-white">34246821</span></p>
                </div>
            </div>
            <div class="note">All protected routes require <span class="text-white">credentials: 'include'</span> on the fetch call so the browser sends HttpOnly cookies cross-origin. On 401, call <span class="text-tac-amber">POST /auth/refresh</span> and retry.</div>
        </section>

        <!-- \u2550\u2550 ERRORS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->
        <section id="errors" class="mb-12 scroll-mt-20">
            <div class="section-divider">
                <i data-lucide="triangle-alert" class="w-4 h-4 text-tac-red shrink-0"></i>
                <h3>Error Codes</h3>
                <div class="line"></div>
            </div>
            <div class="bg-tac-card border border-tac-border overflow-hidden">
                <table class="param-table">
                    <thead><tr><th>Status</th><th>When it occurs</th><th>Body</th></tr></thead>
                    <tbody>
                        <tr><td class="text-tac-amber">400</td><td class="param-desc">Missing / invalid request field</td><td class="text-zinc-500">{ "error": "..." }</td></tr>
                        <tr><td class="text-tac-amber">401</td><td class="param-desc">Missing or expired access token</td><td class="text-zinc-500">{ "error": "Kein Authentifizierungs-Token" }</td></tr>
                        <tr><td class="text-tac-amber">403</td><td class="param-desc">Authenticated but insufficient role</td><td class="text-zinc-500">{ "error": "Zugriff verweigert. Mindestrang: ..." }</td></tr>
                        <tr><td class="text-tac-amber">404</td><td class="param-desc">Resource not found</td><td class="text-zinc-500">{ "error": "..." }</td></tr>
                        <tr><td class="text-tac-red font-bold">429</td><td class="param-desc">Rate limit exceeded \u2014 check <code>Retry-After</code> header</td><td class="text-zinc-500">{ "error": "Zu viele Anfragen..." }</td></tr>
                        <tr><td class="text-tac-amber">500</td><td class="param-desc">Internal worker error</td><td class="text-zinc-500">{ "error": "Interner Server-Fehler: ..." }</td></tr>
                        <tr><td class="text-tac-amber">502</td><td class="param-desc">Upstream Roblox API unreachable</td><td class="text-zinc-500">{ "error": "Roblox-API nicht erreichbar" }</td></tr>
                        <tr><td class="text-tac-amber">503</td><td class="param-desc">Open Cloud action failed</td><td class="text-zinc-500">{ "error": "..." }</td></tr>
                    </tbody>
                </table>
            </div>
        </section>

        <!-- \u2550\u2550 AUTHENTICATION \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->
        <section id="auth" class="mb-12 scroll-mt-20">
            <div class="section-divider">
                <i data-lucide="lock" class="w-4 h-4 text-tac-blue shrink-0"></i>
                <h3>Authentication</h3>
                <div class="line"></div>
            </div>
            <div class="space-y-2">

                <!-- POST /auth/login -->
                <div class="ep">
                    <div class="ep-header ep p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-post px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">POST</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/auth/login</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Exchange Roblox OAuth code for session cookies</span>
                        <span class="auth-pub px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Public</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-5">
                        <p class="font-mono text-[11px] text-zinc-400">Accepts the OAuth authorization code returned by Roblox, exchanges it for tokens, verifies the user's group rank, and sets <span class="text-tac-amber">bwrp_access</span> + <span class="text-tac-amber">bwrp_refresh</span> cookies. Returns 403 if the user has no qualifying rank.</p>
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">Request Body (JSON)</p>
                                <table class="param-table">
                                    <thead><tr><th>Field</th><th>Type</th><th>Req</th><th>Notes</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">code</td><td class="param-type">string</td><td class="param-req">YES</td><td class="param-desc">OAuth authorization code from Roblox callback</td></tr>
                                        <tr><td class="param-name">redirect_uri</td><td class="param-type">string</td><td class="param-opt">opt</td><td class="param-desc">Must match the registered redirect URI. Defaults to <code>https://bwrp.net/team</code></td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{
  "success": true,
  "user": {
    "id": 1,
    "username": "Zane",
    "role": "OWNER",
    "avatarUrl": "https://tr.rbxcdn.com/..."
  }
}</code></pre>
                                <p class="font-mono text-[9px] text-tac-muted mt-2">Sets: <span class="text-tac-amber">bwrp_access</span> (15 min) \xB7 <span class="text-tac-amber">bwrp_refresh</span> (7 days)</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- POST /auth/refresh -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-post px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">POST</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/auth/refresh</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Re-issue access token using refresh cookie</span>
                        <span class="auth-pub px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Public</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="note">Requires the <span class="text-white">bwrp_refresh</span> HttpOnly cookie. No request body needed. Issues a new <span class="text-white">bwrp_access</span> cookie.</div>
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">Cookies Required</p>
                                <table class="param-table">
                                    <thead><tr><th>Cookie</th><th>Notes</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">bwrp_refresh</td><td class="param-desc">Must be valid and not expired (7-day TTL)</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{ "success": true }</code></pre>
                                <p class="font-mono text-[9px] text-tac-muted mt-2">Sets: <span class="text-tac-amber">bwrp_access</span> (new 15 min window)</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- POST /auth/logout -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-post px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">POST</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/auth/logout</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Invalidate session and clear cookies</span>
                        <span class="auth-pub px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Public</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <p class="font-mono text-[11px] text-zinc-400">Deletes the session row from D1 (if refresh cookie is present) and clears both cookies via <code>Max-Age=0</code>. Safe to call even when not logged in.</p>
                        <div>
                            <div class="flex items-center justify-between mb-1.5">
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                                <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                            </div>
                            <pre class="text-tac-green"><code>{ "success": true }</code></pre>
                            <p class="font-mono text-[9px] text-tac-muted mt-2">Clears: <span class="text-tac-amber">bwrp_access</span> \xB7 <span class="text-tac-amber">bwrp_refresh</span></p>
                        </div>
                    </div>
                </div>

            </div>
        </section>

        <!-- \u2550\u2550 STAFF PANEL \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->
        <section id="staff" class="mb-12 scroll-mt-20">
            <div class="section-divider">
                <i data-lucide="users" class="w-4 h-4 text-tac-amber shrink-0"></i>
                <h3>Staff Panel</h3>
                <div class="line"></div>
            </div>
            <div class="space-y-2">

                <!-- GET /staff/me -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/staff/me</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Own profile from the D1 users table</span>
                        <span class="auth-user px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Any Auth</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="flex items-center justify-between mb-1.5">
                            <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                            <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                        </div>
                        <pre class="text-tac-green"><code>{
  "user": {
    "id": 1,
    "username": "Zane",
    "avatar_url": "https://tr.rbxcdn.com/...",
    "role": "OWNER",
    "last_seen": "2026-04-08T12:00:00.000Z",
    "created_at": "2026-01-01T00:00:00.000Z"
  }
}</code></pre>
                        <div class="try-panel">
                            <div class="try-panel-header">
                                <span>Try it</span>
                                <span class="try-label" style="margin-left:auto"></span>
                                <button class="try-run" data-path="/staff/me" data-method="GET" onclick="tryIt(this)">Run</button>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

                <!-- GET /staff/sessions -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/staff/sessions</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">All active sessions for the current user</span>
                        <span class="auth-user px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Any Auth</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="flex items-center justify-between mb-1.5">
                            <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                            <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                        </div>
                        <pre class="text-tac-green"><code>{
  "sessions": [
    {
      "id": 42,
      "ip": "1.2.3.4",
      "user_agent": "Mozilla/5.0 ...",
      "expires_at": "2026-04-15T12:00:00.000Z",
      "created_at": "2026-04-08T12:00:00.000Z"
    }
  ]
}</code></pre>
                    </div>
                </div>

                <!-- GET /staff/roster -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/staff/roster</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">All staff members sorted by role then username</span>
                        <span class="auth-user px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Any Auth</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="flex items-center justify-between mb-1.5">
                            <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                            <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                        </div>
                        <pre class="text-tac-green"><code>{
  "roster": [
    {
      "id": 1,
      "roblox_id": "123456789",
      "username": "Zane",
      "avatar_url": "https://tr.rbxcdn.com/...",
      "role": "OWNER",
      "last_seen": "2026-04-08T12:00:00.000Z"
    }
  ]
}</code></pre>
                    </div>
                </div>

                <!-- GET /staff/status -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/staff/status</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Service status rows from server_status table</span>
                        <span class="auth-user px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Any Auth</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="flex items-center justify-between mb-1.5">
                            <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                            <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                        </div>
                        <pre class="text-tac-green"><code>{
  "status": [
    {
      "service": "Game Server",
      "status": "ONLINE",
      "updated_at": "2026-04-08T12:00:00.000Z"
    }
  ]
}</code></pre>
                    </div>
                </div>

                <!-- GET /staff/activity -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/staff/activity</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Last 20 audit log entries (all staff)</span>
                        <span class="auth-user px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Any Auth</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="flex items-center justify-between mb-1.5">
                            <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                            <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                        </div>
                        <pre class="text-tac-green"><code>{
  "activity": [
    {
      "action": "CASE_CREATE",
      "resource": "cases",
      "resource_id": "INC-0042",
      "created_at": "2026-04-08T12:00:00.000Z",
      "username": "Zane"
    }
  ]
}</code></pre>
                    </div>
                </div>

                <!-- GET /staff/stats -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/staff/stats</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Aggregated lifetime and weekly stats for the caller</span>
                        <span class="auth-user px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Any Auth</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="flex items-center justify-between mb-1.5">
                            <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                            <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                        </div>
                        <pre class="text-tac-green"><code>{
  "total_shifts":  42,
  "total_seconds": 151200,
  "total_cases":   130,
  "total_bans":    18,
  "week_seconds":  14400,
  "week_cases":    12,
  "cases_filed":   95
}</code></pre>
                    </div>
                </div>

            </div>
        </section>

        <!-- \u2550\u2550 WATCHLIST \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->
        <section id="watchlist" class="mb-12 scroll-mt-20">
            <div class="section-divider">
                <i data-lucide="eye" class="w-4 h-4 text-yellow-500 shrink-0"></i>
                <h3>Watchlist</h3>
                <div class="line"></div>
            </div>
            <div class="space-y-2">

                <!-- GET /watchlist -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/watchlist</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">All watchlist entries ordered newest first</span>
                        <span class="auth-mod px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">MOD+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="flex items-center justify-between mb-1.5">
                            <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                            <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                        </div>
                        <pre class="text-tac-green"><code>{
  "watchlist": [
    {
      "id": 15,
      "player_roblox_id": "123456789",
      "player_username": "Troublemaker",
      "reason": "Suspected mass RDM",
      "added_by_id": 1,
      "added_by_username": "Zane",
      "created_at": "2026-04-08T12:00:00.000Z"
    }
  ]
}</code></pre>
                    </div>
                </div>

                <!-- GET /watchlist/check/:robloxId -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/watchlist/check/<span class="text-tac-amber">:robloxId</span></code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Check if a specific player is flagged</span>
                        <span class="auth-mod px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">MOD+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">URL Params</p>
                                <table class="param-table">
                                    <thead><tr><th>Param</th><th>Type</th><th>Notes</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">robloxId</td><td class="param-type">string</td><td class="param-desc">Numeric Roblox user ID</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{
  "flagged": true,
  "entry": {
    "id": 15,
    "player_roblox_id": "123456789",
    "player_username": "Troublemaker",
    "reason": "Suspected mass RDM",
    "created_at": "2026-04-08T12:00:00.000Z"
  }
}</code></pre>
                                <p class="font-mono text-[9px] text-tac-muted mt-2"><code>entry</code> is <span class="text-white">null</span> when <code>flagged: false</code></p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- POST /watchlist -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-post px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">POST</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/watchlist</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Add a player to the watchlist</span>
                        <span class="auth-mod px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">MOD+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">Request Body (JSON)</p>
                                <table class="param-table">
                                    <thead><tr><th>Field</th><th>Type</th><th>Req</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">playerRobloxId</td><td class="param-type">string</td><td class="param-req">YES</td></tr>
                                        <tr><td class="param-name">playerUsername</td><td class="param-type">string</td><td class="param-req">YES</td></tr>
                                        <tr><td class="param-name">reason</td><td class="param-type">string</td><td class="param-req">YES</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 201</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{ "success": true }</code></pre>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- DELETE /watchlist/:id -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-delete px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">DELETE</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/watchlist/<span class="text-tac-amber">:id</span></code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Remove a watchlist entry by its row ID</span>
                        <span class="auth-mod px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">MOD+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">URL Params</p>
                                <table class="param-table">
                                    <thead><tr><th>Param</th><th>Type</th><th>Notes</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">id</td><td class="param-type">integer</td><td class="param-desc">Watchlist row ID (from GET /watchlist)</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{ "success": true }</code></pre>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </section>

        <!-- \u2550\u2550 MODERATION \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->
        <section id="moderation" class="mb-12 scroll-mt-20">
            <div class="section-divider">
                <i data-lucide="gavel" class="w-4 h-4 text-tac-red shrink-0"></i>
                <h3>Moderation</h3>
                <div class="line"></div>
            </div>
            <div class="space-y-2">

                <!-- GET /moderation/all -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/moderation/all</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Paginated case browser with optional filters</span>
                        <span class="auth-mod px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">MOD+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-5">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">Query Params</p>
                                <table class="param-table">
                                    <thead><tr><th>Param</th><th>Type</th><th>Default</th><th>Notes</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">type</td><td class="param-type">string</td><td class="param-opt">\u2014</td><td class="param-desc">WARN \xB7 KICK \xB7 BAN \xB7 PERMBAN</td></tr>
                                        <tr><td class="param-name">search</td><td class="param-type">string</td><td class="param-opt">\u2014</td><td class="param-desc">Partial match on target_username</td></tr>
                                        <tr><td class="param-name">limit</td><td class="param-type">integer</td><td class="param-opt">50</td><td class="param-desc">Max 100</td></tr>
                                        <tr><td class="param-name">offset</td><td class="param-type">integer</td><td class="param-opt">0</td><td class="param-desc">For pagination</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{
  "cases": [
    {
      "id": 1,
      "incident_id": "INC-0042",
      "target_roblox_id": "123456789",
      "target_username": "Player1",
      "type": "BAN",
      "reason": "Mass RDM",
      "duration_days": 7,
      "moderator_id": 1,
      "moderator_username": "Zane",
      "created_at": "2026-04-08T12:00:00.000Z"
    }
  ],
  "total": 1250,
  "limit": 50,
  "offset": 0
}</code></pre>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- GET /moderation/cases/:playerId -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/moderation/cases/<span class="text-tac-amber">:playerId</span></code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">All cases for a specific Roblox user ID</span>
                        <span class="auth-mod px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">MOD+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">URL Params</p>
                                <table class="param-table">
                                    <thead><tr><th>Param</th><th>Type</th><th>Notes</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">playerId</td><td class="param-type">string</td><td class="param-desc">Numeric Roblox user ID</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{ "cases": [ { ... } ] }</code></pre>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- POST /moderation/cases -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-post px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">POST</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/moderation/cases</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Create a new moderation case</span>
                        <span class="auth-mod px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">MOD+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">Request Body (JSON)</p>
                                <table class="param-table">
                                    <thead><tr><th>Field</th><th>Type</th><th>Req</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">targetRobloxId</td><td class="param-type">string</td><td class="param-req">YES</td></tr>
                                        <tr><td class="param-name">targetUsername</td><td class="param-type">string</td><td class="param-req">YES</td></tr>
                                        <tr><td class="param-name">type</td><td class="param-type">string</td><td class="param-req">YES</td></tr>
                                        <tr><td class="param-name">reason</td><td class="param-type">string</td><td class="param-req">YES</td></tr>
                                        <tr><td class="param-name">evidence</td><td class="param-type">string[]</td><td class="param-opt">opt</td></tr>
                                        <tr><td class="param-name">notes</td><td class="param-type">string</td><td class="param-opt">opt</td></tr>
                                        <tr><td class="param-name">durationDays</td><td class="param-type">integer</td><td class="param-opt">opt</td></tr>
                                    </tbody>
                                </table>
                                <p class="font-mono text-[9px] text-tac-muted mt-2">type: <span class="text-white">WARN \xB7 KICK \xB7 BAN \xB7 PERMBAN</span></p>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 201</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{
  "case": {
    "id": 1,
    "incident_id": "INC-0042",
    "type": "BAN",
    "target_username": "Player1",
    "reason": "Mass RDM",
    "created_at": "2026-04-08T12:00:00.000Z"
  }
}</code></pre>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- PATCH /moderation/cases/:caseId -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-patch px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">PATCH</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/moderation/cases/<span class="text-tac-amber">:caseId</span></code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Update notes or evidence on an existing case</span>
                        <span class="auth-mod px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">MOD+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">Request Body (JSON)</p>
                                <table class="param-table">
                                    <thead><tr><th>Field</th><th>Type</th><th>Req</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">notes</td><td class="param-type">string</td><td class="param-opt">opt</td></tr>
                                        <tr><td class="param-name">evidence</td><td class="param-type">string[]</td><td class="param-opt">opt</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{ "success": true }</code></pre>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </section>

        <!-- \u2550\u2550 SHIFTS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->
        <section id="shifts" class="mb-12 scroll-mt-20">
            <div class="section-divider">
                <i data-lucide="clock" class="w-4 h-4 text-tac-green shrink-0"></i>
                <h3>Shifts</h3>
                <div class="line"></div>
            </div>
            <div class="space-y-2">

                <!-- POST /shifts/start -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-post px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">POST</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/shifts/start</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Begin a new shift \u2014 fails if one is already active</span>
                        <span class="auth-mod px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">MOD+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="flex items-center justify-between mb-1.5">
                            <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 201</p>
                            <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                        </div>
                        <pre class="text-tac-green"><code>{
  "shift": {
    "id": 1234,
    "user_id": 1,
    "status": "ACTIVE",
    "start_time": "2026-04-08T12:00:00.000Z"
  }
}</code></pre>
                    </div>
                </div>

                <!-- POST /shifts/end -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-post px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">POST</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/shifts/end</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">End the active shift and record metrics</span>
                        <span class="auth-mod px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">MOD+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">Request Body (JSON) \u2014 all optional</p>
                                <table class="param-table">
                                    <thead><tr><th>Field</th><th>Type</th><th>Default</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">cases_count</td><td class="param-type">integer</td><td class="param-opt">0</td></tr>
                                        <tr><td class="param-name">bans_count</td><td class="param-type">integer</td><td class="param-opt">0</td></tr>
                                        <tr><td class="param-name">warns_count</td><td class="param-type">integer</td><td class="param-opt">0</td></tr>
                                        <tr><td class="param-name">kicks_count</td><td class="param-type">integer</td><td class="param-opt">0</td></tr>
                                        <tr><td class="param-name">notes</td><td class="param-type">string</td><td class="param-opt">null</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{
  "shift": {
    "id": 1234,
    "status": "ENDED",
    "duration_seconds": 3600,
    "cases_count": 5,
    "bans_count": 1,
    "end_time": "2026-04-08T13:00:00.000Z"
  }
}</code></pre>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- GET /shifts/active -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/shifts/active</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Current active shift for the calling user</span>
                        <span class="auth-user px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Any Auth</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="flex items-center justify-between mb-1.5">
                            <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                            <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                        </div>
                        <pre class="text-tac-green"><code>{
  "shift": {
    "id": 1234,
    "status": "ACTIVE",
    "start_time": "2026-04-08T12:00:00.000Z"
  }
}

// shift is null when no active shift</code></pre>
                    </div>
                </div>

                <!-- GET /shifts/analytics -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/shifts/analytics</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Team-wide shift analytics (all staff)</span>
                        <span class="auth-admin px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">ADMIN+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="flex items-center justify-between mb-1.5">
                            <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                            <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                        </div>
                        <pre class="text-tac-green"><code>{
  "analytics": [
    {
      "user_id": 1,
      "username": "Zane",
      "total_shifts": 42,
      "total_seconds": 151200,
      "avg_duration": 3600
    }
  ]
}</code></pre>
                    </div>
                </div>

            </div>
        </section>

        <!-- \u2550\u2550 ROBLOX PROXY \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->
        <section id="roblox" class="mb-12 scroll-mt-20">
            <div class="section-divider">
                <i data-lucide="database" class="w-4 h-4 text-tac-blue shrink-0"></i>
                <h3>Roblox Proxy</h3>
                <div class="line"></div>
            </div>
            <div class="note mb-4">All routes in this section proxy to the Roblox public API. The Worker adds the required <code>User-Agent</code> header. Returns 502 if Roblox is unreachable.</div>
            <div class="space-y-2">

                <!-- GET /roblox/player/:identifier -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/roblox/player/<span class="text-tac-amber">:identifier</span></code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Player profile + headshot (username or numeric ID)</span>
                        <span class="auth-user px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Any Auth</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">URL Params</p>
                                <table class="param-table">
                                    <thead><tr><th>Param</th><th>Notes</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">identifier</td><td class="param-desc">Numeric Roblox ID <em>or</em> exact username. If numeric, skips username resolution.</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{
  "id": 1234567,
  "username": "Zane",
  "displayName": "Zane",
  "description": "Bio text here...",
  "created": "2017-03-12T00:00:00.000Z",
  "isBanned": false,
  "avatarUrl": "https://tr.rbxcdn.com/...",
  "profileUrl": "https://www.roblox.com/users/1234567/profile"
}</code></pre>
                            </div>
                        </div>
                        <div class="try-panel">
                            <div class="try-panel-header">
                                <span>Try it</span>
                                <input class="try-input" placeholder="Username or Roblox ID..." />
                                <span class="try-label" style="margin-left:auto"></span>
                                <button class="try-run" data-path="/roblox/player/{v}" data-method="GET" onclick="tryIt(this)">Run</button>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

                <!-- GET /roblox/group/roles -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/roblox/group/roles</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">All roles defined in group 34246821</span>
                        <span class="auth-user px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Any Auth</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="flex items-center justify-between mb-1.5">
                            <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200 (Roblox passthrough)</p>
                            <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                        </div>
                        <pre class="text-tac-green"><code>{
  "groupId": 34246821,
  "roles": [
    { "id": 100, "name": "Guest",  "rank": 1,   "memberCount": 0 },
    { "id": 200, "name": "Member", "rank": 50,  "memberCount": 120 },
    { "id": 300, "name": "Admin",  "rank": 200, "memberCount": 5 }
  ]
}</code></pre>
                    </div>
                </div>

                <!-- GET /roblox/group/roles/:roleId/users -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/roblox/group/roles/<span class="text-tac-amber">:roleId</span>/users</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Members of a role with headshot thumbnails</span>
                        <span class="auth-user px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Any Auth</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">URL Params</p>
                                <table class="param-table">
                                    <thead><tr><th>Param</th><th>Notes</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">roleId</td><td class="param-desc">Roblox group role ID (from /roblox/group/roles)</td></tr>
                                    </tbody>
                                </table>
                                <p class="font-mono text-[9px] text-tac-muted mt-3">Returns up to 100 members. Thumbnails resolved in a single batch call. <code>avatarUrl</code> may be null if the CDN hasn't processed the image yet.</p>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{
  "data": [
    {
      "userId": 1234567,
      "username": "Zane",
      "displayName": "Zane",
      "avatarUrl": "https://tr.rbxcdn.com/..."
    }
  ]
}</code></pre>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- GET /roblox/servers -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/roblox/servers</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Live server list for the configured Place ID</span>
                        <span class="auth-user px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">Any Auth</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20">
                        <div class="flex items-center justify-between mb-1.5">
                            <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                            <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                        </div>
                        <pre class="text-tac-green"><code>{
  "servers": [
    {
      "index": 1,
      "jobId": "guid-string",
      "players": 12,
      "maxPlayers": 50,
      "ping": 42,
      "fps": 60
    }
  ],
  "totalPlayers": 12,
  "serverCount": 1
}</code></pre>
                        <div class="try-panel">
                            <div class="try-panel-header">
                                <span>Try it</span>
                                <span class="try-label" style="margin-left:auto"></span>
                                <button class="try-run" data-path="/roblox/servers" data-method="GET" onclick="tryIt(this)">Run</button>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

            </div>
        </section>

        <!-- \u2550\u2550 OPEN CLOUD \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->
        <section id="cloud" class="mb-12 scroll-mt-20">
            <div class="section-divider">
                <i data-lucide="cloud" class="w-4 h-4 text-purple-400 shrink-0"></i>
                <h3>Open Cloud</h3>
                <div class="line"></div>
            </div>
            <div class="note-warn note mb-4">These routes communicate directly with Roblox Open Cloud and in-game servers via MessagingService. Actions are irreversible and logged to the audit trail.</div>
            <div class="space-y-2">

                <!-- POST /cloud/kick -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-post px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">POST</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/cloud/kick</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Publish KICK signal via MessagingService to all servers</span>
                        <span class="auth-mod px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">MOD+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">Request Body (JSON)</p>
                                <table class="param-table">
                                    <thead><tr><th>Field</th><th>Type</th><th>Req</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">targetRobloxId</td><td class="param-type">number</td><td class="param-req">YES</td></tr>
                                        <tr><td class="param-name">targetUsername</td><td class="param-type">string</td><td class="param-opt">opt</td></tr>
                                        <tr><td class="param-name">reason</td><td class="param-type">string</td><td class="param-req">YES</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{
  "success": true,
  "message": "Kick-Signal f\xFCr Player1 gesendet."
}</code></pre>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- POST /cloud/ban -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-post px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">POST</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/cloud/ban</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Native universe ban via Roblox Open Cloud + kick signal</span>
                        <span class="auth-mod px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">MOD+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">Request Body (JSON)</p>
                                <table class="param-table">
                                    <thead><tr><th>Field</th><th>Type</th><th>Req</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">targetRobloxId</td><td class="param-type">number</td><td class="param-req">YES</td></tr>
                                        <tr><td class="param-name">targetUsername</td><td class="param-type">string</td><td class="param-opt">opt</td></tr>
                                        <tr><td class="param-name">reason</td><td class="param-type">string</td><td class="param-req">YES</td></tr>
                                        <tr><td class="param-name">displayReason</td><td class="param-type">string</td><td class="param-opt">opt</td><td class="param-desc">Shown to the player. Defaults to reason.</td></tr>
                                        <tr><td class="param-name">durationDays</td><td class="param-type">integer</td><td class="param-opt">opt</td><td class="param-desc">null = permanent ban</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{
  "success": true,
  "message": "Player1 wurde gesperrt."
}</code></pre>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- POST /cloud/unban -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-post px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">POST</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/cloud/unban</code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Remove a native universe ban via Open Cloud</span>
                        <span class="auth-admin px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">ADMIN+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">Request Body (JSON)</p>
                                <table class="param-table">
                                    <thead><tr><th>Field</th><th>Type</th><th>Req</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">targetRobloxId</td><td class="param-type">number</td><td class="param-req">YES</td></tr>
                                        <tr><td class="param-name">targetUsername</td><td class="param-type">string</td><td class="param-opt">opt</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{
  "success": true,
  "message": "Player1 wurde entsperrt."
}</code></pre>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- GET /cloud/restriction/:userId -->
                <div class="ep">
                    <div class="ep-header p-4 flex flex-wrap items-center gap-2.5" onclick="toggle(this.parentElement)">
                        <span class="m-get px-2.5 py-0.5 font-mono text-[10px] font-bold border uppercase tracking-wider">GET</span>
                        <code class="font-mono text-[13px] font-semibold text-white">/cloud/restriction/<span class="text-tac-amber">:userId</span></code>
                        <span class="font-mono text-[10px] text-tac-muted flex-1 min-w-0 truncate">Query current ban/restriction state from Open Cloud</span>
                        <span class="auth-mod px-2 py-0.5 text-[9px] font-mono border uppercase tracking-wider">MOD+</span>
                        <i data-lucide="chevron-down" class="ep-chevron w-4 h-4 text-tac-muted shrink-0"></i>
                    </div>
                    <div class="ep-body px-6 py-5 bg-black/20 space-y-4">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest mb-2">URL Params</p>
                                <table class="param-table">
                                    <thead><tr><th>Param</th><th>Notes</th></tr></thead>
                                    <tbody>
                                        <tr><td class="param-name">userId</td><td class="param-desc">Numeric Roblox user ID</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="font-mono text-[9px] text-tac-muted uppercase tracking-widest">Response 200 (Roblox passthrough)</p>
                                    <button class="copy-btn font-mono text-[9px] text-tac-muted hover:text-white uppercase transition-colors">Copy</button>
                                </div>
                                <pre class="text-tac-green"><code>{
  "path": "universes/6003245325/user-restrictions/123456",
  "gameJoinRestriction": {
    "active": true,
    "startTime": "2026-04-01T00:00:00Z",
    "duration": "P7D",
    "privateReason": "Mass RDM",
    "displayReason": "Rule violation"
  }
}</code></pre>
                            </div>
                        </div>
                        <div class="try-panel">
                            <div class="try-panel-header">
                                <span>Try it</span>
                                <input class="try-input" placeholder="Roblox User ID (numeric)..." />
                                <span class="try-label" style="margin-left:auto"></span>
                                <button class="try-run" data-path="/cloud/restriction/{v}" data-method="GET" onclick="tryIt(this)">Run</button>
                            </div>
                            <div class="try-output"><pre></pre></div>
                        </div>
                    </div>
                </div>

            </div>
        </section>

    </div><!-- /content -->

    <footer class="border-t border-tac-border px-10 py-8 flex flex-col md:flex-row items-center justify-between gap-4 bg-tac-panel/30">
        <div class="font-mono text-[10px] text-tac-muted">
            <span class="text-white font-semibold">BWRP STAFF PANEL</span> \xB7 Cloudflare Workers \xB7 D1 \xB7 Roblox OAuth 2.0
        </div>
        <div class="font-mono text-[10px] text-tac-muted tabular-nums">25 ENDPOINTS \xB7 &copy; 2026 ATLANTIC COMMAND</div>
    </footer>

</main><!-- /main -->

<script>
    lucide.createIcons();

    // Clock
    (function tick() {
        const el = document.getElementById('clock');
        if (el) el.textContent = new Date().toISOString().replace('T',' ').slice(0,19) + ' UTC';
        setTimeout(tick, 1000);
    })();

    // Toggle endpoint open/close
    function toggle(card) {
        card.classList.toggle('open');
    }

    // Copy button \u2014 finds the nearest <pre> inside the same ep-body
    document.addEventListener('click', async function(e) {
        const btn = e.target.closest('.copy-btn');
        if (!btn) return;
        const body = btn.closest('.ep-body');
        if (!body) return;
        const pre = body.querySelector('pre');
        if (!pre) return;
        const code = pre.querySelector('code')?.innerText ?? pre.innerText;
        try {
            await navigator.clipboard.writeText(code.trim());
            const orig = btn.textContent;
            btn.textContent = 'COPIED!';
            btn.classList.add('text-tac-green');
            setTimeout(() => { btn.textContent = orig; btn.classList.remove('text-tac-green'); }, 2000);
        } catch {}
    });

    // Mobile sidebar
    document.getElementById('mob-toggle')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.toggle('-translate-x-full');
    });
    document.querySelectorAll('.nav-link').forEach(a => {
        a.addEventListener('click', () => {
            if (window.innerWidth < 768) document.getElementById('sidebar')?.classList.add('-translate-x-full');
        });
    });

    // \u2500\u2500 Try-it panel logic \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    const API = 'https://bwrp.net/api';

    async function tryIt(btn) {
        const panel     = btn.closest('.try-panel');
        const output    = panel.querySelector('.try-output');
        const statusEl  = panel.querySelector('.try-label');
        const pathInput = panel.querySelector('.try-input');
        const template  = btn.dataset.path;   // e.g. '/staff/me' or '/roblox/player/{v}'
        const method    = btn.dataset.method || 'GET';
        const val       = pathInput ? pathInput.value.trim() : '';

        if (pathInput && !val) {
            showTryResult(output, statusEl, 0, { error: 'Pflichtfeld fehlt' });
            return;
        }

        const path = template.includes('{v}') ? template.replace('{v}', encodeURIComponent(val)) : template;

        btn.disabled = true;
        btn.textContent = '...';
        try {
            const res = await fetch(API + path, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' } });
            let body;
            try { body = await res.json(); } catch { body = { raw: await res.text() }; }
            showTryResult(output, statusEl, res.status, body);
        } catch (e) {
            showTryResult(output, statusEl, 0, { error: 'Netzwerkfehler: ' + e.message });
        } finally {
            btn.disabled = false;
            btn.textContent = 'Run';
        }
    }

    function showTryResult(output, statusEl, status, body) {
        if (statusEl) {
            statusEl.textContent = status ? 'HTTP ' + status : 'ERROR';
            statusEl.className = (status >= 200 && status < 300) ? 'try-status-ok try-label' : 'try-status-err try-label';
        }
        output.style.display = 'block';
        const pre = output.querySelector('pre');
        if (pre) pre.textContent = JSON.stringify(body, null, 2);
    }

    // Enter key in try-it inputs
    document.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        const input = e.target.closest('.try-input');
        if (!input) return;
        const btn = input.closest('.try-panel-header')?.querySelector('.try-run');
        if (btn) btn.click();
    });

    // Scroll spy
    const spy = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                const id = e.target.getAttribute('id');
                document.querySelectorAll('.nav-link').forEach(a => {
                    a.classList.toggle('active', a.getAttribute('href') === '#' + id);
                });
            }
        });
    }, { rootMargin: '-20% 0px -70% 0px' });
    document.querySelectorAll('section[id]').forEach(s => spy.observe(s));
<\/script>
</body>
</html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
__name(renderDocs, "renderDocs");

// src/index.ts
function route(method, path, handler, isPublic = false) {
  const keys = [];
  const pattern = new RegExp(
    "^" + path.replace(/:([^/]+)/g, (_, k) => {
      keys.push(k);
      return "([^/]+)";
    }) + "$"
  );
  return { method, pattern, keys, handler, public: isPublic };
}
__name(route, "route");
var ROUTES = [
  // ── Public ──────────────────────────────────────────────────────────────
  route("GET", "/api/docs", (_req, env2) => renderDocs(env2), true),
  route("POST", "/api/auth/login", AuthController.login, true),
  route("POST", "/api/auth/refresh", AuthController.refresh, true),
  route("POST", "/api/auth/logout", AuthController.logout, true),
  // ── Staff ────────────────────────────────────────────────────────────────
  route("GET", "/api/staff/me", StaffController.me),
  route("GET", "/api/staff/sessions", StaffController.sessions),
  route("GET", "/api/staff/roster", StaffController.roster),
  route("GET", "/api/staff/status", StaffController.status),
  route("GET", "/api/staff/activity", StaffController.activity),
  route("GET", "/api/staff/stats", StaffController.stats),
  // ── Watchlist ────────────────────────────────────────────────────────────
  route("GET", "/api/watchlist", WatchlistController.getAll),
  route("GET", "/api/watchlist/check/:robloxId", WatchlistController.check),
  route("POST", "/api/watchlist", WatchlistController.add),
  route("DELETE", "/api/watchlist/:id", WatchlistController.remove),
  // ── Moderation ───────────────────────────────────────────────────────────
  route("GET", "/api/moderation/all", ModerationController.getAllCases),
  route("GET", "/api/moderation/cases/:playerId", ModerationController.getCases),
  route("POST", "/api/moderation/cases", ModerationController.createCase),
  route("PATCH", "/api/moderation/cases/:caseId", ModerationController.updateCase),
  // ── Shifts ───────────────────────────────────────────────────────────────
  route("POST", "/api/shifts/start", ShiftController.start),
  route("POST", "/api/shifts/end", ShiftController.end),
  route("GET", "/api/shifts/active", ShiftController.active),
  route("GET", "/api/shifts/analytics", ShiftController.analytics),
  route("GET", "/api/shifts/all", ShiftController.all),
  // ── Roblox Proxy ─────────────────────────────────────────────────────────
  route("GET", "/api/roblox/player/:identifier", RobloxController.getPlayer),
  route("GET", "/api/roblox/servers", RobloxController.getServers),
  route("GET", "/api/roblox/group/roles", RobloxController.getGroupRoles),
  route("GET", "/api/roblox/group/roles/:roleId/users", RobloxController.getGroupRoleUsers),
  // ── Roblox Open Cloud ─────────────────────────────────────────────────────
  route("POST", "/api/cloud/kick", CloudController.kick),
  route("POST", "/api/cloud/ban", CloudController.ban),
  route("POST", "/api/cloud/unban", CloudController.unban),
  route("GET", "/api/cloud/restriction/:userId", CloudController.getRestriction),
  // ── Team Management (ADMIN+) ──────────────────────────────────────────────
  route("GET", "/api/mgmt/users", ManagementController.listStaff),
  route("PATCH", "/api/mgmt/users/:id/hwid-reset", ManagementController.resetHwid),
  route("PATCH", "/api/mgmt/users/:id/role", ManagementController.updateRole),
  // ── Database Management (OWNER only) ──────────────────────────────────────
  route("GET", "/api/db/stats", DatabaseController.stats),
  route("GET", "/api/db/users", DatabaseController.listUsers),
  route("PATCH", "/api/db/users/:id", DatabaseController.updateUser),
  route("DELETE", "/api/db/users/:id", DatabaseController.deleteUser),
  route("GET", "/api/db/cases", DatabaseController.listCases),
  route("PATCH", "/api/db/cases/:id", DatabaseController.updateCase),
  route("DELETE", "/api/db/cases/:id", DatabaseController.deleteCase),
  route("GET", "/api/db/sessions", DatabaseController.listSessions),
  route("DELETE", "/api/db/sessions/:id", DatabaseController.deleteSession),
  route("GET", "/api/db/audit-logs", DatabaseController.listAuditLogs),
  route("GET", "/api/db/server-status", DatabaseController.listServerStatus),
  route("PATCH", "/api/db/server-status/:service", DatabaseController.updateServerStatus),
  route("DELETE", "/api/db/rate-limits", DatabaseController.clearRateLimits)
];
var src_default = {
  async fetch(request, env2, ctx) {
    const origin = env2.ALLOWED_ORIGIN ?? "https://bwrp.net";
    const url = new URL(request.url);
    if (request.method === "OPTIONS")
      return handleOptions(origin);
    if (!url.pathname.startsWith("/api/")) {
      return new Response("Not Found", { status: 404 });
    }
    const ip = getIP(request);
    if (url.pathname === "/api/auth/login" || url.pathname === "/api/auth/refresh") {
      const limited = await checkRateLimit(env2, ip, "auth", 10, 60);
      if (limited)
        return limited;
    }
    if (url.pathname.startsWith("/api/cloud/") && request.method !== "GET") {
      const limited = await checkRateLimit(env2, ip, "cloud", 30, 60);
      if (limited)
        return limited;
    }
    if (url.pathname.startsWith("/api/roblox/")) {
      const limited = await checkRateLimit(env2, ip, "roblox", 60, 60);
      if (limited)
        return limited;
    }
    for (const r of ROUTES) {
      if (r.method !== request.method)
        continue;
      const match = url.pathname.match(r.pattern);
      if (!match)
        continue;
      const params = {};
      r.keys.forEach((k, i) => {
        params[k] = match[i + 1];
      });
      if (r.public) {
        return r.handler(request, env2);
      }
      const auth = await requireAuth(request, env2);
      if (auth instanceof Response)
        return auth;
      try {
        return await r.handler(request, env2, auth, params);
      } catch (e) {
        console.error("Route error:", e);
        return err("Interner Server-Fehler: " + e.message, 500, origin);
      }
    }
    return err("Route nicht gefunden", 404, origin);
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var drainBody = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } catch (e) {
    const error3 = reduceError(e);
    return Response.json(error3, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-nx862E/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env2, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env2, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env2, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env2, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-nx862E/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env2, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env2, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env2, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env2, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env2, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env2, ctx) => {
      this.env = env2;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
