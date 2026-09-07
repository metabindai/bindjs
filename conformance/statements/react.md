# Conformance statement: React renderer

- Implementation: `@metabindai/bindjs-runtime` 1.0.9 (runtime), `@metabindai/bindjs-react` 1.0.5 (renderer)
- Specification: BindJS 1.0
- Level: Core with declared gaps
- Charts module: provided
- Checked: 2026-09-06 against `packages/react/src/YapUIDecoder.js` (64 component keys, 93 modifier keys)

## Core components

| Status | Items | Behavior today |
|---|---|---|
| Unsupported | `List`, `Menu`, `Label`, `Path` | Not rendered. `Path` has a full runtime implementation and no React view. |
| Supported after fix | `SecureField` | Masked input (`type="password"`). Until the fix ships, the renderer MUST fail closed: render nothing and log. An unmasked alias is a defect, not a gap, and is not published as one. |
| Aliased (gap) | `LazyVStack`, `LazyHStack` render as `VStack`, `HStack` | Renders correctly; no virtualization. |
| Aliased (gap) | `CustomFont` renders as an empty view | The font is not loaded; hosts load fonts through page CSS. |
| Supported | the remaining 37 | |

## Core modifiers

| Status | Items |
|---|---|
| Unsupported (ignored) | `clipped`, `tint`, `coordinateSpace`, `contextMenu`, `pickerStyle`, `layoutPriority`, `transition`, `autocorrectionDisabled`, `keyboardType`, `focused`, `onSubmit`, `textFieldStyle`, `submitLabel`, `accessibilityHidden`, `accessibilityRemoveTraits`, and the `Image` modifiers `renderingMode`, `interpolation`, `antialiased`, `symbolRenderingMode`, `imageScale` |
| Supported | the remaining 65, including `onHover`, `visualEffect`, `containerRelativeFrame`, `controlSize`, `onChange`, `dynamicTypeSize`, `accessibilityLabel`, `accessibilityValue` |

## Runtime

- No `BindJS.spec` or `BindJS.runtime` global; no version constant anywhere (BEP-0002).
- `ComponentNames.js` omits `Color` (registered separately) and is not sorted; harmless at runtime, fixed before publication.
- Deprecated but live: `call()`, `makeComponent`, `useAppState`, the legacy auto-wrap of components without `export default`. Removed in 2.0; documented as deprecated in 1.0.

## Platform extensions provided

Components: `Shader` (WebGL). Modifiers: `accentColor`, `backgroundBlur`, `borderWidth`, `fontSize`, `link`, `thumbnailScale`, `glassEffect`, `scrollTargetLayout`, `scrollTargetBehavior`.
