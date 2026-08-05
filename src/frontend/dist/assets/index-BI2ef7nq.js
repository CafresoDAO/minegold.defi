var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var __privateWrapper = (obj, member, setter, getter) => ({
  set _(value) {
    __privateSet(obj, member, value, setter);
  },
  get _() {
    return __privateGet(obj, member, getter);
  }
});
var _options, _status, _HeartbeatClient_instances, establish_fn, maintain_fn, receiveStatusResponse_fn, sendStatusRequest_fn, _options2, _HeartbeatServer_instances, establish_fn2, maintain_fn2, receiveStatusRequest_fn, sendStatusResponse_fn, _options3, _closeListeners, _options4, _closed, _pendingQueue, _flow, _closeListeners2, _responseListeners, _closed2, _options5, _results, _index, _navigated, _createdAt, _url, _asyncSlots, _requestKeys, _buffer, _inFlight, _flushTimer, _UrlFlow_instances, scheduleFlush_fn, flush_fn, navigate_fn, persist_fn, _flow2;
const isJsonRpcRequest = (message) => typeof message === "object" && message !== null && message.jsonrpc === "2.0" && typeof message.method === "string";
const isJsonRpcResponse = (message) => typeof message === "object" && message !== null && message.jsonrpc === "2.0" && "id" in message && (typeof message.id === "string" || typeof message.id === "number");
class HeartbeatClient {
  constructor(options) {
    __privateAdd(this, _HeartbeatClient_instances);
    __privateAdd(this, _options);
    __privateAdd(this, _status);
    __privateSet(this, _options, {
      establishTimeout: 1e4,
      pendingTimeout: 3e5,
      disconnectTimeout: 5e3,
      statusPollingRate: 300,
      window: globalThis.window,
      crypto: globalThis.crypto,
      ...options
    });
    __privateMethod(this, _HeartbeatClient_instances, establish_fn).call(this);
  }
}
_options = new WeakMap();
_status = new WeakMap();
_HeartbeatClient_instances = new WeakSet();
establish_fn = function() {
  let pending = [];
  const create = () => {
    const id = __privateGet(this, _options).crypto.randomUUID();
    pending.push(id);
    return id;
  };
  const listener = __privateMethod(this, _HeartbeatClient_instances, receiveStatusResponse_fn).call(this, (response) => {
    if ("result" in response.data && response.data.id !== null && pending.includes(response.data.id)) {
      pending = [];
      listener();
      clearInterval(interval);
      clearTimeout(timeout);
      __privateSet(this, _status, response.data.result);
      __privateGet(this, _options).onEstablish(response.origin, response.data.result);
      __privateMethod(this, _HeartbeatClient_instances, maintain_fn).call(this, response.origin, response.data.result);
    }
  });
  const timeout = setTimeout(() => {
    listener();
    clearInterval(interval);
    __privateGet(this, _options).onEstablishTimeout();
  }, __privateGet(this, _options).establishTimeout);
  const interval = setInterval(() => __privateMethod(this, _HeartbeatClient_instances, sendStatusRequest_fn).call(this, create()), __privateGet(this, _options).statusPollingRate);
};
maintain_fn = function(origin, status) {
  let timeout;
  let pending = [];
  const consume = (id) => {
    const index = pending.findIndex((entry) => entry.id === id);
    if (index > -1) {
      pending.splice(index, 1);
    }
    return index > -1;
  };
  const create = () => {
    const id = __privateGet(this, _options).crypto.randomUUID();
    const time = Date.now();
    pending = pending.filter((entry) => time - __privateGet(this, _options).disconnectTimeout > entry.time);
    pending.push({ id, time });
    return id;
  };
  const resetTimeout = (status2) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      listener();
      __privateGet(this, _options).onDisconnect();
    }, status2 === "pending" ? __privateGet(this, _options).pendingTimeout : __privateGet(this, _options).disconnectTimeout);
  };
  const listener = __privateMethod(this, _HeartbeatClient_instances, receiveStatusResponse_fn).call(this, (response) => {
    if ("result" in response.data && response.data.id !== null && response.origin === origin && consume(response.data.id)) {
      resetTimeout(response.data.result);
      if (__privateGet(this, _status) !== response.data.result) {
        __privateSet(this, _status, response.data.result);
        __privateGet(this, _options).onStatusChange(response.data.result);
      }
    }
    setTimeout(() => __privateMethod(this, _HeartbeatClient_instances, sendStatusRequest_fn).call(this, create()), __privateGet(this, _options).statusPollingRate);
  });
  resetTimeout(status);
  __privateMethod(this, _HeartbeatClient_instances, sendStatusRequest_fn).call(this, create());
};
receiveStatusResponse_fn = function(handler) {
  const listener = (event) => {
    if (event.source === __privateGet(this, _options).signerWindow && isJsonRpcResponse(event.data) && "result" in event.data && (event.data.result === "pending" || event.data.result === "ready")) {
      handler(event);
    }
  };
  __privateGet(this, _options).window.addEventListener("message", listener);
  return () => __privateGet(this, _options).window.removeEventListener("message", listener);
};
sendStatusRequest_fn = function(id) {
  __privateGet(this, _options).signerWindow.postMessage({ jsonrpc: "2.0", id, method: "icrc29_status" }, "*");
};
class HeartbeatServer {
  constructor(options) {
    __privateAdd(this, _HeartbeatServer_instances);
    __privateAdd(this, _options2);
    __privateSet(this, _options2, {
      status: "ready",
      establishTimeout: 1e4,
      disconnectTimeout: 2e3,
      window: globalThis.window,
      ...options,
      allowedOrigin: options.allowedOrigin ?? null
    });
    __privateMethod(this, _HeartbeatServer_instances, establish_fn2).call(this);
  }
  changeStatus(status) {
    __privateGet(this, _options2).status = status;
  }
}
_options2 = new WeakMap();
_HeartbeatServer_instances = new WeakSet();
establish_fn2 = function() {
  const listener = __privateMethod(this, _HeartbeatServer_instances, receiveStatusRequest_fn).call(this, (request) => {
    if (request.source === null || request.data.id === void 0) {
      return;
    }
    listener();
    clearTimeout(timeout);
    __privateGet(this, _options2).onEstablish(request.origin, request.source);
    __privateMethod(this, _HeartbeatServer_instances, sendStatusResponse_fn).call(this, request.data.id, request.origin, request.source);
    __privateMethod(this, _HeartbeatServer_instances, maintain_fn2).call(this, request.origin, request.source);
  });
  if (__privateGet(this, _options2).allowedOrigin !== null && __privateGet(this, _options2).window.opener !== null) {
    __privateMethod(this, _HeartbeatServer_instances, sendStatusResponse_fn).call(this, "wake-up-client", __privateGet(this, _options2).allowedOrigin, __privateGet(this, _options2).window.opener);
  }
  const timeout = setTimeout(() => {
    listener();
    __privateGet(this, _options2).onEstablishTimeout();
  }, __privateGet(this, _options2).establishTimeout);
};
maintain_fn2 = function(origin, source) {
  let timeout;
  const resetTimeout = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      listener();
      __privateGet(this, _options2).onDisconnect();
    }, __privateGet(this, _options2).disconnectTimeout);
  };
  resetTimeout();
  const listener = __privateMethod(this, _HeartbeatServer_instances, receiveStatusRequest_fn).call(this, (request) => {
    if (request.origin === origin && request.source === source && request.data.id !== void 0) {
      resetTimeout();
      __privateMethod(this, _HeartbeatServer_instances, sendStatusResponse_fn).call(this, request.data.id, request.origin, request.source);
    }
  });
};
receiveStatusRequest_fn = function(handler) {
  const listener = (event) => {
    if (!isJsonRpcRequest(event.data) || event.data.method !== "icrc29_status" || __privateGet(this, _options2).allowedOrigin !== null && event.origin !== __privateGet(this, _options2).allowedOrigin) {
      return;
    }
    handler(event);
  };
  __privateGet(this, _options2).window.addEventListener("message", listener);
  return () => __privateGet(this, _options2).window.removeEventListener("message", listener);
};
sendStatusResponse_fn = function(id, origin, source) {
  source.postMessage({ jsonrpc: "2.0", id, result: __privateGet(this, _options2).status }, origin);
};
const NON_CLICK_ESTABLISHMENT_LINK = "https://github.com/slide-computer/signer-js/blob/main/packages/signer-web/README.md#channels-must-be-established-in-a-click-handler";
class PostMessageTransportError extends Error {
}
let withinClick = false;
if (globalThis.window) {
  globalThis.window.addEventListener("click", () => withinClick = true, true);
  globalThis.window.addEventListener("click", () => withinClick = false);
}
class PostMessageTransport {
  constructor(options) {
    __privateAdd(this, _options3);
    const isSecureContext = (() => {
      try {
        const url = new URL(options.url);
        return url.protocol === "https:" || url.hostname === "127.0.0.1" || url.hostname.split(".").slice(-1)[0] === "localhost";
      } catch {
        return false;
      }
    })();
    if (!isSecureContext) {
      throw new PostMessageTransportError("Invalid signer RPC url");
    }
    __privateSet(this, _options3, {
      windowOpenerFeatures: "",
      window: globalThis.window,
      establishTimeout: 12e4,
      pendingTimeout: 3e5,
      disconnectTimeout: 2e3,
      statusPollingRate: 300,
      crypto: globalThis.crypto,
      manageFocus: true,
      closeOnEstablishTimeout: true,
      closeOnPendingTimeout: true,
      detectNonClickEstablishment: true,
      ...options
    });
  }
  /**
   * Opens the signer window and establishes a communication channel
   * via the ICRC-29 heartbeat handshake.
   * @throws {PostMessageTransportError} If called outside a click handler
   *   (when `detectNonClickEstablishment` is enabled), if the window
   *   cannot be opened, or if the handshake times out.
   */
  establishChannel() {
    if (__privateGet(this, _options3).detectNonClickEstablishment && !withinClick) {
      return Promise.reject(new PostMessageTransportError(`Signer window should not be opened outside of click handler, see: ${NON_CLICK_ESTABLISHMENT_LINK}`));
    }
    let signerWindow;
    try {
      const result = __privateGet(this, _options3).window.open(__privateGet(this, _options3).url, `${new URL(__privateGet(this, _options3).url).origin}-signer-window`, __privateGet(this, _options3).windowOpenerFeatures);
      if (!result) {
        return Promise.reject(new PostMessageTransportError("Signer window could not be opened"));
      }
      signerWindow = result;
    } catch (error) {
      return Promise.reject(new PostMessageTransportError(error instanceof Error ? error.message : "Signer window could not be opened"));
    }
    return new Promise((resolve, reject) => {
      let channel;
      new HeartbeatClient({
        ...__privateGet(this, _options3),
        signerWindow,
        onEstablish: (origin, status) => {
          channel = new PostMessageChannel({
            ...__privateGet(this, _options3),
            signerOrigin: origin,
            signerWindow,
            signerStatus: status
          });
          resolve(channel);
        },
        onEstablishTimeout: () => {
          if (__privateGet(this, _options3).closeOnEstablishTimeout) {
            signerWindow.close();
          }
          reject(new PostMessageTransportError("Communication channel could not be established within a reasonable time"));
        },
        onPendingTimeout: () => {
          if (__privateGet(this, _options3).closeOnPendingTimeout) {
            signerWindow.close();
          }
          reject(new PostMessageTransportError("Communication channel was pending for too long"));
        },
        onDisconnect: () => channel.close(),
        onStatusChange: (status) => channel.changeStatus(status)
      });
    });
  }
}
_options3 = new WeakMap();
class PostMessageChannel {
  constructor(options) {
    __privateAdd(this, _closeListeners, /* @__PURE__ */ new Set());
    __privateAdd(this, _options4);
    __privateAdd(this, _closed, false);
    __privateAdd(this, _pendingQueue, []);
    __privateSet(this, _options4, {
      signerStatus: "ready",
      window: globalThis.window,
      manageFocus: true,
      ...options
    });
  }
  /** Whether this channel has been closed. */
  get closed() {
    return __privateGet(this, _closed);
  }
  addEventListener(...[event, listener]) {
    switch (event) {
      case "close":
        __privateGet(this, _closeListeners).add(listener);
        return () => {
          __privateGet(this, _closeListeners).delete(listener);
        };
      case "response": {
        const messageListener = (event2) => {
          if (event2.source !== __privateGet(this, _options4).signerWindow || event2.origin !== __privateGet(this, _options4).signerOrigin || !isJsonRpcResponse(event2.data)) {
            return;
          }
          listener(event2.data);
        };
        __privateGet(this, _options4).window.addEventListener("message", messageListener);
        return () => {
          __privateGet(this, _options4).window.removeEventListener("message", messageListener);
        };
      }
    }
  }
  /**
   * Sends a JSON-RPC request to the signer. If the signer status is
   * `"pending"`, the request is queued until {@link changeStatus} is
   * called with `"ready"`.
   * @param request - The JSON-RPC request to send.
   */
  send(request) {
    if (__privateGet(this, _closed)) {
      return Promise.reject(new PostMessageTransportError("Communication channel is closed"));
    }
    if (__privateGet(this, _options4).signerStatus === "pending") {
      __privateGet(this, _pendingQueue).push(request);
      return Promise.resolve();
    }
    try {
      __privateGet(this, _options4).signerWindow.postMessage(request, __privateGet(this, _options4).signerOrigin);
      if (__privateGet(this, _options4).manageFocus) {
        __privateGet(this, _options4).signerWindow.focus();
      }
    } catch (error) {
      return Promise.reject(error);
    }
    return Promise.resolve();
  }
  /** Closes the signer window and notifies all close listeners. */
  close() {
    if (__privateGet(this, _closed)) {
      return Promise.resolve();
    }
    __privateSet(this, _closed, true);
    __privateGet(this, _options4).signerWindow.close();
    if (__privateGet(this, _options4).manageFocus) {
      __privateGet(this, _options4).window.focus();
    }
    for (const listener of __privateGet(this, _closeListeners)) {
      listener();
    }
    return Promise.resolve();
  }
  /**
   * Updates the signer status. When transitioning to `"ready"`,
   * all queued messages are flushed to the signer window.
   * @param status - The new signer status.
   */
  changeStatus(status) {
    __privateGet(this, _options4).signerStatus = status;
    if (status === "ready") {
      const requests = __privateGet(this, _pendingQueue);
      __privateSet(this, _pendingQueue, []);
      requests.forEach((request) => {
        __privateGet(this, _options4).signerWindow.postMessage(request, __privateGet(this, _options4).signerOrigin);
      });
    }
  }
}
_closeListeners = new WeakMap();
_options4 = new WeakMap();
_closed = new WeakMap();
_pendingQueue = new WeakMap();
const requestKey = (request) => JSON.stringify({ method: request.method, params: request.params ?? null });
class UrlChannel {
  constructor(flow) {
    __privateAdd(this, _flow);
    __privateAdd(this, _closeListeners2, /* @__PURE__ */ new Set());
    __privateAdd(this, _responseListeners, /* @__PURE__ */ new Set());
    __privateAdd(this, _closed2, false);
    __privateSet(this, _flow, flow);
  }
  /** Whether this channel has been closed. */
  get closed() {
    return __privateGet(this, _closed2);
  }
  addEventListener(...[event, listener]) {
    switch (event) {
      case "close":
        __privateGet(this, _closeListeners2).add(listener);
        return () => {
          __privateGet(this, _closeListeners2).delete(listener);
        };
      case "response":
        __privateGet(this, _responseListeners).add(listener);
        return () => {
          __privateGet(this, _responseListeners).delete(listener);
        };
    }
  }
  /**
   * Resolves the request from the journal if the flow has already reached this
   * call, otherwise buffers it for the next redirect.
   * @param request - The JSON-RPC request to send.
   */
  send(request) {
    if (__privateGet(this, _closed2)) {
      return Promise.reject(new Error("Communication channel is closed"));
    }
    if (request.id === void 0 || request.id === null) {
      return Promise.reject(new Error("The URL transport requires a request id; notifications are not supported"));
    }
    const index = __privateGet(this, _flow).next();
    const key = requestKey(request);
    const cached = __privateGet(this, _flow).get(index);
    if (cached !== void 0) {
      if (__privateGet(this, _flow).recordedRequestKey(index) !== key) {
        return Promise.reject(new Error("URL transport replay diverged: the request at this step differs from the one sent before the redirect. Issue the same requests in the same order on every load."));
      }
      const response = { ...cached, id: request.id ?? null };
      queueMicrotask(() => {
        for (const listener of __privateGet(this, _responseListeners)) {
          listener(response);
        }
      });
      return Promise.resolve();
    }
    __privateGet(this, _flow).request(index, request, key);
    return Promise.resolve();
  }
  /** Marks the channel closed and notifies all close listeners. */
  close() {
    if (__privateGet(this, _closed2)) {
      return Promise.resolve();
    }
    __privateSet(this, _closed2, true);
    for (const listener of __privateGet(this, _closeListeners2)) {
      listener();
    }
    return Promise.resolve();
  }
}
_flow = new WeakMap();
_closeListeners2 = new WeakMap();
_responseListeners = new WeakMap();
_closed2 = new WeakMap();
const isLoopbackHost = (hostname) => hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "[::1]" || /^127(?:\.\d{1,3}){3}$/.test(hostname);
const isSecureContextUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" && isLoopbackHost(url.hostname);
  } catch {
    return false;
  }
};
const readStored = (storage, key) => {
  const raw = storage.getItem(key);
  if (raw === null) {
    return { results: {} };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      createdAt: parsed.createdAt,
      url: parsed.url,
      results: parsed.results ?? {},
      asyncSlots: parsed.asyncSlots,
      requestKeys: parsed.requestKeys,
      pending: parsed.pending
    };
  } catch {
    return { results: {} };
  }
};
const parseJson = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return void 0;
  }
};
class UrlFlow {
  constructor(options) {
    __privateAdd(this, _UrlFlow_instances);
    __privateAdd(this, _options5);
    __privateAdd(this, _results);
    __privateAdd(this, _index, 0);
    __privateAdd(this, _navigated, false);
    __privateAdd(this, _createdAt);
    // The redirect target used for navigation. Seeded from the constructor url,
    // but on a signer return replaced by the target persisted on the first load,
    // so a second hop reaches the same signer even when the return-load url is a
    // bare default (see StoredFlow.url).
    __privateAdd(this, _url);
    // Call-order slots whose producer was async, so a replay returns a promise
    // (see StoredFlow.asyncSlots).
    __privateAdd(this, _asyncSlots);
    // Content fingerprint per request slot, for the replay divergence guard
    // (see StoredFlow.requestKeys).
    __privateAdd(this, _requestKeys, {});
    __privateAdd(this, _buffer, []);
    __privateAdd(this, _inFlight, 0);
    __privateAdd(this, _flushTimer);
    __privateSet(this, _options5, options);
    __privateSet(this, _url, options.url);
    __privateSet(this, _asyncSlots, /* @__PURE__ */ new Set());
    const stored = readStored(options.storage, options.storageKey);
    const expired = stored.createdAt !== void 0 && options.now() - stored.createdAt > options.flowTimeout;
    if (expired) {
      options.storage.removeItem(options.storageKey);
    }
    const params = new URLSearchParams(options.location.hash.slice(1));
    const message = params.get("message");
    const state = params.get("state");
    if (message !== null) {
      options.history.replaceState(null, "", options.location.pathname + options.location.search);
    }
    if (!expired && message !== null && stored.pending !== void 0 && state === stored.pending.state) {
      __privateSet(this, _createdAt, stored.createdAt);
      __privateSet(this, _url, stored.url ?? options.url);
      __privateSet(this, _results, { ...stored.results });
      __privateSet(this, _asyncSlots, new Set(stored.asyncSlots));
      __privateSet(this, _requestKeys, { ...stored.requestKeys });
      const parsed = parseJson(message);
      const responses = Array.isArray(parsed) ? parsed : [parsed];
      for (const { index, id } of stored.pending.requests) {
        const match = responses.find((response) => isJsonRpcResponse(response) && response.id === id);
        if (match !== void 0) {
          __privateGet(this, _results)[index] = match;
        }
      }
      __privateMethod(this, _UrlFlow_instances, persist_fn).call(this);
    } else {
      __privateSet(this, _results, {});
    }
  }
  /** Reserves the next call-order slot. */
  next() {
    return __privateWrapper(this, _index)._++;
  }
  /**
   * The stored result for a slot, or `undefined` if it has not completed.
   * @param index - The call-order slot to read.
   */
  get(index) {
    return __privateGet(this, _results)[index];
  }
  /**
   * The content fingerprint recorded for a request slot, or `undefined` if no
   * request was journaled there. Used by the channel's replay divergence guard.
   * @param index - The call-order slot to read.
   */
  recordedRequestKey(index) {
    return __privateGet(this, _requestKeys)[index];
  }
  /**
   * Buffers an uncached request for the next redirect.
   * @param index - The call-order slot reserved for the request.
   * @param request - The JSON-RPC request to send on the next redirect.
   * @param key - Content fingerprint recorded for the divergence guard.
   */
  request(index, request, key) {
    __privateGet(this, _buffer).push({ index, request });
    __privateGet(this, _requestKeys)[index] = key;
    __privateMethod(this, _UrlFlow_instances, scheduleFlush_fn).call(this);
  }
  memoize(produce) {
    const index = this.next();
    const cached = this.get(index);
    if (cached !== void 0) {
      if (__privateGet(this, _requestKeys)[index] !== void 0) {
        throw new Error("URL transport replay diverged: a memoize step is at a slot that held a request before the redirect. Issue the same requests and memoize steps in the same order on every load.");
      }
      return __privateGet(this, _asyncSlots).has(index) ? Promise.resolve(cached) : cached;
    }
    const record = (value, isAsync) => {
      __privateGet(this, _results)[index] = value;
      if (isAsync) {
        __privateGet(this, _asyncSlots).add(index);
      }
      __privateMethod(this, _UrlFlow_instances, persist_fn).call(this);
      return value;
    };
    const release = () => {
      __privateWrapper(this, _inFlight)._--;
      __privateMethod(this, _UrlFlow_instances, scheduleFlush_fn).call(this);
    };
    __privateWrapper(this, _inFlight)._++;
    let produced;
    try {
      produced = produce();
    } catch (error) {
      release();
      throw error;
    }
    if (produced instanceof Promise) {
      return produced.then((value) => record(value, true)).finally(release);
    }
    try {
      return record(produced, false);
    } finally {
      release();
    }
  }
}
_options5 = new WeakMap();
_results = new WeakMap();
_index = new WeakMap();
_navigated = new WeakMap();
_createdAt = new WeakMap();
_url = new WeakMap();
_asyncSlots = new WeakMap();
_requestKeys = new WeakMap();
_buffer = new WeakMap();
_inFlight = new WeakMap();
_flushTimer = new WeakMap();
_UrlFlow_instances = new WeakSet();
scheduleFlush_fn = function() {
  if (__privateGet(this, _flushTimer) !== void 0) {
    clearTimeout(__privateGet(this, _flushTimer));
  }
  __privateSet(this, _flushTimer, setTimeout(() => __privateMethod(this, _UrlFlow_instances, flush_fn).call(this), 0));
};
flush_fn = function() {
  __privateSet(this, _flushTimer, void 0);
  if (__privateGet(this, _inFlight) > 0 || __privateGet(this, _buffer).length === 0) {
    return;
  }
  __privateMethod(this, _UrlFlow_instances, navigate_fn).call(this);
};
navigate_fn = function() {
  if (__privateGet(this, _navigated)) {
    return;
  }
  __privateSet(this, _navigated, true);
  const batch = __privateGet(this, _buffer);
  __privateSet(this, _buffer, []);
  const state = __privateGet(this, _options5).crypto.randomUUID();
  __privateMethod(this, _UrlFlow_instances, persist_fn).call(this, {
    state,
    requests: batch.map(({ index, request }) => ({ index, id: request.id ?? null }))
  });
  const requests = batch.map(({ request }) => request);
  const message = JSON.stringify(requests.length === 1 ? requests[0] : requests);
  const fragment = new URLSearchParams({
    message,
    callback: __privateGet(this, _options5).callbackUrl,
    state
  });
  if (!isSecureContextUrl(__privateGet(this, _url))) {
    throw new Error("Refusing to navigate to a non-secure-context signer URL");
  }
  __privateGet(this, _options5).location.assign(`${__privateGet(this, _url)}#${fragment.toString()}`);
};
persist_fn = function(pending) {
  __privateGet(this, _createdAt) ?? __privateSet(this, _createdAt, __privateGet(this, _options5).now());
  __privateGet(this, _options5).storage.setItem(__privateGet(this, _options5).storageKey, JSON.stringify({
    createdAt: __privateGet(this, _createdAt),
    url: __privateGet(this, _url),
    results: __privateGet(this, _results),
    asyncSlots: [...__privateGet(this, _asyncSlots)],
    requestKeys: __privateGet(this, _requestKeys),
    pending
  }));
};
class UrlTransportError extends Error {
}
class UrlTransport {
  constructor(options) {
    __privateAdd(this, _flow2);
    if (!isSecureContextUrl(options.url)) {
      throw new UrlTransportError("Invalid signer RPC url");
    }
    let callback;
    try {
      callback = new URL(options.callbackUrl);
    } catch {
      throw new UrlTransportError("Invalid callback url");
    }
    if (callback.hash !== "") {
      throw new UrlTransportError("Callback url must not contain a fragment");
    }
    __privateSet(this, _flow2, new UrlFlow({
      url: options.url,
      callbackUrl: options.callbackUrl,
      storage: options.storage ?? globalThis.sessionStorage,
      storageKey: options.storageKey ?? `icrc167:flow:${options.callbackUrl}`,
      flowTimeout: options.flowTimeout ?? 6e5,
      location: options.location ?? globalThis.location,
      history: options.history ?? globalThis.history,
      crypto: options.crypto ?? globalThis.crypto,
      now: options.now ?? (() => Date.now())
    }));
  }
  /** Establishes a channel that drives this transport's shared flow journal. */
  establishChannel() {
    return Promise.resolve(new UrlChannel(__privateGet(this, _flow2)));
  }
  memoize(produce) {
    return __privateGet(this, _flow2).memoize(produce);
  }
}
_flow2 = new WeakMap();
export {
  HeartbeatClient,
  HeartbeatServer,
  PostMessageChannel,
  PostMessageTransport,
  PostMessageTransportError,
  UrlChannel,
  UrlFlow,
  UrlTransport,
  UrlTransportError
};
