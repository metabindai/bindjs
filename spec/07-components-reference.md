# BindJS Specification 1.0, chapter 07: Component Reference

> Part of the BindJS Specification (`metabindai/bindjs`). Normative unless marked informative. Changes go through BEPs (`proposals/`).

## BindJS Component Reference

This reference lists every component declared in the BindJS type definitions. Each entry shows the canonical signature plus a short example. Modifiers are covered in the next chapter.

The reference is split into two sections:

- **Core** — components every conforming runtime SHOULD implement. Cross-platform by design.
- **Platform Extensions** — components scoped to a specific host platform's UI vocabulary (today, all iOS / SwiftUI). Authoring code that uses these is non-portable.

> The per-platform implementation status of each component lives in chapter 9.

---

## Core

## Layout — Stacks

### `VStack`, `HStack`, `ZStack`

Vertical, horizontal, and overlay stacks.

```javascript
VStack({ spacing: 16, alignment: 'leading' }, [Text('Title'), Text('Body')])
HStack({ spacing: 12, alignment: 'center' }, [Image({ systemName: 'star.fill' }), Text('Rating')])
ZStack({ alignment: 'bottomTrailing' }, [
  Image({ url: 'photo.jpg' }),
  Text('Caption').padding(8),
])
```

All three accept either `(children)` or `(props, children)`. `VStack` / `LazyVStack` use `HorizontalAlignment`; `HStack` / `LazyHStack` use `VerticalAlignment`; `ZStack` uses `Alignment`.

### `LazyVStack`, `LazyHStack`

Lazy variants — only render visible children. Use inside `ScrollView` for large lists.

```javascript
ScrollView([
  LazyVStack({ spacing: 8, pinnedViews: 'sectionHeaders' }, items.map(renderRow))
])
```

`pinnedViews` accepts `'sectionHeaders'`, `'sectionFooters'`, or `'all'`.

### `Group`

Groups multiple components without adding layout. Useful for conditional rendering or applying modifiers to a set of components at once. Accepts a `subviews` form for view decomposition:

```javascript
Group([Text('A'), Text('B')])

Group(VStack([a, b, c]), (subviews) =>
  HStack([subviews[0], Spacer(), subviews[1]])
)
```

### `Section`

Groups content with optional header / footer. Used inside `List` and `Form`.

```javascript
Section({ header: Text('Settings').font('headline') }, [
  Toggle({ label: 'Dark Mode', isOn, setIsOn }),
])
```

## Layout — Adaptive

### `GeometryReader`

Provides the parent container's geometry to a builder function.

```javascript
GeometryReader((geometry) =>
  Circle().frame({ width: geometry.size.width * 0.5 })
)
```

The `geometry` argument is a `GeometryProxy` — it exposes `size`, `safeAreaInsets`, `containerCornerInsets`, and `frame(coordinateSpace)`.

## Scrolling and Lists

### `ScrollView`

Scrollable container.

```javascript
ScrollView({ axis: 'horizontal', showsIndicators: false }, [
  HStack({ spacing: 16 }, cards),
])
```

`axis` is `'horizontal'`, `'vertical'` (default), or `'both'`.

### `List`

A scrollable list with optional selection tracking.

```javascript
List([ ForEach(items, (item) => Text(item.name)) ])

const [selection, setSelection] = useState(null)
List({ selection, setSelection }, items.map(item =>
  Text(item.name).tag(item.id)
))
```

### `ForEach`

Iterates over data to produce components. The callback is `(item, index)` — positional arguments, not destructured:

```javascript
ForEach(items, (item, index) => Text(`${index + 1}. ${item.name}`))
```

Also iterates over subviews for view decomposition:

```javascript
ForEach(subviews, ({ subview }) => subview.padding(8))
```

## Text and Markdown

### `Text`

Plain text or inline markdown.

```javascript
Text('Hello, world!')
Text({ markdown: '**Bold** and *italic*' })
```

### `Markdown`

Renders a full markdown document (headings, paragraphs, lists, code blocks). Use `Text({ markdown })` for inline formatting only.

```javascript
Markdown('# Welcome\n\nThis is a **paragraph** with formatting.')
```

## Text Input

### `TextField`

Single-line text input.

```javascript
TextField({ placeholder: 'Email', text, setText: setText })
  .keyboardType('emailAddress')
  .autocorrectionDisabled()
  .submitLabel('done')
  .onSubmit(() => handleSubmit())
```

