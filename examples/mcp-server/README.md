# Serving BindJS Views from an MCP server

A TypeScript MCP server with two `ui://` Views of type `application/bindjs+json`, each
tool derived whole from its View's entry component.

```sh
npm install
npm run walkthrough    # prints every message, in order
npm start              # stdio, for a host to launch
npm run serve          # http://localhost:8787/mcp, for ../mcp-client
```

`npm run walkthrough` connects a client in-process and prints the whole conversation. Read
it beside [`bindings/mcp-apps-walkthrough.md`](../../bindings/mcp-apps-walkthrough.md).

## Shape

Two Views, `ui://shop/views/product-card` (entry `ProductCard`) and
`.../product-search` (entry `SearchResults`), share one package,
`ui://shop/packages/product-ui@12`, so a host verifies those bytes once.

`product_card` and `product_search` are View-channel tools: their arguments *are* the entry
component's props (binding 2.4), so `inputSchema` is derived from the component's
`properties` (2.5) with nothing hand-written and nothing filtered out. Both answer with a
line for the transcript. `product_lookup` and `add_to_cart` are data tools with no View;
the components call them through the bridge.

The content channel (an instance document in a tool result, binding 2.2) is not used here.

## Why the components have so few properties

Every property is something a model can decide: `sku`, `height`, `badges`. The facts (name,
price, image, colors) are deliberately not properties, because a model cannot
author an asset URL and should not invent a price. Were they properties, 2.5 would put them
in the tool's schema, `title` and `price` required, and oblige the model to make them up.
**A component's `properties` are its agent interface, so they hold only what the agent
decides.**

The facts come from `product_lookup`, called by the component on appear. So a card renders
twice: first with props alone (right size, right badges, placeholders), then with the lookup's answer.
That skeleton is what "components MUST tolerate absent props" (2.4) looks like taken
seriously.

A component that could declare its own fetch would get that payload with the first render,
and `product_lookup` would not need to exist. Not in the specification today.

## Files

| Path | What it is |
|---|---|
| `components/*.js` | The components, in package source form. These bytes ship in the package verbatim. |
| `data/products.json` | Six catalogue rows: name, description, price, colours, image file. |
| `data/images/*.jpg` | The product images, bundled and served at `/assets` by `http.ts`. |
| `src/package.ts` | Builds the package document, its digest and size. |
| `src/introspect.ts` | Reads a component's `metadata` and `properties` without a runtime. |
| `src/schema.ts` | The schema derivation: `properties` to JSON Schema. |
| `src/server.ts` | Resources, tools, negotiation. |
| `src/index.ts` | stdio entry point. |
| `src/http.ts` | Streamable HTTP entry point, with CORS. |
| `src/walkthrough.ts` | The in-process client that prints the conversation. |

`introspect.ts` evaluates each source with stand-in globals rather than shipping a runtime:
`properties` and `metadata` are top-level data, and `body` is never called. Not a sandbox,
and not trying to be: these sources are ours, off local disk.

## Connecting a host

```jsonc
{ "command": "npx", "args": ["tsx", "src/index.ts"], "cwd": "<path to this directory>" }
```

A host that does not advertise `application/bindjs+json` gets the four tools with no Views
listed and no `_meta.ui.resourceUri`. `createServer()` is transport-agnostic.

Images are served by the HTTP entry point at `/assets`, and that origin is what the Views
allowlist in `csp.resourceDomains`, so the allowlist and the images stay one fact. Over
stdio nothing serves them; set `ASSET_ORIGIN` to somewhere that does.
