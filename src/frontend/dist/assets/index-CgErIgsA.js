var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { e as encode, T as Text, i as isV3ResponseBody, H as HttpAgent, r as reactExports, D as DelegationIdentity, a as isDelegationValid, A as AuthClient, u as useQueryClient, b as useQuery } from "./index-al26jyLH.js";
class ExternalBlob {
  constructor(directURL, blob) {
    __publicField(this, "_blob");
    __publicField(this, "directURL");
    __publicField(this, "onProgress");
    if (blob) {
      this._blob = blob;
    }
    this.directURL = directURL;
  }
  static fromURL(url) {
    return new ExternalBlob(url, null);
  }
  static fromBytes(blob) {
    const url = URL.createObjectURL(new Blob([new Uint8Array(blob)], {
      type: "application/octet-stream"
    }));
    return new ExternalBlob(url, blob);
  }
  async getBytes() {
    if (this._blob) {
      return this._blob;
    }
    const response = await fetch(this.directURL);
    const blob = await response.blob();
    this._blob = new Uint8Array(await blob.arrayBuffer());
    return this._blob;
  }
  getDirectURL() {
    return this.directURL;
  }
  withUploadProgress(onProgress) {
    this.onProgress = onProgress;
    return this;
  }
}
const MAXIMUM_CONCURRENT_UPLOADS = 10;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1e3;
const MAX_DELAY_MS = 3e4;
const GATEWAY_VERSION = "v1";
const HASH_ALGORITHM = "SHA-256";
const SHA256_PREFIX = "sha256:";
const DOMAIN_SEPARATOR_FOR_CHUNKS = new TextEncoder().encode("icfs-chunk/");
const DOMAIN_SEPARATOR_FOR_METADATA = new TextEncoder().encode("icfs-metadata/");
const DOMAIN_SEPARATOR_FOR_NODES = new TextEncoder().encode("ynode/");
async function withRetry(operation) {
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const shouldRetry = isRetriableError(error);
      if (attempt === MAX_RETRIES || !shouldRetry) {
        if (!shouldRetry && attempt < MAX_RETRIES) {
          console.warn(`Non-retriable error encountered: ${lastError.message}. Not retrying.`);
        }
        throw error;
      }
      const delay = Math.min(BASE_DELAY_MS * 2 ** attempt + Math.random() * 1e3, MAX_DELAY_MS);
      console.warn(`Request failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${lastError.message}. Retrying in ${Math.round(delay)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError || new Error("Unknown error occurred during retry attempts");
}
function isRetriableError(error) {
  var _a, _b;
  const errorMessage = ((_a = error == null ? void 0 : error.message) == null ? void 0 : _a.toLowerCase()) || "";
  if ((_b = error == null ? void 0 : error.response) == null ? void 0 : _b.status) {
    const status = error.response.status;
    if (status === 408 || status === 429)
      return true;
    if (status >= 400 && status < 500)
      return false;
    if (status >= 500)
      return true;
  }
  if (errorMessage.includes("ssl") || errorMessage.includes("tls") || errorMessage.includes("network error") || errorMessage.includes("connection") || errorMessage.includes("timeout") || errorMessage.includes("fetch")) {
    return true;
  }
  if (errorMessage.includes("validation") || errorMessage.includes("invalid") || errorMessage.includes("malformed") || errorMessage.includes("unauthorized") || errorMessage.includes("forbidden") || errorMessage.includes("not found")) {
    return false;
  }
  return true;
}
function validateHashFormat(hash, context) {
  if (!hash) {
    throw new Error(`${context}: Hash cannot be empty`);
  }
  if (!hash.startsWith(SHA256_PREFIX)) {
    throw new Error(`${context}: Invalid hash format. Expected format: ${SHA256_PREFIX}<64-char-hex>, got: ${hash}`);
  }
  const hexPart = hash.substring(SHA256_PREFIX.length);
  if (hexPart.length !== 64) {
    throw new Error(`${context}: Invalid hash format. Expected 64 hex characters after ${SHA256_PREFIX}, got ${hexPart.length} characters: ${hash}`);
  }
  if (!/^[0-9a-f]{64}$/i.test(hexPart)) {
    throw new Error(`${context}: Invalid hash format. Hash must contain only hex characters (0-9, a-f), got: ${hash}`);
  }
}
class YHash {
  constructor(bytes) {
    __publicField(this, "bytes");
    if (bytes.length !== 32) {
      throw new Error(`YHash must be exactly 32 bytes, got ${bytes.length}`);
    }
    this.bytes = new Uint8Array(bytes);
  }
  static async fromNodes(left, right) {
    const leftBytes = left instanceof YHash ? left.bytes : new TextEncoder().encode("UNBALANCED");
    const rightBytes = right instanceof YHash ? right.bytes : new TextEncoder().encode("UNBALANCED");
    const combined = new Uint8Array(DOMAIN_SEPARATOR_FOR_NODES.length + leftBytes.length + rightBytes.length);
    const arrays = [DOMAIN_SEPARATOR_FOR_NODES, leftBytes, rightBytes];
    let offset = 0;
    for (const data of arrays) {
      combined.set(data, offset);
      offset += data.length;
    }
    const hashBuffer = await crypto.subtle.digest(HASH_ALGORITHM, combined);
    return new YHash(new Uint8Array(hashBuffer));
  }
  static async fromChunk(data) {
    return YHash.fromBytes(DOMAIN_SEPARATOR_FOR_CHUNKS, data);
  }
  static async fromHeaders(headers) {
    const headerLines = [];
    for (const [key, value] of Object.entries(headers)) {
      headerLines.push(`${key.trim()}: ${value.trim()}
`);
    }
    headerLines.sort();
    const hash = await YHash.fromBytes(DOMAIN_SEPARATOR_FOR_METADATA, new TextEncoder().encode(headerLines.join("")));
    return hash;
  }
  static async fromBytes(domainSeparator, data) {
    const combined = new Uint8Array(domainSeparator.length + data.length);
    combined.set(domainSeparator);
    combined.set(data, domainSeparator.length);
    const hashBuffer = await crypto.subtle.digest(HASH_ALGORITHM, combined);
    return new YHash(new Uint8Array(hashBuffer));
  }
  static fromHex(hexString) {
    const bytes = new Uint8Array(hexString.match(/.{1,2}/g).map((byte) => Number.parseInt(byte, 16)));
    return new YHash(bytes);
  }
  toShaString() {
    return `${SHA256_PREFIX}${this.toHex()}`;
  }
  toString() {
    throw new Error("toString is not supported for YHash");
  }
  toHex() {
    return Array.from(this.bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}
function nodeToJSON(node) {
  return {
    hash: node.hash.toShaString(),
    left: node.left ? nodeToJSON(node.left) : null,
    right: node.right ? nodeToJSON(node.right) : null
  };
}
class BlobHashTree {
  constructor(chunk_hashes, tree, headers = null) {
    __publicField(this, "tree_type");
    __publicField(this, "chunk_hashes");
    __publicField(this, "tree");
    __publicField(this, "headers");
    this.tree_type = "DSBMTWH";
    this.chunk_hashes = chunk_hashes;
    this.tree = tree;
    if (headers == null) {
      this.headers = [];
    } else if (Array.isArray(headers)) {
      this.headers = headers;
    } else {
      this.headers = Object.entries(headers).map(([key, value]) => `${key.trim()}: ${value.trim()}`);
    }
    this.headers.sort();
  }
  static async build(chunkHashes, headers = {}) {
    if (chunkHashes.length === 0) {
      const hex = "8b8e620f084e48da0be2287fd12c5aaa4dbe14b468fd2e360f48d741fe7628a0";
      const bytes = new TextEncoder().encode(hex);
      chunkHashes.push(new YHash(bytes));
    }
    let level = chunkHashes.map((hash) => ({
      hash,
      left: null,
      right: null
    }));
    while (level.length > 1) {
      const nextLevel = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = level[i + 1] || null;
        const parentHash = await YHash.fromNodes(left.hash, right ? right.hash : null);
        nextLevel.push({
          hash: parentHash,
          left,
          right
        });
      }
      level = nextLevel;
    }
    const chunksRoot = level[0];
    if (headers && Object.keys(headers).length > 0) {
      const metadataRootHash = await YHash.fromHeaders(headers);
      const metadataRoot = {
        hash: metadataRootHash,
        left: null,
        right: null
      };
      const combinedRootHash = await YHash.fromNodes(chunksRoot.hash, metadataRoot.hash);
      const combinedRoot = {
        hash: combinedRootHash,
        left: chunksRoot,
        right: metadataRoot
      };
      return new BlobHashTree(chunkHashes, combinedRoot, headers);
    }
    return new BlobHashTree(chunkHashes, chunksRoot, headers);
  }
  toJSON() {
    return {
      tree_type: this.tree_type,
      chunk_hashes: this.chunk_hashes.map((h) => h.toShaString()),
      tree: nodeToJSON(this.tree),
      headers: this.headers
    };
  }
}
class StorageGatewayClient {
  constructor(storageGatewayUrl) {
    __publicField(this, "storageGatewayUrl");
    this.storageGatewayUrl = storageGatewayUrl;
  }
  getStorageGatewayUrl() {
    return this.storageGatewayUrl;
  }
  async uploadChunk(params) {
    const blobHashString = params.blobRootHash.toShaString();
    const chunkHashString = params.chunkHash.toShaString();
    validateHashFormat(blobHashString, `uploadChunk[${params.chunkIndex}] blob_hash`);
    validateHashFormat(chunkHashString, `uploadChunk[${params.chunkIndex}] chunk_hash`);
    return await withRetry(async () => {
      const queryParams = new URLSearchParams({
        owner_id: params.owner,
        blob_hash: blobHashString,
        chunk_hash: chunkHashString,
        chunk_index: params.chunkIndex.toString(),
        bucket_name: params.bucketName,
        project_id: params.projectId
      });
      const url = `${this.storageGatewayUrl}/${GATEWAY_VERSION}/chunk/?${queryParams.toString()}`;
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Caffeine-Project-ID": params.projectId
        },
        body: params.chunkData
      });
      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`Failed to upload chunk ${params.chunkIndex}: ${response.status} ${response.statusText} - ${errorText}`);
        error.response = { status: response.status };
        throw error;
      }
      const result = await response.json();
      return {
        isComplete: result.status === "blob_complete"
      };
    });
  }
  async uploadBlobTree(blobHashTree, bucketName, numBlobBytes, owner, projectId, certificateBytes) {
    const treeJSON = blobHashTree.toJSON();
    validateHashFormat(treeJSON.tree.hash, "uploadBlobTree root hash");
    treeJSON.chunk_hashes.forEach((hash, index) => {
      validateHashFormat(hash, `uploadBlobTree chunk_hash[${index}]`);
    });
    return await withRetry(async () => {
      const url = `${this.storageGatewayUrl}/${GATEWAY_VERSION}/blob-tree/`;
      const requestBody = {
        blob_tree: treeJSON,
        bucket_name: bucketName,
        num_blob_bytes: numBlobBytes,
        owner,
        project_id: projectId,
        headers: blobHashTree.headers,
        auth: {
          OwnerEgressSignature: Array.from(certificateBytes)
        }
      };
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Caffeine-Project-ID": projectId
        },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`Failed to upload blob tree: ${response.status} ${response.statusText} - ${errorText}`);
        error.response = { status: response.status };
        throw error;
      }
    });
  }
}
class StorageClient {
  constructor(bucket, storageGatewayUrl, backendCanisterId, projectId, agent) {
    __publicField(this, "bucket");
    __publicField(this, "backendCanisterId");
    __publicField(this, "projectId");
    __publicField(this, "agent");
    __publicField(this, "storageGatewayClient");
    this.bucket = bucket;
    this.backendCanisterId = backendCanisterId;
    this.projectId = projectId;
    this.agent = agent;
    this.storageGatewayClient = new StorageGatewayClient(storageGatewayUrl);
  }
  async getCertificate(hash) {
    const args = encode([Text], [hash]);
    const result = await this.agent.call(this.backendCanisterId, {
      methodName: "_immutableObjectStorageCreateCertificate",
      arg: args
    });
    const respone = result.response.body;
    if (isV3ResponseBody(respone)) {
      console.log("Certificate:", respone.certificate);
      return respone.certificate;
    }
    throw new Error("Expected v3 response body");
  }
  async putFile(blobBytes, onProgress) {
    const httpHeaders = {
      "Content-Type": "application/json"
    };
    const file = new Blob([new Uint8Array(blobBytes)], {
      type: "application/octet-stream"
    });
    const fileHeaders = {
      "Content-Type": "application/octet-stream",
      "Content-Length": file.size.toString()
    };
    const { chunks, chunkHashes, blobHashTree } = await this.processFileForUpload(file, fileHeaders);
    const blobRootHash = blobHashTree.tree.hash;
    const hashString = blobRootHash.toShaString();
    const certificateBytes = await this.getCertificate(hashString);
    await this.storageGatewayClient.uploadBlobTree(blobHashTree, this.bucket, file.size, this.backendCanisterId, this.projectId, certificateBytes);
    await this.parallelUpload(chunks, chunkHashes, blobRootHash, httpHeaders, onProgress);
    return { hash: hashString };
  }
  async getDirectURL(hash) {
    if (!hash) {
      throw new Error("Hash must not be empty");
    }
    validateHashFormat(hash, `getDirectURL for path '${hash}'`);
    return `${this.storageGatewayClient.getStorageGatewayUrl()}/${GATEWAY_VERSION}/blob/?blob_hash=${encodeURIComponent(hash)}&owner_id=${encodeURIComponent(this.backendCanisterId)}&project_id=${encodeURIComponent(this.projectId)}`;
  }
  async processFileForUpload(file, headers) {
    const chunks = this.createFileChunks(file);
    const chunkHashes = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunkData = new Uint8Array(await chunks[i].arrayBuffer());
      const hash = await YHash.fromChunk(chunkData);
      chunkHashes.push(hash);
    }
    const blobHashTree = await BlobHashTree.build(chunkHashes, headers);
    return { chunks, chunkHashes, blobHashTree };
  }
  async parallelUpload(chunks, chunkHashes, blobRootHash, httpHeaders, onProgress) {
    let completedChunks = 0;
    const uploadSingleChunk = async (index) => {
      const chunkData = new Uint8Array(await chunks[index].arrayBuffer());
      const chunkHash = chunkHashes[index];
      await this.storageGatewayClient.uploadChunk({
        blobRootHash,
        chunkHash,
        chunkIndex: index,
        chunkData,
        bucketName: this.bucket,
        owner: this.backendCanisterId,
        projectId: this.projectId,
        httpHeaders
      });
      const currentCompleted = ++completedChunks;
      if (onProgress != null) {
        const percentage = chunks.length === 0 ? 100 : Math.round(currentCompleted / chunks.length * 100);
        onProgress(percentage);
      }
    };
    await Promise.all(Array.from({ length: MAXIMUM_CONCURRENT_UPLOADS }, async (_, workerId) => {
      for (let i = workerId; i < chunks.length; i += MAXIMUM_CONCURRENT_UPLOADS) {
        await uploadSingleChunk(i);
      }
    }));
  }
  createFileChunks(file, chunkSize = 1024 * 1024) {
    const chunks = [];
    const totalChunks = Math.ceil(file.size / chunkSize);
    for (let index = 0; index < totalChunks; index++) {
      const start = index * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      chunks.push(chunk);
    }
    return chunks;
  }
}
var define_process_env_default = {};
const DEFAULT_STORAGE_GATEWAY_URL = "https://blob.caffeine.ai";
const DEFAULT_BUCKET_NAME = "default-bucket";
const DEFAULT_PROJECT_ID = "0000000-0000-0000-0000-00000000000";
let configCache = null;
async function loadConfig() {
  if (configCache) {
    return configCache;
  }
  const backendCanisterId = define_process_env_default.CANISTER_ID_BACKEND;
  const envBaseUrl = define_process_env_default.BASE_URL || "/";
  const baseUrl = envBaseUrl.endsWith("/") ? envBaseUrl : `${envBaseUrl}/`;
  try {
    const response = await fetch(`${baseUrl}env.json`);
    const config = await response.json();
    if (!backendCanisterId && config.backend_canister_id === "undefined") {
      console.error("CANISTER_ID_BACKEND is not set");
      throw new Error("CANISTER_ID_BACKEND is not set");
    }
    const fullConfig = {
      backend_host: config.backend_host === "undefined" ? void 0 : config.backend_host,
      backend_canister_id: config.backend_canister_id === "undefined" ? backendCanisterId : config.backend_canister_id,
      storage_gateway_url: "https://blob.caffeine.ai",
      bucket_name: DEFAULT_BUCKET_NAME,
      project_id: config.project_id !== "undefined" ? config.project_id : DEFAULT_PROJECT_ID,
      ii_derivation_origin: config.ii_derivation_origin === "undefined" ? void 0 : config.ii_derivation_origin
    };
    configCache = fullConfig;
    return fullConfig;
  } catch {
    if (!backendCanisterId) {
      console.error("CANISTER_ID_BACKEND is not set");
      throw new Error("CANISTER_ID_BACKEND is not set");
    }
    const fallbackConfig = {
      backend_host: void 0,
      backend_canister_id: backendCanisterId,
      storage_gateway_url: DEFAULT_STORAGE_GATEWAY_URL,
      bucket_name: DEFAULT_BUCKET_NAME,
      project_id: DEFAULT_PROJECT_ID,
      ii_derivation_origin: void 0
    };
    return fallbackConfig;
  }
}
function extractAgentErrorMessage(error) {
  const errorString = String(error);
  const match = errorString.match(/with message:\s*'([^']+)'/s);
  return match ? match[1] : errorString;
}
function processError(e) {
  if (e && typeof e === "object" && "message" in e) {
    throw new Error(extractAgentErrorMessage(`${e.message}`));
  }
  throw e;
}
async function maybeLoadMockBackend() {
  {
    return null;
  }
}
async function createActorWithConfig(createActor, options) {
  var _a;
  const mock = await maybeLoadMockBackend();
  if (mock) {
    return mock;
  }
  const config = await loadConfig();
  const resolvedOptions = options ?? {};
  const agent = new HttpAgent({
    ...resolvedOptions.agentOptions,
    host: config.backend_host
  });
  if ((_a = config.backend_host) == null ? void 0 : _a.includes("localhost")) {
    await agent.fetchRootKey().catch((err) => {
      console.warn("Unable to fetch root key. Check to ensure that your local replica is running");
      console.error(err);
    });
  }
  const actorOptions = {
    ...resolvedOptions,
    agent,
    processError
  };
  const storageClient = new StorageClient(config.bucket_name, config.storage_gateway_url, config.backend_canister_id, config.project_id, agent);
  const MOTOKO_DEDUPLICATION_SENTINEL = "!caf!";
  const uploadFile = async (file) => {
    const { hash } = await storageClient.putFile(await file.getBytes(), file.onProgress);
    return new TextEncoder().encode(MOTOKO_DEDUPLICATION_SENTINEL + hash);
  };
  const downloadFile = async (bytes) => {
    const hashWithPrefix = new TextDecoder().decode(new Uint8Array(bytes));
    const hash = hashWithPrefix.substring(MOTOKO_DEDUPLICATION_SENTINEL.length);
    const url = await storageClient.getDirectURL(hash);
    return ExternalBlob.fromURL(url);
  };
  return createActor(config.backend_canister_id, uploadFile, downloadFile, actorOptions);
}
const ONE_HOUR_IN_NANOSECONDS = BigInt(36e11);
const DEFAULT_IDENTITY_PROVIDER = "https://identity.ic0.app";
const InternetIdentityReactContext = reactExports.createContext(void 0);
async function createAuthClient(createOptions) {
  const config = await loadConfig();
  const options = {
    idleOptions: {
      // Default behaviour of this hook is not to logout and reload window on identity expiration
      disableDefaultIdleCallback: true,
      disableIdle: true,
      ...createOptions == null ? void 0 : createOptions.idleOptions
    },
    loginOptions: {
      derivationOrigin: config.ii_derivation_origin
    },
    ...createOptions
  };
  const authClient = await AuthClient.create(options);
  return authClient;
}
function assertProviderPresent(context) {
  if (!context) {
    throw new Error("InternetIdentityProvider is not present. Wrap your component tree with it.");
  }
}
const useInternetIdentity = () => {
  const context = reactExports.useContext(InternetIdentityReactContext);
  assertProviderPresent(context);
  return context;
};
function InternetIdentityProvider({ children, createOptions }) {
  const [authClient, setAuthClient] = reactExports.useState(void 0);
  const [identity, setIdentity] = reactExports.useState(void 0);
  const [loginStatus, setStatus] = reactExports.useState("initializing");
  const [loginError, setError] = reactExports.useState(void 0);
  const setErrorMessage = reactExports.useCallback((message) => {
    setStatus("loginError");
    setError(new Error(message));
  }, []);
  const handleLoginSuccess = reactExports.useCallback(() => {
    const latestIdentity = authClient == null ? void 0 : authClient.getIdentity();
    if (!latestIdentity) {
      setErrorMessage("Identity not found after successful login");
      return;
    }
    setIdentity(latestIdentity);
    setStatus("success");
  }, [authClient, setErrorMessage]);
  const handleLoginError = reactExports.useCallback((maybeError) => {
    setErrorMessage(maybeError ?? "Login failed");
  }, [setErrorMessage]);
  const login = reactExports.useCallback(() => {
    if (!authClient) {
      setErrorMessage("AuthClient is not initialized yet, make sure to call `login` on user interaction e.g. click.");
      return;
    }
    const currentIdentity = authClient.getIdentity();
    if (!currentIdentity.getPrincipal().isAnonymous() && currentIdentity instanceof DelegationIdentity && isDelegationValid(currentIdentity.getDelegation())) {
      setErrorMessage("User is already authenticated");
      return;
    }
    const options = {
      identityProvider: DEFAULT_IDENTITY_PROVIDER,
      onSuccess: handleLoginSuccess,
      onError: handleLoginError,
      maxTimeToLive: ONE_HOUR_IN_NANOSECONDS * BigInt(24 * 30)
      // 30 days
    };
    setStatus("logging-in");
    void authClient.login(options);
  }, [authClient, handleLoginError, handleLoginSuccess, setErrorMessage]);
  const clear = reactExports.useCallback(() => {
    if (!authClient) {
      setErrorMessage("Auth client not initialized");
      return;
    }
    void authClient.logout().then(() => {
      setIdentity(void 0);
      setAuthClient(void 0);
      setStatus("idle");
      setError(void 0);
    }).catch((unknownError) => {
      setStatus("loginError");
      setError(unknownError instanceof Error ? unknownError : new Error("Logout failed"));
    });
  }, [authClient, setErrorMessage]);
  reactExports.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setStatus("initializing");
        let existingClient = authClient;
        if (!existingClient) {
          existingClient = await createAuthClient(createOptions);
          if (cancelled)
            return;
          setAuthClient(existingClient);
        }
        const isAuthenticated = await existingClient.isAuthenticated();
        if (cancelled)
          return;
        if (isAuthenticated) {
          const loadedIdentity = existingClient.getIdentity();
          setIdentity(loadedIdentity);
        }
      } catch (unknownError) {
        setStatus("loginError");
        setError(unknownError instanceof Error ? unknownError : new Error("Initialization failed"));
      } finally {
        if (!cancelled)
          setStatus("idle");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [createOptions, authClient]);
  const value = reactExports.useMemo(() => ({
    identity,
    login,
    clear,
    loginStatus,
    isInitializing: loginStatus === "initializing",
    isLoginIdle: loginStatus === "idle",
    isLoggingIn: loginStatus === "logging-in",
    isLoginSuccess: loginStatus === "success",
    isLoginError: loginStatus === "loginError",
    loginError
  }), [identity, login, clear, loginStatus, loginError]);
  return reactExports.createElement(InternetIdentityReactContext.Provider, {
    value,
    children
  });
}
function hasAccessControl(actor) {
  return typeof actor === "object" && actor !== null && "_initializeAccessControl" in actor;
}
const ACTOR_QUERY_KEY = "actor";
function useActor(createActor) {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const actorQuery = useQuery({
    queryKey: [ACTOR_QUERY_KEY, identity == null ? void 0 : identity.getPrincipal().toString()],
    queryFn: async () => {
      const isAuthenticated = !!identity;
      if (!isAuthenticated) {
        return await createActorWithConfig(createActor);
      }
      const actorOptions = {
        agentOptions: {
          identity
        }
      };
      const actor = await createActorWithConfig(createActor, actorOptions);
      if (hasAccessControl(actor)) {
        await actor._initializeAccessControl();
      }
      return actor;
    },
    // Only refetch when identity changes
    staleTime: Number.POSITIVE_INFINITY,
    // This will cause the actor to be recreated when the identity changes
    enabled: true
  });
  reactExports.useEffect(() => {
    if (actorQuery.data) {
      queryClient.invalidateQueries({
        predicate: (query) => {
          return !query.queryKey.includes(ACTOR_QUERY_KEY);
        }
      });
      queryClient.refetchQueries({
        predicate: (query) => {
          return !query.queryKey.includes(ACTOR_QUERY_KEY);
        }
      });
    }
  }, [actorQuery.data, queryClient]);
  return {
    actor: actorQuery.data || null,
    isFetching: actorQuery.isFetching
  };
}
export {
  InternetIdentityProvider,
  createActorWithConfig,
  loadConfig,
  useActor,
  useInternetIdentity
};
