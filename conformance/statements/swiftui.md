# Conformance statement: SwiftUI renderer

- Implementation: `bindjs-apple` 1.2.0 (Swift package `BindJS`; iOS 17, macOS 14, tvOS 17, watchOS 10, visionOS 1)
- Specification: BindJS 1.0
- Level: Core with declared gaps
- Charts module: provided
- Checked: 2026-09-06 against `Sources/BindJS/Components/ComponentView.swift` (60 component types, 130 modifiers)

## Core components

| Status | Items | Behavior today |
|---|---|---|
| Unsupported | `Markdown`, `Slider` | Name is accepted by the runtime; the renderer treats the node as unresolved and renders its children only. |
| Supported | the remaining 43 | `Map` and its sub-directives are iOS and visionOS only (platform extension). |

## Core modifiers

| Status | Items | Behavior today |
|---|---|---|
| Unsupported (ignored) | `onHover` | Not registered; ignored. |
| Partial | `aspectRatio`, `frame` | `aspectRatio`: the bundled runtime sends the ratio as `rawValue` and no content mode, so every call draws as `.aspectRatio(nil, contentMode: .fill)`, until the runtime from metabindai/bindjs-runtime#14 is bundled. `frame`: a fixed `width` or `height` in a frame that also has a minimum or maximum is dropped, until metabindai/bindjs-apple#83. |
| Supported | the remaining 82 | `frame` is one modifier with two argument shapes (fixed and flexible). `fill`, `stroke`, `resizable`, `buttonStyle` are folded into the component's props by the runtime and read as props. `glassEffect`, `scrollEdgeEffectHidden`, `scrollEdgeEffectStyle` (extensions) are no-ops below OS 26. |

## Runtime

- No `BindJS.spec` or `BindJS.runtime` global; the vendored `BindJSRuntime.js` carries no version stamp (BEP-0002).
- JavaScript context: plain `JSContext`, no DOM, no `fetch`, no storage, no `require`; timers and `console` only. No explicit memory or time limits (the MCP Apps binding recommends them).
- Host bridge: `MCPHostBridge` implements the full 1.0 bridge surface plus `elicit` (platform extension, not part of 1.0).
- Unknown component: renders children only, silently. 1.0 requires a log line.

## Platform extensions provided

Components: `NavigationStack`, `Grid`, `GridRow`, `ViewThatFits`, `ContentUnavailableView`, `ToolbarItem`, `ToolbarItemGroup`, `Map` (+ `Annotation`, `Marker`, `MapCircle`, `MapPolygon`, `MapPolyline`). Modifiers: presentation (`sheet`, `fullScreenCover`, `presentationDetents`, `quickLookPreview`), navigation chrome, toolbar, list chrome, scroll chrome, grid cells, `safeAreaInset`, `contentShape`, `glassEffect`, `sensoryFeedback`, `badge`, `contentTransition`, `minimumScaleFactor`, `allowsTightening`, `fontWidth`, `accessibilityHint`, `accessibilityAddTraits`, `accessibilityRepresentation`, `previewName`, `gallery`, `galleryItem`.
