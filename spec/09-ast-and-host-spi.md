# BindJS Specification 1.0, chapter 09: AST and Host SPI

> Part of the BindJS Specification (`metabindai/bindjs`). Normative unless marked informative. Changes go through BEPs (`proposals/`).

## Per-platform runtime architecture

| Aspect | Web | iOS | Android |
|---|---|---|---|
| Runtime entry | `BindJSRuntime` (`@metabindai/bindjs-runtime`) + `YapUIDecoder` (`@metabindai/bindjs-react`) | `BindJSContext` + `BindJSRuntime.js` (bundled resource) | `JsRuntimeImpl` + `script.js` (bundled raw resource) |
| JavaScript engine | Browser JS engine (host page or sandboxed iframe) | JavaScriptCore (`JSContext`) | `androidx.javascriptengine` (`JavaScriptIsolate`) |
| Renderer target | React (`@metabindai/bindjs-react`) | SwiftUI | Jetpack Compose |
| Distribution | npm (Apache 2.0) | Swift package `bindjs-apple` (Apache 2.0) | `ai.metabind:bindjs-android` (Apache 2.0) |

All three runtimes share the same `defineComponent` JS surface, the same property helper functions, and the same modifier names. They diverge in two places: which components and modifiers have a native implementation, and which environment keys the host injects.

---

## Runtime Implementation

This section describes the runtime as built today. In BindJS 1.0 the AST node shapes and the host SPI below are normative: renderers and hosts rely on them, and changing them requires a BEP. Anything an author can rely on belongs in chapter 06 (*Runtime Behavior Contracts*); this chapter is for renderer authors and anyone embedding the runtime.

### One canonical runtime, three platform copies

The runtime is a single JavaScript library, `BindJSRuntime`. The source in `bindjs-runtime/packages/runtime/src/runtime/BindJSRuntime.js` is canonical. The iOS and Android builds are pre-bundled copies of the same module, kept in sync:

- Web: `bindjs-runtime/packages/runtime` (modular ES source; published as `@metabindai/bindjs-runtime`).
- iOS: `bindjs-apple/Sources/BindJS/Resources/BindJSRuntime.js` (bundled, self-contained).
- Android: `bindjs-android/bindjs/src/main/res/raw/script.js` (bundled, self-contained).

The bundled platform copies inline every component, modifier, and built-in registration into a single file so the JS engine can load them without dynamic imports. The web build keeps them as separate modules for the React tooling.

Per-platform JS engine:

- Web — the host page's JS engine (browser, or a sandboxed iframe inside an MCP host).
- iOS — `JSContext` (JavaScriptCore), wrapped by `BindJSContext.swift`.
- Android — `JavaScriptIsolate` from `androidx.javascriptengine`, driven by `JsRuntimeImpl.kt`.

### AST node types

The runtime emits a small set of AST node shapes. A renderer walks these to produce native views.

| Node type | Shape | Role |
|---|---|---|
| `Directive` | `{ type: <name>, props: { ...args, children: [] } }` | A built-in or user component invocation. `<name>` is the component name (`Text`, `VStack`, `MyCard`). |
| `ModifiedComponent` | `{ type: 'ModifiedComponent', props: { modifier: { name, ...args }, content: [...] } }` | Wraps an inner subtree with one modifier. Modifier chains nest as nested `ModifiedComponent` wrappers. |
| `ForEach` | `{ type: 'ForEach', props: { dataId, functionId, count, environmentId, children } }` | Deferred iteration — the runtime stores the body function by `functionId`; the renderer asks the runtime to expand it as needed. |
| `Representable` | `{ type: 'Representable', props: { functionId, environmentId } }` | Deferred function call — used for builders like `GeometryReader((proxy) => ...)`. |
| `ComponentCall` | `{ type: 'ComponentCall', props: { name, props }, children: [ast] }` | Wraps a user-defined component invocation; `children` carries the body's emitted AST. |

Modifier chains compose into nested `ModifiedComponent` nodes: `Text('hi').padding(8).background(Color('red'))` emits a `ModifiedComponent('background', ModifiedComponent('padding', Directive('Text')))`. The renderer must unwrap these depth-first to apply modifiers in chain order.

### Host SPI (host → runtime)

The host (the renderer or a containing app) calls these methods on a `BindJSRuntime` instance.

