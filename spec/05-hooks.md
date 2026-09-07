# BindJS Specification 1.0, chapter 05: Hooks

> Part of the BindJS Specification (`metabindai/bindjs`). Normative unless marked informative. Changes go through BEPs (`proposals/`).

## Hooks

Hooks are runtime-injected functions a component body can call to read context, manage state, navigate, dispatch host actions, or talk to an MCP host. Each hook is described in detail in the type definitions; this chapter is a reference index.

### `useState<T>(initialValue: T): [T, (value: T) => void]`

Component-local state. Each component instance maintains its own state across re-renders.

```javascript
const [count, setCount] = useState(0)
```

### `useStore<T>(key, defaultValue, scope?): Store<T>`

Global shared state. Returns a store with flattened fields, auto-generated per-field setters (`setX`), and a `set` method for full-state updates. Pass a `scope` to namespace the store (e.g. per content instance).

```javascript
const store = useStore('counter', { count: 0, label: 'clicks' })

store.count                          // read: 0
store.setCount(5)                    // per-field setter
store.setLabel('taps')               // auto-generated setter
store.set(prev => ({ ...prev, count: prev.count + 1 })) // full-state update
```

For primitive defaults, the store wraps the value as `{ value: T }`.

### `useEnvironment(): EnvironmentValues`

Reads the current environment values. Returns the keys a runtime injects (see chapter 6, *Runtime Globals & Environment*) plus any values set by ancestor components via `.environment(key, value)`.

```javascript
const env = useEnvironment()
const isDark = env.colorScheme === 'dark'
env.openURL('https://example.com')
```

The exact set of injected keys varies per platform and host — see chapter 6 for the spec, and chapter 9 for the per-platform parity matrix.

### `useNavigate(): (options) => void`

Returns a navigation function for programmatic navigation. The host app defines how navigation is handled.

```javascript
const navigate = useNavigate()
navigate({ to: 'DetailView', props: { id: '123' } })
```

### `useAction(): (options) => void`

Returns an action dispatch function for triggering host-app-defined actions. Use for analytics, deep links, or native integrations.

```javascript
const action = useAction()
action({ name: 'addToCart', props: { productId: 'abc' } })
```

### `useMCPHost(): MCPHost | null`

Returns the MCP host interface when the BindJS view is rendered inside an MCP host (sandboxed iframe in Claude / ChatGPT / VS Code, or natively via an Assistant SDK). Returns `null` otherwise.

The hook is registered on every conforming runtime, but it returns `null` unless the host has supplied a concrete bridge. On web, the bridge is the iframe's JSON-RPC channel to the surrounding chat host. On iOS and Android, the bridge is supplied by the host application and routes calls back to native handlers. The wire mapping of each method to MCP Apps messages is in `bindings/mcp-apps.md`, section 5.

#### The `MCPHost` interface

```typescript
interface MCPHost {
  // Tool calls
  toolCall: (name: string, args?: Record<string, any>) => Promise<any>

  // Messaging
  sendMessage: (message: string) => Promise<void>
  updateModelContext: (content: Record<string, any>) => Promise<void>

  // Display + navigation
  requestDisplayMode: (mode: 'inline' | 'fullscreen' | 'pip') => Promise<void>
  openLink: (url: string) => Promise<void>
  sizeChanged: (height: number) => void

  // Logging
  log: (level: 'debug' | 'info' | 'warning' | 'error', message: string, data?: any) => void

  // Low-level transport
  sendRequest: (method: string, params?: any) => Promise<any>
  sendNotification: (method: string, params?: any) => void
}
```

#### Tool calls

```javascript
const result = await host.toolCall('search_products', { query: 'shoes' })
```

`toolCall` resolves to the tool's **structured data directly** — not the raw MCP envelope. If the underlying MCP response carries `structuredContent`, it's unwrapped; otherwise the runtime parses the first text block as JSON, and falls back to the raw text if parsing fails.

`toolCall` **throws** when the tool reports an error (`isError: true` in the MCP response). Use `try` / `catch` or `.catch()` — there is no `{ data, error }` envelope.

#### Messaging the chat

`sendMessage` injects a message into the host's chat as if the user had typed it — the LLM sees it and produces a full response turn:

```javascript
await host.sendMessage('Tell me more about this product')
```

`updateModelContext` updates the LLM's working context **silently** — no immediate response is triggered. The argument is an arbitrary key-value object; the host injects it into the model context for the next turn:

```javascript
await host.updateModelContext({
  selectedProduct: { id: 123, name: 'Boot' },
  cart: { qty: 2, color: 'oat' },
})
```

A common pattern is to combine the two: silently push state into the context, then send a user-style message that triggers a turn against that context.

#### Display mode

`requestDisplayMode` asks the host to resize / reposition the BindJS view's container. The three defined modes:

- `'inline'` — embedded in the chat transcript at natural height (default).
- `'fullscreen'` — takes over the host surface.
- `'pip'` — picture-in-picture overlay, persistent across host navigation.

Unknown modes fall back to `'inline'`. Hosts that don't support a mode silently ignore the request.

#### Navigation

`openLink` asks the host to open a URL. Sandboxed iframes cannot navigate directly, so this routes through the chat host's URL handler:

```javascript
await host.openLink('https://example.com/details/123')
```

#### Iframe sizing

`sizeChanged` informs the chat host of a content-height change so it can resize the iframe. The web runtime fires this automatically on layout change; component code rarely needs to call it.

#### Logging

`log` sends a structured log to the host. Useful because `console.log` inside a sandboxed iframe is not visible in every chat host's surface:

```javascript
host.log('info', 'product loaded', { id: 123 })
host.log('error', 'tool call failed', { name: 'search_products', error: err })
```

#### Low-level transport

`sendRequest` and `sendNotification` are the JSON-RPC primitives every other method is built on. Use them only when you need to invoke a custom host-defined method that isn't part of the standard interface.

#### Fetch-on-mount pattern

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

#### End-to-end example

A product card. Tapping **View details** fetches the product via a tool, renders it in the card, places the selected product in the LLM's context, and prompts the LLM to talk about it — so the chat that follows is grounded in the same product the user is looking at.

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

The same pattern — `toolCall` to fetch, `updateModelContext` to inform the model, `sendMessage` to prompt — covers most real-world uses of the host bridge.

---
