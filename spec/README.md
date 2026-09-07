# BindJS Specification 1.0

Authors: Trevor Stout, Ollie Wagner, Dave Fumberger, Emory Al-Imam (Metabind). Status: draft for publication.

Read in order the first time; afterwards each chapter stands alone. Chapters 01 to 10 are normative unless a section is marked informative; chapter 11 is the overview of the agent surfaces and points at the normative bindings. If you came here for how agents drive BindJS, start with chapter 11. What "1.0" freezes, and the conformance levels, are in chapter 00 and in `../conformance/`.

| Chapter | Title | What it defines |
|---|---|---|
| [00](00-versioning.md) | Versioning and conformance | What BindJS 1.0 consists of, the version scheme, the three conformance levels, the statement format, how the specification changes (BEPs). |
| [01](01-introduction.md) | Introduction and Architecture | What BindJS is and why; the four pieces of a conforming implementation (runtime, registry, renderer, modifier pipeline); execution flow; the authoring primitives `defineComponent` and `defineButtonStyle`; getting started. |
| [02](02-concepts.md) | Core Concepts and Design | Design principles, custom components, state management. |
| [03](03-properties.md) | Properties System | Typed input schemas: property constructors, options, structure, type reference, schema generation. |
| [04](04-components.md) | Components, Composition, and Lookup | Name lookup order, built-in registration, custom registration, composition, environment and state flow. |
| [05](05-hooks.md) | Hooks | `useState`, `useStore`, `useEnvironment`, `useNavigate`, `useAction`, `useMCPHost`, `useRef`; the `MCPHost` interface. |
| [06](06-runtime.md) | Runtime Globals and Environment | The globals every runtime MUST register (Core), SHOULD register (Recommended), and platform extensions; environment keys; runtime behavior contracts (hook state keying, render model, callback persistence, environment scoping, modifier ordering). |
| [07](07-components-reference.md) | Component Reference | Every Core component with its arguments, then platform extensions. The Core list is frozen in `../conformance/README.md`. |
| [08](08-modifiers-reference.md) | Modifiers Reference | Animation, every Core modifier by category, component-specific modifiers, platform extensions, top-level utilities. The Core list is frozen in `../conformance/README.md`. |
| [09](09-ast-and-host-spi.md) | AST and Host SPI | The JSON view tree a runtime emits (node types, modifier wrapping and folding, handler ids, `ForEach` forms) and the calls a host makes into a runtime. Normative in 1.0. |
| [10](10-packages.md) | Packages | The unit of distribution and the allowlist: the package document, immutability, integrity, local holding, and the package's role in the agent contract. |
| [11](11-agent-surfaces.md) | Agent surfaces | The map from the language to where agents render it: what an agent sees (the schema contract), what travels (packages), the surfaces (MCP Apps View and content channels, A2UI, in-app assistants), the host bridge, and where the language ends. Overview; the bindings are normative. |

Bindings that hang off this specification (the MCP Apps one has a call-by-call walkthrough beside it): [`../bindings/mcp-apps.md`](../bindings/mcp-apps.md) (the `application/bindjs+json` View content type: view and instance documents, packages, `_meta.ui.bindjs`, sandbox contract, bridge mapping) and [`../bindings/a2ui.md`](../bindings/a2ui.md) (BindJS packages as A2UI catalogs).

Terminology used throughout: a **component** is a `defineComponent` module; a **package** is a versioned, immutable map of component names to sources and the unit of distribution (chapter 10); the **AST** or **view tree** is the JSON the runtime emits; a **renderer** draws it; a **host** embeds a runtime and a renderer and supplies the bridge.
