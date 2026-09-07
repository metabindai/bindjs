# Conformance statement: Jetpack Compose renderer

- Implementation: `ai.metabind:bindjs-android` 0.0.20 (minSdk 26, compileSdk 36, Compose UI 1.10.4, Material3 1.4.0)
- Specification: BindJS 1.0
- Level: Partial (nine Core components and fifteen Core modifiers unsupported; target for Core with declared gaps: [date, owner])
- Charts module: provided
- Checked: 2026-09-06 against `GsonProvider.kt` (47 registered types, 87 modifiers) and `BindJSView.kt`

## Core components

| Status | Items | Behavior today |
|---|---|---|
| Unsupported | `LazyVStack`, `LazyHStack`, `List`, `Markdown`, `SecureField`, `Slider`, `Path`, `CustomFont`, `Placeholder` | Deserialized as an empty component; nothing rendered. `Text` renders Markdown inline, but the `Markdown` component is not registered. |
| Partial | `ForEach` | Expanded form only (the 1.0 baseline). Lazy form is refused with a log line. |
| Partial | `Picker` | Options are discovered only from `Text(...).tag(...)` children; `segmented` and menu styles. |
| Partial | `Spacer` | Honored inside `VStack`, `HStack`, `Section`; elsewhere not rendered. |
| Partial | `Material` | Honored as a `background` or `foregroundStyle` value; not rendered standalone. |
| Supported | the remaining 30 | |

## Core modifiers

| Status | Items | Behavior today |
|---|---|---|
| Unsupported (ignored) | `containerRelativeFrame`, `onHover`, `transition`, `keyboardType`, `focused`, `onSubmit`, `submitLabel`, `textFieldStyle`, `controlSize`, `dynamicTypeSize`, and the `Image` modifiers `renderingMode`, `interpolation`, `antialiased`, `symbolRenderingMode`, `imageScale` | Not registered; ignored. |
| No-op (registered, no effect) | `colorScheme`, `coordinateSpace`, `environment`, `layoutPriority`, `resizable`, `tint`, `visualEffect`, `ignoresSafeArea` (deliberate on Android) | Accepted and dropped. |
| Partial | `blur` (API 31 and later only), `transformEffect` (no shear), `foregroundStyle` (Material via blur only in the chain; color resolved at the leaf), `disabled` (Button, TextEditor, Video only), `allowsHitTesting` (strips tap only), `accessibilityRemoveTraits` (clears all semantics), `border` (no Material) | |
| Supported | the remaining 46 | |

## Runtime

- No `BindJS.spec` or `BindJS.runtime` global; the vendored `script.js` carries no version stamp (BEP-0002).
- JavaScript isolate: `androidx.javascriptengine` `JavaScriptIsolate`, no `fetch`, no storage; timers polyfilled over a `Handler`; `console` is the only channel to native. No `IsolateStartupParameters` (no heap limit) today.
- Host bridge: console-message channel (`__MCP__::method::args`) with `__resolveToolCall` for promises; `McpHost` has `toolCall`, `sendMessage`, `updateModelContext`, `openLink`, `log`. `requestDisplayMode`, `sizeChanged`, `sendRequest`, `sendNotification` are absent (gap against the 1.0 bridge surface; BEP-0002 lists the required additions).
- Environment: Core keys are not injected by the runtime; the host must set them. 1.0 requires the runtime to inject defaults.
- Unknown component: logged and not rendered (conforms).

## Platform extensions provided

None beyond the Charts module. The renderer-internal `LocalModifier` set is not addressable from BindJS source.
