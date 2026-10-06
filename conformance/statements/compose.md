# Conformance statement: Jetpack Compose renderer

- Implementation: `ai.metabind:bindjs-android` 0.0.20 (minSdk 26, compileSdk 36, Compose UI 1.10.4, Material3 1.4.0)
- Specification: BindJS 1.0
- Level: Partial (nine Core components and 15 Core modifiers unsupported). Target: Core with declared gaps by the BindJS 1.0 release, owned by the Android maintainer; progress is tracked in the repository's conformance-gap issues.
- Charts module: provided
- Checked: 2026-09-06 against `GsonProvider.kt` (47 registered types, 87 modifiers) and `BindJSView.kt`; layout checked 2026-10-06 against SwiftUI on the 85 parity cases of metabindai/bindjs-runtime#14

## Core components

| Status | Items | Behavior today |
|---|---|---|
| Unsupported | `LazyVStack`, `LazyHStack`, `List`, `Markdown`, `SecureField`, `Slider`, `Path`, `CustomFont`, `Placeholder`, `AudioPlayer` | Deserialized as an empty component; nothing rendered. `Text` renders Markdown inline, but the `Markdown` component is not registered. |
| Partial | `ForEach` | Expanded form only (the 1.0 baseline). Lazy form is refused with a log line. |
| Partial | `Picker` | Options are discovered only from `Text(...).tag(...)` children; `segmented` and menu styles. |
| Partial | `Spacer` | Honored inside `VStack`, `HStack`, `Section`; elsewhere not rendered. |
| Partial | `Material` | Honored as a `background` or `foregroundStyle` value; not rendered standalone. |
| Partial | `VStack`, `HStack` | Space is shared by Compose weight, not by SwiftUI's order of flexibility. An `HStack` of two `aspectRatio(1)` colors in a 360-wide frame draws nothing; SwiftUI draws two 180-point squares. |
| Partial | `ScrollView` | A vertical scroll view takes its content's height, not the height offered. In a taller frame the frame's alignment places it (centered by default); SwiftUI's fills the frame with the content at the top. |
| Partial | `Image` | With no aspect modifier, a resizable image keeps its ratio where SwiftUI stretches it to its ideal height, and a non-resizable image is scaled to fit its frame where SwiftUI keeps its natural size. |
| Supported | the remaining 26 | |

## Core modifiers

| Status | Items | Behavior today |
|---|---|---|
| Unsupported (ignored) | `containerRelativeFrame`, `onHover`, `transition`, `keyboardType`, `focused`, `onSubmit`, `submitLabel`, `textFieldStyle`, `controlSize`, `dynamicTypeSize`, and the `Image` modifiers `renderingMode`, `interpolation`, `antialiased`, `symbolRenderingMode`, `imageScale` | Not registered; ignored. |
| No-op (registered, no effect) | `colorScheme`, `coordinateSpace`, `environment`, `layoutPriority`, `resizable`, `tint`, `visualEffect`, `ignoresSafeArea` (deliberate on Android) | Accepted and dropped. |
| Partial | `blur` (API 31 and later only), `transformEffect` (no shear), `foregroundStyle` (Material via blur only in the chain; color resolved at the leaf), `disabled` (Button, TextEditor, Video only), `allowsHitTesting` (strips tap only), `accessibilityRemoveTraits` (clears all semantics), `border` (no Material) | |
| Supported after fix | `aspectRatio`, `scaledToFit`, `scaledToFill`, `tracking`. metabindai/bindjs-android#45 | Until it ships: `aspectRatio` ignores the content mode and draws a `null` ratio as 1; `scaledToFit` and `scaledToFill` size no view and only set how an image draws, and `scaledToFill` stretches it (`ContentScale.FillBounds`); `tracking` is applied in sp, so it grows with the user's font scale. |
| Partial | `frame`, `padding` | A frame is applied as Compose constraints, so content larger than a fixed frame is squeezed instead of overflowing. Padding written outside a frame is drawn inside it: `.frame(100, 100).padding(20)` is 100 tall, not 140. Negative padding offsets the content instead of insetting it, and a negative leading or trailing value offsets it vertically. |
| Supported | the remaining 40 | |

## Runtime

- No `BindJS.spec` or `BindJS.runtime` global; the vendored `script.js` carries no version stamp (BEP-0002).
- JavaScript isolate: `androidx.javascriptengine` `JavaScriptIsolate`, no `fetch`, no storage; timers polyfilled over a `Handler`; `console` is the only channel to native. No `IsolateStartupParameters` (no heap limit) today.
- Host bridge: console-message channel (`__MCP__::method::args`) with `__resolveToolCall` for promises; `McpHost` has `toolCall`, `sendMessage`, `updateModelContext`, `openLink`, `log`. `requestDisplayMode`, `sizeChanged`, `sendRequest`, `sendNotification` are absent (gap against the 1.0 bridge surface; BEP-0002 lists the required additions).
- Environment: Core keys are not injected by the runtime; the host must set them. 1.0 requires the runtime to inject defaults.
- Unknown component: logged and not rendered (conforms).

## Platform extensions provided

None beyond the Charts module. The renderer-internal `LocalModifier` set is not addressable from BindJS source.
