# Conformance statement: Metabind hosted MCP server

- Implementation: `metabind-mcp` 1.0.18, the hosted MCP server behind `mcp.metabind.ai`
- Binding: [BindJS binding for MCP Apps](../../bindings/mcp-apps.md), server side
- Specification: BindJS 1.0
- Checked: 2026-09-30

The binding's conformance clause (section 8) is written for hosts. This statement records what the server side serves, so a host knows what to expect from it.

## Binding sections

| Section | Status | Behavior today |
|---|---|---|
| 2.1 View document (View channel) | Supported | Served to hosts that declare `application/bindjs+json`. The package is referenced through `_meta.ui.bindjs.package`, never inlined. |
| 2.2 Instance document (content channel) | Not implemented | `contentMimeTypes` is not declared. Waits on ext-apps [PR #699](https://github.com/modelcontextprotocol/ext-apps/pull/699). |
| 2.3 Package resource | Supported | Listed as its own `ui://` resource with `mimeType: application/bindjs-package+json`, referenced by `sha256` and `size` over the exact bytes served. |
| 2.4 Tool input as props | Supported | |
| 2.5 Tool definition derived from the component | Supported | Tool copy and annotations come from the Type first, then from the entry component. |
| 3 Metadata (`_meta.ui.bindjs`) | Supported | |
| 4 Executable code and the sandbox contract | Host obligation | |
| 5 Bridge binding | Host obligation | |
| 6 Versioning and negotiation | Supported | Negotiates `application/bindjs+json;version=…`; no parameter means `version=1.0`. A Type can require a minimum spec and choose native or HTML for hosts below it. |

## Fallback and compatibility

- `text/html;profile=mcp-app` is served to every host as the universal fallback.
- The pre-specification type `application/vnd.bindjs+json` is still answered, with its original body shape, for hosts that have not migrated (see [`registry/renderers.md`](../../registry/renderers.md)).

## Machine-readable statement

`conformance.json` at the root of `metabind-mcp`.
