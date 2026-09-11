# BindJS Specification 1.0, chapter 11: Packages

> [!NOTE]
> Part of the BindJS Specification (`metabindai/bindjs`). Normative. Changes go through BEPs ([`proposals/`](../proposals/)).

A **package** is the unit of distribution for BindJS components and the component allowlist for anything that renders them. Every agent surface that carries BindJS ([chapter 02](02-agent-surfaces.md)) ships components as packages; the language itself does not require them for local use, where a host may register component sources directly ([chapter 05](05-components.md)).

## 1. Package document

Media type `application/bindjs-package+json`. Body:

```jsonc
{
  "name": "com.shop.product-ui",       // reverse-DNS style identifier
  "version": "12.0.0",                 // semver; immutable once published
  "spec": "1.0",                       // BindJS specification version the sources target
  "components": { "<Name>": "<JavaScript source>" },   // name to source; names are JS identifiers
  "entry": "ProductCard",              // optional default entry component
  "assets": { "ProductCard": [ { "name": "hero", "url": "https://cdn.example/hero.jpg" } ] },   // optional
  "dependencies": [                    // optional
    { "package": "<reference>", "sha256": "<hex>" }
  ]
}
```

- `components` is the only source of non-Core components for a render. A runtime MUST NOT load components from anywhere else during a render; a name the package did not ship has no implementation and renders nothing ([chapter 10, unknown names](10-ast-and-host-spi.md#additional-10-contracts-from-the-2026-09-06-inventories)).
- Component names MUST match `^[A-Za-z_$][A-Za-z0-9_$]*$` after the runtime's sanitization; a package MUST NOT contain two names that sanitize to the same identifier.
- Each source MUST be a `defineComponent` or `defineButtonStyle` module ([chapter 01](01-introduction.md)) authored against the `spec` version declared, in **package source form**: plain JavaScript (no ES module syntax, no TypeScript) that assigns the definition to `exports.default`. Authoring tools MUST transform `export default` to `exports.default =` and compile TypeScript before packaging; the runtime evaluates each source with an `exports` object in scope and reads `exports.default`.
- A package MAY carry `assets`: a map from component name to an array of `{ "name": string, "url": string, "type"?: string }` entries that resolve the names a component's `PropertyAsset` values refer to. Hosts MUST restrict asset URLs to their allowlists (MCP Apps: `csp.resourceDomains`).
- A hosting binding MAY define additional top-level fields (for example the A2UI binding's `catalogId`); runtimes ignore fields they do not know.
- `dependencies` are resolved before rendering; their components are registered first, in dependency order. Circular dependencies are an error. How a `package` reference is written (URI, URL, local name) is defined by the hosting binding.

## 2. Immutability and integrity

- A published `name` plus `version` MUST always denote the same bytes. A change is a new version.
- A package MAY be accompanied by `sha256` (hex SHA-256 of the document bytes) and `size` wherever it is referenced. A host that receives a digest MUST verify it before executing any source and MUST NOT execute on mismatch. Hosts SHOULD cache verified packages by digest.
- A host MAY hold packages locally (bundled with the application, or cached). A reference the host can satisfy by `name`, `version`, and `sha256` from its local store needs no fetch. That is the whole of what some surfaces call "catalog mode": there is no second identifier and no second concept.

## 3. Packages and the agent contract

A package carries, for every component, the `properties` schema and `metadata` from which a host derives the JSON Schema an agent sees ([chapter 04, Schema derivation](04-properties.md#schema-generation-and-llm-understanding)). A host MAY publish that derived schema (for example as an MCP tool's `inputSchema`) so that an agent can call a component without executing it. The `entry` component is the one a surface renders by default; a surface MAY name any component in the package instead.

## 4. Bindings

- MCP Apps: a package is a `ui://` resource with `_meta.ui.bindjs` metadata ([`bindings/mcp-apps.md`, sections 2.3 and 3](../bindings/mcp-apps.md#23-package-resource)).
- A2UI: a package whose component names are a catalog's component names ([`bindings/a2ui.md`, section 2](../bindings/a2ui.md#2-catalog-package)).
