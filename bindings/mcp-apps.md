# BindJS binding for MCP Apps

Version 1.0 (draft). Defines the registered View content type `application/bindjs+json` for MCP Apps (SEP-1865) and the follow-up proposal "Native rendering of registered View content types." This document is the governing specification the MCP Apps registry entry points at. It satisfies the five requirements a governing specification must meet: content, metadata, executable code, bridge binding, versioning.

## 1. Overview

A worked example of every call and response, with diagrams, is in `mcp-apps-walkthrough.md` (informative).

A BindJS View is a component package executed by a BindJS runtime in an isolated JavaScript context. The runtime emits a JSON view tree; the host's renderer draws it with SwiftUI, Jetpack Compose, or React. The renderer never receives code, only the tree. Everything a View does beyond drawing goes through the MCP Apps bridge.

The type is used on both MCP Apps channels, and each channel carries a different document. No field distinguishes them; the channel does, and a host always knows which channel it is reading:

- **View channel** (a `ui://` resource): a **view document** that names the entry component and carries or references the package. Code travels only here, predeclared and reviewable. Tool input is delivered as the entry component's props.
- **Content channel** (Dynamic View Content in a tool result): an **instance document** that names a component in the target View's package and carries the props to render. Data only; no code.

The split answers the question of what BindJS returns from a tool: on the View channel, nothing (the input is the UI's data); on the content channel, data for a component that was predeclared.

## 2. Content

### 2.1 View document (View channel)

`mimeType`: `application/bindjs+json`. The `resources/read` body:

```jsonc
{
  "spec": "1.0",
  "component": "ProductCard",          // entry component, resolved in the package
  "package": { /* inline package document (2.3) */ }
  // or no "package": the package is referenced by _meta.ui.bindjs.package
}
```

Exactly one of the inline `package` or the `_meta.ui.bindjs.package` reference MUST be present. When both are present the inline package wins and the host SHOULD log the inconsistency. A view document MUST NOT contain `props`.

### 2.2 Instance document (content channel)

`mimeType`: `application/bindjs+json`, carried as a marked embedded resource (`_meta.ui.content`) per PR #699:

```jsonc
{
  "spec": "1.0",
  "component": "SearchResults",        // a component in the target View's package
  "props": { "query": "boots", "results": [ /* ... */ ] }
}
```

- The target View (the tool's `resourceUri`, or `rendererUri` when set) MUST be a BindJS View, and its resource MUST declare `contentMimeTypes: ["application/bindjs+json"]`.
- The host renders the instance with the target View's package. `component` MUST resolve in that package; an unresolved name renders nothing and is logged.
- An instance document MUST NOT carry code. A host MUST reject an instance document that contains a `package` field.
- Multiple instances in one result are rendered in array order. A later instance for the same target replaces the previous one unless the View's package documents otherwise.

Use the content channel when the tool's output, not its input, is the UI's data (search results, a computed dashboard). Use the View channel alone when the input is the data (a card whose fields the model chose).

### 2.3 Package resource

The package document is defined in the specification, chapter 10. On MCP Apps a package is a `ui://` resource with `mimeType: application/bindjs-package+json` whose body is that document:

```jsonc
{
  "name": "com.shop.product-ui",       // reverse-DNS style identifier
  "version": "12.0.0",                 // semver; immutable once published
  "spec": "1.0",
  "components": { "<Name>": "<JavaScript source>" },   // name to source; names are JS identifiers
  "entry": "ProductCard"               // optional default entry component
}
```

- On this surface, a `dependencies[].package` reference is a `ui://` resource URI; the host resolves dependencies with `resources/read` before rendering, MAY prefetch them at connection time, and caches them by digest.
- The allowlist, naming, immutability, integrity, and local-holding rules of chapter 10 apply unchanged.

### 2.4 Tool input as props

The tool's `inputSchema` properties correspond to the entry component's `properties` (flattened to the top level). On `ui/notifications/tool-input`, the host passes the arguments object as the entry component's props. On `ui/notifications/tool-input-partial`, the host passes the partial object; components MUST tolerate absent props (the runtime tolerates in-flight partial component instances). The host MUST validate arguments against `inputSchema` before rendering.

### 2.5 Tool definition derived from the component

When a server exposes a BindJS View as an MCP tool, the tool definition SHOULD be derived from the entry component so that every host presents the same interface:

| Tool field | Source |
|---|---|
| `inputSchema` | The entry component's `properties`, derived per the specification, chapter 03 (including component-instance unions for slots). |
| `title` | `metadata.title`, unless the server overrides it. |
| `description` | `metadata.description`, written for the agent (chapter 11). |
| `annotations` | `metadata.annotations` when present (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`), else the server's defaults. |
| `name` | The server's choice; BindJS does not constrain it. |

A server MAY override any of these per deployment; the component's declarations are the baseline.

## 3. Metadata: `_meta.ui.bindjs`

The `bindjs` key is owned by this specification. On a View resource (listing or content item; content item wins):

| Field | Type | Required | Meaning |
|---|---|---|---|
| `spec` | string | yes | BindJS specification version, e.g. `"1.0"`. A host that does not support the major version MUST NOT render the View and SHOULD fall back to another negotiated type. |
| `component` | string | yes | Entry component name. Duplicates the body field so hosts can decide before reading. |
| `package` | string (URI) | when not inline | `ui://` URI of the package resource. |
| `sha256` | string | recommended | Hex SHA-256 of the package resource body (canonical: the `text` field bytes as served). |
| `size` | integer | recommended | Byte length of the package body. |

On a package resource:

| Field | Type | Required | Meaning |
|---|---|---|---|
| `spec` | string | yes | |
| `name`, `version` | string | yes | Duplicate the body for listing-time review. |
| `sha256`, `size` | | recommended | As above. |
| `contentUrl` | string (URL) | no | Alternate fetch location for the same bytes (typically a CDN). MUST be `https`. A host that uses it MUST verify `sha256` and `size` before executing, exactly as for `resources/read`; a mismatch MUST fall back to `resources/read` or fail. |

On a tool: no `bindjs` fields are defined in 1.0. `_meta.ui.resourceUri` is used unchanged.

## 4. Executable code and the sandbox contract

Content of this type carries executable JavaScript on the View channel. A conforming host MUST execute it under all of the following:

1. **Isolated context.** One JavaScript context per View instance, with no DOM, no filesystem, no storage APIs, no `require` or module loading, and no access to the host application's objects except the bridge (section 5). On iOS this is a `JSContext`; on Android a `JavaScriptIsolate`; on web the sandboxed iframe of SEP-1865.
2. **No network primitive.** The context MUST NOT expose `fetch`, `XMLHttpRequest`, `WebSocket`, or equivalents to component code. Network access happens only through `useMCPHost().toolCall` (host-mediated) or through renderer-owned asset loading for `Image`, `Video`, `Model3D`, and `CustomFont` URLs, which the host MUST restrict to `csp.connectDomains` and `csp.resourceDomains` when present.
3. **Timers only.** `setTimeout`, `clearTimeout`, `setInterval`, `clearInterval`, and `console` are the only host-provided globals beyond the BindJS runtime API.
4. **Resource limits.** Hosts SHOULD bound heap size and per-render execution time and SHOULD tear down a context that exceeds them.
5. **Integrity.** When `sha256` is present, the host MUST verify it before executing a package and MUST NOT execute on mismatch. Hosts SHOULD cache verified packages by digest.
6. **Allowlist.** The package is the component allowlist. The runtime has no API to register components mid-render; a name the package did not ship has no implementation and renders nothing.
7. **Output.** The renderer consumes only the JSON view tree. Handlers cross the boundary as string ids, never as functions.
8. **Content channel is data.** Instance documents carry props only (2.2). Code never arrives through a tool result.

Hosts remain free to add restrictions, for example refusing any package they did not bundle.

## 5. Bridge binding

### 5.1 Vocabulary mapping

`useMCPHost()` returns the bridge. Its methods map to MCP Apps messages as follows:

| BindJS | MCP Apps message | Direction |
|---|---|---|
| `toolCall(name, args)` | `tools/call` | View to host |
| `sendMessage(text)` | `ui/message` | View to host |
| `updateModelContext(obj)` | `ui/update-model-context` | View to host |
| `openLink(url)` | `ui/open-link` | View to host |
| `requestDisplayMode(mode)` | `ui/request-display-mode` | View to host |
| `sizeChanged(height)` | `ui/notifications/size-changed` | View to host (iframe only; no-op when the host lays out the View) |
| `log(level, message, data)` | host logging channel | View to host |
| `sendRequest`, `sendNotification` | any JSON-RPC method | escape hatch; hosts MAY refuse methods outside this table |
| props (entry component) | `ui/notifications/tool-input`, `tool-input-partial` | host to View |
| instance documents | `ui/notifications/tool-result` (marked embedded resources) | host to View |
| `useEnvironment()` keys | `ui/initialize` result, `ui/notifications/host-context-changed` | host to View |

A dedicated hook for `tool-result` beyond instance documents is proposed in BEP-0002.

### 5.2 Host context mapping

| MCP Apps host context | BindJS environment key |
|---|---|
| `theme` (`light`/`dark`) | `colorScheme` |
| `locale` | `locale` |
| `containerDimensions` | `screen` |
| `displayMode` | proposed key `displayMode` (BEP-0002); until then, not exposed |
| `platform` | `platform` |

Standardized theme variables (colors, fonts) have no environment mapping in 1.0. BEP-0004 proposes one.

### 5.3 Transports (informative)

- **Web:** SEP-1865 `postMessage`, unchanged. The runtime and React renderer run inside the iframe.
- **iOS:** a host object exposed to the `JSContext` with Promise bridging (`MCPHostBridge` in `bindjs-apple`).
- **Android:** a console-message channel from the isolate to native with a resolver callback for promises (`bindjs-android`).

The message vocabulary and authorization rules are identical on all three.

### 5.4 Messages not applicable

`ui/notifications/size-changed` on hosts that lay out the View natively. Everything else in SEP-1865 applies.

## 6. Versioning

- `spec` follows the BindJS Specification version scheme (`MAJOR.MINOR`, additive minors).
- The MIME strings are stable across specification versions; hosts negotiate the specification major through `_meta.ui.bindjs.spec` and the document's `spec` field. The two media type names are not yet registered with IANA.
- Packages are immutable per `version`; a new package version is a new resource URI (`...@13`) or a new `version` with a new digest.

## 7. Security considerations

Beyond section 4: the bridge is host-mediated, so a View cannot call a tool the iframe path could not; `visibility` and cross-server rules apply. A malicious package can draw misleading UI, as can HTML; the digest, the allowlist, and package immutability make what was drawn auditable after the fact. Hosts SHOULD present the package `name` and `version` in their review UI. Because the content channel is data only, a compromised tool result cannot introduce code.

## 8. Conformance

A host conforms to this binding when it implements sections 2 through 5 for at least one platform renderer at BindJS 1.0 "Core with declared gaps" or better, and publishes which renderer and statement it ships. The Metabind hosts (`metabind-apple`, `metabind-android`, `metabind-web`) are the reference implementations; the Metabind hosted MCP server serves this type today.
