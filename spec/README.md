# BindJS Specification 1.0

Authors: Trevor Stout, Ollie Wagner, Dave Fumberger, Emory Al-Imam (Metabind). Status: draft for publication.

Read the chapters in order the first time; afterwards each chapter stands alone. Chapter 02 is the overview of the agent surfaces and points at the normative bindings; the other chapters are normative unless a section is marked informative. If you came here for how agents drive BindJS, start with [chapter 02](02-agent-surfaces.md). What "1.0" freezes, and the conformance levels, are in [chapter 00](00-versioning.md) and in [`../conformance/`](../conformance/README.md).

| Chapter | Title | What it defines |
|---|---|---|
| [00](00-versioning.md) | Versioning and conformance | What BindJS 1.0 consists of, the version scheme, the three conformance levels, the statement format, and how the specification changes (BEPs). |
| [01](01-introduction.md) | Introduction and architecture | What BindJS is and why; the four pieces of a conforming implementation (runtime, registry, renderer, modifier pipeline); execution flow; the authoring primitives `defineComponent` and `defineButtonStyle`; getting started. |
| [02](02-agent-surfaces.md) | Agent surfaces | The map from the language to where agents render it: what an agent sees (the schema contract), what travels (packages), the surfaces (MCP Apps View and content channels, A2UI, in-app assistants), the host bridge, and where the language ends. Overview; the bindings are normative. |
| [03](03-concepts.md) | Core concepts and design | Design principles, custom components, and state management. |
| [04](04-properties.md) | Properties system | Typed input schemas: property constructors, options, structure, type reference, and schema generation. |
| [05](05-components.md) | Components, composition, and lookup | Name lookup order, built-in registration, custom registration, composition, and environment and state flow. |
| [06](06-hooks.md) | Hooks | `useState`, `useStore`, `useEnvironment`, `useNavigate`, `useAction`, `useMCPHost`, `useRef`; the `MCPHost` interface. |
| [07](07-runtime.md) | Runtime globals and environment | The globals every runtime MUST register (Core), SHOULD register (Recommended), and platform extensions; environment keys; runtime behavior contracts (hook state keying, render model, callback persistence, environment scoping, and modifier ordering). |
| [08](08-components-reference.md) | Component reference | Every Core component with its arguments, then platform extensions. The Core list is frozen in [`../conformance/README.md`](../conformance/README.md). |
| [09](09-modifiers-reference.md) | Modifiers reference | Animation, every Core modifier by category, component-specific modifiers, platform extensions, and top-level utilities. The Core list is frozen in [`../conformance/README.md`](../conformance/README.md). |
| [10](10-ast-and-host-spi.md) | AST and host SPI | The JSON view tree a runtime emits (node types, modifier wrapping and folding, handler ids, `ForEach` forms) and the calls a host makes into a runtime. Normative in 1.0. |
| [11](11-packages.md) | Packages | The unit of distribution and the allowlist: the package document, immutability, integrity, local holding, and the package's role in the agent contract. |
| [guide](authoring-guide.md) | Authoring guide | Informative: the worked getting-started material, host bridge patterns, and authoring conventions moved out of chapters 01, 06, and 07. |

Two bindings hang off this specification (the MCP Apps one has a call-by-call walkthrough beside it): [`../bindings/mcp-apps.md`](../bindings/mcp-apps.md) (the `application/bindjs+json` View content type: view and instance documents, packages, `_meta.ui.bindjs`, sandbox contract, and bridge mapping) and [`../bindings/a2ui.md`](../bindings/a2ui.md) (BindJS packages as A2UI catalogs).

Terminology used throughout: a **component** is a `defineComponent` module; a **package** is a versioned, immutable map of component names to sources and the unit of distribution ([chapter 11](11-packages.md)); the **AST** or **view tree** is the JSON the runtime emits; a **renderer** draws it; a **host** embeds a runtime and a renderer and supplies the bridge.
