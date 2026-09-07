# BindJS Specification 1.0, chapter 08: Modifiers Reference

> Part of the BindJS Specification (`metabindai/bindjs`). Normative unless marked informative. Changes go through BEPs (`proposals/`).

## Modifiers Reference

This chapter covers BindJS animation and the modifier surface attached to every component. Hooks (`useState`, `useStore`, `useEnvironment`, `useNavigate`, `useAction`, `useMCPHost`) are documented in chapter 5; runtime globals are in chapter 6.

The reference is split into two sections:

- **Core** — modifiers every conforming runtime SHOULD implement. Cross-platform by design.
- **Platform Extensions** — modifiers scoped to a specific host platform's UI vocabulary (today, all iOS / SwiftUI). Authoring code that uses these is non-portable.

> The per-platform implementation status of each modifier lives in chapter 9.

---

## Animation

### `withAnimation(animation?, body)`

Wraps a state mutation in an animation context so the resulting UI changes are animated.

```javascript
withAnimation(() => setExpanded(!expanded))                    // default spring
withAnimation(Spring({ response: 0.5 }), () => setOffset({ x: 100, y: 0 }))
```

### Animation builders

All animation builders return an `AnimationComponent` that supports chainable timing modifiers.

| Builder | Options |
|---|---|
| `Spring({ response, dampingFraction, blendDuration })` | Default-feel spring |
| `InterpolatingSpring({ stiffness, damping, mass })` | Physical spring |
| `EaseIn({ duration })` | Slow → fast |
| `EaseOut({ duration })` | Fast → slow |
| `EaseInOut({ duration })` | Slow on both ends |
| `Linear({ duration })` | Constant speed |
| `Bouncy({ duration, extraBounce })` | Spring with extra bounce |
| `Snappy({ response, dampingFraction, blendDuration })` | Higher-damping spring |

Chainable `AnimationComponent` modifiers:

```javascript
const anim = Spring()
  .delay(0.5)
  .speed(2.0)
  .repeatCount(3)
  .repeatForever({ autoreverses: true })

withAnimation(anim, () => setAnimatedValue(100))
```

---

## Core

Every component supports the universal modifier set below. Some modifiers only have effect on specific component types — for example, `.font()` and `.bold()` apply to `Text`, while `.resizable()` only applies to `Image`.

## Identity

| Modifier | Purpose |
|---|---|
| `.id(value)` | Stable identity for diffing and animations |
| `.tag(value)` | Tag for selection contexts (e.g. `Picker` items) |

## Lifecycle

```javascript
.onAppear(() => loadData())
.onDisappear(() => cleanup())
```

`.onAppear` is the canonical place for fetch-on-mount — see `useMCPHost` in chapter 5 for the combined pattern with `useState`.

## Layout — Frame

```javascript
.frame({ width: 200, height: 100 })
.frame({ width: 200, height: 100, alignment: 'topLeading' })
.frame({ minWidth: 100, idealWidth: 200, maxWidth: 300,
         minHeight: 50, idealHeight: 100, maxHeight: 150,
         alignment: 'center' })
```

## Layout — Container-Relative Frame

Sizes a component relative to its nearest container.

```javascript
.containerRelativeFrame('horizontal')                                    // fill the axis
.containerRelativeFrame({ axes: 'horizontal', count: 3, span: 2, spacing: 8 })  // grid form
.containerRelativeFrame({ axes: 'horizontal', fraction: 0.8 })           // fractional
```

## Layout — Padding, Offset, Stacking

```javascript
.padding(16)
.padding('horizontal', 20)
.padding(['top', 'leading'], 20)
.offset({ x: 10, y: -5 })
.zIndex(10)
.layoutPriority(1)
```

## Layout — Sizing

```javascript
.aspectRatio(16 / 9, 'fit')
.scaledToFit()
.scaledToFill()
.fixedSize({ horizontal: true, vertical: false })
```

## Transforms

```javascript
.scaleEffect(1.5)
.scaleEffect({ x: 2, y: 1, anchor: { x: 0, y: 0.5 } })
.rotationEffect(45)
.rotationEffect({ degrees: 45, anchor: 'center' })
.transformEffect({ a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 })
```

## Appearance — Color and Style

```javascript
.opacity(0.5)
.foregroundStyle(Color('primary'))
.foregroundStyle(LinearGradient({ colors: [Color('red'), Color('blue')] }))
.tint(Color('blue'))                          // tint for interactive controls
.background(Color('gray').opacity(0.2))
.background(Material('thin'))
.background({ alignment: 'bottomTrailing' }, Image({ systemName: 'star.fill' }))
.cornerRadius(8)
.border({ style: Color('blue'), width: 2 })
.shadow({ radius: 10, x: 0, y: 5, color: Color('black').opacity(0.3) })
```