### `SecureField`

Single-line input that obscures its contents (passwords).

```javascript
SecureField({ placeholder: 'Password', text, setText })
```

### `TextEditor`

Multi-line text editing area.

```javascript
TextEditor({ text, setText })
  .frame({ minHeight: 120 })
```

## Controls

### `Button`

```javascript
Button('Save', () => handleSave())
Button({ label: HStack([Image({ systemName: 'checkmark' }), Text('Save')]),
         action: () => handleSave() })
```

Style with `.buttonStyle(MyButtonStyle)` — see `defineButtonStyle` in chapter 1.

### `Toggle`

```javascript
const [isOn, setIsOn] = useState(false)
Toggle({ label: 'Enabled', isOn, setIsOn })
```

### `Slider`

```javascript
Slider({
  value: volume,
  setValue: setVolume,
  range: [0, 100],
  step: 5,
  label: 'Volume',
  minimumValueLabel: Text('0').font('caption'),
  maximumValueLabel: Text('100').font('caption'),
})
```

`range: [lo, hi]` is the convenient form; `lowerBound` / `upperBound` work too.

### `Picker`

A selection control. Style it with `.pickerStyle()`.

```javascript
const [size, setSize] = useState('m')
Picker('Size', [size, setSize], [
  Text('Small').tag('s'),
  Text('Medium').tag('m'),
  Text('Large').tag('l'),
]).pickerStyle('segmented')
```

`pickerStyle` values: `'automatic'`, `'segmented'`, `'inline'`, `'menu'`, `'navigationlink'`, `'palette'`, `'radiogroup'`, `'wheel'`.

### `Menu`

A dropdown of actions.

```javascript
Menu({ label: Button('Options', () => {}) }, [
  Button('Edit', () => handleEdit()),
  Button('Delete', () => handleDelete()),
])
```

### `Label`

Standard title + icon row.

```javascript
Label({ title: 'Favorites', systemImage: 'star.fill' })
Label({ title: 'Profile', icon: Image({ url: 'avatar.png' }) })
```

### `ProgressView`

```javascript
ProgressView()                          // indeterminate spinner
ProgressView({ value: 0.7, total: 1 })  // 70% bar
```

## Empty States and Spacers

### `Empty`

Renders nothing. Use for conditional rendering.

```javascript
showContent ? Text('Hello') : Empty()
```

### `Spacer` and `Divider`

```javascript
HStack([Text('Left'), Spacer(), Text('Right')])
HStack([Text('Top'), Spacer({ minLength: 20 }), Text('Bottom')])
VStack({ spacing: 0 }, [Text('Above'), Divider(), Text('Below')])
```

## Media

### `Image`

```javascript
Image({ url: 'https://example.com/photo.jpg' })
Image({ systemName: 'star.fill' })
Image({ name: 'hero-image' })            // asset name
Image({ image: 'data:image/png;base64,…' })
Image({ svg: '<svg>…</svg>' })
```

Image-specific modifiers: `.resizable()`, `.renderingMode('original'|'template')`, `.interpolation('none'|'low'|'medium'|'high')`, `.antialiased()`, `.symbolRenderingMode('monochrome'|'hierarchical'|'palette'|'multicolor')`, `.imageScale('small'|'medium'|'large')`. Most callers also use the universal `.aspectRatio()` and `.scaledToFit()` / `.scaledToFill()`.

### `Video`

```javascript
Video({
  url: 'https://example.com/video.mp4',
  autoplay: true, muted: true, controls: true, loop: false,
}).frame({ height: 300 })
```

### `Model3D`

Displays a 3D model from a URL. iOS uses `iOSURL` for a USDZ override.

```javascript
Model3D({
  url: 'https://example.com/chair.glb',
  iOSURL: 'https://example.com/chair.usdz',
  description: 'Lounge chair',
  cameraControls: true,
  autoRotate: false,
})
```

## Shapes

### Built-in

```javascript
Rectangle().fill(Color('blue')).frame({ width: 100, height: 50 })
RoundedRectangle({ cornerRadius: 12 }).fill(Color('green'))
Circle().fill(Color('red')).frame({ width: 50, height: 50 })
Ellipse().fill(LinearGradient({ colors: [Color('blue'), Color('purple')] }))
Capsule().fill(Color('orange')).frame({ width: 80, height: 40 })
```

