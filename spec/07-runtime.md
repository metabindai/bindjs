# BindJS Specification 1.0, chapter 07: Runtime globals and environment

> [!NOTE]
> Part of the BindJS Specification (`metabindai/bindjs`). Normative unless marked informative. Changes go through BEPs ([`proposals/`](../proposals/)).

A BindJS runtime is the JavaScript execution context in which `defineComponent` modules run. Every runtime MUST inject a known surface: the *globals* (functions and constructors callable from any component) and the *environment* (the values returned by `useEnvironment()`). This chapter is the spec for that surface.

A renderer (web React, iOS SwiftUI, Android Compose, or anything else) consumes the AST produced by the runtime and turns it into native views. Renderers may legitimately differ in which components they paint and which environment keys they observe, but every conforming runtime MUST register the *core* globals listed below.

> [!NOTE]
> **Spec and extension distinction.** Sections labeled **Core (required)** are part of the BindJS spec and MUST be registered by every runtime. Sections labeled **Recommended** SHOULD be registered when the platform supports them; they are widely used and authoring code commonly assumes their presence. Sections labeled **Platform extensions** are scoped to a specific platform and are out of spec; component code that depends on them is by definition non-portable.

---

## JavaScript context globals

The runtime registers the following globals on the JS context before any component code runs.

### Authoring primitives (Core, required)

| Global | Purpose |
|---|---|
| `defineComponent({ body, properties?, metadata?, previews?, thumbnail?, icon? })` | Declares a UI component (the canonical default export). |
| `defineButtonStyle({ body, metadata? })` | Declares a custom button style applied via `.buttonStyle()`. |

### Hooks (Core, required)

The full hook set is part of the spec and MUST be registered. See [chapter 06](06-hooks.md) for usage. Calling a hook in an environment where the underlying capability is absent (for example, `useMCPHost()` outside an MCP context) MUST return `null` rather than throwing.

`useState`, `useStore`, `useEnvironment`, `useNavigate`, `useAction`, `useMCPHost`, `useRef`.

### Property constructors (Core, required)

Used by the `properties` schema to declare typed inputs (see [chapter 04](04-properties.md)).

`PropertyString`, `PropertyNumber`, `PropertyInteger`, `PropertyBoolean`, `PropertyEnum`, `PropertyDate`, `PropertyArray`, `PropertyAsset`, `PropertyContent`, `PropertyComponent`, `PropertyGroup`.

Two additional helpers, `PropertyChildren` and `PropertyComponentList`, are registered for internal use by the runtime. Authoring code should not depend on them; use `PropertyComponent` with `allowedComponents`.

### Animation builders (Core, required)

Returned by component code, consumed by `withAnimation` and animation-aware modifiers.

`Spring`, `InterpolatingSpring`, `EaseIn`, `EaseInOut`, `EaseOut`, `Linear`, `Bouncy`, `Snappy`, and the top-level `withAnimation`.

### Top-level utilities (Core, required)

| Global | Purpose |
|---|---|
| `Self` | Self-reference for recursive components. Props inferred from the component's own `properties`. |
| `getComponentData(builder)` | Returns `{ name, props }` from a component builder, unwrapping modifiers. |
| `OpenURLAction(callback)` | Wraps a URL-handling callback so it can be set as an environment value. |
| `alert(message)` | Display a modal alert. |

### Host-platform JS (Recommended)

The host JavaScript engine SHOULD provide:

- `setTimeout` and `clearTimeout`: deferred callbacks.
- `fetch`: network requests (Promise-returning).
- The `console.log`, `console.warn`, and `console.error` family: diagnostics. Output is host-defined.
- A `funcs` namespace with string helpers (`capitalize`, `reverse`, `contains`, `titleCase`).

