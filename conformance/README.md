# BindJS 1.0 conformance

This directory freezes what an implementation must provide to call itself BindJS 1.0, and records what each shipping implementation provides today. The lists below are normative; they were cut from the reference chapters (07 Components, 08 Modifiers, 05 Hooks, 06 Runtime) and checked against the three renderers' registries on 2026-09-06.

## 1. Core component set (44)

Layout: `VStack`, `HStack`, `ZStack`, `LazyVStack`, `LazyHStack`, `Group`, `Section`, `GeometryReader`
Scrolling and lists: `ScrollView`, `List`, `ForEach`
Text: `Text`, `Markdown`
Text input: `TextField`, `SecureField`, `TextEditor`
Controls: `Button`, `Toggle`, `Slider`, `Picker`, `Menu`, `Label`, `ProgressView`
Empty states and spacers: `Empty`, `Spacer`, `Divider`
Media: `Image`, `Video`, `Model3D`
Shapes: `Circle`, `Ellipse`, `Capsule`, `Rectangle`, `RoundedRectangle`, `Path`
Color, material, gradients: `Color`, `Material`, `LinearGradient`, `AngularGradient`, `RadialGradient`, `EllipticalGradient`
Fonts: `CustomFont`
Navigation: `NavigationLink`
Host integration: `Placeholder`

**Charts module (1.0, optional).** `Chart`, `PieChart`, and the marks `AreaMark`, `BarMark`, `LineMark`, `PointMark`, `RuleMark`, `RectangleMark`, `PieSliceMark`, with the twelve `chart*` modifiers, `annotation`, `interpolationMethod`, `lineStyle`, `symbol`, `symbolSize`. All three renderers ship it; the reference chapter is being written from the implementations (BEP-0003, Charts). An implementation states whether it provides the module.

Everything else the runtime accepts as a name (the runtime registers about 170 SwiftUI names so that authoring code parses) is outside 1.0. A renderer MUST render nothing for an unknown component, MUST NOT throw, and SHOULD log the name.

## 2. Core modifier set (86)

Identity: `id`, `tag`
Lifecycle: `onAppear`, `onDisappear`
Layout: `frame`, `containerRelativeFrame`, `padding`, `offset`, `zIndex`, `layoutPriority`, `fixedSize`, `aspectRatio`
Transforms: `scaleEffect`, `rotationEffect`, `transformEffect`
Appearance: `opacity`, `foregroundStyle`, `background`, `border`, `cornerRadius`, `shadow`, `blur`, `saturation`, `brightness`, `contrast`, `grayscale`, `colorInvert`, `blendMode`, `tint`
Color scheme and type size: `colorScheme`, `dynamicTypeSize`
Typography: `font`, `fontWeight`, `fontDesign`, `bold`, `italic`, `monospaced`, `tracking`, `lineSpacing`, `lineLimit`, `multilineTextAlignment`, `strikethrough`, `underline`, `textCase`
Layering, clipping, masking: `overlay`, `mask`, `clipShape`, `clipped`
Safe area: `ignoresSafeArea`
Visibility and interaction: `disabled`, `hidden`, `allowsHitTesting`
Gestures: `onTapGesture`, `onLongPressGesture`, `onDragGesture`, `onHover`
Visual effects: `visualEffect`, `coordinateSpace`
Context menu: `contextMenu`
Controls: `controlSize`, `buttonStyle`, `pickerStyle`, `textSelection`
Text input: `keyboardType`, `focused`, `onSubmit`, `textFieldStyle`, `submitLabel`, `autocorrectionDisabled`
Value observation: `onChange`
Accessibility: `accessibilityLabel`, `accessibilityValue`, `accessibilityHidden`, `accessibilityRemoveTraits`
Transitions: `transition`
Environment: `environment`
Component-specific: `Image`: `resizable`, `scaledToFit`, `scaledToFill`, `renderingMode`, `interpolation`, `antialiased`, `symbolRenderingMode`, `imageScale`; `Shape`: `fill`, `stroke`

The modifier namespace is open at the language level: the runtime turns any property access into a modifier node. That is a language feature (it is how platform extensions work without runtime changes), not a conformance surface. A renderer MUST ignore an unknown modifier, MUST NOT throw, and SHOULD log the name. A renderer MUST NOT silently alias one Core name to another; an alias is a declared gap.

## 3. Runtime conformance

A runtime conforms when it provides, per chapter 06: the authoring primitives (`defineComponent`, `defineButtonStyle`), the hooks (`useState`, `useStore`, `useEnvironment`, `useNavigate`, `useAction`, `useMCPHost`, `useRef`), the property constructors, the animation builders and `withAnimation`, the utilities (`Self`, `getComponentData`, `OpenURLAction`), the Core environment keys (`colorScheme`, `displayScale`, `locale`, `layoutDirection`, `openURL`), timers (`setTimeout`, `clearTimeout`, `setInterval`, `clearInterval`), and the AST contract of chapter 09 (four node constructors; `ModifiedComponent` wrappers; handler ids in place of functions for any prop named `on*` or `set*`; expanded `ForEach` as the 1.0 baseline, lazy `ForEach` optional).

New in 1.0, required by publication: the runtime MUST expose `BindJS.spec` (the specification version, `"1.0"`) and `BindJS.runtime` (the implementation version) as globals, and vendored runtime bundles MUST carry both in a leading comment. No shipping runtime does this today; it is the first item in every statement's gap list (BEP-0002).

## 4. Statements

- `statements/react.md`: `@metabindai/bindjs-runtime` 1.0.9 and `@metabindai/bindjs-react` 1.0.5
- `statements/swiftui.md`: `bindjs-apple` 1.2.0
- `statements/compose.md`: `bindjs-android` 0.0.20

Each statement lists Core items that are unsupported, aliased, partial, or no-op, and the platform extensions it provides. Each gap gets a tracking issue when the repository is published.