Shape-specific modifiers: `.fill(Style)`, `.stroke(Style | { style, lineWidth })`.

### `Path`

Custom vector shape from path commands.

```javascript
Path((path) => {
  path.move(50, 0)
  path.line(100, 100)
  path.line(0, 100)
  path.close()
}).fill(Color('blue'))
```

The `PathBuilder` exposes `move`, `line`, `quadCurve`, `curve`, `arc`, `addRect`, `addRoundedRect`, `addEllipse`, `addLines`, `close`.

## Color, Material, Gradients

### `Color`

```javascript
Color('blue')                       // named
Color({ r: 0.5, g: 0.3, b: 0.9 })  // RGB (0–1)
Color({ h: 240, s: 0.8, b: 0.5 })  // HSB
Color('#FF5500')                    // hex
Color('primary')                    // semantic, adapts to color scheme
Color('blue').opacity(0.5)
```

The `ColorProps` union accepts named colors, RGB / HSL objects, hex strings, and ARGB integers.

### `Material`

Translucent blur effect ("frosted glass"). Use as a background.

```javascript
Text('Over blurred background').background(Material('thin'))
Material({ type: 'regular', opacity: 0.8, blurRadius: 10 })
```

Types: `'ultraThin'`, `'thin'`, `'regular'`, `'thick'`, `'bar'`, `'chrome'`, `'titlebar'`, `'toolbarMaterial'`.

### Gradients

```javascript
LinearGradient({ colors: [Color('blue'), Color('purple')], startPoint: 'leading', endPoint: 'trailing' })
AngularGradient({ colors: ['red', 'yellow', 'green'], center: 'center', startAngle: 0, endAngle: 360 })
RadialGradient({ colors: ['white', 'black'], center: 'center', startRadius: 0, endRadius: 100 })
EllipticalGradient({ colors: [Color('yellow'), Color('orange'), Color('red')], startRadius: 0, endRadius: 100 })
```

`startPoint` / `endPoint` / `center` accept a `UnitPoint` — either `{x, y}` (0–1 range) or one of `'top'`, `'bottom'`, `'leading'`, `'trailing'`, `'topLeading'`, `'topTrailing'`, `'bottomLeading'`, `'bottomTrailing'`, `'center'`, `'zero'`.

## Custom Fonts

### `CustomFont`

```javascript
Text('Custom').font(CustomFont({
  url: 'https://example.com/Inter-Regular.woff2',
  family: 'Inter',
  size: 16,
  relativeToTextStyle: 'body',
}))
```

## Navigation

### `NavigationLink`

Triggers navigation to a destination view when tapped. Inside a `NavigationStack` on iOS; resolved by the host on web and Android via `useNavigate()`.

```javascript
NavigationLink('Details', () => DetailView({ id: item.id }))
NavigationLink(
  Label({ title: 'Settings', systemImage: 'gear' }),
  () => SettingsView()
)
```

For programmatic navigation, attach `.navigationDestination({ isPresented, setIsPresented, destination })` to a parent view (see chapter 8 — `navigationDestination` is an iOS Platform Extension modifier).

## Host Integration

### `Placeholder`

A bridge to native platform components. The host application registers native views by name; at runtime, BindJS resolves the `name` against that registry. The children render as a fallback when no native component is registered for the current platform.

```javascript
Placeholder({
  name: 'MapView',
  props: { latitude: 37.7749, longitude: -122.4194 },
  title: 'Map',
  validPlatforms: ['iOS', 'android'],
}, [
  Text('Map not available on this platform'),
])
```

## Utilities

These aren't components but are commonly used in component bodies.

| Function | Purpose |
|---|---|
| `Self(props?, children?)` | Self-reference for recursive components. Props inferred from the component's own `properties`. |
| `getComponentData(builder)` | Extracts `{ name, props }` from a component builder, unwrapping modifiers. |
| `OpenURLAction(callback)` | Intercepts URL-opening requests. Set as an environment value. |
| `setTimeout(cb, delayMs)` / `clearTimeout(id)` | Schedule and cancel deferred callbacks. |
| `alert(message)` | Display a modal alert. |

```javascript
VStack([Markdown(props.content)]).environment('openURL', OpenURLAction((url) => {
  if (url.startsWith('myapp://')) {
    navigate({ to: 'deep-link', props: { url } })
    return { handled: true }
  }
  return { systemAction: { url, preferInApp: true } }
}))
```

