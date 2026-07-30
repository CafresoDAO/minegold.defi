import { c as createLucideIcon, j as jsxRuntimeExports, a as cn, r as reactExports, R as React2, b as React, u as useInternetIdentity, d as useIsAdmin, L as LoaderCircle, W as Wallet, C as CircleAlert, e as Coins, f as useTreasuryICRC1Balances, g as RefreshCw, h as useGetTreasuryWalletInfo, i as useUNIExchangeRate, k as useSetUNIExchangeRate, S as Send, l as useAllUNIDeposits, m as useBackendActor, n as useAdminMintCkUNI, o as useAdminDissolveCkUNI, p as useAdminInitializeMinterAddress, q as Copy, s as CircleCheck, t as useStrandedQueue, v as directWhoAmI, w as directAdminGrantAdmin, P as Principal, x as directAdminTransfer } from "./index-BjvrAIp3.js";
import { c as createSlot$3, a as composeRefs, u as useComposedRefs, B as Button } from "./button-DIzQ28Ap.js";
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
var NODES$2 = [
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
var Primitive$2 = NODES$2.reduce((primitive, node) => {
  const Slot = createSlot$3(`Primitive.${node}`);
  const Node = reactExports.forwardRef((props, forwardedRef) => {
    const { asChild, ...primitiveProps } = props;
    const Comp = asChild ? Slot : node;
    if (typeof window !== "undefined") {
      window[Symbol.for("radix-ui")] = true;
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Comp, { ...primitiveProps, ref: forwardedRef });
  });
  Node.displayName = `Primitive.${node}`;
  return { ...primitive, [node]: Node };
}, {});
var NAME = "Label";
var Label$1 = reactExports.forwardRef((props, forwardedRef) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Primitive$2.label,
    {
      ...props,
      ref: forwardedRef,
      onMouseDown: (event) => {
        var _a;
        const target = event.target;
        if (target.closest("button, input, select, textarea")) return;
        (_a = props.onMouseDown) == null ? void 0 : _a.call(props, event);
        if (!event.defaultPrevented && event.detail > 1) event.preventDefault();
      }
    }
  );
});
Label$1.displayName = NAME;
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
function composeEventHandlers(originalEventHandler, ourEventHandler, { checkForDefaultPrevented = true } = {}) {
  return function handleEvent(event) {
    originalEventHandler == null ? void 0 : originalEventHandler(event);
    if (checkForDefaultPrevented === false || !event.defaultPrevented) {
      return ourEventHandler == null ? void 0 : ourEventHandler(event);
    }
  };
}
function createContextScope(scopeName, createContextScopeDeps = []) {
  let defaultContexts = [];
  function createContext3(rootComponentName, defaultContext) {
    const BaseContext = reactExports.createContext(defaultContext);
    const index = defaultContexts.length;
    defaultContexts = [...defaultContexts, defaultContext];
    const Provider = (props) => {
      var _a;
      const { scope, children, ...context } = props;
      const Context = ((_a = scope == null ? void 0 : scope[scopeName]) == null ? void 0 : _a[index]) || BaseContext;
      const value = reactExports.useMemo(() => context, Object.values(context));
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Context.Provider, { value, children });
    };
    Provider.displayName = rootComponentName + "Provider";
    function useContext2(consumerName, scope) {
      var _a;
      const Context = ((_a = scope == null ? void 0 : scope[scopeName]) == null ? void 0 : _a[index]) || BaseContext;
      const context = reactExports.useContext(Context);
      if (context) return context;
      if (defaultContext !== void 0) return defaultContext;
      throw new Error(`\`${consumerName}\` must be used within \`${rootComponentName}\``);
    }
    return [Provider, useContext2];
  }
  const createScope = () => {
    const scopeContexts = defaultContexts.map((defaultContext) => {
      return reactExports.createContext(defaultContext);
    });
    return function useScope(scope) {
      const contexts = (scope == null ? void 0 : scope[scopeName]) || scopeContexts;
      return reactExports.useMemo(
        () => ({ [`__scope${scopeName}`]: { ...scope, [scopeName]: contexts } }),
        [scope, contexts]
      );
    };
  };
  createScope.scopeName = scopeName;
  return [createContext3, composeContextScopes(createScope, ...createContextScopeDeps)];
}
function composeContextScopes(...scopes) {
  const baseScope = scopes[0];
  if (scopes.length === 1) return baseScope;
  const createScope = () => {
    const scopeHooks = scopes.map((createScope2) => ({
      useScope: createScope2(),
      scopeName: createScope2.scopeName
    }));
    return function useComposedScopes(overrideScopes) {
      const nextScopes = scopeHooks.reduce((nextScopes2, { useScope, scopeName }) => {
        const scopeProps = useScope(overrideScopes);
        const currentScope = scopeProps[`__scope${scopeName}`];
        return { ...nextScopes2, ...currentScope };
      }, {});
      return reactExports.useMemo(() => ({ [`__scope${baseScope.scopeName}`]: nextScopes }), [nextScopes]);
    };
  };
  createScope.scopeName = baseScope.scopeName;
  return createScope;
}
// @__NO_SIDE_EFFECTS__
function createSlot$2(ownerName) {
  const SlotClone = /* @__PURE__ */ createSlotClone$2(ownerName);
  const Slot2 = reactExports.forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props;
    const childrenArray = reactExports.Children.toArray(children);
    const slottable = childrenArray.find(isSlottable$2);
    if (slottable) {
      const newElement = slottable.props.children;
      const newChildren = childrenArray.map((child) => {
        if (child === slottable) {
          if (reactExports.Children.count(newElement) > 1) return reactExports.Children.only(null);
          return reactExports.isValidElement(newElement) ? newElement.props.children : null;
        } else {
          return child;
        }
      });
      return /* @__PURE__ */ jsxRuntimeExports.jsx(SlotClone, { ...slotProps, ref: forwardedRef, children: reactExports.isValidElement(newElement) ? reactExports.cloneElement(newElement, void 0, newChildren) : null });
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(SlotClone, { ...slotProps, ref: forwardedRef, children });
  });
  Slot2.displayName = `${ownerName}.Slot`;
  return Slot2;
}
// @__NO_SIDE_EFFECTS__
function createSlotClone$2(ownerName) {
  const SlotClone = reactExports.forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props;
    if (reactExports.isValidElement(children)) {
      const childrenRef = getElementRef$3(children);
      const props2 = mergeProps$2(slotProps, children.props);
      if (children.type !== reactExports.Fragment) {
        props2.ref = forwardedRef ? composeRefs(forwardedRef, childrenRef) : childrenRef;
      }
      return reactExports.cloneElement(children, props2);
    }
    return reactExports.Children.count(children) > 1 ? reactExports.Children.only(null) : null;
  });
  SlotClone.displayName = `${ownerName}.SlotClone`;
  return SlotClone;
}
var SLOTTABLE_IDENTIFIER$2 = Symbol("radix.slottable");
function isSlottable$2(child) {
  return reactExports.isValidElement(child) && typeof child.type === "function" && "__radixId" in child.type && child.type.__radixId === SLOTTABLE_IDENTIFIER$2;
}
function mergeProps$2(slotProps, childProps) {
  const overrideProps = { ...childProps };
  for (const propName in childProps) {
    const slotPropValue = slotProps[propName];
    const childPropValue = childProps[propName];
    const isHandler = /^on[A-Z]/.test(propName);
    if (isHandler) {
      if (slotPropValue && childPropValue) {
        overrideProps[propName] = (...args) => {
          const result = childPropValue(...args);
          slotPropValue(...args);
          return result;
        };
      } else if (slotPropValue) {
        overrideProps[propName] = slotPropValue;
      }
    } else if (propName === "style") {
      overrideProps[propName] = { ...slotPropValue, ...childPropValue };
    } else if (propName === "className") {
      overrideProps[propName] = [slotPropValue, childPropValue].filter(Boolean).join(" ");
    }
  }
  return { ...slotProps, ...overrideProps };
}
function getElementRef$3(element) {
  var _a, _b;
  let getter = (_a = Object.getOwnPropertyDescriptor(element.props, "ref")) == null ? void 0 : _a.get;
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
function createCollection(name) {
  const PROVIDER_NAME = name + "CollectionProvider";
  const [createCollectionContext, createCollectionScope2] = createContextScope(PROVIDER_NAME);
  const [CollectionProviderImpl, useCollectionContext] = createCollectionContext(
    PROVIDER_NAME,
    { collectionRef: { current: null }, itemMap: /* @__PURE__ */ new Map() }
  );
  const CollectionProvider = (props) => {
    const { scope, children } = props;
    const ref = React2.useRef(null);
    const itemMap = React2.useRef(/* @__PURE__ */ new Map()).current;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(CollectionProviderImpl, { scope, itemMap, collectionRef: ref, children });
  };
  CollectionProvider.displayName = PROVIDER_NAME;
  const COLLECTION_SLOT_NAME = name + "CollectionSlot";
  const CollectionSlotImpl = /* @__PURE__ */ createSlot$2(COLLECTION_SLOT_NAME);
  const CollectionSlot = React2.forwardRef(
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
  const CollectionItemSlotImpl = /* @__PURE__ */ createSlot$2(ITEM_SLOT_NAME);
  const CollectionItemSlot = React2.forwardRef(
    (props, forwardedRef) => {
      const { scope, children, ...itemData } = props;
      const ref = React2.useRef(null);
      const composedRefs = useComposedRefs(forwardedRef, ref);
      const context = useCollectionContext(ITEM_SLOT_NAME, scope);
      React2.useEffect(() => {
        context.itemMap.set(ref, { ref, ...itemData });
        return () => void context.itemMap.delete(ref);
      });
      return /* @__PURE__ */ jsxRuntimeExports.jsx(CollectionItemSlotImpl, { ...{ [ITEM_DATA_ATTR]: "" }, ref: composedRefs, children });
    }
  );
  CollectionItemSlot.displayName = ITEM_SLOT_NAME;
  function useCollection2(scope) {
    const context = useCollectionContext(name + "CollectionConsumer", scope);
    const getItems = React2.useCallback(() => {
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
  return [
    { Provider: CollectionProvider, Slot: CollectionSlot, ItemSlot: CollectionItemSlot },
    useCollection2,
    createCollectionScope2
  ];
}
var useLayoutEffect2 = (globalThis == null ? void 0 : globalThis.document) ? reactExports.useLayoutEffect : () => {
};
var useReactId = React[" useId ".trim().toString()] || (() => void 0);
var count = 0;
function useId(deterministicId) {
  const [id, setId] = reactExports.useState(useReactId());
  useLayoutEffect2(() => {
    setId((reactId) => reactId ?? String(count++));
  }, [deterministicId]);
  return deterministicId || (id ? `radix-${id}` : "");
}
// @__NO_SIDE_EFFECTS__
function createSlot$1(ownerName) {
  const SlotClone = /* @__PURE__ */ createSlotClone$1(ownerName);
  const Slot2 = reactExports.forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props;
    const childrenArray = reactExports.Children.toArray(children);
    const slottable = childrenArray.find(isSlottable$1);
    if (slottable) {
      const newElement = slottable.props.children;
      const newChildren = childrenArray.map((child) => {
        if (child === slottable) {
          if (reactExports.Children.count(newElement) > 1) return reactExports.Children.only(null);
          return reactExports.isValidElement(newElement) ? newElement.props.children : null;
        } else {
          return child;
        }
      });
      return /* @__PURE__ */ jsxRuntimeExports.jsx(SlotClone, { ...slotProps, ref: forwardedRef, children: reactExports.isValidElement(newElement) ? reactExports.cloneElement(newElement, void 0, newChildren) : null });
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(SlotClone, { ...slotProps, ref: forwardedRef, children });
  });
  Slot2.displayName = `${ownerName}.Slot`;
  return Slot2;
}
// @__NO_SIDE_EFFECTS__
function createSlotClone$1(ownerName) {
  const SlotClone = reactExports.forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props;
    if (reactExports.isValidElement(children)) {
      const childrenRef = getElementRef$2(children);
      const props2 = mergeProps$1(slotProps, children.props);
      if (children.type !== reactExports.Fragment) {
        props2.ref = forwardedRef ? composeRefs(forwardedRef, childrenRef) : childrenRef;
      }
      return reactExports.cloneElement(children, props2);
    }
    return reactExports.Children.count(children) > 1 ? reactExports.Children.only(null) : null;
  });
  SlotClone.displayName = `${ownerName}.SlotClone`;
  return SlotClone;
}
var SLOTTABLE_IDENTIFIER$1 = Symbol("radix.slottable");
function isSlottable$1(child) {
  return reactExports.isValidElement(child) && typeof child.type === "function" && "__radixId" in child.type && child.type.__radixId === SLOTTABLE_IDENTIFIER$1;
}
function mergeProps$1(slotProps, childProps) {
  const overrideProps = { ...childProps };
  for (const propName in childProps) {
    const slotPropValue = slotProps[propName];
    const childPropValue = childProps[propName];
    const isHandler = /^on[A-Z]/.test(propName);
    if (isHandler) {
      if (slotPropValue && childPropValue) {
        overrideProps[propName] = (...args) => {
          const result = childPropValue(...args);
          slotPropValue(...args);
          return result;
        };
      } else if (slotPropValue) {
        overrideProps[propName] = slotPropValue;
      }
    } else if (propName === "style") {
      overrideProps[propName] = { ...slotPropValue, ...childPropValue };
    } else if (propName === "className") {
      overrideProps[propName] = [slotPropValue, childPropValue].filter(Boolean).join(" ");
    }
  }
  return { ...slotProps, ...overrideProps };
}
function getElementRef$2(element) {
  var _a, _b;
  let getter = (_a = Object.getOwnPropertyDescriptor(element.props, "ref")) == null ? void 0 : _a.get;
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
var NODES$1 = [
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
var Primitive$1 = NODES$1.reduce((primitive, node) => {
  const Slot = /* @__PURE__ */ createSlot$1(`Primitive.${node}`);
  const Node = reactExports.forwardRef((props, forwardedRef) => {
    const { asChild, ...primitiveProps } = props;
    const Comp = asChild ? Slot : node;
    if (typeof window !== "undefined") {
      window[Symbol.for("radix-ui")] = true;
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Comp, { ...primitiveProps, ref: forwardedRef });
  });
  Node.displayName = `Primitive.${node}`;
  return { ...primitive, [node]: Node };
}, {});
function useCallbackRef(callback) {
  const callbackRef = reactExports.useRef(callback);
  reactExports.useEffect(() => {
    callbackRef.current = callback;
  });
  return reactExports.useMemo(() => (...args) => {
    var _a;
    return (_a = callbackRef.current) == null ? void 0 : _a.call(callbackRef, ...args);
  }, []);
}
var useInsertionEffect = React[" useInsertionEffect ".trim().toString()] || useLayoutEffect2;
function useControllableState({
  prop,
  defaultProp,
  onChange = () => {
  },
  caller
}) {
  const [uncontrolledProp, setUncontrolledProp, onChangeRef] = useUncontrolledState({
    defaultProp,
    onChange
  });
  const isControlled = prop !== void 0;
  const value = isControlled ? prop : uncontrolledProp;
  {
    const isControlledRef = reactExports.useRef(prop !== void 0);
    reactExports.useEffect(() => {
      const wasControlled = isControlledRef.current;
      if (wasControlled !== isControlled) {
        const from = wasControlled ? "controlled" : "uncontrolled";
        const to = isControlled ? "controlled" : "uncontrolled";
        console.warn(
          `${caller} is changing from ${from} to ${to}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`
        );
      }
      isControlledRef.current = isControlled;
    }, [isControlled, caller]);
  }
  const setValue = reactExports.useCallback(
    (nextValue) => {
      var _a;
      if (isControlled) {
        const value2 = isFunction(nextValue) ? nextValue(prop) : nextValue;
        if (value2 !== prop) {
          (_a = onChangeRef.current) == null ? void 0 : _a.call(onChangeRef, value2);
        }
      } else {
        setUncontrolledProp(nextValue);
      }
    },
    [isControlled, prop, setUncontrolledProp, onChangeRef]
  );
  return [value, setValue];
}
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
    var _a;
    if (prevValueRef.current !== value) {
      (_a = onChangeRef.current) == null ? void 0 : _a.call(onChangeRef, value);
      prevValueRef.current = value;
    }
  }, [value, prevValueRef]);
  return [value, setValue, onChangeRef];
}
function isFunction(value) {
  return typeof value === "function";
}
var DirectionContext = reactExports.createContext(void 0);
function useDirection(localDir) {
  const globalDir = reactExports.useContext(DirectionContext);
  return localDir || globalDir || "ltr";
}
var ENTRY_FOCUS = "rovingFocusGroup.onEntryFocus";
var EVENT_OPTIONS = { bubbles: false, cancelable: true };
var GROUP_NAME = "RovingFocusGroup";
var [Collection, useCollection, createCollectionScope] = createCollection(GROUP_NAME);
var [createRovingFocusGroupContext, createRovingFocusGroupScope] = createContextScope(
  GROUP_NAME,
  [createCollectionScope]
);
var [RovingFocusProvider, useRovingFocusContext] = createRovingFocusGroupContext(GROUP_NAME);
var RovingFocusGroup = reactExports.forwardRef(
  (props, forwardedRef) => {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Collection.Provider, { scope: props.__scopeRovingFocusGroup, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Collection.Slot, { scope: props.__scopeRovingFocusGroup, children: /* @__PURE__ */ jsxRuntimeExports.jsx(RovingFocusGroupImpl, { ...props, ref: forwardedRef }) }) });
  }
);
RovingFocusGroup.displayName = GROUP_NAME;
var RovingFocusGroupImpl = reactExports.forwardRef((props, forwardedRef) => {
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
        Primitive$1.div,
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
});
var ITEM_NAME = "RovingFocusGroupItem";
var RovingFocusGroupItem = reactExports.forwardRef(
  (props, forwardedRef) => {
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
    reactExports.useEffect(() => {
      if (focusable) {
        onFocusableItemAdd();
        return () => onFocusableItemRemove();
      }
    }, [focusable, onFocusableItemAdd, onFocusableItemRemove]);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Collection.ItemSlot,
      {
        scope: __scopeRovingFocusGroup,
        id,
        focusable,
        active,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Primitive$1.span,
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
  }
);
RovingFocusGroupItem.displayName = ITEM_NAME;
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
function getFocusIntent(event, orientation, dir) {
  const key = getDirectionAwareKey(event.key, dir);
  if (orientation === "vertical" && ["ArrowLeft", "ArrowRight"].includes(key)) return void 0;
  if (orientation === "horizontal" && ["ArrowUp", "ArrowDown"].includes(key)) return void 0;
  return MAP_KEY_TO_FOCUS_INTENT[key];
}
function focusFirst(candidates, preventScroll = false) {
  const PREVIOUSLY_FOCUSED_ELEMENT = document.activeElement;
  for (const candidate of candidates) {
    if (candidate === PREVIOUSLY_FOCUSED_ELEMENT) return;
    candidate.focus({ preventScroll });
    if (document.activeElement !== PREVIOUSLY_FOCUSED_ELEMENT) return;
  }
}
function wrapArray(array, startIndex) {
  return array.map((_, index) => array[(startIndex + index) % array.length]);
}
var Root = RovingFocusGroup;
var Item = RovingFocusGroupItem;
function useStateMachine(initialState, machine) {
  return reactExports.useReducer((state, event) => {
    const nextState = machine[state][event];
    return nextState ?? state;
  }, initialState);
}
var Presence = (props) => {
  const { present, children } = props;
  const presence = usePresence(present);
  const child = typeof children === "function" ? children({ present: presence.isPresent }) : reactExports.Children.only(children);
  const ref = useComposedRefs(presence.ref, getElementRef$1(child));
  const forceMount = typeof children === "function";
  return forceMount || presence.isPresent ? reactExports.cloneElement(child, { ref }) : null;
};
Presence.displayName = "Presence";
function usePresence(present) {
  const [node, setNode] = reactExports.useState();
  const stylesRef = reactExports.useRef(null);
  const prevPresentRef = reactExports.useRef(present);
  const prevAnimationNameRef = reactExports.useRef("none");
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
    const currentAnimationName = getAnimationName(stylesRef.current);
    prevAnimationNameRef.current = state === "mounted" ? currentAnimationName : "none";
  }, [state]);
  useLayoutEffect2(() => {
    const styles = stylesRef.current;
    const wasPresent = prevPresentRef.current;
    const hasPresentChanged = wasPresent !== present;
    if (hasPresentChanged) {
      const prevAnimationName = prevAnimationNameRef.current;
      const currentAnimationName = getAnimationName(styles);
      if (present) {
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
      const handleAnimationEnd = (event) => {
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
      };
      const handleAnimationStart = (event) => {
        if (event.target === node) {
          prevAnimationNameRef.current = getAnimationName(stylesRef.current);
        }
      };
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
      stylesRef.current = node2 ? getComputedStyle(node2) : null;
      setNode(node2);
    }, [])
  };
}
function getAnimationName(styles) {
  return (styles == null ? void 0 : styles.animationName) || "none";
}
function getElementRef$1(element) {
  var _a, _b;
  let getter = (_a = Object.getOwnPropertyDescriptor(element.props, "ref")) == null ? void 0 : _a.get;
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
// @__NO_SIDE_EFFECTS__
function createSlot(ownerName) {
  const SlotClone = /* @__PURE__ */ createSlotClone(ownerName);
  const Slot2 = reactExports.forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props;
    const childrenArray = reactExports.Children.toArray(children);
    const slottable = childrenArray.find(isSlottable);
    if (slottable) {
      const newElement = slottable.props.children;
      const newChildren = childrenArray.map((child) => {
        if (child === slottable) {
          if (reactExports.Children.count(newElement) > 1) return reactExports.Children.only(null);
          return reactExports.isValidElement(newElement) ? newElement.props.children : null;
        } else {
          return child;
        }
      });
      return /* @__PURE__ */ jsxRuntimeExports.jsx(SlotClone, { ...slotProps, ref: forwardedRef, children: reactExports.isValidElement(newElement) ? reactExports.cloneElement(newElement, void 0, newChildren) : null });
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(SlotClone, { ...slotProps, ref: forwardedRef, children });
  });
  Slot2.displayName = `${ownerName}.Slot`;
  return Slot2;
}
// @__NO_SIDE_EFFECTS__
function createSlotClone(ownerName) {
  const SlotClone = reactExports.forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props;
    if (reactExports.isValidElement(children)) {
      const childrenRef = getElementRef(children);
      const props2 = mergeProps(slotProps, children.props);
      if (children.type !== reactExports.Fragment) {
        props2.ref = forwardedRef ? composeRefs(forwardedRef, childrenRef) : childrenRef;
      }
      return reactExports.cloneElement(children, props2);
    }
    return reactExports.Children.count(children) > 1 ? reactExports.Children.only(null) : null;
  });
  SlotClone.displayName = `${ownerName}.SlotClone`;
  return SlotClone;
}
var SLOTTABLE_IDENTIFIER = Symbol("radix.slottable");
function isSlottable(child) {
  return reactExports.isValidElement(child) && typeof child.type === "function" && "__radixId" in child.type && child.type.__radixId === SLOTTABLE_IDENTIFIER;
}
function mergeProps(slotProps, childProps) {
  const overrideProps = { ...childProps };
  for (const propName in childProps) {
    const slotPropValue = slotProps[propName];
    const childPropValue = childProps[propName];
    const isHandler = /^on[A-Z]/.test(propName);
    if (isHandler) {
      if (slotPropValue && childPropValue) {
        overrideProps[propName] = (...args) => {
          const result = childPropValue(...args);
          slotPropValue(...args);
          return result;
        };
      } else if (slotPropValue) {
        overrideProps[propName] = slotPropValue;
      }
    } else if (propName === "style") {
      overrideProps[propName] = { ...slotPropValue, ...childPropValue };
    } else if (propName === "className") {
      overrideProps[propName] = [slotPropValue, childPropValue].filter(Boolean).join(" ");
    }
  }
  return { ...slotProps, ...overrideProps };
}
function getElementRef(element) {
  var _a, _b;
  let getter = (_a = Object.getOwnPropertyDescriptor(element.props, "ref")) == null ? void 0 : _a.get;
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
  const Slot = /* @__PURE__ */ createSlot(`Primitive.${node}`);
  const Node = reactExports.forwardRef((props, forwardedRef) => {
    const { asChild, ...primitiveProps } = props;
    const Comp = asChild ? Slot : node;
    if (typeof window !== "undefined") {
      window[Symbol.for("radix-ui")] = true;
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Comp, { ...primitiveProps, ref: forwardedRef });
  });
  Node.displayName = `Primitive.${node}`;
  return { ...primitive, [node]: Node };
}, {});
var TABS_NAME = "Tabs";
var [createTabsContext] = createContextScope(TABS_NAME, [
  createRovingFocusGroupScope
]);
var useRovingFocusGroupScope = createRovingFocusGroupScope();
var [TabsProvider, useTabsContext] = createTabsContext(TABS_NAME);
var Tabs$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
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
  }
);
Tabs$1.displayName = TABS_NAME;
var TAB_LIST_NAME = "TabsList";
var TabsList$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
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
  }
);
TabsList$1.displayName = TAB_LIST_NAME;
var TRIGGER_NAME = "TabsTrigger";
var TabsTrigger$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
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
              if ([" ", "Enter"].includes(event.key)) context.onValueChange(value);
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
  }
);
TabsTrigger$1.displayName = TRIGGER_NAME;
var CONTENT_NAME = "TabsContent";
var TabsContent$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
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
  }
);
TabsContent$1.displayName = CONTENT_NAME;
function makeTriggerId(baseId, value) {
  return `${baseId}-trigger-${value}`;
}
function makeContentId(baseId, value) {
  return `${baseId}-content-${value}`;
}
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
    var _a, _b;
    if (!identity) {
      setDiagStatus({ busy: false, ok: false, message: "Not logged in" });
      return;
    }
    setDiagStatus({ busy: true, message: "Querying backend whoAmI…" });
    try {
      const result = await directWhoAmI(identity);
      setWho(result);
      const bal = await refetchBalances();
      const msg = `caller=${result.caller} · isAdmin=${result.isAdmin} (hardcoded=${result.isHardcodedAdmin}, role=${result.hasAdminRole}) · sGLDT=${(_a = bal.data) == null ? void 0 : _a.sgldtBalance} · ckUNI=${(_b = bal.data) == null ? void 0 : _b.ckUNIBalance}`;
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
