var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var _keys, _a;
import { c as createLucideIcon, j as jsxRuntimeExports, a as cn, r as reactExports, b as reactDomExports, R as React2, u as useInternetIdentity, d as useIsAdmin, L as LoaderCircle, W as Wallet, C as CircleAlert, e as Coins, f as useTreasuryICRC1Balances, g as RefreshCw, h as useGetTreasuryWalletInfo, i as useUNIExchangeRate, k as useSetUNIExchangeRate, S as Send, l as useAllUNIDeposits, m as useBackendActor, n as useAdminMintCkUNI, o as useAdminDissolveCkUNI, p as useAdminInitializeMinterAddress, q as Copy, s as CircleCheck, t as useStrandedQueue, v as directWhoAmI, w as directAdminGrantAdmin, P as Principal, x as directAdminTransfer } from "./index-AllR9Xff.js";
import { c as createSlot, u as useComposedRefs, B as Button } from "./button-BUC3Rteu.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$3 = [
  ["path", { d: "M8 3 4 7l4 4", key: "9rb6wj" }],
  ["path", { d: "M4 7h16", key: "6tx8e3" }],
  ["path", { d: "m16 21 4-4-4-4", key: "siv7j2" }],
  ["path", { d: "M20 17H4", key: "h6l3hr" }]
];
const ArrowLeftRight = createLucideIcon("arrow-left-right", __iconNode$3);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$2 = [
  [
    "path",
    {
      d: "M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727",
      key: "yr8idg"
    }
  ]
];
const Bitcoin = createLucideIcon("bitcoin", __iconNode$2);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$1 = [
  [
    "path",
    {
      d: "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z",
      key: "96xj49"
    }
  ]
];
const Flame = createLucideIcon("flame", __iconNode$1);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      key: "oel41y"
    }
  ]
];
const Shield = createLucideIcon("shield", __iconNode);
function Input({ className, type, ...props }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "input",
    {
      type,
      "data-slot": "input",
      className: cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      ),
      ...props
    }
  );
}
var __defProp$d = Object.defineProperty;
var __name$d = (target, value) => __defProp$d(target, "name", { value, configurable: true });
var NODES = [
  "a",
  "button",
  "div",
  "form",
  "h2",
  "h3",
  "img",
  "input",
  "label",
  "li",
  "nav",
  "ol",
  "p",
  "select",
  "span",
  "svg",
  "ul"
];
var Primitive = NODES.reduce((primitive, node) => {
  const Slot = createSlot(`Primitive.${node}`);
  const Node2 = reactExports.forwardRef((props, forwardedRef) => {
    const { asChild, ...primitiveProps } = props;
    const Comp = asChild ? Slot : node;
    if (typeof window !== "undefined") {
      window[Symbol.for("radix-ui")] = true;
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Comp, { ...primitiveProps, ref: forwardedRef });
  });
  Node2.displayName = `Primitive.${node}`;
  return { ...primitive, [node]: Node2 };
}, {});
function dispatchDiscreteCustomEvent(target, event) {
  if (target) reactDomExports.flushSync(() => target.dispatchEvent(event));
}
__name$d(dispatchDiscreteCustomEvent, "dispatchDiscreteCustomEvent");
var __defProp$c = Object.defineProperty;
var __name$c = (target, value) => __defProp$c(target, "name", { value, configurable: true });
var Label$1 = /* @__PURE__ */ reactExports.forwardRef(
  /* @__PURE__ */ __name$c(function Label2(props, forwardedRef) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.label,
      {
        ...props,
        ref: forwardedRef,
        onMouseDown: (event) => {
          var _a2;
          const target = event.target;
          if (target.closest("button, input, select, textarea")) return;
          (_a2 = props.onMouseDown) == null ? void 0 : _a2.call(props, event);
          if (!event.defaultPrevented && event.detail > 1) event.preventDefault();
        }
      }
    );
  }, "Label")
);
var Root$1 = Label$1;
function Label({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Root$1,
    {
      "data-slot": "label",
      className: cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      ),
      ...props
    }
  );
}
var __defProp$b = Object.defineProperty;
var __name$b = (target, value) => __defProp$b(target, "name", { value, configurable: true });
var canUseDOM = !!(typeof window !== "undefined" && window.document && window.document.createElement);
function composeEventHandlers(originalEventHandler, ourEventHandler, { checkForDefaultPrevented = true } = {}) {
  return /* @__PURE__ */ __name$b(function handleEvent(event) {
    originalEventHandler == null ? void 0 : originalEventHandler(event);
    if (checkForDefaultPrevented === false || !event || !event.defaultPrevented) {
      return ourEventHandler == null ? void 0 : ourEventHandler(event);
    }
  }, "handleEvent");
}
__name$b(composeEventHandlers, "composeEventHandlers");
function getOwnerWindow(element) {
  var _a2;
  if (!canUseDOM) {
    throw new Error("Cannot access window outside of the DOM");
  }
  return ((_a2 = element == null ? void 0 : element.ownerDocument) == null ? void 0 : _a2.defaultView) ?? window;
}
__name$b(getOwnerWindow, "getOwnerWindow");
function getOwnerDocument(element) {
  if (!canUseDOM) {
    throw new Error("Cannot access document outside of the DOM");
  }
  return (element == null ? void 0 : element.ownerDocument) ?? document;
}
__name$b(getOwnerDocument, "getOwnerDocument");
function getActiveElement(node, activeDescendant = false) {
  const { activeElement } = getOwnerDocument(node);
  if (!(activeElement == null ? void 0 : activeElement.nodeName)) {
    return null;
  }
  if (isFrame(activeElement) && activeElement.contentDocument) {
    return getActiveElement(activeElement.contentDocument.body, activeDescendant);
  }
  if (activeDescendant) {
    const id = activeElement.getAttribute("aria-activedescendant");
    if (id) {
      const element = getOwnerDocument(activeElement).getElementById(id);
      if (element) {
        return element;
      }
    }
  }
  return activeElement;
}
__name$b(getActiveElement, "getActiveElement");
function isFrame(element) {
  return element.tagName === "IFRAME";
}
__name$b(isFrame, "isFrame");
var __defProp$a = Object.defineProperty;
var __name$a = (target, value) => __defProp$a(target, "name", { value, configurable: true });
// @__NO_SIDE_EFFECTS__
function createContext2(rootComponentName, defaultContext) {
  const Context = reactExports.createContext(defaultContext);
  Context.displayName = rootComponentName + "Context";
  const Provider = /* @__PURE__ */ __name$a((props) => {
    const { children, ...context } = props;
    const value = reactExports.useMemo(() => context, Object.values(context));
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Context.Provider, { value, children });
  }, "Provider");
  Provider.displayName = rootComponentName + "Provider";
  function useContext2(consumerName, options = {}) {
    const { optional = false } = options;
    const context = reactExports.useContext(Context);
    if (context) return context;
    if (defaultContext !== void 0) return defaultContext;
    if (optional) return void 0;
    throw new Error(`\`${consumerName}\` must be used within \`${rootComponentName}\``);
  }
  __name$a(useContext2, "useContext");
  return [Provider, useContext2];
}
__name$a(createContext2, "createContext");
// @__NO_SIDE_EFFECTS__
function createContextScope(scopeName, createContextScopeDeps = []) {
  let defaultContexts = [];
  function createContext3(rootComponentName, defaultContext) {
    const BaseContext = reactExports.createContext(defaultContext);
    BaseContext.displayName = rootComponentName + "Context";
    const index = defaultContexts.length;
    defaultContexts = [...defaultContexts, defaultContext];
    const Provider = /* @__PURE__ */ __name$a((props) => {
      var _a2;
      const { scope, children, ...context } = props;
      const Context = ((_a2 = scope == null ? void 0 : scope[scopeName]) == null ? void 0 : _a2[index]) || BaseContext;
      const value = reactExports.useMemo(() => context, Object.values(context));
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Context.Provider, { value, children });
    }, "Provider");
    Provider.displayName = rootComponentName + "Provider";
    function useContext2(consumerName, scope, options = {}) {
      var _a2;
      const { optional = false } = options;
      const Context = ((_a2 = scope == null ? void 0 : scope[scopeName]) == null ? void 0 : _a2[index]) || BaseContext;
      const context = reactExports.useContext(Context);
      if (context) return context;
      if (defaultContext !== void 0) return defaultContext;
      if (optional) return void 0;
      throw new Error(`\`${consumerName}\` must be used within \`${rootComponentName}\``);
    }
    __name$a(useContext2, "useContext");
    return [Provider, useContext2];
  }
  __name$a(createContext3, "createContext");
  const createScope = /* @__PURE__ */ __name$a(() => {
    const scopeContexts = defaultContexts.map((defaultContext) => {
      return reactExports.createContext(defaultContext);
    });
    return /* @__PURE__ */ __name$a(function useScope(scope) {
      const contexts = (scope == null ? void 0 : scope[scopeName]) || scopeContexts;
      return reactExports.useMemo(
        () => ({ [`__scope${scopeName}`]: { ...scope, [scopeName]: contexts } }),
        [scope, contexts]
      );
    }, "useScope");
  }, "createScope");
  createScope.scopeName = scopeName;
  return [createContext3, composeContextScopes(createScope, ...createContextScopeDeps)];
}
__name$a(createContextScope, "createContextScope");
function composeContextScopes(...scopes) {
  const baseScope = scopes[0];
  if (scopes.length === 1) return baseScope;
  const createScope = /* @__PURE__ */ __name$a(() => {
    const scopeHooks = scopes.map((createScope2) => ({
      useScope: createScope2(),
      scopeName: createScope2.scopeName
    }));
    return /* @__PURE__ */ __name$a(function useComposedScopes(overrideScopes) {
      const nextScopes = scopeHooks.reduce((nextScopes2, { useScope, scopeName }) => {
        const scopeProps = useScope(overrideScopes);
        const currentScope = scopeProps[`__scope${scopeName}`];
        return { ...nextScopes2, ...currentScope };
      }, {});
      return reactExports.useMemo(() => ({ [`__scope${baseScope.scopeName}`]: nextScopes }), [nextScopes]);
    }, "useComposedScopes");
  }, "createScope");
  createScope.scopeName = baseScope.scopeName;
  return createScope;
}
__name$a(composeContextScopes, "composeContextScopes");
var __defProp$9 = Object.defineProperty;
var __name$9 = (target, value) => __defProp$9(target, "name", { value, configurable: true });
// @__NO_SIDE_EFFECTS__
function createCollection(name) {
  const PROVIDER_NAME = name + "CollectionProvider";
  const [createCollectionContext, createCollectionScope2] = /* @__PURE__ */ createContextScope(PROVIDER_NAME);
  const [CollectionProviderImpl, useCollectionContext] = createCollectionContext(
    PROVIDER_NAME,
    { collectionRef: { current: null }, itemMap: /* @__PURE__ */ new Map() }
  );
  const CollectionProvider = /* @__PURE__ */ __name$9((props) => {
    const { scope, children } = props;
    const ref = reactExports.useRef(null);
    const itemMap = reactExports.useRef(/* @__PURE__ */ new Map()).current;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(CollectionProviderImpl, { scope, itemMap, collectionRef: ref, children });
  }, "CollectionProvider");
  CollectionProvider.displayName = PROVIDER_NAME;
  const COLLECTION_SLOT_NAME = name + "CollectionSlot";
  const CollectionSlotImpl = createSlot(COLLECTION_SLOT_NAME);
  const CollectionSlot = reactExports.forwardRef(
    (props, forwardedRef) => {
      const { scope, children } = props;
      const context = useCollectionContext(COLLECTION_SLOT_NAME, scope);
      const composedRefs = useComposedRefs(forwardedRef, context.collectionRef);
      return /* @__PURE__ */ jsxRuntimeExports.jsx(CollectionSlotImpl, { ref: composedRefs, children });
    }
  );
  CollectionSlot.displayName = COLLECTION_SLOT_NAME;
  const ITEM_SLOT_NAME = name + "CollectionItemSlot";
  const ITEM_DATA_ATTR = "data-radix-collection-item";
  const CollectionItemSlotImpl = createSlot(ITEM_SLOT_NAME);
  const CollectionItemSlot = reactExports.forwardRef(
    (props, forwardedRef) => {
      const { scope, children, ...itemData } = props;
      const ref = reactExports.useRef(null);
      const composedRefs = useComposedRefs(forwardedRef, ref);
      const context = useCollectionContext(ITEM_SLOT_NAME, scope);
      reactExports.useEffect(() => {
        context.itemMap.set(ref, { ref, ...itemData });
        return () => void context.itemMap.delete(ref);
      });
      return /* @__PURE__ */ jsxRuntimeExports.jsx(CollectionItemSlotImpl, { ...{ [ITEM_DATA_ATTR]: "" }, ref: composedRefs, children });
    }
  );
  CollectionItemSlot.displayName = ITEM_SLOT_NAME;
  function useCollection2(scope) {
    const context = useCollectionContext(name + "CollectionConsumer", scope);
    const getItems = reactExports.useCallback(() => {
      const collectionNode = context.collectionRef.current;
      if (!collectionNode) return [];
      const orderedNodes = Array.from(collectionNode.querySelectorAll(`[${ITEM_DATA_ATTR}]`));
      const items = Array.from(context.itemMap.values());
      const orderedItems = items.sort(
        (a, b) => orderedNodes.indexOf(a.ref.current) - orderedNodes.indexOf(b.ref.current)
      );
      return orderedItems;
    }, [context.collectionRef, context.itemMap]);
    return getItems;
  }
  __name$9(useCollection2, "useCollection");
  return [
    { Provider: CollectionProvider, Slot: CollectionSlot, ItemSlot: CollectionItemSlot },
    useCollection2,
    createCollectionScope2
  ];
}
__name$9(createCollection, "createCollection");
var __instanciated = /* @__PURE__ */ new WeakMap();
var OrderedDict = (_a = class extends Map {
  constructor(entries) {
    super(entries);
    __privateAdd(this, _keys);
    __privateSet(this, _keys, [...super.keys()]);
    __instanciated.set(this, true);
  }
  set(key, value) {
    if (__instanciated.get(this)) {
      if (this.has(key)) {
        __privateGet(this, _keys)[__privateGet(this, _keys).indexOf(key)] = key;
      } else {
        __privateGet(this, _keys).push(key);
      }
    }
    super.set(key, value);
    return this;
  }
  insert(index, key, value) {
    const has = this.has(key);
    const length = __privateGet(this, _keys).length;
    const relativeIndex = toSafeInteger(index);
    let actualIndex = relativeIndex >= 0 ? relativeIndex : length + relativeIndex;
    const safeIndex = actualIndex < 0 || actualIndex >= length ? -1 : actualIndex;
    if (safeIndex === this.size || has && safeIndex === this.size - 1 || safeIndex === -1) {
      this.set(key, value);
      return this;
    }
    const size = this.size + (has ? 0 : 1);
    if (relativeIndex < 0) {
      actualIndex++;
    }
    const keys = [...__privateGet(this, _keys)];
    let nextValue;
    let shouldSkip = false;
    for (let i = actualIndex; i < size; i++) {
      if (actualIndex === i) {
        let nextKey = keys[i];
        if (keys[i] === key) {
          nextKey = keys[i + 1];
        }
        if (has) {
          this.delete(key);
        }
        nextValue = this.get(nextKey);
        this.set(key, value);
      } else {
        if (!shouldSkip && keys[i - 1] === key) {
          shouldSkip = true;
        }
        const currentKey = keys[shouldSkip ? i : i - 1];
        const currentValue = nextValue;
        nextValue = this.get(currentKey);
        this.delete(currentKey);
        this.set(currentKey, currentValue);
      }
    }
    return this;
  }
  with(index, key, value) {
    const copy = new _a(this);
    copy.insert(index, key, value);
    return copy;
  }
  before(key) {
    const index = __privateGet(this, _keys).indexOf(key) - 1;
    if (index < 0) {
      return void 0;
    }
    return this.entryAt(index);
  }
  /**
   * Sets a new key-value pair at the position before the given key.
   */
  setBefore(key, newKey, value) {
    const index = __privateGet(this, _keys).indexOf(key);
    if (index === -1) {
      return this;
    }
    return this.insert(index, newKey, value);
  }
  after(key) {
    let index = __privateGet(this, _keys).indexOf(key);
    index = index === -1 || index === this.size - 1 ? -1 : index + 1;
    if (index === -1) {
      return void 0;
    }
    return this.entryAt(index);
  }
  /**
   * Sets a new key-value pair at the position after the given key.
   */
  setAfter(key, newKey, value) {
    const index = __privateGet(this, _keys).indexOf(key);
    if (index === -1) {
      return this;
    }
    return this.insert(index + 1, newKey, value);
  }
  first() {
    return this.entryAt(0);
  }
  last() {
    return this.entryAt(-1);
  }
  clear() {
    __privateSet(this, _keys, []);
    return super.clear();
  }
  delete(key) {
    const deleted = super.delete(key);
    if (deleted) {
      __privateGet(this, _keys).splice(__privateGet(this, _keys).indexOf(key), 1);
    }
    return deleted;
  }
  deleteAt(index) {
    const key = this.keyAt(index);
    if (key !== void 0) {
      return this.delete(key);
    }
    return false;
  }
  at(index) {
    const key = at(__privateGet(this, _keys), index);
    if (key !== void 0) {
      return this.get(key);
    }
  }
  entryAt(index) {
    const key = at(__privateGet(this, _keys), index);
    if (key !== void 0) {
      return [key, this.get(key)];
    }
  }
  indexOf(key) {
    return __privateGet(this, _keys).indexOf(key);
  }
  keyAt(index) {
    return at(__privateGet(this, _keys), index);
  }
  from(key, offset) {
    const index = this.indexOf(key);
    if (index === -1) {
      return void 0;
    }
    let dest = index + offset;
    if (dest < 0) dest = 0;
    if (dest >= this.size) dest = this.size - 1;
    return this.at(dest);
  }
  keyFrom(key, offset) {
    const index = this.indexOf(key);
    if (index === -1) {
      return void 0;
    }
    let dest = index + offset;
    if (dest < 0) dest = 0;
    if (dest >= this.size) dest = this.size - 1;
    return this.keyAt(dest);
  }
  find(predicate, thisArg) {
    let index = 0;
    for (const entry of this) {
      if (Reflect.apply(predicate, thisArg, [entry, index, this])) {
        return entry;
      }
      index++;
    }
    return void 0;
  }
  findIndex(predicate, thisArg) {
    let index = 0;
    for (const entry of this) {
      if (Reflect.apply(predicate, thisArg, [entry, index, this])) {
        return index;
      }
      index++;
    }
    return -1;
  }
  filter(predicate, thisArg) {
    const entries = [];
    let index = 0;
    for (const entry of this) {
      if (Reflect.apply(predicate, thisArg, [entry, index, this])) {
        entries.push(entry);
      }
      index++;
    }
    return new _a(entries);
  }
  map(callbackfn, thisArg) {
    const entries = [];
    let index = 0;
    for (const entry of this) {
      entries.push([entry[0], Reflect.apply(callbackfn, thisArg, [entry, index, this])]);
      index++;
    }
    return new _a(entries);
  }
  reduce(...args) {
    const [callbackfn, initialValue] = args;
    let index = 0;
    let accumulator = initialValue ?? this.at(0);
    for (const entry of this) {
      if (index === 0 && args.length === 1) {
        accumulator = entry;
      } else {
        accumulator = Reflect.apply(callbackfn, this, [accumulator, entry, index, this]);
      }
      index++;
    }
    return accumulator;
  }
  reduceRight(...args) {
    const [callbackfn, initialValue] = args;
    let accumulator = initialValue ?? this.at(-1);
    for (let index = this.size - 1; index >= 0; index--) {
      const entry = this.at(index);
      if (index === this.size - 1 && args.length === 1) {
        accumulator = entry;
      } else {
        accumulator = Reflect.apply(callbackfn, this, [accumulator, entry, index, this]);
      }
    }
    return accumulator;
  }
  toSorted(compareFn) {
    const entries = [...this.entries()].sort(compareFn);
    return new _a(entries);
  }
  toReversed() {
    const reversed = new _a();
    for (let index = this.size - 1; index >= 0; index--) {
      const key = this.keyAt(index);
      const element = this.get(key);
      reversed.set(key, element);
    }
    return reversed;
  }
  toSpliced(...args) {
    const entries = [...this.entries()];
    entries.splice(...args);
    return new _a(entries);
  }
  slice(start, end) {
    const result = new _a();
    let stop = this.size - 1;
    if (start === void 0) {
      return result;
    }
    if (start < 0) {
      start = start + this.size;
    }
    if (end !== void 0 && end > 0) {
      stop = end - 1;
    }
    for (let index = start; index <= stop; index++) {
      const key = this.keyAt(index);
      const element = this.get(key);
      result.set(key, element);
    }
    return result;
  }
  every(predicate, thisArg) {
    let index = 0;
    for (const entry of this) {
      if (!Reflect.apply(predicate, thisArg, [entry, index, this])) {
        return false;
      }
      index++;
    }
    return true;
  }
  some(predicate, thisArg) {
    let index = 0;
    for (const entry of this) {
      if (Reflect.apply(predicate, thisArg, [entry, index, this])) {
        return true;
      }
      index++;
    }
    return false;
  }
}, _keys = new WeakMap(), __name$9(_a, "OrderedDict"), _a);
function at(array, index) {
  if ("at" in Array.prototype) {
    return Array.prototype.at.call(array, index);
  }
  const actualIndex = toSafeIndex(array, index);
  return actualIndex === -1 ? void 0 : array[actualIndex];
}
__name$9(at, "at");
function toSafeIndex(array, index) {
  const length = array.length;
  const relativeIndex = toSafeInteger(index);
  const actualIndex = relativeIndex >= 0 ? relativeIndex : length + relativeIndex;
  return actualIndex < 0 || actualIndex >= length ? -1 : actualIndex;
}
__name$9(toSafeIndex, "toSafeIndex");
function toSafeInteger(number) {
  return number !== number || number === 0 ? 0 : Math.trunc(number);
}
__name$9(toSafeInteger, "toSafeInteger");
// @__NO_SIDE_EFFECTS__
function createCollection2(name) {
  const PROVIDER_NAME = name + "CollectionProvider";
  const [createCollectionContext, createCollectionScope2] = /* @__PURE__ */ createContextScope(PROVIDER_NAME);
  const [CollectionContextProvider, useCollectionContext] = createCollectionContext(
    PROVIDER_NAME,
    {
      collectionElement: null,
      collectionRef: { current: null },
      collectionRefObject: { current: null },
      itemMap: new OrderedDict(),
      setItemMap: /* @__PURE__ */ __name$9(() => void 0, "setItemMap")
    }
  );
  const CollectionProvider = /* @__PURE__ */ __name$9(({ state, ...props }) => {
    return state ? /* @__PURE__ */ jsxRuntimeExports.jsx(CollectionProviderImpl, { ...props, state }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CollectionInit, { ...props });
  }, "CollectionProvider");
  CollectionProvider.displayName = PROVIDER_NAME;
  const CollectionInit = /* @__PURE__ */ __name$9((props) => {
    const state = useInitCollection();
    return /* @__PURE__ */ jsxRuntimeExports.jsx(CollectionProviderImpl, { ...props, state });
  }, "CollectionInit");
  CollectionInit.displayName = PROVIDER_NAME + "Init";
  const CollectionProviderImpl = /* @__PURE__ */ __name$9((props) => {
    const { scope, children, state } = props;
    const ref = reactExports.useRef(null);
    const [collectionElement, setCollectionElement] = reactExports.useState(
      null
    );
    const composeRefs = useComposedRefs(ref, setCollectionElement);
    const [itemMap, setItemMap] = state;
    reactExports.useEffect(() => {
      if (!collectionElement) return;
      const observer = getChildListObserver(() => {
      });
      observer.observe(collectionElement, {
        childList: true,
        subtree: true
      });
      return () => {
        observer.disconnect();
      };
    }, [collectionElement]);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      CollectionContextProvider,
      {
        scope,
        itemMap,
        setItemMap,
        collectionRef: composeRefs,
        collectionRefObject: ref,
        collectionElement,
        children
      }
    );
  }, "CollectionProviderImpl");
  CollectionProviderImpl.displayName = PROVIDER_NAME + "Impl";
  const COLLECTION_SLOT_NAME = name + "CollectionSlot";
  const CollectionSlotImpl = createSlot(COLLECTION_SLOT_NAME);
  const CollectionSlot = reactExports.forwardRef(
    (props, forwardedRef) => {
      const { scope, children } = props;
      const context = useCollectionContext(COLLECTION_SLOT_NAME, scope);
      const composedRefs = useComposedRefs(forwardedRef, context.collectionRef);
      return /* @__PURE__ */ jsxRuntimeExports.jsx(CollectionSlotImpl, { ref: composedRefs, children });
    }
  );
  CollectionSlot.displayName = COLLECTION_SLOT_NAME;
  const ITEM_SLOT_NAME = name + "CollectionItemSlot";
  const ITEM_DATA_ATTR = "data-radix-collection-item";
  const CollectionItemSlotImpl = createSlot(ITEM_SLOT_NAME);
  const CollectionItemSlot = reactExports.forwardRef(
    (props, forwardedRef) => {
      const { scope, children, ...itemData } = props;
      const ref = reactExports.useRef(null);
      const [element, setElement] = reactExports.useState(null);
      const composedRefs = useComposedRefs(forwardedRef, ref, setElement);
      const context = useCollectionContext(ITEM_SLOT_NAME, scope);
      const { setItemMap } = context;
      const itemDataRef = reactExports.useRef(itemData);
      if (!shallowEqual(itemDataRef.current, itemData)) {
        itemDataRef.current = itemData;
      }
      const memoizedItemData = itemDataRef.current;
      reactExports.useEffect(() => {
        const itemData2 = memoizedItemData;
        setItemMap((map) => {
          if (!element) {
            return map;
          }
          if (!map.has(element)) {
            map.set(element, { ...itemData2, element });
            return map.toSorted(sortByDocumentPosition);
          }
          return map.set(element, { ...itemData2, element }).toSorted(sortByDocumentPosition);
        });
        return () => {
          setItemMap((map) => {
            if (!element || !map.has(element)) {
              return map;
            }
            map.delete(element);
            return new OrderedDict(map);
          });
        };
      }, [element, memoizedItemData, setItemMap]);
      return /* @__PURE__ */ jsxRuntimeExports.jsx(CollectionItemSlotImpl, { ...{ [ITEM_DATA_ATTR]: "" }, ref: composedRefs, children });
    }
  );
  CollectionItemSlot.displayName = ITEM_SLOT_NAME;
  function useInitCollection() {
    return reactExports.useState(new OrderedDict());
  }
  __name$9(useInitCollection, "useInitCollection");
  function useCollection2(scope) {
    const { itemMap } = useCollectionContext(name + "CollectionConsumer", scope);
    return itemMap;
  }
  __name$9(useCollection2, "useCollection");
  const functions = {
    createCollectionScope: createCollectionScope2,
    useCollection: useCollection2,
    useInitCollection
  };
  return [
    { Provider: CollectionProvider, Slot: CollectionSlot, ItemSlot: CollectionItemSlot },
    functions
  ];
}
__name$9(createCollection2, "createCollection");
function shallowEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object") return false;
  if (a == null || b == null) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (a[key] !== b[key]) return false;
  }
  return true;
}
__name$9(shallowEqual, "shallowEqual");
function isElementPreceding(a, b) {
  return !!(b.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_PRECEDING);
}
__name$9(isElementPreceding, "isElementPreceding");
function sortByDocumentPosition(a, b) {
  return !a[1].element || !b[1].element ? 0 : isElementPreceding(a[1].element, b[1].element) ? -1 : 1;
}
__name$9(sortByDocumentPosition, "sortByDocumentPosition");
function getChildListObserver(callback) {
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        callback();
        return;
      }
    }
  });
  return observer;
}
__name$9(getChildListObserver, "getChildListObserver");
var useLayoutEffect2 = (globalThis == null ? void 0 : globalThis.document) ? reactExports.useLayoutEffect : () => {
};
var __defProp$8 = Object.defineProperty;
var __name$8 = (target, value) => __defProp$8(target, "name", { value, configurable: true });
var useReactId = React2[" useId ".trim().toString()] || (() => void 0);
var count = 0;
function useId(deterministicId) {
  const [id, setId] = reactExports.useState(useReactId());
  useLayoutEffect2(() => {
    if (!deterministicId) setId((reactId) => reactId ?? String(count++));
  }, [deterministicId]);
  return deterministicId || (id ? `radix-${id}` : "");
}
__name$8(useId, "useId");
var __defProp$7 = Object.defineProperty;
var __name$7 = (target, value) => __defProp$7(target, "name", { value, configurable: true });
function useCallbackRef(callback) {
  const callbackRef = reactExports.useRef(callback);
  reactExports.useEffect(() => {
    callbackRef.current = callback;
  });
  return reactExports.useMemo(() => (...args) => {
    var _a2;
    return (_a2 = callbackRef.current) == null ? void 0 : _a2.call(callbackRef, ...args);
  }, []);
}
__name$7(useCallbackRef, "useCallbackRef");
var __defProp$6 = Object.defineProperty;
var __name$6 = (target, value) => __defProp$6(target, "name", { value, configurable: true });
var useReactEffectEvent = React2[" useEffectEvent ".trim().toString()];
var useReactInsertionEffect = React2[" useInsertionEffect ".trim().toString()];
function useEffectEvent(callback) {
  if (typeof useReactEffectEvent === "function") {
    return useReactEffectEvent(callback);
  }
  const ref = reactExports.useRef(() => {
    throw new Error("Cannot call an event handler while rendering.");
  });
  if (typeof useReactInsertionEffect === "function") {
    useReactInsertionEffect(() => {
      ref.current = callback;
    });
  } else {
    useLayoutEffect2(() => {
      ref.current = callback;
    });
  }
  return reactExports.useMemo(() => (...args) => {
    var _a2;
    return (_a2 = ref.current) == null ? void 0 : _a2.call(ref, ...args);
  }, []);
}
__name$6(useEffectEvent, "useEffectEvent");
var __defProp$5 = Object.defineProperty;
var __name$5 = (target, value) => __defProp$5(target, "name", { value, configurable: true });
var useInsertionEffect = React2[" useInsertionEffect ".trim().toString()] || useLayoutEffect2;
function useControllableState({
  prop,
  defaultProp,
  onChange = /* @__PURE__ */ __name$5(() => {
  }, "onChange"),
  caller
}) {
  const [uncontrolledProp, setUncontrolledProp, onChangeRef] = useUncontrolledState({
    defaultProp,
    onChange
  });
  const isControlled = prop !== void 0;
  const value = isControlled ? prop : uncontrolledProp;
  const setValue = reactExports.useCallback(
    (nextValue) => {
      var _a2;
      if (isControlled) {
        const value2 = isFunction(nextValue) ? nextValue(prop) : nextValue;
        if (value2 !== prop) {
          (_a2 = onChangeRef.current) == null ? void 0 : _a2.call(onChangeRef, value2);
        }
      } else {
        setUncontrolledProp(nextValue);
      }
    },
    [isControlled, prop, setUncontrolledProp, onChangeRef]
  );
  return [value, setValue];
}
__name$5(useControllableState, "useControllableState");
function useUncontrolledState({
  defaultProp,
  onChange
}) {
  const [value, setValue] = reactExports.useState(defaultProp);
  const prevValueRef = reactExports.useRef(value);
  const onChangeRef = reactExports.useRef(onChange);
  useInsertionEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  reactExports.useEffect(() => {
    var _a2;
    if (prevValueRef.current !== value) {
      (_a2 = onChangeRef.current) == null ? void 0 : _a2.call(onChangeRef, value);
      prevValueRef.current = value;
    }
  }, [value, prevValueRef]);
  return [value, setValue, onChangeRef];
}
__name$5(useUncontrolledState, "useUncontrolledState");
function isFunction(value) {
  return typeof value === "function";
}
__name$5(isFunction, "isFunction");
var SYNC_STATE = Symbol("RADIX:SYNC_STATE");
function useControllableStateReducer(reducer, userArgs, initialArg, init) {
  const { prop: controlledState, defaultProp, onChange: onChangeProp, caller } = userArgs;
  const isControlled = controlledState !== void 0;
  const onChange = useEffectEvent(onChangeProp);
  const args = [{ ...initialArg, state: defaultProp }];
  if (init) {
    args.push(init);
  }
  const [internalState, dispatch] = reactExports.useReducer(
    (state2, action) => {
      if (action.type === SYNC_STATE) {
        return { ...state2, state: action.state };
      }
      const next = reducer(state2, action);
      if (isControlled && !Object.is(next.state, state2.state)) {
        onChange(next.state);
      }
      return next;
    },
    ...args
  );
  const uncontrolledState = internalState.state;
  const prevValueRef = reactExports.useRef(uncontrolledState);
  reactExports.useEffect(() => {
    if (prevValueRef.current !== uncontrolledState) {
      prevValueRef.current = uncontrolledState;
      if (!isControlled) {
        onChange(uncontrolledState);
      }
    }
  }, [uncontrolledState, prevValueRef, isControlled]);
  const state = reactExports.useMemo(() => {
    const isControlled2 = controlledState !== void 0;
    if (isControlled2) {
      return { ...internalState, state: controlledState };
    }
    return internalState;
  }, [internalState, controlledState]);
  reactExports.useEffect(() => {
    if (isControlled && !Object.is(controlledState, internalState.state)) {
      dispatch({ type: SYNC_STATE, state: controlledState });
    }
  }, [controlledState, internalState.state, isControlled]);
  return [state, dispatch];
}
__name$5(useControllableStateReducer, "useControllableStateReducer");
var __defProp$4 = Object.defineProperty;
var __name$4 = (target, value) => __defProp$4(target, "name", { value, configurable: true });
var DirectionContext = reactExports.createContext(void 0);
function useDirection(localDir) {
  const globalDir = reactExports.useContext(DirectionContext);
  return localDir || globalDir || "ltr";
}
__name$4(useDirection, "useDirection");
var __defProp$3 = Object.defineProperty;
var __name$3 = (target, value) => __defProp$3(target, "name", { value, configurable: true });
var _isHydrated = false;
function useIsHydrated() {
  const [isHydrated, setIsHydrated] = reactExports.useState(_isHydrated);
  reactExports.useEffect(() => {
    if (!_isHydrated) {
      _isHydrated = true;
      setIsHydrated(true);
    }
  }, []);
  return isHydrated;
}
__name$3(useIsHydrated, "useIsHydrated");
var useReactSyncExternalStore = React2[" useSyncExternalStore ".trim().toString()];
function subscribe() {
  return () => {
  };
}
__name$3(subscribe, "subscribe");
function useIsHydratedModern() {
  return useReactSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
__name$3(useIsHydratedModern, "useIsHydratedModern");
var useIsHydrated2 = typeof useReactSyncExternalStore === "function" ? useIsHydratedModern : useIsHydrated;
var __defProp$2 = Object.defineProperty;
var __name$2 = (target, value) => __defProp$2(target, "name", { value, configurable: true });
var ENTRY_FOCUS = "rovingFocusGroup.onEntryFocus";
var EVENT_OPTIONS = { bubbles: false, cancelable: true };
var GROUP_NAME = "RovingFocusGroup";
var [Collection, useCollection, createCollectionScope] = /* @__PURE__ */ createCollection(GROUP_NAME);
var [createRovingFocusGroupContext, createRovingFocusGroupScope] = /* @__PURE__ */ createContextScope(
  GROUP_NAME,
  [createCollectionScope]
);
var [RovingFocusProvider, useRovingFocusContext] = createRovingFocusGroupContext(GROUP_NAME);
var RovingFocusGroup = /* @__PURE__ */ reactExports.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ __name$2(function RovingFocusGroup2(props, forwardedRef) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Collection.Provider, { scope: props.__scopeRovingFocusGroup, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Collection.Slot, { scope: props.__scopeRovingFocusGroup, children: /* @__PURE__ */ jsxRuntimeExports.jsx(RovingFocusGroupImpl, { ...props, ref: forwardedRef }) }) });
  }, "RovingFocusGroup")
);
var RovingFocusGroupImpl = /* @__PURE__ */ reactExports.forwardRef(/* @__PURE__ */ __name$2(function RovingFocusGroupImpl2(props, forwardedRef) {
  const {
    __scopeRovingFocusGroup,
    orientation,
    loop = false,
    dir,
    currentTabStopId: currentTabStopIdProp,
    defaultCurrentTabStopId,
    onCurrentTabStopIdChange,
    onEntryFocus,
    preventScrollOnEntryFocus = false,
    ...groupProps
  } = props;
  const ref = reactExports.useRef(null);
  const composedRefs = useComposedRefs(forwardedRef, ref);
  const direction = useDirection(dir);
  const [currentTabStopId, setCurrentTabStopId] = useControllableState({
    prop: currentTabStopIdProp,
    defaultProp: defaultCurrentTabStopId ?? null,
    onChange: onCurrentTabStopIdChange,
    caller: GROUP_NAME
  });
  const [isTabbingBackOut, setIsTabbingBackOut] = reactExports.useState(false);
  const handleEntryFocus = useCallbackRef(onEntryFocus);
  const getItems = useCollection(__scopeRovingFocusGroup);
  const isClickFocusRef = reactExports.useRef(false);
  const [focusableItemsCount, setFocusableItemsCount] = reactExports.useState(0);
  reactExports.useEffect(() => {
    const node = ref.current;
    if (node) {
      node.addEventListener(ENTRY_FOCUS, handleEntryFocus);
      return () => node.removeEventListener(ENTRY_FOCUS, handleEntryFocus);
    }
  }, [handleEntryFocus]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    RovingFocusProvider,
    {
      scope: __scopeRovingFocusGroup,
      orientation,
      dir: direction,
      loop,
      currentTabStopId,
      onItemFocus: reactExports.useCallback(
        (tabStopId) => setCurrentTabStopId(tabStopId),
        [setCurrentTabStopId]
      ),
      onItemShiftTab: reactExports.useCallback(() => setIsTabbingBackOut(true), []),
      onFocusableItemAdd: reactExports.useCallback(
        () => setFocusableItemsCount((prevCount) => prevCount + 1),
        []
      ),
      onFocusableItemRemove: reactExports.useCallback(
        () => setFocusableItemsCount((prevCount) => prevCount - 1),
        []
      ),
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Primitive.div,
        {
          tabIndex: isTabbingBackOut || focusableItemsCount === 0 ? -1 : 0,
          "data-orientation": orientation,
          ...groupProps,
          ref: composedRefs,
          style: { outline: "none", ...props.style },
          onMouseDown: composeEventHandlers(props.onMouseDown, () => {
            isClickFocusRef.current = true;
          }),
          onFocus: composeEventHandlers(props.onFocus, (event) => {
            const isKeyboardFocus = !isClickFocusRef.current;
            if (event.target === event.currentTarget && isKeyboardFocus && !isTabbingBackOut) {
              const entryFocusEvent = new CustomEvent(ENTRY_FOCUS, EVENT_OPTIONS);
              event.currentTarget.dispatchEvent(entryFocusEvent);
              if (!entryFocusEvent.defaultPrevented) {
                const items = getItems().filter((item) => item.focusable);
                const activeItem = items.find((item) => item.active);
                const currentItem = items.find((item) => item.id === currentTabStopId);
                const candidateItems = [activeItem, currentItem, ...items].filter(
                  Boolean
                );
                const candidateNodes = candidateItems.map((item) => item.ref.current);
                focusFirst(candidateNodes, preventScrollOnEntryFocus);
              }
            }
            isClickFocusRef.current = false;
          }),
          onBlur: composeEventHandlers(props.onBlur, () => setIsTabbingBackOut(false))
        }
      )
    }
  );
}, "RovingFocusGroupImpl"));
var ITEM_NAME = "RovingFocusGroupItem";
var RovingFocusGroupItem = /* @__PURE__ */ reactExports.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ __name$2(function RovingFocusGroupItem2(props, forwardedRef) {
    const {
      __scopeRovingFocusGroup,
      focusable = true,
      active = false,
      tabStopId,
      children,
      ...itemProps
    } = props;
    const autoId = useId();
    const id = tabStopId || autoId;
    const context = useRovingFocusContext(ITEM_NAME, __scopeRovingFocusGroup);
    const isCurrentTabStop = context.currentTabStopId === id;
    const getItems = useCollection(__scopeRovingFocusGroup);
    const { onFocusableItemAdd, onFocusableItemRemove, currentTabStopId } = context;
    const isHydrated = useIsHydrated2();
    useLayoutEffect2(() => {
      if (!isHydrated || !focusable) {
        return;
      }
      onFocusableItemAdd();
      return () => onFocusableItemRemove();
    }, [isHydrated, focusable, onFocusableItemAdd, onFocusableItemRemove]);
    reactExports.useEffect(() => {
      if (isHydrated || !focusable) {
        return;
      }
      onFocusableItemAdd();
      return () => onFocusableItemRemove();
    }, [isHydrated, focusable, onFocusableItemAdd, onFocusableItemRemove]);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Collection.ItemSlot,
      {
        scope: __scopeRovingFocusGroup,
        id,
        focusable,
        active,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Primitive.span,
          {
            tabIndex: isCurrentTabStop ? 0 : -1,
            "data-orientation": context.orientation,
            ...itemProps,
            ref: forwardedRef,
            onMouseDown: composeEventHandlers(props.onMouseDown, (event) => {
              if (!focusable) event.preventDefault();
              else context.onItemFocus(id);
            }),
            onFocus: composeEventHandlers(props.onFocus, () => context.onItemFocus(id)),
            onKeyDown: composeEventHandlers(props.onKeyDown, (event) => {
              if (event.key === "Tab" && event.shiftKey) {
                context.onItemShiftTab();
                return;
              }
              if (event.target !== event.currentTarget) return;
              const focusIntent = getFocusIntent(event, context.orientation, context.dir);
              if (focusIntent !== void 0) {
                if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
                event.preventDefault();
                const items = getItems().filter((item) => item.focusable);
                let candidateNodes = items.map((item) => item.ref.current);
                if (focusIntent === "last") candidateNodes.reverse();
                else if (focusIntent === "prev" || focusIntent === "next") {
                  if (focusIntent === "prev") candidateNodes.reverse();
                  const currentIndex = candidateNodes.indexOf(event.currentTarget);
                  candidateNodes = context.loop ? wrapArray(candidateNodes, currentIndex + 1) : candidateNodes.slice(currentIndex + 1);
                }
                setTimeout(() => focusFirst(candidateNodes));
              }
            }),
            children: typeof children === "function" ? children({ isCurrentTabStop, hasTabStop: currentTabStopId != null }) : children
          }
        )
      }
    );
  }, "RovingFocusGroupItem")
);
var MAP_KEY_TO_FOCUS_INTENT = {
  ArrowLeft: "prev",
  ArrowUp: "prev",
  ArrowRight: "next",
  ArrowDown: "next",
  PageUp: "first",
  Home: "first",
  PageDown: "last",
  End: "last"
};
function getDirectionAwareKey(key, dir) {
  if (dir !== "rtl") return key;
  return key === "ArrowLeft" ? "ArrowRight" : key === "ArrowRight" ? "ArrowLeft" : key;
}
__name$2(getDirectionAwareKey, "getDirectionAwareKey");
function getFocusIntent(event, orientation, dir) {
  const key = getDirectionAwareKey(event.key, dir);
  if (orientation === "vertical" && ["ArrowLeft", "ArrowRight"].includes(key)) return void 0;
  if (orientation === "horizontal" && ["ArrowUp", "ArrowDown"].includes(key)) return void 0;
  return MAP_KEY_TO_FOCUS_INTENT[key];
}
__name$2(getFocusIntent, "getFocusIntent");
function focusFirst(candidates, preventScroll = false) {
  const PREVIOUSLY_FOCUSED_ELEMENT = document.activeElement;
  for (const candidate of candidates) {
    if (candidate === PREVIOUSLY_FOCUSED_ELEMENT) return;
    candidate.focus({ preventScroll });
    if (document.activeElement !== PREVIOUSLY_FOCUSED_ELEMENT) return;
  }
}
__name$2(focusFirst, "focusFirst");
function wrapArray(array, startIndex) {
  return array.map((_, index) => array[(startIndex + index) % array.length]);
}
__name$2(wrapArray, "wrapArray");
var Root = RovingFocusGroup;
var Item = RovingFocusGroupItem;
var __defProp$1 = Object.defineProperty;
var __name$1 = (target, value) => __defProp$1(target, "name", { value, configurable: true });
function useStateMachine(initialState, machine) {
  return reactExports.useReducer((state, event) => {
    const nextState = machine[state][event];
    return nextState ?? state;
  }, initialState);
}
__name$1(useStateMachine, "useStateMachine");
var Presence = /* @__PURE__ */ __name$1((props) => {
  const { present, children } = props;
  const presence = usePresence(present);
  const child = typeof children === "function" ? children({ present: presence.isPresent }) : reactExports.Children.only(children);
  const ref = useStableComposedRefs(presence.ref, getElementRef(child));
  const forceMount = typeof children === "function";
  return forceMount || presence.isPresent ? reactExports.cloneElement(child, { ref }) : null;
}, "Presence");
function usePresence(present) {
  const [node, setNode] = reactExports.useState();
  const stylesRef = reactExports.useRef(null);
  const prevPresentRef = reactExports.useRef(present);
  const prevAnimationNameRef = reactExports.useRef("none");
  const mountAnimationNameRef = reactExports.useRef(void 0);
  const initialState = present ? "mounted" : "unmounted";
  const [state, send] = useStateMachine(initialState, {
    mounted: {
      UNMOUNT: "unmounted",
      ANIMATION_OUT: "unmountSuspended"
    },
    unmountSuspended: {
      MOUNT: "mounted",
      ANIMATION_END: "unmounted"
    },
    unmounted: {
      MOUNT: "mounted"
    }
  });
  reactExports.useEffect(() => {
    if (state === "mounted") {
      prevAnimationNameRef.current = mountAnimationNameRef.current ?? getAnimationName(stylesRef.current);
      mountAnimationNameRef.current = void 0;
    } else {
      prevAnimationNameRef.current = "none";
    }
  }, [state]);
  useLayoutEffect2(() => {
    const styles = stylesRef.current;
    const wasPresent = prevPresentRef.current;
    const hasPresentChanged = wasPresent !== present;
    if (hasPresentChanged) {
      const prevAnimationName = prevAnimationNameRef.current;
      const currentAnimationName = getAnimationName(styles);
      if (present) {
        mountAnimationNameRef.current = currentAnimationName;
        send("MOUNT");
      } else if (currentAnimationName === "none" || (styles == null ? void 0 : styles.display) === "none") {
        send("UNMOUNT");
      } else {
        const isAnimating = prevAnimationName !== currentAnimationName;
        if (wasPresent && isAnimating) {
          send("ANIMATION_OUT");
        } else {
          send("UNMOUNT");
        }
      }
      prevPresentRef.current = present;
    }
  }, [present, send]);
  useLayoutEffect2(() => {
    if (node) {
      let timeoutId;
      const ownerWindow = node.ownerDocument.defaultView ?? window;
      const handleAnimationEnd = /* @__PURE__ */ __name$1((event) => {
        const currentAnimationName = getAnimationName(stylesRef.current);
        const isCurrentAnimation = currentAnimationName.includes(CSS.escape(event.animationName));
        if (event.target === node && isCurrentAnimation) {
          send("ANIMATION_END");
          if (!prevPresentRef.current) {
            const currentFillMode = node.style.animationFillMode;
            node.style.animationFillMode = "forwards";
            timeoutId = ownerWindow.setTimeout(() => {
              if (node.style.animationFillMode === "forwards") {
                node.style.animationFillMode = currentFillMode;
              }
            });
          }
        }
      }, "handleAnimationEnd");
      const handleAnimationStart = /* @__PURE__ */ __name$1((event) => {
        if (event.target === node) {
          prevAnimationNameRef.current = getAnimationName(stylesRef.current);
        }
      }, "handleAnimationStart");
      node.addEventListener("animationstart", handleAnimationStart);
      node.addEventListener("animationcancel", handleAnimationEnd);
      node.addEventListener("animationend", handleAnimationEnd);
      return () => {
        ownerWindow.clearTimeout(timeoutId);
        node.removeEventListener("animationstart", handleAnimationStart);
        node.removeEventListener("animationcancel", handleAnimationEnd);
        node.removeEventListener("animationend", handleAnimationEnd);
      };
    } else {
      send("ANIMATION_END");
    }
  }, [node, send]);
  return {
    isPresent: ["mounted", "unmountSuspended"].includes(state),
    ref: reactExports.useCallback((node2) => {
      if (node2) {
        const styles = getComputedStyle(node2);
        stylesRef.current = styles;
        mountAnimationNameRef.current = getAnimationName(styles);
      } else {
        stylesRef.current = null;
      }
      setNode(node2);
    }, [])
  };
}
__name$1(usePresence, "usePresence");
function setRef(ref, value) {
  if (typeof ref === "function") {
    return ref(value);
  } else if (ref !== null && ref !== void 0) {
    ref.current = value;
  }
}
__name$1(setRef, "setRef");
function useStableComposedRefs(...refs) {
  const refsRef = reactExports.useRef(refs);
  refsRef.current = refs;
  return reactExports.useCallback((node) => {
    const currentRefs = refsRef.current;
    let hasCleanup = false;
    const cleanups = currentRefs.map((ref) => {
      const cleanup = setRef(ref, node);
      if (!hasCleanup && typeof cleanup === "function") {
        hasCleanup = true;
      }
      return cleanup;
    });
    if (hasCleanup) {
      return () => {
        for (let i = 0; i < cleanups.length; i++) {
          const cleanup = cleanups[i];
          if (typeof cleanup === "function") {
            cleanup();
          } else {
            setRef(currentRefs[i], null);
          }
        }
      };
    }
  }, []);
}
__name$1(useStableComposedRefs, "useStableComposedRefs");
function getAnimationName(styles) {
  return (styles == null ? void 0 : styles.animationName) || "none";
}
__name$1(getAnimationName, "getAnimationName");
function getElementRef(element) {
  var _a2, _b;
  let getter = (_a2 = Object.getOwnPropertyDescriptor(element.props, "ref")) == null ? void 0 : _a2.get;
  let mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.ref;
  }
  getter = (_b = Object.getOwnPropertyDescriptor(element, "ref")) == null ? void 0 : _b.get;
  mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.props.ref;
  }
  return element.props.ref || element.ref;
}
__name$1(getElementRef, "getElementRef");
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var TABS_NAME = "Tabs";
var [createTabsContext, createTabsScope] = /* @__PURE__ */ createContextScope(TABS_NAME, [
  createRovingFocusGroupScope
]);
var useRovingFocusGroupScope = createRovingFocusGroupScope();
var [TabsProvider, useTabsContext] = createTabsContext(TABS_NAME);
var Tabs$1 = /* @__PURE__ */ reactExports.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ __name(function Tabs2(props, forwardedRef) {
    const {
      __scopeTabs,
      value: valueProp,
      onValueChange,
      defaultValue,
      orientation = "horizontal",
      dir,
      activationMode = "automatic",
      ...tabsProps
    } = props;
    const direction = useDirection(dir);
    const [value, setValue] = useControllableState({
      prop: valueProp,
      onChange: onValueChange,
      defaultProp: defaultValue ?? "",
      caller: TABS_NAME
    });
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      TabsProvider,
      {
        scope: __scopeTabs,
        baseId: useId(),
        value,
        onValueChange: setValue,
        orientation,
        dir: direction,
        activationMode,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Primitive.div,
          {
            dir: direction,
            "data-orientation": orientation,
            ...tabsProps,
            ref: forwardedRef
          }
        )
      }
    );
  }, "Tabs")
);
var TAB_LIST_NAME = "TabsList";
var TabsList$1 = /* @__PURE__ */ reactExports.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ __name(function TabsList2(props, forwardedRef) {
    const { __scopeTabs, loop = true, ...listProps } = props;
    const context = useTabsContext(TAB_LIST_NAME, __scopeTabs);
    const rovingFocusGroupScope = useRovingFocusGroupScope(__scopeTabs);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Root,
      {
        asChild: true,
        ...rovingFocusGroupScope,
        orientation: context.orientation,
        dir: context.dir,
        loop,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Primitive.div,
          {
            role: "tablist",
            "aria-orientation": context.orientation,
            ...listProps,
            ref: forwardedRef
          }
        )
      }
    );
  }, "TabsList")
);
var TRIGGER_NAME = "TabsTrigger";
var TabsTrigger$1 = /* @__PURE__ */ reactExports.forwardRef(
  /* @__PURE__ */ __name(function TabsTrigger2(props, forwardedRef) {
    const { __scopeTabs, value, disabled = false, ...triggerProps } = props;
    const context = useTabsContext(TRIGGER_NAME, __scopeTabs);
    const rovingFocusGroupScope = useRovingFocusGroupScope(__scopeTabs);
    const triggerId = makeTriggerId(context.baseId, value);
    const contentId = makeContentId(context.baseId, value);
    const isSelected = value === context.value;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Item,
      {
        asChild: true,
        ...rovingFocusGroupScope,
        focusable: !disabled,
        active: isSelected,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Primitive.button,
          {
            type: "button",
            role: "tab",
            "aria-selected": isSelected,
            "aria-controls": contentId,
            "data-state": isSelected ? "active" : "inactive",
            "data-disabled": disabled ? "" : void 0,
            disabled,
            id: triggerId,
            ...triggerProps,
            ref: forwardedRef,
            onMouseDown: composeEventHandlers(props.onMouseDown, (event) => {
              if (!disabled && event.button === 0 && event.ctrlKey === false) {
                context.onValueChange(value);
              } else {
                event.preventDefault();
              }
            }),
            onKeyDown: composeEventHandlers(props.onKeyDown, (event) => {
              if (disabled || event.target !== event.currentTarget) {
                return;
              }
              if ([" ", "Enter"].includes(event.key)) {
                context.onValueChange(value);
              }
            }),
            onFocus: composeEventHandlers(props.onFocus, () => {
              const isAutomaticActivation = context.activationMode !== "manual";
              if (!isSelected && !disabled && isAutomaticActivation) {
                context.onValueChange(value);
              }
            })
          }
        )
      }
    );
  }, "TabsTrigger")
);
var CONTENT_NAME = "TabsContent";
var TabsContent$1 = /* @__PURE__ */ reactExports.forwardRef(
  /* @__PURE__ */ __name(function TabsContent2(props, forwardedRef) {
    const { __scopeTabs, value, forceMount, children, ...contentProps } = props;
    const context = useTabsContext(CONTENT_NAME, __scopeTabs);
    const triggerId = makeTriggerId(context.baseId, value);
    const contentId = makeContentId(context.baseId, value);
    const isSelected = value === context.value;
    const isMountAnimationPreventedRef = reactExports.useRef(isSelected);
    reactExports.useEffect(() => {
      const rAF = requestAnimationFrame(() => isMountAnimationPreventedRef.current = false);
      return () => cancelAnimationFrame(rAF);
    }, []);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Presence, { present: forceMount || isSelected, children: ({ present }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.div,
      {
        "data-state": isSelected ? "active" : "inactive",
        "data-orientation": context.orientation,
        role: "tabpanel",
        "aria-labelledby": triggerId,
        hidden: !present,
        id: contentId,
        tabIndex: 0,
        ...contentProps,
        ref: forwardedRef,
        style: {
          ...props.style,
          animationDuration: isMountAnimationPreventedRef.current ? "0s" : void 0
        },
        children: present && children
      }
    ) });
  }, "TabsContent")
);
function makeTriggerId(baseId, value) {
  return `${baseId}-trigger-${value}`;
}
__name(makeTriggerId, "makeTriggerId");
function makeContentId(baseId, value) {
  return `${baseId}-content-${value}`;
}
__name(makeContentId, "makeContentId");
var Root2 = Tabs$1;
var List = TabsList$1;
var Trigger = TabsTrigger$1;
var Content = TabsContent$1;
function Tabs({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Root2,
    {
      "data-slot": "tabs",
      className: cn("flex flex-col gap-2", className),
      ...props
    }
  );
}
function TabsList({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    List,
    {
      "data-slot": "tabs-list",
      className: cn(
        "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
        className
      ),
      ...props
    }
  );
}
function TabsTrigger({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Trigger,
    {
      "data-slot": "tabs-trigger",
      className: cn(
        "data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      ),
      ...props
    }
  );
}
function TabsContent({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Content,
    {
      "data-slot": "tabs-content",
      className: cn("flex-1 outline-none", className),
      ...props
    }
  );
}
const ADMIN_PRINCIPAL = "rc62u-qypnw-bbkkp-d56wk-tnzaq-vwhi2-cqqay-q56hw-gsqbp-6wegl-jae";
function StatusLine({ status }) {
  if (!status) return null;
  const color = status.busy ? "bg-zinc-800 border-zinc-700 text-zinc-300" : status.ok ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `mt-3 text-xs rounded-lg px-3 py-2 border font-mono break-all ${color}`, children: [
    status.busy && /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-3 h-3 mr-1.5 animate-spin inline" }),
    status.message
  ] });
}
function Section({ title, children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-zinc-800 bg-zinc-900 p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-base font-bold text-white mb-4", children: title }),
    children
  ] });
}
function AdminPage() {
  const { identity, login, isLoggingIn } = useInternetIdentity();
  const { data: isAdminData, isLoading: isAdminLoading } = useIsAdmin();
  const callerPrincipal = identity && !identity.getPrincipal().isAnonymous() ? identity.getPrincipal().toText() : null;
  const isLocalAdmin = callerPrincipal === ADMIN_PRINCIPAL;
  const hasAdminAccess = isLocalAdmin || !!isAdminData;
  if (!identity || !callerPrincipal) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-[60vh] flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center max-w-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "w-16 h-16 text-zinc-600 mx-auto mb-4 opacity-40" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-white mb-3", children: "Admin Access" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-zinc-400 text-sm mb-6", children: "Connect your Internet Identity to continue." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: login, disabled: isLoggingIn, className: "bg-yellow-500 hover:bg-yellow-400 text-black font-bold", children: [
        isLoggingIn ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-4 h-4 mr-2 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Wallet, { className: "w-4 h-4 mr-2" }),
        "Connect Identity"
      ] })
    ] }) });
  }
  if (!hasAdminAccess && isAdminLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-[60vh] flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-10 h-10 text-yellow-500 mx-auto mb-3 animate-spin opacity-60" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-zinc-400 text-sm", children: "Verifying admin access…" })
    ] }) });
  }
  if (!hasAdminAccess) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-[60vh] flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center max-w-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "w-16 h-16 text-red-500 mx-auto mb-4 opacity-60" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-white mb-3", children: "Access Denied" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-zinc-400 text-sm mb-2", children: "Not an admin principal." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-zinc-500 font-mono mb-6 break-all bg-zinc-900 border border-zinc-800 rounded-xl p-3", children: callerPrincipal })
    ] }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AdminContent, { callerPrincipal });
}
function AdminContent({ callerPrincipal }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen bg-[#080808]", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "container mx-auto max-w-6xl px-4 sm:px-6 py-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "w-5 h-5 text-yellow-500" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "t-label text-yellow-500", children: "Admin panel" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-3xl font-black text-white", children: "Treasury Management" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-zinc-500 text-xs mt-1 font-mono break-all", children: [
        "Signed in as: ",
        callerPrincipal
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(DiagnosticsBar, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { defaultValue: "treasury", className: "mt-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, { className: "bg-zinc-900 border border-zinc-800 rounded-xl p-1 mb-6 flex flex-wrap gap-1 h-auto", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "treasury", className: "data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-zinc-400 font-semibold rounded-lg px-4 py-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Coins, { className: "w-3.5 h-3.5 mr-1.5" }),
          "Treasury"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "deposits", className: "data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-zinc-400 font-semibold rounded-lg px-4 py-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Bitcoin, { className: "w-3.5 h-3.5 mr-1.5" }),
          "Deposits"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "minter", className: "data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-zinc-400 font-semibold rounded-lg px-4 py-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeftRight, { className: "w-3.5 h-3.5 mr-1.5" }),
          "Mint & Dissolve"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "stranded", className: "data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-zinc-400 font-semibold rounded-lg px-4 py-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "w-3.5 h-3.5 mr-1.5" }),
          "Stranded"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "treasury", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TreasuryTab, {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "deposits", children: /* @__PURE__ */ jsxRuntimeExports.jsx(DepositsTab, {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "minter", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MinterTab, {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "stranded", children: /* @__PURE__ */ jsxRuntimeExports.jsx(StrandedTab, {}) })
    ] })
  ] }) });
}
function DiagnosticsBar() {
  const { identity } = useInternetIdentity();
  const { data: balances, refetch: refetchBalances } = useTreasuryICRC1Balances();
  const [diagStatus, setDiagStatus] = reactExports.useState(null);
  const [who, setWho] = reactExports.useState(null);
  const runDiagnose = async () => {
    var _a2, _b;
    if (!identity) {
      setDiagStatus({ busy: false, ok: false, message: "Not logged in" });
      return;
    }
    setDiagStatus({ busy: true, message: "Querying backend whoAmI…" });
    try {
      const result = await directWhoAmI(identity);
      setWho(result);
      const bal = await refetchBalances();
      const msg = `caller=${result.caller} · isAdmin=${result.isAdmin} (hardcoded=${result.isHardcodedAdmin}, role=${result.hasAdminRole}) · sGLDT=${(_a2 = bal.data) == null ? void 0 : _a2.sgldtBalance} · ckUNI=${(_b = bal.data) == null ? void 0 : _b.ckUNIBalance}`;
      setDiagStatus({ busy: false, ok: !!result.isAdmin, message: msg });
    } catch (err) {
      console.error("[whoAmI] threw:", err);
      setDiagStatus({
        busy: false,
        ok: false,
        message: err instanceof Error ? err.message : "Diagnose failed"
      });
    }
  };
  const grantSelfAdmin = async () => {
    if (!identity || !who) return;
    setDiagStatus({ busy: true, message: `Attempting to grant admin to ${who.caller.slice(0, 12)}…` });
    try {
      const result = await directAdminGrantAdmin(identity, who.caller);
      if (result.startsWith("error:")) {
        setDiagStatus({ busy: false, ok: false, message: result.replace(/^error:\s*/, "") });
        return;
      }
      setDiagStatus({ busy: false, ok: true, message: `${result} — click Diagnose again to verify` });
      setWho(null);
    } catch (err) {
      setDiagStatus({
        busy: false,
        ok: false,
        message: err instanceof Error ? err.message : "Grant failed"
      });
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col sm:flex-row sm:items-center gap-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "t-label text-zinc-500 mb-1", children: "Treasury balances (cached)" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm text-white font-mono", children: [
        "sGLDT ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-yellow-400", children: balances ? (Number(balances.sgldtBalance) / 1e8).toFixed(4) : "…" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-zinc-600 mx-2", children: "·" }),
        "ckUNI ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-blue-400", children: balances ? (Number(balances.ckUNIBalance) / 1e18).toFixed(6) : "…" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "outline", onClick: runDiagnose, disabled: diagStatus == null ? void 0 : diagStatus.busy, className: "shrink-0", children: [
      (diagStatus == null ? void 0 : diagStatus.busy) ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-3.5 h-3.5 mr-1.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-3.5 h-3.5 mr-1.5" }),
      "Diagnose"
    ] }),
    who && !who.isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", onClick: grantSelfAdmin, disabled: diagStatus == null ? void 0 : diagStatus.busy, className: "shrink-0 bg-red-500 hover:bg-red-400 text-white font-bold", children: "Grant me admin" }),
    diagStatus && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusLine, { status: diagStatus }) })
  ] });
}
function TreasuryTab() {
  const { identity } = useInternetIdentity();
  const { data: balances, refetch: refetchBalances } = useTreasuryICRC1Balances();
  const { refetch: refetchWalletInfo } = useGetTreasuryWalletInfo();
  const { data: exchangeRate } = useUNIExchangeRate();
  const setRateMutation = useSetUNIExchangeRate();
  const [rateInput, setRateInput] = reactExports.useState("");
  const [rateStatus, setRateStatus] = reactExports.useState(null);
  const [sgldtTo, setSgldtTo] = reactExports.useState("");
  const [sgldtAmount, setSgldtAmount] = reactExports.useState("");
  const [sgldtStatus, setSgldtStatus] = reactExports.useState(null);
  const [ckuniTo, setCkuniTo] = reactExports.useState("");
  const [ckuniAmount, setCkuniAmount] = reactExports.useState("");
  const [ckuniStatus, setCkuniStatus] = reactExports.useState(null);
  const sgldtAvailable = balances ? Number(balances.sgldtBalance) / 1e8 : 0;
  const ckuniAvailable = balances ? Number(balances.ckUNIBalance) / 1e18 : 0;
  const humanRate = exchangeRate ? (Number(exchangeRate) / 1e8).toFixed(8) : "—";
  const handleSaveRate = async () => {
    const parsed = Number.parseFloat(rateInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setRateStatus({ busy: false, ok: false, message: "Enter a positive number" });
      return;
    }
    setRateStatus({ busy: true, message: `Setting rate to ${parsed} sGLDT/UNI…` });
    try {
      await setRateMutation.mutateAsync(BigInt(Math.round(parsed * 1e8)));
      setRateStatus({ busy: false, ok: true, message: `Exchange rate set to ${parsed} sGLDT per UNI` });
      setRateInput("");
    } catch (err) {
      setRateStatus({ busy: false, ok: false, message: err instanceof Error ? err.message : "Failed" });
    }
  };
  const runAdminTransfer = async (token, toRaw, amountRaw, setStatus, clearForm) => {
    let principal;
    try {
      principal = Principal.fromText(toRaw.trim());
    } catch {
      setStatus({ busy: false, ok: false, message: "Invalid recipient principal" });
      return;
    }
    const parsed = Number.parseFloat(amountRaw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setStatus({ busy: false, ok: false, message: "Enter a positive amount" });
      return;
    }
    if (!identity) {
      setStatus({ busy: false, ok: false, message: "Not logged in — reconnect Internet Identity" });
      return;
    }
    const decimals = token === "sGLDT" ? 1e8 : 1e18;
    const amount = BigInt(Math.round(parsed * decimals));
    setStatus({ busy: true, message: `Sending ${parsed} ${token} → ${principal.toString().slice(0, 12)}…` });
    console.log(`[${token} transfer]`, { to: principal.toString(), amount: amount.toString() });
    try {
      const result = await directAdminTransfer({
        identity,
        token,
        to: principal.toString(),
        amount
      });
      console.log(`[${token} transfer] result:`, result);
      if (result.startsWith("error:")) {
        setStatus({ busy: false, ok: false, message: result.replace(/^error:\s*/, "") });
        return;
      }
      setStatus({ busy: false, ok: true, message: result });
      clearForm();
      refetchBalances();
      refetchWalletInfo();
    } catch (err) {
      console.error(`[${token} transfer] threw:`, err);
      setStatus({
        busy: false,
        ok: false,
        message: err instanceof Error ? err.message : `${token} transfer failed`
      });
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Section, { title: "UNI → sGLDT Exchange Rate", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-zinc-500 mb-3", children: [
        "Current rate: ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-yellow-400 font-mono", children: humanRate }),
        " sGLDT per UNI"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            type: "number",
            min: "0",
            step: "0.00000001",
            value: rateInput,
            onChange: (e) => setRateInput(e.target.value),
            placeholder: humanRate,
            className: "flex-1 bg-zinc-800 border-zinc-700 text-white font-mono"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: handleSaveRate, disabled: !!(rateStatus == null ? void 0 : rateStatus.busy), className: "bg-yellow-500 hover:bg-yellow-400 text-black font-bold", children: (rateStatus == null ? void 0 : rateStatus.busy) ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-4 h-4 animate-spin" }) : "Set Rate" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatusLine, { status: rateStatus })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Section, { title: `Transfer sGLDT from Treasury (balance ${sgldtAvailable.toFixed(4)})`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid sm:grid-cols-2 gap-3 mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs text-zinc-400", children: "Recipient Principal" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: sgldtTo, onChange: (e) => setSgldtTo(e.target.value), placeholder: "aaaaa-bbbbb-…", className: "bg-zinc-800 border-zinc-700 text-white font-mono text-sm" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs text-zinc-400", children: "Amount (sGLDT)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", min: "0", step: "0.00000001", value: sgldtAmount, onChange: (e) => setSgldtAmount(e.target.value), placeholder: "0.00000000", className: "bg-zinc-800 border-zinc-700 text-white font-mono text-sm" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          onClick: () => runAdminTransfer("sGLDT", sgldtTo, sgldtAmount, setSgldtStatus, () => {
            setSgldtTo("");
            setSgldtAmount("");
          }),
          disabled: !!(sgldtStatus == null ? void 0 : sgldtStatus.busy) || !sgldtTo || !sgldtAmount,
          className: "bg-yellow-500 hover:bg-yellow-400 text-black font-bold",
          children: (sgldtStatus == null ? void 0 : sgldtStatus.busy) ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-4 h-4 mr-2 animate-spin" }),
            "Transferring"
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "w-4 h-4 mr-2" }),
            "Transfer sGLDT"
          ] })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatusLine, { status: sgldtStatus })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Section, { title: `Transfer ckUNI from Treasury (balance ${ckuniAvailable.toFixed(6)})`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid sm:grid-cols-2 gap-3 mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs text-zinc-400", children: "Recipient Principal" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: ckuniTo, onChange: (e) => setCkuniTo(e.target.value), placeholder: "aaaaa-bbbbb-…", className: "bg-zinc-800 border-zinc-700 text-white font-mono text-sm" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs text-zinc-400", children: "Amount (ckUNI)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", min: "0", step: "0.000000000000000001", value: ckuniAmount, onChange: (e) => setCkuniAmount(e.target.value), placeholder: "0.000000", className: "bg-zinc-800 border-zinc-700 text-white font-mono text-sm" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          onClick: () => runAdminTransfer("ckUNI", ckuniTo, ckuniAmount, setCkuniStatus, () => {
            setCkuniTo("");
            setCkuniAmount("");
          }),
          disabled: !!(ckuniStatus == null ? void 0 : ckuniStatus.busy) || !ckuniTo || !ckuniAmount,
          className: "bg-blue-500 hover:bg-blue-400 text-white font-bold",
          children: (ckuniStatus == null ? void 0 : ckuniStatus.busy) ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-4 h-4 mr-2 animate-spin" }),
            "Transferring"
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "w-4 h-4 mr-2" }),
            "Transfer ckUNI"
          ] })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatusLine, { status: ckuniStatus })
    ] })
  ] });
}
function DepositsTab() {
  const { data: deposits, isLoading, refetch, isFetching } = useAllUNIDeposits();
  const { actor } = useBackendActor();
  const actorAny = actor;
  const [payStatus, setPayStatus] = reactExports.useState({});
  const pay = async (id) => {
    if (!actorAny) {
      setPayStatus((s) => ({ ...s, [String(id)]: { busy: false, ok: false, message: "Actor not ready" } }));
      return;
    }
    setPayStatus((s) => ({ ...s, [String(id)]: { busy: true, message: `Paying deposit #${id}…` } }));
    try {
      const result = await actorAny.verifyAndPayUNIDeposit(id);
      const lower = result.toLowerCase();
      const isError = lower.startsWith("error") || lower.startsWith("failed") || lower.startsWith("confirmed_payout_failed");
      setPayStatus((s) => ({
        ...s,
        [String(id)]: { busy: false, ok: !isError, message: result }
      }));
      refetch();
    } catch (err) {
      setPayStatus((s) => ({
        ...s,
        [String(id)]: { busy: false, ok: false, message: err instanceof Error ? err.message : "Payout failed" }
      }));
    }
  };
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-zinc-500 text-sm", children: "Loading deposits…" });
  }
  const sorted = (deposits ?? []).slice().sort((a, b) => {
    return Number(b.timestamp - a.timestamp);
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-zinc-400", children: [
        sorted.length,
        " deposits total"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "outline", onClick: () => refetch(), disabled: isFetching, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: `w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}` }),
        "Refresh"
      ] })
    ] }),
    sorted.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-zinc-500 text-sm", children: "No deposits yet." }),
    sorted.map((dep) => {
      const d = dep;
      const statusKey = Object.keys(d.status)[0];
      const statusColor = statusKey === "paid" ? "text-emerald-400" : statusKey === "failed" ? "text-red-400" : statusKey === "confirmed" ? "text-yellow-400" : statusKey === "processing" ? "text-blue-400" : "text-zinc-400";
      const uniDisplay = (Number(d.uniAmount) / 1e8).toFixed(6);
      const sgldtDisplay = (Number(d.sgldtPaid) / 1e8).toFixed(6);
      const needsPay = statusKey === "confirmed" || statusKey === "failed";
      const entry = payStatus[String(d.id)];
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-zinc-800 bg-zinc-900 p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-3 mb-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-sm font-bold text-white", children: [
            "#",
            String(d.id)
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `t-label ${statusColor}`, children: statusKey }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-zinc-500 font-mono", children: [
            uniDisplay,
            " UNI"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-zinc-600 text-xs", children: "→" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-zinc-500 font-mono", children: [
            sgldtDisplay,
            " sGLDT"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-zinc-600 font-mono break-all mb-2", children: [
          "tx: ",
          d.txHash
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-zinc-600 font-mono break-all mb-3", children: [
          "submitter: ",
          d.submitter.toString()
        ] }),
        needsPay && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", onClick: () => pay(d.id), disabled: !!(entry == null ? void 0 : entry.busy), className: "bg-yellow-500 hover:bg-yellow-400 text-black font-bold", children: (entry == null ? void 0 : entry.busy) ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-3.5 h-3.5 mr-1.5 animate-spin" }),
          "Paying"
        ] }) : "Verify & Pay" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(StatusLine, { status: entry })
      ] }, String(d.id));
    })
  ] });
}
function MinterTab() {
  const { data: walletInfo, refetch: refetchWalletInfo } = useGetTreasuryWalletInfo();
  const mintMutation = useAdminMintCkUNI();
  const dissolveMutation = useAdminDissolveCkUNI();
  const initMinterMutation = useAdminInitializeMinterAddress();
  const [mintTxHash, setMintTxHash] = reactExports.useState("");
  const [mintAmount, setMintAmount] = reactExports.useState("");
  const [mintStatus, setMintStatus] = reactExports.useState(null);
  const [dissolveAmount, setDissolveAmount] = reactExports.useState("");
  const [dissolveEth, setDissolveEth] = reactExports.useState("");
  const [dissolveStatus, setDissolveStatus] = reactExports.useState(null);
  const [minterStatus, setMinterStatus] = reactExports.useState(null);
  const depositAddress = (walletInfo == null ? void 0 : walletInfo.depositAddress) || "(not initialized)";
  const handleMint = async () => {
    if (!mintTxHash.trim().startsWith("0x")) {
      setMintStatus({ busy: false, ok: false, message: "Tx hash must start with 0x" });
      return;
    }
    const parsed = Number.parseFloat(mintAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setMintStatus({ busy: false, ok: false, message: "Enter a positive UNI amount" });
      return;
    }
    const amount = BigInt(Math.round(parsed * 1e18));
    setMintStatus({ busy: true, message: `Minting ${parsed} ckUNI…` });
    try {
      const r = await mintMutation.mutateAsync({ ethTxHash: mintTxHash.trim(), uniAmount: amount });
      setMintStatus({ busy: false, ok: true, message: typeof r === "string" ? r : "Mint requested" });
      setMintTxHash("");
      setMintAmount("");
      refetchWalletInfo();
    } catch (err) {
      setMintStatus({ busy: false, ok: false, message: err instanceof Error ? err.message : "Mint failed" });
    }
  };
  const handleDissolve = async () => {
    const parsed = Number.parseFloat(dissolveAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setDissolveStatus({ busy: false, ok: false, message: "Enter a positive ckUNI amount" });
      return;
    }
    if (!dissolveEth.trim().startsWith("0x")) {
      setDissolveStatus({ busy: false, ok: false, message: "Ethereum address must start with 0x" });
      return;
    }
    const amount = BigInt(Math.round(parsed * 1e18));
    setDissolveStatus({ busy: true, message: `Dissolving ${parsed} ckUNI → ${dissolveEth.trim().slice(0, 10)}…` });
    try {
      const r = await dissolveMutation.mutateAsync({ ckUNIAmount: amount, destinationEthAddress: dissolveEth.trim() });
      setDissolveStatus({ busy: false, ok: true, message: typeof r === "string" ? r : "Dissolve submitted" });
      setDissolveAmount("");
      setDissolveEth("");
      refetchWalletInfo();
    } catch (err) {
      setDissolveStatus({ busy: false, ok: false, message: err instanceof Error ? err.message : "Dissolve failed" });
    }
  };
  const handleInitMinter = async () => {
    setMinterStatus({ busy: true, message: "Fetching deposit address…" });
    try {
      const r = await initMinterMutation.mutateAsync();
      if (typeof r === "string" && r.toLowerCase().startsWith("err")) {
        setMinterStatus({ busy: false, ok: false, message: r.replace(/^err:\s*/i, "") });
      } else {
        setMinterStatus({ busy: false, ok: true, message: `Deposit address: ${r}` });
        refetchWalletInfo();
      }
    } catch (err) {
      setMinterStatus({ busy: false, ok: false, message: err instanceof Error ? err.message : "Failed" });
    }
  };
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Section, { title: "Ethereum Deposit Address", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-zinc-500 mb-2", children: "Send UNI to this address on Ethereum; ckUNI is minted to the treasury automatically." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "flex-1 text-xs text-blue-300 font-mono break-all bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2", children: depositAddress }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "outline", onClick: () => copyToClipboard(depositAddress), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "w-3.5 h-3.5" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "outline", onClick: handleInitMinter, disabled: !!(minterStatus == null ? void 0 : minterStatus.busy), children: [
        (minterStatus == null ? void 0 : minterStatus.busy) ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-3.5 h-3.5 mr-1.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-3.5 h-3.5 mr-1.5" }),
        "Refresh Address"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatusLine, { status: minterStatus })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Section, { title: "Mint ckUNI (record an Ethereum UNI deposit)", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid sm:grid-cols-2 gap-3 mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs text-zinc-400", children: "Ethereum Tx Hash" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: mintTxHash, onChange: (e) => setMintTxHash(e.target.value), placeholder: "0x…", className: "bg-zinc-800 border-zinc-700 text-white font-mono text-sm" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs text-zinc-400", children: "UNI Amount (18 decimals)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", min: "0", step: "0.000000000000000001", value: mintAmount, onChange: (e) => setMintAmount(e.target.value), placeholder: "0.000000", className: "bg-zinc-800 border-zinc-700 text-white font-mono text-sm" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: handleMint, disabled: !!(mintStatus == null ? void 0 : mintStatus.busy) || !mintTxHash || !mintAmount, className: "bg-emerald-500 hover:bg-emerald-400 text-black font-bold", children: (mintStatus == null ? void 0 : mintStatus.busy) ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-4 h-4 mr-2 animate-spin" }),
        "Minting"
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-4 h-4 mr-2" }),
        "Mint ckUNI"
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatusLine, { status: mintStatus })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Section, { title: "Dissolve ckUNI → UNI on Ethereum", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid sm:grid-cols-2 gap-3 mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs text-zinc-400", children: "ckUNI Amount" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", min: "0", step: "0.000000000000000001", value: dissolveAmount, onChange: (e) => setDissolveAmount(e.target.value), placeholder: "0.000000", className: "bg-zinc-800 border-zinc-700 text-white font-mono text-sm" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs text-zinc-400", children: "Destination Ethereum Address" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: dissolveEth, onChange: (e) => setDissolveEth(e.target.value), placeholder: "0x…", className: "bg-zinc-800 border-zinc-700 text-white font-mono text-sm" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: handleDissolve, disabled: !!(dissolveStatus == null ? void 0 : dissolveStatus.busy) || !dissolveAmount || !dissolveEth, className: "bg-red-500 hover:bg-red-400 text-white font-bold", children: (dissolveStatus == null ? void 0 : dissolveStatus.busy) ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-4 h-4 mr-2 animate-spin" }),
        "Dissolving"
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Flame, { className: "w-4 h-4 mr-2" }),
        "Dissolve"
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatusLine, { status: dissolveStatus })
    ] })
  ] });
}
function StrandedTab() {
  const { identity } = useInternetIdentity();
  const { data: queue, isLoading, refetch, isFetching } = useStrandedQueue(identity);
  const [copied, setCopied] = reactExports.useState(null);
  const copy = (text, key) => {
    void navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Section, { title: "Stranded swaps — manual resolution queue", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-zinc-500 max-w-md leading-relaxed", children: "Each row is a user whose funds were pulled but neither paid out nor auto-refunded. Resolve by sending the owed amount from the Treasury tab to their principal. The public /proof page shows this queue's count live." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          variant: "outline",
          size: "sm",
          onClick: () => void refetch(),
          disabled: isFetching,
          className: "border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 gap-1.5 shrink-0",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: `w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}` }),
            "Refresh"
          ]
        }
      )
    ] }),
    isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 py-8 justify-center text-zinc-500 text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-4 h-4 animate-spin" }),
      " Loading queue…"
    ] }) : !queue || queue.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-70" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-emerald-300", children: "Queue is empty — no stranded swaps." })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: queue.map((s) => {
      const key = `${s.kind}-${s.id.toString()}`;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-xs space-y-1.5",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-black uppercase tracking-wider text-amber-300", children: [
                s.kind,
                " #",
                s.id.toString()
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-zinc-500", children: new Date(Number(s.timestampNs / 1000000n)).toLocaleString() })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-zinc-300", children: [
              "Pulled ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-white", children: s.pulled }),
              " ",
              "from the user · owes them",
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-white", children: s.owed }),
              s.pullBlock != null && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-zinc-500", children: [
                " · pull block #",
                s.pullBlock.toString()
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-zinc-400 break-all", children: s.user }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => copy(s.user, key),
                  className: "shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-zinc-700 bg-zinc-900 text-[10px] font-bold text-zinc-300 hover:bg-zinc-800",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "w-3 h-3" }),
                    copied === key ? "Copied" : "Copy principal"
                  ]
                }
              )
            ] }),
            s.errorMsg && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-red-300/80 font-mono break-all", children: s.errorMsg })
          ]
        },
        key
      );
    }) })
  ] });
}
export {
  AdminPage
};
