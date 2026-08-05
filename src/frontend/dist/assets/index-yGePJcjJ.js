var __defProp = Object.defineProperty;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
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
var _options, _channel, _establishingChannel, _scheduledChannelClosure, _pendingRequestCount, _Signer_instances, rpc_fn, applyTransforms_fn;
import { P as Principal, ac as DelegationChain, ad as Delegation } from "./index-Cnm2qphK.js";
const GENERIC_ERROR = 1e3;
const NETWORK_ERROR = 4e3;
const toBase64 = (bytes) => {
  if ("toBase64" in bytes && typeof bytes.toBase64 === "function") {
    return bytes.toBase64();
  }
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return globalThis.btoa(binary);
};
const fromBase64 = (str) => {
  if ("fromBase64" in Uint8Array && typeof Uint8Array.fromBase64 === "function") {
    return Uint8Array.fromBase64(str);
  }
  const binary = globalThis.atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};
const asRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
const asString = (value) => typeof value === "string" ? value : void 0;
const asArray = (value) => Array.isArray(value) ? value : void 0;
const bytesEqual = (a, b) => a.length === b.length && a.every((byte, index) => byte === b[index]);
const toExpiration = (value) => {
  if (typeof value !== "string" || !/^[0-9]{1,20}$/.test(value)) {
    throw new Error("Invalid delegation expiration");
  }
  const expiration = BigInt(value);
  if (expiration >= 2n ** 64n) {
    throw new Error("Invalid delegation expiration");
  }
  return expiration;
};
const assertLeafKey = (delegations, publicKey) => {
  var _a;
  const leaf = (_a = delegations[delegations.length - 1]) == null ? void 0 : _a.delegation.pubkey;
  if (leaf !== void 0 && bytesEqual(new Uint8Array(leaf), new Uint8Array(publicKey.toDer()))) {
    return;
  }
  throw new Error("Returned delegation chain does not terminate at the requested public key");
};
const assertTargetScope = (delegations, targets) => {
  if (targets === void 0) {
    return;
  }
  const requested = new Set(targets.map((target) => target.toText()));
  const scopedHops = delegations.map(({ delegation }) => delegation.targets).filter((hopTargets) => hopTargets !== void 0);
  if (scopedHops.length === 0) {
    throw new Error("Returned delegation is unscoped but scoped targets were requested");
  }
  let effective;
  for (const hop of scopedHops) {
    const hopSet = new Set(hop.map((target) => target.toText()));
    effective = effective === void 0 ? hopSet : new Set([...effective].filter((target) => hopSet.has(target)));
  }
  for (const target of effective ?? []) {
    if (!requested.has(target)) {
      throw new Error("Returned delegation targets are broader than requested");
    }
  }
};
const assertLifetime = (delegations, maxTimeToLive) => {
  const first = delegations[0];
  if (maxTimeToLive === void 0 || first === void 0) {
    return;
  }
  const delegationChainExpiration = delegations.reduce((earliestExpiration, { delegation }) => delegation.expiration < earliestExpiration ? delegation.expiration : earliestExpiration, first.delegation.expiration);
  const skewNs = 5n * 60n * 1000000000n;
  const maxExpiration = BigInt(Date.now()) * 1000000n + maxTimeToLive + skewNs;
  if (delegationChainExpiration > maxExpiration) {
    throw new Error("Returned delegation expires later than the requested maxTimeToLive");
  }
};
const validateDelegationChain = (chain, params) => {
  assertLeafKey(chain.delegations, params.publicKey);
  assertTargetScope(chain.delegations, params.targets);
  assertLifetime(chain.delegations, params.maxTimeToLive);
};
const jsonCleanTransform = (request) => JSON.parse(JSON.stringify(request));
const icrc95DerivationOriginTransform = (derivationOrigin) => {
  return (request) => ({
    ...request,
    params: {
      ...request.params,
      icrc95DerivationOrigin: derivationOrigin
    }
  });
};
class SignerError extends Error {
  constructor(error, options) {
    super(error.message, options);
    /** The JSON-RPC error code. */
    __publicField(this, "code");
    /** Optional additional error data from the signer. */
    __publicField(this, "data");
    this.code = error.code;
    this.data = error.data;
  }
}
class Signer {
  constructor(options) {
    __privateAdd(this, _Signer_instances);
    __privateAdd(this, _options);
    __privateAdd(this, _channel);
    __privateAdd(this, _establishingChannel);
    __privateAdd(this, _scheduledChannelClosure);
    __privateAdd(this, _pendingRequestCount, 0);
    const transforms = [...options.transforms ?? []];
    if (options.derivationOrigin) {
      transforms.push(icrc95DerivationOriginTransform(options.derivationOrigin));
    }
    transforms.push(jsonCleanTransform);
    __privateSet(this, _options, {
      autoCloseTransportChannel: true,
      closeTransportChannelAfter: 200,
      crypto: globalThis.crypto,
      ...options,
      transforms
    });
  }
  /** The transport used to communicate with the signer. */
  get transport() {
    return __privateGet(this, _options).transport;
  }
  /**
   * Whether the transport channel auto-closes after a response is received.
   * Can be toggled at runtime, which is useful for multi-step flows that
   * need to await async work between requests without losing the channel.
   * Setting this to `false` also cancels any auto-close already scheduled
   * by a prior response.
   */
  get autoCloseTransportChannel() {
    return __privateGet(this, _options).autoCloseTransportChannel;
  }
  set autoCloseTransportChannel(value) {
    __privateGet(this, _options).autoCloseTransportChannel = value;
    if (!value) {
      clearTimeout(__privateGet(this, _scheduledChannelClosure));
    }
  }
  /**
   * Opens a communication channel with the signer.
   * Reuses an existing open channel if available.
   */
  async openChannel() {
    clearTimeout(__privateGet(this, _scheduledChannelClosure));
    if (__privateGet(this, _establishingChannel)) {
      await __privateGet(this, _establishingChannel);
    }
    if (__privateGet(this, _channel) && !__privateGet(this, _channel).closed) {
      return __privateGet(this, _channel);
    }
    const channel = __privateGet(this, _options).transport.establishChannel();
    __privateSet(this, _establishingChannel, channel.then(() => {
    }).catch(() => {
    }));
    __privateSet(this, _channel, void 0);
    __privateSet(this, _channel, await channel.catch((error) => {
      throw new SignerError({
        code: NETWORK_ERROR,
        message: error instanceof Error ? error.message : "Network error"
      }, { cause: error });
    }));
    __privateSet(this, _establishingChannel, void 0);
    return __privateGet(this, _channel);
  }
  /** Closes the current communication channel, if open. */
  async closeChannel() {
    var _a;
    await ((_a = __privateGet(this, _channel)) == null ? void 0 : _a.close());
  }
  /**
   * Sends a JSON-RPC request over the transport channel.
   * @param request - The JSON-RPC request to send.
   */
  async sendRequest(request) {
    const channel = await this.openChannel();
    const { promise, resolve, reject } = Promise.withResolvers();
    const expectsResponse = request.id !== void 0 && request.id !== null;
    if (expectsResponse) {
      __privateWrapper(this, _pendingRequestCount)._++;
    }
    let settled = false;
    const settle = () => {
      if (settled) {
        return;
      }
      settled = true;
      if (expectsResponse) {
        __privateWrapper(this, _pendingRequestCount)._--;
      }
    };
    const removeResponseListener = channel.addEventListener("response", (response) => {
      if (response.id !== request.id) {
        return;
      }
      removeResponseListener();
      removeCloseListener();
      settle();
      if ("error" in response && (typeof response.error !== "object" || response.error === null || typeof response.error.code !== "number" || typeof response.error.message !== "string")) {
        resolve({
          jsonrpc: "2.0",
          id: response.id,
          error: { code: GENERIC_ERROR, message: "Invalid error response from signer" }
        });
      } else {
        resolve(response);
      }
      if (__privateGet(this, _options).autoCloseTransportChannel && __privateGet(this, _pendingRequestCount) === 0) {
        __privateSet(this, _scheduledChannelClosure, setTimeout(() => {
          if (!channel.closed) {
            channel.close();
          }
        }, __privateGet(this, _options).closeTransportChannelAfter));
      }
    });
    const removeCloseListener = channel.addEventListener("close", () => {
      removeResponseListener();
      removeCloseListener();
      settle();
      reject(new SignerError({
        code: NETWORK_ERROR,
        message: "Channel was closed before a response was received"
      }));
    });
    let transformedRequest;
    try {
      transformedRequest = __privateMethod(this, _Signer_instances, applyTransforms_fn).call(this, request);
    } catch (cause) {
      removeResponseListener();
      removeCloseListener();
      settle();
      reject(new SignerError({
        code: GENERIC_ERROR,
        message: `Transform failed: ${cause instanceof Error ? cause.message : cause}`
      }, { cause }));
      return promise;
    }
    try {
      await channel.send(transformedRequest);
    } catch (error) {
      removeResponseListener();
      removeCloseListener();
      settle();
      reject(new SignerError({
        code: NETWORK_ERROR,
        message: error instanceof Error ? error.message : "Network error"
      }, { cause: error }));
    }
    return promise;
  }
  /**
   * Queries which ICRC standards the signer supports.
   * Use this to determine signer capabilities before calling other methods.
   * @see https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_25_signer_interaction_standard.md
   */
  getSupportedStandards() {
    return __privateMethod(this, _Signer_instances, rpc_fn).call(this, {
      method: "icrc25_supported_standards",
      decode: (result) => {
        const r = asRecord(result);
        const standards = asArray(r == null ? void 0 : r.supportedStandards);
        if (!standards) {
          throw new Error("Expected supportedStandards array");
        }
        return standards.map((item) => {
          const obj = asRecord(item);
          const name = asString(obj == null ? void 0 : obj.name);
          const url = asString(obj == null ? void 0 : obj.url);
          if (name === void 0 || url === void 0) {
            throw new Error("Expected { name, url }");
          }
          return { name, url };
        });
      }
    });
  }
  /**
   * Requests the signer to grant permission for the given scopes.
   * The signer may prompt the user for approval.
   * @param scopes - The permission scopes to request.
   * @returns The current state of each requested scope after the user's decision.
   */
  requestPermissions(scopes) {
    return __privateMethod(this, _Signer_instances, rpc_fn).call(this, {
      method: "icrc25_request_permissions",
      params: scopes,
      encode: (scopes2) => ({ scopes: scopes2 }),
      decode: (result) => {
        const r = asRecord(result);
        const scopes2 = asArray(r == null ? void 0 : r.scopes);
        if (!scopes2) {
          throw new Error("Expected scopes array");
        }
        return scopes2.map((item) => {
          const obj = asRecord(item);
          const scope = asRecord(obj == null ? void 0 : obj.scope);
          const state = asString(obj == null ? void 0 : obj.state);
          if (!scope || typeof scope.method !== "string" || !state) {
            throw new Error("Expected { scope: { method }, state }");
          }
          return { scope, state };
        });
      }
    });
  }
  /**
   * Queries the current state of all permission scopes.
   * @returns The current permission state for each scope the signer supports.
   */
  getPermissions() {
    return __privateMethod(this, _Signer_instances, rpc_fn).call(this, {
      method: "icrc25_permissions",
      decode: (result) => {
        const r = asRecord(result);
        const scopes = asArray(r == null ? void 0 : r.scopes);
        if (!scopes) {
          throw new Error("Expected scopes array");
        }
        return scopes.map((item) => {
          const obj = asRecord(item);
          const scope = asRecord(obj == null ? void 0 : obj.scope);
          const state = asString(obj == null ? void 0 : obj.state);
          if (!scope || typeof scope.method !== "string" || !state) {
            throw new Error("Expected { scope: { method }, state }");
          }
          return { scope, state };
        });
      }
    });
  }
  /**
   * Requests the accounts managed by the signer.
   * Each account has an owner {@link Principal} and an optional 32-byte subaccount.
   *
   * Requires the `icrc27_accounts` permission scope.
   * @see https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_27_accounts.md
   */
  getAccounts() {
    return __privateMethod(this, _Signer_instances, rpc_fn).call(this, {
      method: "icrc27_accounts",
      decode: (result) => {
        const r = asRecord(result);
        const accounts = asArray(r == null ? void 0 : r.accounts);
        if (!accounts) {
          throw new Error("Expected accounts array");
        }
        return accounts.map((item) => {
          const obj = asRecord(item);
          const owner = asString(obj == null ? void 0 : obj.owner);
          const subaccount = asString(obj == null ? void 0 : obj.subaccount);
          if (!owner) {
            throw new Error("Expected account.owner string");
          }
          return {
            owner: Principal.fromText(owner),
            subaccount: subaccount !== void 0 ? fromBase64(subaccount) : void 0
          };
        });
      }
    });
  }
  /**
   * Requests a delegation chain from the signer for session-based authentication.
   * This allows the relying party to sign canister calls without requiring
   * user approval for each individual call.
   * @param params - The delegation request parameters.
   * @param params.publicKey - The session's public key to delegate to.
   * @param params.targets - Optional canister IDs to restrict the delegation to.
   *   When provided, the signer creates an account delegation; otherwise a
   *   relying party delegation.
   * @param params.maxTimeToLive - Optional maximum delegation lifetime in nanoseconds.
   * @returns A {@link DelegationChain} that can be used with `DelegationIdentity`.
   * @see https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_34_delegation.md
   */
  requestDelegation(params) {
    return __privateMethod(this, _Signer_instances, rpc_fn).call(this, {
      method: "icrc34_delegation",
      params,
      encode: (v) => {
        var _a;
        return {
          publicKey: toBase64(new Uint8Array(v.publicKey.toDer())),
          targets: (_a = v.targets) == null ? void 0 : _a.map((t) => t.toText()),
          maxTimeToLive: v.maxTimeToLive !== void 0 ? String(v.maxTimeToLive) : void 0
        };
      },
      decode: (result) => {
        const r = asRecord(result);
        const publicKey = asString(r == null ? void 0 : r.publicKey);
        const signerDelegation = asArray(r == null ? void 0 : r.signerDelegation);
        if (!publicKey || !signerDelegation) {
          throw new Error("Expected { publicKey, signerDelegation }");
        }
        const chain = DelegationChain.fromDelegations(signerDelegation.map((item) => {
          const obj = asRecord(item);
          const del = asRecord(obj == null ? void 0 : obj.delegation);
          const pubkey = asString(del == null ? void 0 : del.pubkey);
          const expiration = del == null ? void 0 : del.expiration;
          const signature = asString(obj == null ? void 0 : obj.signature);
          if (!pubkey || expiration === void 0 || !signature) {
            throw new Error("Expected delegation { pubkey, expiration, signature }");
          }
          const targets = asArray(del == null ? void 0 : del.targets);
          return {
            delegation: new Delegation(fromBase64(pubkey), toExpiration(expiration), targets == null ? void 0 : targets.map((t) => Principal.fromText(t))),
            signature: fromBase64(signature)
          };
        }), fromBase64(publicKey));
        validateDelegationChain(chain, params);
        return chain;
      }
    });
  }
  /**
   * Requests the signer to execute a canister call on behalf of the user.
   * The signer will prompt the user for approval before signing and
   * submitting the call to the Internet Computer.
   * @param params - The canister call parameters.
   * @param params.canisterId - The target canister.
   * @param params.sender - The principal executing the call.
   * @param params.method - The canister method to invoke.
   * @param params.arg - The Candid-encoded call arguments.
   * @param params.nonce - Optional nonce (max 32 bytes) for replay protection.
   * @returns The CBOR-encoded content map and certificate from the IC,
   *   which can be used to verify the call's execution.
   * @see https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_49_call_canister.md
   */
  callCanister(params) {
    return __privateMethod(this, _Signer_instances, rpc_fn).call(this, {
      method: "icrc49_call_canister",
      params,
      encode: (v) => ({
        canisterId: v.canisterId.toText(),
        sender: v.sender.toText(),
        method: v.method,
        arg: toBase64(v.arg),
        nonce: v.nonce !== void 0 ? toBase64(v.nonce) : void 0
      }),
      decode: (result) => {
        const r = asRecord(result);
        const contentMap = asString(r == null ? void 0 : r.contentMap);
        const certificate = asString(r == null ? void 0 : r.certificate);
        if (!contentMap || !certificate) {
          throw new Error("Expected { contentMap, certificate }");
        }
        return { contentMap: fromBase64(contentMap), certificate: fromBase64(certificate) };
      }
    });
  }
}
_options = new WeakMap();
_channel = new WeakMap();
_establishingChannel = new WeakMap();
_scheduledChannelClosure = new WeakMap();
_pendingRequestCount = new WeakMap();
_Signer_instances = new WeakSet();
rpc_fn = async function(args) {
  let params;
  if (args.encode) {
    try {
      params = args.encode(args.params);
    } catch (cause) {
      throw new SignerError({
        code: GENERIC_ERROR,
        message: `Failed to encode params: ${cause instanceof Error ? cause.message : cause}`
      }, { cause });
    }
  }
  const response = await this.sendRequest({
    id: __privateGet(this, _options).crypto.randomUUID(),
    jsonrpc: "2.0",
    method: args.method,
    params
  });
  if ("error" in response) {
    throw new SignerError(response.error);
  }
  if ("result" in response) {
    try {
      return args.decode(response.result);
    } catch (cause) {
      throw new SignerError({
        code: GENERIC_ERROR,
        message: `Invalid result from signer: ${cause instanceof Error ? cause.message : cause}`
      }, { cause });
    }
  }
  throw new SignerError({
    code: GENERIC_ERROR,
    message: "Response contains neither result nor error"
  });
};
/**
 * Applies all configured transforms to a JSON-RPC request.
 * @param request - The JSON-RPC request to transform.
 */
applyTransforms_fn = function(request) {
  return __privateGet(this, _options).transforms.reduce((req, transform) => transform(req), request);
};
export {
  Signer,
  SignerError
};
