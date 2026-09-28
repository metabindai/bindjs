# Runtimes and renderers

| Implementation | Platform | Kind | Spec | Statement | Maintainer |
|---|---|---|---|---|---|
| `@metabindai/bindjs-runtime` | any JS engine | runtime | 1.0 | [React statement, runtime section](../conformance/statements/react.md#runtime) | Metabind |
| `@metabindai/bindjs-react` | React DOM | renderer | 1.0, Core with declared gaps | [React statement](../conformance/statements/react.md) | Metabind |
| `bindjs-apple` | SwiftUI (iOS, macOS, tvOS, watchOS, visionOS) | renderer | 1.0, Core with declared gaps | [SwiftUI statement](../conformance/statements/swiftui.md) | Metabind |
| `ai.metabind:bindjs-android` | Jetpack Compose | renderer | 1.0, Partial | [Jetpack Compose statement](../conformance/statements/compose.md) | Metabind |

Hosts:

- `metabind-apple` (`MCPAppsHost`, `MetabindAI`) embeds `bindjs-apple`, and `metabind-android` (`mcpappshost-android`, `metabindai-android`) embeds `ai.metabind:bindjs-android`. Neither implements the [MCP Apps binding](../bindings/mcp-apps.md) yet. Both declare `application/vnd.bindjs+json`, a pre-specification type that the Metabind MCP server answers with a different body than the binding's view document, plus `text/html;profile=mcp-app`. A server that implements only this binding therefore gets no native rendering from these hosts; they show its HTML View if it lists one.
- `metabind-web` (`@metabindai/agent-ui`) embeds no BindJS renderer. It renders MCP Apps tool UIs as HTML in sandboxed iframes through `@mcp-ui/client`.

To add an implementation, open a pull request with a row here and a statement under [`conformance/statements/`](../conformance/statements/).
