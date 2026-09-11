# BindJS Specification 1.0, chapter 02: Agent surfaces

> [!NOTE]
> Part of the BindJS Specification (`metabindai/bindjs`). Informative overview with pointers to the normative bindings. Changes go through BEPs ([`proposals/`](../proposals/)).

BindJS is a component language for agent UI: people write the components, and agents make the calls that render them. This chapter is the map from the language to the places agents render UI. The wire details live in [`bindings/`](../bindings/); this chapter says what is common to all of them and where to look.

## 1. What an agent sees: the component contract

An agent never sees BindJS source. It sees, for each component it may render:

- a name;
- a JSON Schema derived from the component's `properties` ([chapter 04, Schema derivation](04-properties.md#schema-generation-and-llm-understanding)), with each property's `title`, `description`, defaults, constraints, and examples;
- for slots declared with `PropertyComponent`, the allowed component names and, recursively, their schemas;
- the component's `metadata.description`, which tells the agent what the component is for.

The agent produces a props object that validates against that schema. The host validates it and renders. That is the entire contract: the schema is the interface, the package ([chapter 11](11-packages.md)) is the implementation, and the agent's arguments are the data. `description` fields are therefore not documentation for humans only; they are the text an agent reasons over, and authors SHOULD write them for that reader.

## 2. What travels: packages

Components ship as packages ([chapter 11](11-packages.md)): versioned, immutable, digest-verifiable maps of component names to sources. A package is the allowlist for a render. Code travels only as packages, predeclared and reviewable; the data an agent sends never carries code.

## 3. The surfaces

| Surface | How BindJS arrives | How the agent's data arrives | Binding |
|---|---|---|---|
| **MCP Apps, View channel** | A `ui://` View resource of type `application/bindjs+json` naming an entry component and its package. | The tool's arguments (`ui/notifications/tool-input`, streamed with `tool-input-partial`) are the entry component's props. | [`bindings/mcp-apps.md`, sections 2.1 and 2.4](../bindings/mcp-apps.md#21-view-document-view-channel) |
| **MCP Apps, content channel** | The same predeclared View and package. | A tool result carries an instance document (a component name in the package plus props) as Dynamic View Content. Data only. | [`bindings/mcp-apps.md`, section 2.2](../bindings/mcp-apps.md#22-instance-document-content-channel) |
| **A2UI** | A package whose component names are an A2UI catalog's names. | A2UI messages bind catalog components to a data model; the interpreter resolves bindings and calls the BindJS component with props. | [`bindings/a2ui.md`](../bindings/a2ui.md) |
| **In-app assistants** | Packages bundled with the application or fetched and cached by digest. | Whatever the host's agent loop delivers, through the same host bridge. | [`bindings/mcp-apps.md`, section 5](../bindings/mcp-apps.md#5-bridge-binding) (the bridge is the same) |

A common pattern chains the two MCP channels: a data-returning tool answers with an instance document that names a component from a predeclared package, so the agent fetches with one tool and renders with the other. In every case the host holds the runtime and the renderer; the agent holds neither. A surface that renders BindJS renders it with platform widgets (SwiftUI, Jetpack Compose, React) from the runtime's view tree.

## 4. What the UI can say back: the host bridge

Rendered UI talks to the agent's host through `useMCPHost()` ([chapter 06](06-hooks.md)): call a tool, send a message into the conversation, update the model's context silently, open a link, request a display mode. The mapping of each call to an MCP Apps message is in [`bindings/mcp-apps.md`, section 5](../bindings/mcp-apps.md#5-bridge-binding). There is no other channel out of a component.

## 5. What keeps it safe

The output boundary is data (only a view tree reaches the platform) and the code runs with no ambient authority: no DOM, no filesystem, no network except through host-managed channels, no host interaction except through the bridge. The sandbox contract a host MUST enforce is in [`bindings/mcp-apps.md`, section 4](../bindings/mcp-apps.md#4-executable-code-and-the-sandbox-contract), and applies to every surface that executes packages.

## 6. Where the language ends

This specification covers what a host or an agent needs to render and to call a component: the language, the runtime contract, the view tree, packages, the schema derivation, the bridge, and the bindings. Authoring tools, hosting, publishing pipelines, governance, analytics, agent orchestration, and data tools (`defineDataSource`) are products built on the language and are outside it.
