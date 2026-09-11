# BindJS authoring guide

> [!NOTE]
> Informative. This guide collects the worked material that used to sit inside the specification chapters: how to structure a component, how the host bridge is used in practice, and the authoring conventions the reference implementations expect. Nothing here is normative; the chapters it points to are.

## Getting started

### Basic component structure

A BindJS component packages a `body` render function and an optional `properties` schema, plus optional `metadata`, `previews`, `thumbnail`, and `icon` fields, into a single `defineComponent` call exported as the module default.

```javascript
const properties = {
  title: PropertyString({ title: 'Title', required: true, defaultValue: 'Default Title' }),
  showSecondary: PropertyBoolean({ title: 'Show Secondary', defaultValue: true }),
}

const body = (props, children) => {
  return VStack({ spacing: 20 }, [
    Text(props.title)
      .font('headline')
      .foregroundStyle(Color('primary')),

    props.showSecondary
      ? HStack({ spacing: 10 }, [
          Button('Click Me', () => console.log('Clicked')),
          Text('Secondary text').foregroundStyle(Color('secondary')),
        ])
      : Empty(),
  ])
}

export default defineComponent({
  metadata: { title: 'My Component', description: 'Example BindJS component' },
  properties,
  body,
})
```

The `properties` and `body` are usually defined as top-level constants for readability, but `defineComponent` is the canonical export. The body's `props` type is inferred from the `properties` schema (see the next section).

Key differences from React:

- No JSX: BindJS uses function calls and method chaining.
- Components return an AST, not React elements.
- Props and children are typed through the `properties` schema.
- State is managed through runtime hooks (`useState`, `useStore`, `useEnvironment`, and the other hooks in [chapter 06](06-hooks.md)).
- Modifiers are applied through method chaining.

### Type safety from `properties`

The body function's `props` argument is fully typed against the `properties` schema. There is no manual `ComponentProps` interface; the type is inferred through `InferProps<typeof properties>` inside the `defineComponent` overload.

```javascript
const properties = {
  title: PropertyString({ title: 'Title', required: true }),
  count: PropertyNumber({ title: 'Count', defaultValue: 0 }),
  isEnabled: PropertyBoolean({ title: 'Enabled', defaultValue: true }),
}

// Inferred body signature:
//   (props: { title: string; count: number; isEnabled: boolean },
//    children: Component[]) => Component
const body = (props, children) => {
  return VStack([
    Text(props.title),
    Text(`Count: ${props.count}`),
    props.isEnabled ? Text('Enabled') : Empty(),
  ])
}

export default defineComponent({ properties, body })
```

Property helpers (`PropertyString`, `PropertyNumber`, `PropertyBoolean`, `PropertyEnum`, `PropertyInteger`, `PropertyArray`, `PropertyDate`, `PropertyAsset`, `PropertyContent`, `PropertyComponent`, `PropertyGroup`) are described in [chapter 04](04-properties.md).

### Optional `defineComponent` fields

#### `metadata`

Identification and discoverability information surfaced in editors, galleries, and documentation:

```javascript
defineComponent({
  metadata: {
    title: 'My Custom Component',
    description: 'A reusable UI component',
    category: 'Layout',
  },
  body,
})
```

#### `previews`

Preview instances rendered in galleries and design tools. Use `Self({...})` to instantiate the component itself with sample props:

```javascript
defineComponent({
  properties,
  body,
  previews: [
    Self({ title: 'Preview Title', showSecondary: true }).previewName('Default'),
    Self({ title: 'Long title goes here', showSecondary: false }).previewName('Long title'),
  ],
})
```

#### `thumbnail` and `icon`

- `thumbnail`: an SVG string or a render function returning a `Component`, used in the component picker.
- `icon`: a short icon name string used in menus and context menus.

### Sibling primitive: `defineButtonStyle`

The same module pattern is used for `defineButtonStyle`:

```javascript
// Custom button style, applied via .buttonStyle()
export default defineButtonStyle({
  body: (configuration, props) =>
    Capsule()
      .fill(Color(props?.color || 'blue'))
      .overlay(configuration.label)
      .frame({ height: 44 }),
})
```

## Fetch-on-mount pattern

Trigger the call inside `.onAppear()` and store the result with `useState`:

```javascript
const body = (props, children) => {
  const host = useMCPHost()
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)

  return VStack([
    data ? Text(JSON.stringify(data))
      : err ? Text('Error: ' + err.message)
      : Text('Loading…'),
  ]).onAppear(() => {
    if (!host) return
    host.toolCall('search_products', { query: 'shoes' })
      .then(setData)
      .catch(setErr)
  })
}
```

## End-to-end example

A product card. Tapping **View details** fetches the product via a tool, renders it in the card, places the selected product in the LLM's context, and prompts the LLM to talk about it, so the chat that follows is grounded in the same product the user is looking at.

```javascript
const body = (props, children) => {
  const host = useMCPHost()
  const [product, setProduct] = useState(null)
  const [busy, setBusy] = useState(false)

  const onViewDetails = async () => {
    if (!host) return
    setBusy(true)
    try {
      const result = await host.toolCall('get_product', { id: props.productId })
      setProduct(result)

      // Tell the LLM what the user is now looking at, then ask it to react.
      await host.updateModelContext({ selectedProduct: result })
      await host.sendMessage('Tell me more about this product.')
    } catch (err) {
      host.log('error', 'product fetch failed', { id: props.productId, error: String(err) })
    } finally {
      setBusy(false)
    }
  }

  return VStack({ spacing: 12 }, [
    product ? Text(product.name).font('headline') : Empty(),
    product ? Text(product.description) : Empty(),

    busy
      ? ProgressView()
      : Button('View details', onViewDetails),
  ])
}
```

The same pattern (`toolCall` to fetch, `updateModelContext` to inform the model, `sendMessage` to prompt) covers most real-world uses of the host bridge.

## Practical authoring guidance

1. **Default to the core surface.** Anything in *Core (required)* runs identically on every conforming runtime.
2. **Treat *Recommended* as best-effort.** Always guard with optional access and fallbacks (`env.dynamicTypeSize ?? 'large'`).
3. **Treat *Platform extensions* as opt-in non-portable code.** A component that reads `accessibility.reduceMotion` is by definition iOS-only; wrap the read with a fallback path for other platforms.
4. **Hosts inject custom keys.** Beyond the platform-built-in keys, the host application can inject any keys it likes. Document which keys your component depends on in its `metadata.description`.
