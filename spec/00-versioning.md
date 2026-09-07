# BindJS Specification: versioning and conformance

## 1. What "BindJS 1.0" means

BindJS 1.0 is the language and runtime contract documented in chapters 01 to 09 of this specification as of its publication date. It consists of:

1. **Authoring primitives.** `defineComponent`, `defineButtonStyle`, and the component body contract (chapter 04).
2. **Properties.** The property constructors and schema semantics (chapter 03).
3. **Hooks.** `useState`, `useStore`, `useEnvironment`, `useNavigate`, `useAction`, `useMCPHost`, `useRef` (chapter 05).
4. **Runtime globals and environment.** The Core globals, the Core environment keys, and the runtime behavior contracts: hook state keying, render model, callback persistence, environment scoping, modifier ordering (chapter 06).
5. **The Core component set** (chapter 07) and **the Core modifier set** (chapter 08).
6. **The AST and host SPI** (chapter 09): the JSON view tree a runtime emits and the calls a host makes into a runtime.
7. **Packages** (chapter 10): the package document, immutability, and integrity rules.
8. **The agent contract** (chapter 03, Schema derivation): the JSON Schema a host derives from `properties` and `metadata`.

Items marked Recommended or Platform extension are documented but are not part of the 1.0 conformance surface.

## 2. Version scheme

- The specification carries a two-part version, `MAJOR.MINOR`. `1.x` releases are additive: a component authored against 1.0 renders identically on a 1.x runtime and renderer. A `2.0` may remove or change semantics.
- Implementations (runtimes, renderers, SDKs) carry their own semantic versions and are not tied to the specification's numbering. Each implementation publishes a conformance statement naming the specification version it targets.
- Content carries the specification version it was authored against where the hosting binding provides a slot (for the MCP Apps binding, `_meta.ui.bindjs.spec`; for packages, the `spec` field of the package document).

## 3. Conformance levels

A **runtime** conforms to BindJS 1.0 when it registers every Core global and hook, injects every Core environment key, and implements the runtime behavior contracts of chapter 06 and the AST contract of chapter 09.

A **renderer** conforms to BindJS 1.0 at one of three levels:

- **Core.** Renders every Core component and every Core modifier per chapters 07 and 08.
- **Core with declared gaps.** Renders the Core sets except for the items listed in its conformance statement, each with the behavior a component author will observe (not rendered, rendered as a fallback, rendered without a property). A renderer at this level MUST NOT silently alias one component to another; an alias MUST be declared.

- **Partial.** Renders a substantial subset of the Core sets (as a rule of thumb, more than ten Core items missing) and publishes a dated plan to reach Core with declared gaps. A Partial renderer MUST NOT describe itself as BindJS 1.0 without the qualifier.

Platform extensions (iOS-only components and modifiers, web-only `Shader`) are outside conformance and are listed in the statement for information.

## 4. Conformance statement

Every implementation publishes `conformance.json` at its repository root and a human-readable statement in this repository under `conformance/statements/`. The JSON shape:

```json
{
  "implementation": "bindjs-apple",
  "version": "1.2.0",
  "spec": "1.0",
  "kind": "renderer",
  "platform": "swiftui",
  "level": "core-with-gaps",
  "components": { "unsupported": ["Markdown", "Slider"], "aliased": [], "partial": [] },
  "modifiers": { "unsupported": [], "partial": [] },
  "extensions": { "components": ["NavigationStack", "Grid"], "modifiers": ["sheet", "toolbar"] }
}
```

The renderer statements for React, SwiftUI, and Jetpack Compose are in `conformance/statements/`. They are the public form of what was previously an internal issues list, and each gap links to a tracking issue.

## 5. Changing the specification

Changes go through BindJS Enhancement Proposals (`proposals/`, process in BEP-0001). A BEP that adds a Core component, modifier, hook, global, or environment key targets the next minor version. A BEP that changes existing semantics targets the next major version.