## Appearance — Effects

```javascript
.blur(10)
.saturation(0.5)
.brightness(1.2)
.contrast(0.8)
.grayscale(0.5)
.colorInvert()
.blendMode('multiply')                        // and screen, overlay, hue, …
```

## Appearance — Color Scheme & Type Size

```javascript
.colorScheme('dark')
.dynamicTypeSize('accessibility1')
```

## Typography

```javascript
.font('headline')                             // semantic style
.font(20)                                     // point size
.font(CustomFont({ url, family: 'Inter', size: 16, relativeToTextStyle: 'body' }))
.fontWeight('semibold')
.fontDesign('rounded')                        // 'default' | 'serif' | 'rounded' | 'monospaced'
.bold()                                       // .bold(false) to disable
.italic()
.strikethrough()
.underline()
.monospaced()
.tracking(500)                                // milli-em (500 = 0.5em)
.lineSpacing(8)
.textCase('uppercase')                        // or 'lowercase'
.lineLimit(2)
.multilineTextAlignment('leading')            // 'leading' | 'center' | 'trailing'
```

## Layering — Overlay, Background

```javascript
.overlay(Text('Badge').padding(4).background(Color('red')))
.overlay({ alignment: 'topTrailing' }, Circle().frame({ width: 10, height: 10 }))

.background(content)
.background({ alignment: 'bottomTrailing' }, Image({ systemName: 'star.fill' }))
```

## Clipping & Masking

```javascript
.clipped()
.clipShape(Circle())
.clipShape(RoundedRectangle({ cornerRadius: 12 }))
.mask(Image({ name: 'gradient-mask' }))
```

## Safe Area

```javascript
.ignoresSafeArea()                        // all regions, all edges
.ignoresSafeArea('container', 'top')
.ignoresSafeArea('all', ['top', 'bottom'])
```

## Visibility & Interaction

```javascript
.hidden()
.allowsHitTesting(false)
.disabled(isLoading)
.textSelection('enabled')
```

## Gestures

```javascript
.onTapGesture((location) => console.log(location))
.onTapGesture({ count: 2 }, (location) => console.log('Double tap'))

.onDragGesture((state) => {
  console.log(state.phase)             // 'possible' | 'began' | 'changed' | 'ended' | 'cancelled'
  console.log(state.translation)       // { x, y }
  console.log(state.velocity)          // { x, y }
})
.onDragGesture({ minimumDistance: 20 }, handler)

.onLongPressGesture((state) => console.log(state.phase))
.onLongPressGesture({ minimumDuration: 1.0, maximumDistance: 10 }, handler)

.onHover((isHovering) => setHovered(isHovering))
```

## Visual Effects (geometry-aware)

```javascript
Text('Scroll effect')
  .visualEffect((builder, proxy) =>
    builder
      .opacity(proxy.frame('scrollView').minY > 0 ? 1 : 0.5)
      .scale(0.8)
  )

.coordinateSpace('myScroll')           // name the coordinate space for descendants
```

The builder supports `.blur(radius)`, `.opacity(amount)`, `.offset({x,y})`, `.scale(value | {x,y})`, `.transform(matrix)`, `.translation({x,y})`, `.rotation(degrees | {degrees} | {radians})`.

## Context Menu

```javascript
.contextMenu([Button('Copy', () => {}), Button('Delete', () => {})])
```

## Controls

```javascript
.controlSize('large')                     // 'mini' | 'small' | 'regular' | 'large' | 'extraLarge'
.pickerStyle('segmented')
.buttonStyle(MyButtonStyle())
```

## Text Input

```javascript
.keyboardType('emailAddress')
.textFieldStyle('roundedBorder')          // 'roundedBorder' | 'plain' | 'automatic'
.submitLabel('done')
.autocorrectionDisabled()
.onSubmit(() => handleSubmit())

const [focused, setFocused] = useState(false)
TextField({ text, setText }).focused({ isFocused: focused, setIsFocused: setFocused })
```

## Value Observation

```javascript
.onChange(name, ([newVal, oldVal]) => {
  console.log(`Changed from ${oldVal} to ${newVal}`)
})
```

## Accessibility

```javascript
.accessibilityLabel('Play button')
.accessibilityValue('50%')
.accessibilityHidden()
.accessibilityRemoveTraits('isStaticText')
```