---

## Platform Extensions

These components are scoped to a specific host platform's UI vocabulary. They render natively on the platform they belong to and have no portable equivalent on others. Authoring code that uses them is non-portable — guard with environment checks if you need the same component to work cross-platform.

## iOS / SwiftUI

### Layout — Grids and Adaptive

#### `Grid`, `GridRow`

Two-dimensional grid layout — SwiftUI `Grid`.

```javascript
Grid({ horizontalSpacing: 12, verticalSpacing: 8 }, [
  GridRow([Text('Name'), Text('Value')]),
  GridRow([Text('Width'), Text('100').gridCellColumns(1)]),
])
```

#### `ViewThatFits`

Picks the first child that fits in the available space.

```javascript
ViewThatFits([
  HStack([icon, label, description]), // try wide layout first
  VStack([icon, label]),               // fall back to narrow layout
])
```

Optionally accepts `{ axes: 'horizontal' | 'vertical' | 'both' }`.

### Empty States

#### `ContentUnavailableView`

SwiftUI's native empty-state view with icon, title, description, and optional actions.

```javascript
ContentUnavailableView({
  title: 'No Results',
  systemImage: 'magnifyingglass',
  description: 'Try a different search term.',
}, [
  Button('Clear filters', () => clearFilters()),
])
```

### Navigation

#### `NavigationStack`

A SwiftUI container for hierarchical navigation. On other platforms, navigation is delegated to the host application via `useNavigate()`.

```javascript
NavigationStack([
  List([
    NavigationLink('Settings', () => SettingsView()),
  ]).navigationTitle('Home'),
])
```

### Toolbar

#### `ToolbarItem`

A single toolbar item with optional placement. Used inside `.toolbar()`.

```javascript
ToolbarItem({ placement: 'topBarTrailing' }, [
  Button('Save', () => handleSave()),
])
```

#### `ToolbarItemGroup`

Groups multiple toolbar items with shared placement.

```javascript
VStack([…]).toolbar(
  ToolbarItemGroup({ placement: 'topBarTrailing' }, [
    Button('Edit', () => {}),
    Button('Share', () => {}),
  ])
)
```

`ToolbarItemPlacement` includes semantic values (`'primaryAction'`, `'cancellationAction'`, `'confirmationAction'`, `'destructiveAction'`, `'principal'`, `'navigation'`, `'status'`) and positional values (`'topBarLeading'`, `'topBarTrailing'`, `'bottomBar'`, `'navigationBarLeading'`, `'navigationBarTrailing'`, `'bottomOrnament'`, `'keyboard'`, `'subtitle'`, `'title'`, `'largeSubtitle'`).

## Web

### Effects

#### `Shader`

Custom GPU effect rendered via WebGL. Web-only today.

```javascript
Shader({
  fragmentShader: 'void mainImage(out vec4 fragColor, in vec2 fragCoord) { … }',
  uniforms: { speed: 1.0, color: [1.0, 0.5, 0.0] },
  timeEnabled: true,
  mouseEnabled: false,
  updateInterval: 16,
})
```

---

## Complete Example: Interactive Card

```javascript
const properties = {
  title: PropertyString({ required: true }),
  icon: PropertyString({ defaultValue: 'star.fill' }),
}

const body = (props, children) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return VStack({ spacing: 0, alignment: 'leading' }, [
    HStack({ spacing: 12 }, [
      Image({ systemName: props.icon })
        .foregroundStyle(Color('blue'))
        .font(20),
      Text(props.title).font('headline').fontWeight('bold'),
      Spacer(),
      Button({
        label: Image({ systemName: isExpanded ? 'chevron.up' : 'chevron.down' }),
        action: () => setIsExpanded(!isExpanded),
      }),
    ]).padding(16),

    isExpanded
      ? VStack({ spacing: 8, alignment: 'leading' }, [
          Divider(),
          VStack({ spacing: 12, alignment: 'leading' }, children).padding(16),
        ])
      : Empty(),
  ])
    .background(Color('white'))
    .cornerRadius(12)
    .shadow({ radius: 4, y: 2 })
}

export default defineComponent({
  metadata: { title: 'Interactive Card', category: 'Layout' },
  properties,
  body,
})
```
