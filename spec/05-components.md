# BindJS Specification 1.0, chapter 05: Components, composition, and lookup

> [!NOTE]
> Part of the BindJS Specification (`metabindai/bindjs`). Normative unless marked informative. Changes go through BEPs ([`proposals/`](../proposals/)).

This chapter describes how component identifiers are resolved at runtime, how components compose with each other, and how content data flows into a component tree.

## Component name lookup

A BindJS runtime maintains a name-to-implementation map that the JS surface uses to construct component instances. When component code calls `Text(...)`, `VStack(...)`, or `MyCustomCard(...)`, the runtime looks the name up in that map and returns a component builder that participates in the AST.

The spec requires three things from the lookup:

1. **Built-in components are always available.** Every name in the BindJS type definitions (`metabind.d.ts`), such as `VStack`, `HStack`, `Text`, `Image`, and `Button`, is registered before any user code runs.
2. **The host can register additional names.** A runtime exposes a registration function (for example, `registerComponent(name, impl)`) so the host can add user-authored components to the lookup.
3. **Unknown names are recoverable.** Calling an unregistered name MUST NOT crash the runtime; it MUST render nothing, and the runtime SHOULD surface a diagnostic to the host (see chapter 10, unknown names).

**How user-authored components reach the lookup is implementation-defined.** A simple host might `registerComponent` from a static bundle. A platform host might version components into immutable *packages* (a snapshot of components at a specific version, with declared dependencies on other packages) and resolve the lookup against the active package set. *Packages* are how the MCP Apps binding distributes components ([chapter 11](11-packages.md); [`bindings/mcp-apps.md`, section 2.3](../bindings/mcp-apps.md#23-package-resource)); the core language does not require them.

## Built-in component registration

A reference runtime registers built-in components at construction:

```javascript
// Conceptual; every runtime has its own registry shape
const componentsMap = {
  HStack,
  VStack,
  ZStack,
  Text,
  Button,
  Image,
  // ...
}

const modifiersMap = {
  padding: Padding,
  foregroundStyle: ForegroundStyle,
  background: Background,
  font: Font,
  // ...
}
```

## Custom component registration

The runtime exposes a registration function the host calls before component code runs:

```javascript
registerComponent('MyCustomComponent', MyCustomComponent)
```

Once registered, `MyCustomComponent({...})` is callable from any component body.

## Component composition

### Direct usage

You compose components by calling them inside another component's body:

```javascript
const body = (props, children) =>
  StoryLayout({ title: props.title, subtitle: props.subtitle }, [
    StoryParagraph({ text: props.introText }),
    StoryPhoto({ asset: props.headerImage }),
  ])
```

### Self-reference

Use `Self({...})` inside a component's body to recursively render itself with different props. `Self`'s prop types are inferred from the component's own `properties` schema:

```javascript
const properties = {
  title: PropertyString({ required: true }),
  items: PropertyArray({
    valueType: PropertyGroup({
      properties: {
        title: PropertyString({}),
        children: PropertyArray({ valueType: PropertyString({}) }),
      },
    }),
  }),
}

const body = (props, children) =>
  VStack([
    Text(props.title),
    ...(props.items || []).map(item =>
      item.children
        ? Self({ title: item.title, items: item.children })
        : Text(item.title)
    ),
  ])

export default defineComponent({ properties, body })
```

### Environment-based conditional rendering

A component can adapt its output based on the current environment. Read the environment with `useEnvironment()` (see [chapter 06](06-hooks.md)):

```javascript
const body = (props, children) => {
  const env = useEnvironment()

  if (env.gallery) {
    // Simplified rendering for gallery context
    return props.asset ? Image(props.asset.image) : AssetPlaceholder()
  }

  return VStack({ spacing: 0 }, [
    props.asset ? Image(props.asset.image) : AssetPlaceholder(),
    props.caption ? Text(props.caption) : Empty(),
  ])
}
```

---

## Props, state, and environment

### Environment and context flow

BindJS uses environment values to pass context down the component tree. A parent sets values with `.environment(key, value)`; descendants read them with `useEnvironment()`.

```javascript
// Parent: set values for the subtree
export default defineComponent({
  body: (props, children) =>
    VStack(children)
      .environment('margin', 20)
      .environment('colorScheme', 'dark')
      .environment('preview', 'thumbnail'),
})

// Child: read them
export default defineComponent({
  properties: { title: PropertyString({}) },
  body: (props, children) => {
    const env = useEnvironment()
    const margin = env.margin ?? 10
    const isDark = env.colorScheme === 'dark'

    return Text(props.title)
      .padding('horizontal', margin)
      .foregroundStyle(isDark ? Color('white') : Color('black'))
  },
})
```

### State and interaction flow

Components manage local state with `useState` and handle interactions with built-in hooks:

```javascript
export default defineComponent({
  properties: {
    initialCount: PropertyNumber({ defaultValue: 0 }),
    linkTo: PropertyString({}),
  },
  body: (props, children) => {
    const [count, setCount] = useState(props.initialCount)
    const navigate = useNavigate()

    return VStack({ spacing: 10 }, [
      Text(`Count: ${count}`),
      Button('Increment', () => setCount(count + 1)),
      Button('Navigate', () => {
        if (props.linkTo) navigate({ to: props.linkTo })
      }),
    ])
  },
})
```

### Asset props

A `PropertyAsset` resolves to an object containing exactly one of `image`, `video`, or `model`. Each variant carries `url`, `dimensions`, `mimeType`, and a host-supplied `id`:

```javascript
export default defineComponent({
  properties: { asset: PropertyAsset({ assetTypes: ['image'] }) },
  body: (props, children) =>
    props.asset
      ? Image({ url: props.asset.image.url })
          .resizable()
          .aspectRatio(undefined, 'fit')
          .frame({ width: props.asset.image.dimensions.width / 2 })
      : AssetPlaceholder(),
})
```