| Method | Purpose |
|---|---|
| `new BindJSRuntime(options?)` | Construct an instance. |
| `registerComponent(name, jsSource, entryPoint = 'default')` | Load a `defineComponent` module by name. |
| `registerComponents(map, entryPoint = 'body')` | Batch register. |
| `aliasComponent(existing, alias)` | Add a name alias. |
| `registerEnvironment(env)` | Inject the initial environment dictionary. |
| `setRendererId(id)` | Set the host's renderer instance id (used to scope re-render notifications). |
| `willRender()` | Reset hook indices before a render cycle. |
| `callComponent(name, props, children, unwrap = true)` | Invoke a component and return its emitted AST. |
| `callComponentPreview(name, index, ...)` | Render one of a component's `previews[]`. |
| `callComponentThumbnail(name, options, ...)` | Render the component's `thumbnail`. |
| `getComponentMetadata(name)` / `getComponentProperties(name)` / `getComponentPreviews(name)` / `getComponentIcon(name)` / `getComponentType(name)` | Introspection — read schema and metadata without rendering. |
| `restoreFunction(functionId)` | Resolve a callback opaque id back to the JS function so the host can invoke it. |
| `restoreEnvironment(environmentId)` | Resolve a captured environment snapshot. |
| `callForEachFunction(functionId, element, index)` | Expand a deferred `ForEach` body for one element. |
| `resetState()` | Clear all hook storage. |

### Runtime → host callbacks (overrideable)

The host provides these on a `BindJSRuntime` instance to receive notifications from the runtime.

| Hook | Fires when |
|---|---|
| `needsRerender(rendererId)` | A `setState` (or other state-changing hook) wants the host to schedule a re-render. The host owns the loop. |
| `onOpenURL(url, callback, options)` | A component invokes the `openURL` environment value. |
| `onUpdateAppState(key, value, state)` | A `useAppState` setter fires (legacy). |
| `navigateCallback({ to, props })` | A component calls `useNavigate()(...)`. |
| `actionCallback({ name, props })` | A component calls `useAction()(...)`. |
| `withAnimation(handlerId)` | The runtime is invoking a `withAnimation`-wrapped state mutation. |
| `mcpHost` | Set by the host; the runtime exposes this object via `useMCPHost()`. |

### Path-based hook state, in implementation terms

The runtime maintains a `hookState.path` array during render. Entering a component pushes `<modifierId>:<componentName>:<childIndex>` (or `<forEachElementId>` inside an iteration) onto the path; exiting pops it. Hook storage is keyed by `path.join('.')`, and within a component each hook call increments `hookState.currentComponent.hookIndex` so the N-th `useState` in the body always reads / writes the same slot. This implementation is what the spec's *hook state keying* contract describes externally — `.id(...)` on items in `ForEach` is how authors give a child a stable `forEachElementId` so its state survives reorders.

### Source files to consult

If something above drifts from the runtime, these are the files of record.

| Concern | File |
|---|---|
| Runtime entry, component / modifier registration, hook bookkeeping | `bindjs-runtime/packages/runtime/src/runtime/BindJSRuntime.js` |
| AST node constructors | `bindjs-runtime/packages/runtime/src/runtime/AST.js` |
| Web renderer (`componentsMap`, `modifiersMap`) | `bindjs-runtime/packages/react/src/YapUIDecoder.js` |
| iOS bridge | `bindjs-apple/Sources/BindJS/Infrastructure/BindJSContext.swift`, `BindJSView.swift` |
| Android bridge | `bindjs-android/bindjs/src/main/java/ai/metabind/bindjs/JsRuntimeImpl.kt`, `composables/BindJSView.kt` |

---

### Additional 1.0 contracts (from the 2026-09-06 inventories)

- **Handler ids.** Any prop whose key starts with `on` or `set` and whose value is a function is replaced by `<key>Id` holding a handler id; the original key is removed. Handlers never cross the boundary as functions.
- **Modifier folding.** Some modifiers fold into the child's props instead of wrapping: `opacity` on `Color`, `resizable` on `Image`, `fill` and `stroke` on shapes, and the animation timing modifiers (`delay`, `speed`, `repeatCount`, `repeatForever`). Renderers MUST handle both the wrapped and the folded form.
- **`ForEach`.** The expanded form (materialized `children`) is the 1.0 baseline every renderer MUST accept. The lazy form (`dataId`, `functionId`, `count`) is optional.
- **Unknown names.** A renderer MUST render nothing for an unknown component, MUST ignore an unknown modifier, MUST NOT throw in either case, and SHOULD log the name.
- **Partial props.** The runtime tolerates in-flight partial component instances (streamed tool input) and renders the prefix it has; components MUST tolerate absent props.
- **Version globals.** `BindJS.spec` and `BindJS.runtime` (BEP-0002).

Per-renderer coverage lives in `conformance/statements/`.
