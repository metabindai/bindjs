# BindJS

**Write a UI component once, with its logic. BindJS renders it as native SwiftUI, Jetpack Compose, and React, wherever an agent renders UI: as an [MCP Apps](https://github.com/modelcontextprotocol/ext-apps) View, as an A2UI catalog, or inside an in-app assistant.** A custom component needs no per-platform renderer.

BindJS is the open component language for agent UI. It is an open specification, Apache 2.0, stewarded by [Metabind](https://metabind.ai). Authors: Trevor Stout, Ollie Wagner, Dave Fumberger, Emory Al-Imam (see [`AUTHORS.md`](AUTHORS.md)).

You write a BindJS component in JavaScript against a SwiftUI-shaped API. A runtime executes it in an isolated context and emits a JSON view tree; a renderer on each platform draws that tree with real platform widgets. The renderer never sees code, only data. That boundary is what makes one definition portable across three platforms, and it is what lets a host bound what BindJS content can do: the runtime executes with no ambient authority, and only a view tree reaches the platform.

## What is in this repository

| Path | Contents |
|---|---|
| [`spec/`](spec/README.md) | The BindJS Specification 1.0: introduction and architecture, concepts, properties (including the agent contract), components and lookup, hooks, runtime globals and environment, component reference, modifier reference, AST and host SPI, packages, and the agent surfaces overview. |
| [`bindings/mcp-apps.md`](bindings/mcp-apps.md) | The `application/bindjs+json` View content type for MCP Apps (SEP-1865): View and instance documents, `_meta.ui.bindjs`, package resources, the sandbox contract, and the bridge binding. [`bindings/mcp-apps-walkthrough.md`](bindings/mcp-apps-walkthrough.md) follows one tool through every call, with diagrams. |
| [`bindings/a2ui.md`](bindings/a2ui.md) | BindJS packages as A2UI catalogs: component contract, data binding, actions, and the catalog manifest proposal. |
| [`conformance/`](conformance/README.md) | What "BindJS 1.0" means for an implementation: the frozen Core sets, three conformance levels, the statement format, and the statements for the React, SwiftUI, and Jetpack Compose renderers. |
| [`registry/renderers.md`](registry/renderers.md) | Known runtimes, renderers, and hosts. |
| [`proposals/`](proposals/) | BindJS Enhancement Proposals (BEPs). [BEP-0001](proposals/BEP-0001-process.md) is the process; [BEP-0002](proposals/BEP-0002-version-and-bridge-parity.md) is the first change. |
| [`examples/`](examples/) | [`quickstart`](examples/quickstart/README.md) (one component, three platforms) and [`mcp-server`](examples/mcp-server/README.md) (serve a BindJS View from any MCP server). Planned for the first release; see each folder's README. |

## Status

| Document | Version | Status |
|---|---|---|
| BindJS Specification | 1.0 | Draft for publication. Freezes the language and runtime contract shipped by `@metabindai/bindjs-runtime` 1.0.x. |
| MCP Apps binding | 1.0 | Draft. Matches what the reference server and hosts do today, with the metadata block in the registered-type shape proposed to the MCP Apps working group. |
| A2UI binding | 1.0 | Draft. Matches `metabindai/a2ui-bindjs` (A2UI v0.9.1 and v1.0). |
| Conformance | 1.0 | Draft. Statements for React, SwiftUI, and Jetpack Compose, with public gap lists. |

## Implementations

| Repository | What it is | Conformance |
|---|---|---|
| [`metabindai/bindjs-runtime`](https://github.com/metabindai/bindjs-runtime) | The runtime (`@metabindai/bindjs-runtime`) and the React renderer (`@metabindai/bindjs-react`) | [React statement](conformance/statements/react.md) |
| [`metabindai/bindjs-apple`](https://github.com/metabindai/bindjs-apple) | SwiftUI rendering engine | [SwiftUI statement](conformance/statements/swiftui.md) |
| [`metabindai/bindjs-android`](https://github.com/metabindai/bindjs-android) | Jetpack Compose rendering engine (`ai.metabind:bindjs-android`) | [Jetpack Compose statement](conformance/statements/compose.md) |
| [`metabindai/a2ui-bindjs`](https://github.com/metabindai/a2ui-bindjs) | A2UI renderer on BindJS: the A2UI interpreter, the basic catalog as BindJS source, React, iOS, and Android hosts | [A2UI binding](bindings/a2ui.md) |

Hosts that implement the MCP Apps binding: [`metabind-apple`](https://github.com/metabindai/metabind-apple), [`metabind-android`](https://github.com/metabindai/metabind-android), and [`metabind-web`](https://github.com/metabindai/metabind-web).

Tutorials, the API reference, a playground, and the hosted tooling (Metabind Studio, the hosted MCP server) live at [metabind.ai](https://metabind.ai) and [docs.metabind.ai/bindjs](https://docs.metabind.ai/bindjs/introduction). Where they and this repository disagree, this repository is normative.

## Citing

"BindJS Specification 1.0", `metabindai/bindjs`, section as applicable. The MCP Apps registry entry for `application/bindjs+json` points at [`bindings/mcp-apps.md`](bindings/mcp-apps.md). The project site is [bindjs.dev](https://bindjs.dev).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Specification changes go through BEPs ([BEP-0001](proposals/BEP-0001-process.md)). Report security issues as described in [`SECURITY.md`](SECURITY.md).

## License

Apache License 2.0 (see [`LICENSE`](LICENSE)). Copyright Yap Studios LLC (Metabind). "BindJS" is a trademark of Yap Studios LLC; the specification and the reference implementations are open, and the name identifies conforming work.
