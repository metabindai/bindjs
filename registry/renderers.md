# Runtimes and renderers

| Implementation | Platform | Kind | Spec | Statement | Maintainer |
|---|---|---|---|---|---|
| `@metabindai/bindjs-runtime` | any JS engine | runtime | 1.0 | `conformance/statements/react.md` (runtime section) | Metabind |
| `@metabindai/bindjs-react` | React DOM | renderer | 1.0, Core with declared gaps | `conformance/statements/react.md` | Metabind |
| `bindjs-apple` | SwiftUI (iOS, macOS, tvOS, watchOS, visionOS) | renderer | 1.0, Core with declared gaps | `conformance/statements/swiftui.md` | Metabind |
| `ai.metabind:bindjs-android` | Jetpack Compose | renderer | 1.0, Partial | `conformance/statements/compose.md` | Metabind |

Hosts that embed a renderer and implement the MCP Apps binding: `metabind-apple` (`MCPAppsHost`, `MetabindAI`), `metabind-android` (`mcpappshost-android`, `metabindai-android`), `metabind-web` (`@metabindai/agent-ui`).

To add an implementation: open a PR with a row here and a statement under `conformance/statements/`.