Accessibility traits: `'isButton'`, `'isLink'`, `'isSearchField'`, `'isImage'`, `'isSelected'`, `'playsSound'`, `'isKeyboardKey'`, `'isStaticText'`, `'isSummaryElement'`, `'updatesFrequently'`, `'startsMediaSession'`, `'allowsDirectInteraction'`, `'causesPageTurn'`, `'isModal'`, `'isHeader'`.

## Transitions

```javascript
.transition('opacity')
.transition({ move: 'bottom' })
.transition({ scale: 0.8, anchor: 'center' })
.transition({ asymmetric: { insertion: 'slide', removal: 'opacity' } })
.transition({ combined: ['opacity', 'slide'] })
```

## Environment

```javascript
.environment('colorScheme', 'dark')
.environment('locale', 'fr-FR')
.environment('margin', 20)
.environment('openURL', OpenURLAction((url) => …))
```

Set arbitrary keys to pass context down the tree; descendants read them with `useEnvironment()`.

---

## Component-specific modifiers (Core)

These modifiers are only valid on specific component subclasses; they appear in the type definitions on the corresponding interface.

### `Image`

```javascript
Image({ url: '…' })
  .resizable()
  .renderingMode('template')
  .interpolation('high')
  .antialiased(true)
  .symbolRenderingMode('hierarchical')
  .imageScale('large')
```

### `Shape` (Circle, Rectangle, RoundedRectangle, Ellipse, Capsule, Path)

```javascript
Circle().fill(Color('blue'))
Circle().stroke(Color('red'), 2)
Circle().stroke({ style: LinearGradient({ colors: [Color('a'), Color('b')] }), lineWidth: 4 })
```

### `Color`

```javascript
Color('blue').opacity(0.5)
```

---

## Platform Extensions

These modifiers are scoped to a specific host platform's UI vocabulary. Authoring code that uses them is non-portable — guard with environment checks if you need the same component to work cross-platform.

## iOS / SwiftUI

### Presentation — Sheet, Cover, Detents, Quick Look

```javascript
const [showSheet, setShowSheet] = useState(false)

VStack([Button('Open', () => setShowSheet(true))])
  .sheet({
    isPresented: showSheet,
    setIsPresented: setShowSheet,
    content: () => Text('Sheet content'),
    onDismiss: () => console.log('dismissed'),
  })

VStack([…]).fullScreenCover({ isPresented, setIsPresented, content: () => DetailView() })

.presentationDetents([Detent.medium, Detent.large])
.presentationDetents([Detent.fraction(0.25), Detent.height(300)])
// Detent exposes: medium, large, fraction(value), height(value)

VStack([…]).quickLookPreview({
  url: previewURL,
  setURL: setPreviewURL,
  onLoadingChanged: (loading) => setLoading(loading),
})
```

### Navigation Chrome

```javascript
VStack([Button('Details', () => setShowDetail(true))])
  .navigationDestination({
    isPresented: showDetail,
    setIsPresented: setShowDetail,
    destination: () => DetailView(),
  })

.navigationTitle('Inbox')
.navigationBarBackButtonHidden()
.navigationBarTitleDisplayMode('inline')   // 'large' | 'inline' | 'automatic'
```

### Toolbar

```javascript
.toolbar(ToolbarItemGroup({ placement: 'topBarTrailing' }, [
  Button('Edit', () => {}),
  Button('Share', () => {}),
]))

.toolbarVisibility('hidden', ['navigationBar', 'tabBar'])
```

### List Chrome

```javascript
.listStyle('insetGrouped')               // 'automatic' | 'plain' | 'insetGrouped' | 'grouped' | 'inset' | 'sidebar'
.listRowBackground(Color('blue').opacity(0.05))
.listRowSeparator('hidden')
```

### Scroll Chrome

```javascript
.scrollContentBackground('hidden')

ScrollView({ axis: 'horizontal' }, [
  HStack({ spacing: 16 }, items.map(Card)).scrollTargetLayout(),
]).scrollTargetBehavior('viewAligned')   // or 'paging'

const [scrollId, setScrollId] = useState(null)
ScrollView([
  ForEach(items, (item) => Text(item.name).id(item.id)),
]).scrollPosition({ id: scrollId, setId: setScrollId })

.scrollEdgeEffectHidden()
.scrollEdgeEffectStyle({ style: 'soft', edges: ['top', 'bottom'] })
.scrollIndicators('hidden')
.scrollIndicators({ visibility: 'hidden', axes: 'vertical' })
```