These are not strictly required by the BindJS spec, but most authoring code assumes their presence. A hosting binding MAY restrict them: the MCP Apps binding forbids exposing `fetch` or any network primitive to component code ([`bindings/mcp-apps.md`, section 4](../bindings/mcp-apps.md#4-executable-code-and-the-sandbox-contract)), and the shipping native runtimes expose timers and `console` only.

---

## Environment values

`useEnvironment()` returns a record of values the runtime injects, plus any custom values set by ancestor components with `.environment(key, value)`. A host MAY also inject custom keys (organization or project identifiers, secrets, locale overrides, API base URLs); those are application-level extensions and not standardized.

### Core (required) keys

Every conforming runtime MUST inject the following keys. They MUST be observable from `useEnvironment()` from the first render onward, and MUST update reactively when the underlying value changes.

| Key | Type | Notes |
|---|---|---|
| `colorScheme` | `'light' \| 'dark'` | System preference, overridable per subtree via `.environment('colorScheme', …)`. |
| `displayScale` | `number` | Device pixel ratio (logical to physical). |
| `locale` | `string` | BCP-47 locale identifier. |
| `layoutDirection` | `'leftToRight' \| 'rightToLeft'` | Effective layout direction. |
| `openURL` | `(url, callback?) => void` | Opens a URL via the host's URL handler. May be replaced via `.environment('openURL', OpenURLAction(...))`. |

### Recommended keys

Conforming runtimes SHOULD inject the following keys when the platform exposes the corresponding signal. Components MUST tolerate their absence (`env.dynamicTypeSize ?? 'large'`).

| Key | Type | Notes |
|---|---|---|
| `platform` | `string` | Identifier for the current platform (`'web'`, `'iOS'`, `'Android'`, and so on). |
| `screen` | `{ width, height }` | Logical pixel size of the rendering surface. |
| `dynamicTypeSize` | `string` | User text-size preference. |
| `systemColorScheme` | `'light' \| 'dark'` | The system's preference, never overridden by `.environment(...)`. |

### Platform extensions

The following keys are legitimate platform extensions: they reflect signals only available on a specific platform. Components that read them MUST guard with optional access and fallbacks; they are not portable.

- **iOS-only:** `colorSchemeContrast`, `pixelLength`, `contentSizeCategory`, `horizontalSizeClass`, `verticalSizeClass`, `isEnabled`, `redactionReasons`, `scenePhase`, `timeZone`, `calendar`, `now`, and the `accessibility.*` family (`differentiateWithoutColor`, `reduceMotion`, `reduceTransparency`, `invertColors`, `showButtonShapes`, `voiceOverEnabled`, `switchControlEnabled`).
- **Web-only:** none beyond the recommended set today.

The per-platform inventory of which environment keys are actually injected (and where the value comes from) lives in the [conformance statements](../conformance/statements/).

### Safe-area awareness

Safe-area insets are NOT exposed via `useEnvironment()`. They are surfaced at the layout level: through `.ignoresSafeArea()`, `GeometryReader`, and `.safeAreaInset()`. Web does not have a safe-area concept; iOS and Android both support `GeometryReader`-based access.

### Host-injected custom keys

The host application MAY inject any additional keys it likes (organization or project identifiers, secrets, base URLs, feature flags). The spec only commits to:

1. Custom keys MUST NOT collide with reserved core or recommended names.
2. The runtime MUST serialize values as JSON-compatible types (objects, arrays, primitives, functions for callback-typed values).
3. Custom keys propagate to descendants via `.environment(key, value)` exactly like built-in keys.

A component that depends on a host-injected key SHOULD document the dependency in its `metadata.description` so callers know what to provide.

---

## Runtime behavior contracts

Beyond the globals and environment values it injects, a conforming BindJS runtime MUST exhibit the following observable behaviors. Authors rely on them in component code; an implementation that diverges will silently break components that work elsewhere.

These are observable contracts, not implementation requirements: a runtime may key state, schedule renders, or wire callbacks however it likes, as long as the externally visible behavior matches.

### Hook state keying

Component state declared via `useState`, `useStore`, and the other state hooks MUST be keyed by the **deterministic position** of the calling component within the rendered tree. The same component instance, rendered at the same path on a re-render, MUST receive the same hook values.

Two consequences for authors:

1. **Hooks MUST NOT be called conditionally.** Every `useState` or `useStore` call has to run on every render; `if (cond) useState(...)` desyncs the hook indices and corrupts state.

   ```javascript
   // ❌ Wrong: conditional hook call
   if (props.editable) {
     const [draft, setDraft] = useState('')
   }

   // ✅ Right: hook always runs; condition gates the use
   const [draft, setDraft] = useState('')
   if (props.editable) { /* render the editor */ }
   ```

2. **Items in a dynamic list MUST carry a stable `.id(...)`.** A runtime keys child state by tree position; without a stable identity, reordering or inserting items will reassign state to the wrong child.

   ```javascript
   ForEach(items, (item) =>
     ProductCard({ name: item.name }).id(item.id)   // .id() makes state stable across reorders
   )
   ```

### Render model

After a state mutation, a conforming runtime MUST re-execute the affected component subtree's bodies with the updated values, and the AST it emits MUST reflect those values on the next render. Authors can rely on "after `setState`, the next render runs the body again with fresh values"; they MUST NOT depend on partial-render shortcuts (for example, assuming sibling subtrees won't re-execute) or on render scheduling timing (synchronous or batched). A runtime may batch, debounce, or schedule renders however it likes.

State updates from outside the render cycle (a `setTimeout` callback, a tool-call response, a host action) MUST eventually trigger a re-render that observes the new state.

### Callback persistence

A callback registered inside a body call (`Button('Save', onSave)`, `.onTapGesture(handler)`, `useState`'s setter) MUST remain invocable for the lifetime of that component instance. The runtime MAY use opaque handles, registry lookups, or any other transport mechanism, but a callback registered on render N MUST still fire correctly when invoked after render N+1, as long as the component instance still exists.

Practical consequence: closures inside callbacks capture the values they were defined with at render time. If a callback needs the latest state, it should read from a ref-style store (`useStore`) or be re-registered on every render that depends on the value.

### Environment scoping

`.environment(key, value)` MUST be visible only to the modified subtree. After that subtree finishes rendering, the runtime MUST restore the prior environment for siblings and ancestors. Environment values MUST NOT leak upward or sideways.

```javascript
VStack([
  Text('Outer').foregroundStyle(Color('primary')),     // sees outer env
  HStack(children).environment('colorScheme', 'dark'), // children see dark
  Text('Sibling'),                                     // sees outer env again
])
```

A descendant `useEnvironment()` call MUST observe the merged environment as of the deepest enclosing `.environment(key, value)` for each key.

### Modifier ordering

Modifiers MUST be applied in chain order, left to right. Reordering modifiers can change visible output (`.padding(8).background(Color('red'))` produces a different result from `.background(Color('red')).padding(8)`), and a conforming runtime MUST preserve the author's order through to the renderer.

---

## Practical authoring guidance

Moved to the [authoring guide](authoring-guide.md).