### Grid Cells

For use with the `Grid` Platform-Extension component (chapter 7).

```javascript
GridRow([Text('Full width').gridCellColumns(3)])
.gridCellAnchor('topLeading')
.gridColumnAlignment('center')
.gridCellUnsizedAxes('horizontal')
```

### Safe Area Insets

```javascript
.safeAreaInset({ edge: 'bottom' }, Toolbar(…))
```

(`.ignoresSafeArea()` is Core; `.safeAreaInset()` — adding content alongside the safe-area boundary — is iOS-specific.)

### Hit-Testing Shape

```javascript
.contentShape(Circle())                       // hit-testing shape
```

### Liquid Glass

```javascript
.glassEffect()
.glassEffect({ interactive: true, tint: Color('blue') })
```

### Sensory Feedback

```javascript
.sensoryFeedback({ feedback: 'success', trigger: didSucceed })
```

Sensory feedback values: `'impact'`, `'selection'`, `'success'`, `'warning'`, `'error'`, `'light'`, `'medium'`, `'heavy'`, `'increase'`, `'decrease'`.

### Apple Accessibility Refinements

```javascript
.accessibilityHint('Double tap to start playback')
.accessibilityRepresentation(Text('Custom accessible text'))
.accessibilityAddTraits(['isButton', 'isHeader'])
```

(`.accessibilityLabel`, `.accessibilityValue`, `.accessibilityHidden`, `.accessibilityRemoveTraits` are Core.)

### Text Refinements

```javascript
.minimumScaleFactor(0.5)        // shrink text up to 50% before truncating
.allowsTightening(true)         // allow tighter character spacing first
.fontWidth('condensed')         // 'compressed' | 'condensed' | 'standard' | 'expanded'
.badge(5)
.badge('NEW')
.contentTransition('numericText')
.contentTransition({ countsDown: true })
```

### Preview Naming

```javascript
.previewName('Default')
```

Display name for a `previews[]` entry, used by gallery / design tools.

---

## Top-Level Utility Functions

| Function | Purpose |
|---|---|
| `Self(props?, children?)` | Self-reference; props inferred from the component's own `properties`. |
| `getComponentData(builder)` | `{ name, props }` — extracts the underlying component info from a builder, unwrapping modifiers. |
| `OpenURLAction(callback)` | Intercept URL-opening requests; set as an environment value. |
| `setTimeout(cb, delayMs)` | Schedule a deferred callback. Returns an id. |
| `clearTimeout(id)` | Cancel a pending `setTimeout`. |
| `alert(message)` | Display a modal alert. |

---

## Complete Example: Profile Card

```javascript
const properties = {
  name: PropertyString({ required: true }),
  bio: PropertyString({ inspector: { control: 'multiline', numberOfLines: 3 } }),
  avatarUrl: PropertyString({}),
  userId: PropertyString({ required: true }),
}

const body = (props, children) => {
  const [isHighlighted, setIsHighlighted] = useState(false)
  const env = useEnvironment()

  return VStack({ spacing: 16, alignment: 'center' }, [
    Image({ url: props.avatarUrl })
      .resizable()
      .frame({ width: 80, height: 80 })
      .cornerRadius(40)
      .overlay({ alignment: 'bottomTrailing' },
        Circle()
          .fill(Color('green'))
          .frame({ width: 20, height: 20 })
          .border({ style: Color('white'), width: 2 })
      ),

    Text(props.name)
      .font('headline')
      .fontWeight('semibold')
      .foregroundStyle(env.colorScheme === 'dark' ? Color('white') : Color('black')),

    Text(props.bio)
      .font('body')
      .foregroundStyle(Color('secondary'))
      .multilineTextAlignment('center')
      .lineLimit(3)
      .padding('horizontal', 20),
  ])
    .padding(24)
    .background(RoundedRectangle({ cornerRadius: 16 }).fill(Material('regular')))
    .scaleEffect(isHighlighted ? 1.05 : 1.0)
    .shadow({ radius: isHighlighted ? 20 : 10, y: 5 })
    .onTapGesture(() => {
      withAnimation(Spring({ response: 0.4, dampingFraction: 0.6 }), () => {
        setIsHighlighted(!isHighlighted)
      })
    })
    .accessibilityLabel(`Profile card for ${props.name}`)
    .id(`profile-${props.userId}`)
}

export default defineComponent({
  metadata: { title: 'Profile Card', category: 'Cards' },
  properties,
  body,
})
```
