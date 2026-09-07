# BindJS binding for A2UI

Version 1.0 (draft). Defines how a BindJS package serves as an A2UI catalog, so that one catalog implementation renders natively on SwiftUI, Jetpack Compose, and React. Reference implementation: `metabindai/a2ui-bindjs` (A2UI v0.9.1 and v1.0; passes every in-scope case of the official conformance suite).

## 1. How the two fit

A2UI is a protocol for an agent to drive UI: messages name components from a catalog and bind them to a data model. It does not say how a component looks or what draws it. BindJS is a language for defining components and producing their platform-native rendering. So the two meet at the catalog: an A2UI catalog is an interface (component names and property schemas); a BindJS package is an implementation of that interface that renders natively everywhere.

The chain in `a2ui-bindjs`: A2UI messages arrive; the A2UI interpreter (TypeScript, bundled into the same JavaScript context as the BindJS runtime) maintains surfaces and the data model, resolves bindings, and calls the BindJS component for each A2UI component with resolved props; the BindJS runtime emits the view tree; the platform renderer draws it. On the web that is `@metabindai/a2ui-bindjs-react`; on iOS `A2UIHost` and `A2UISurfaceView`; on Android `ai.metabind.a2ui.A2UIHost` and `A2UISurfaceView`.

With MCP in the picture, A2UI travels on the content channel (typed payloads in tool results, per PR #699) and BindJS Views travel on the View channel (predeclared resources). A host that renders both shares one runtime and one package format between them. That is the unification: not one wire format, but one component implementation serving both.

## 2. Catalog package

A catalog is a BindJS package (MCP Apps binding, section 2.3) with:

- `components` keyed by A2UI component name (`Text`, `Card`, `Row`, `Column`, `Button`, `Image`, `List`, `Modal`, `Tabs`, `CheckBox`, `ChoicePicker`, `DateTimeInput`, `Slider`, `TextField`, `Divider`, `Icon`, `AudioPlayer`, `Video`, plus any custom names).
- A `catalogId` matching the id A2UI surfaces reference (`beginRendering.catalogId`). The basic catalog id is the one A2UI defines for the version in use.
- Each component's `properties` mirroring the A2UI component schema for that name.

The basic catalog shipped in `a2ui-bindjs` (`core/src/catalog/basic`, 18 components) is the reference catalog for 1.0.

## 3. Component contract

For each A2UI component instance the interpreter:

1. Resolves data bindings (`path`, `literalString`, function calls) against the surface data model.
2. Calls the BindJS component with the resolved values as props. A2UI child references (`child`, `children`, `entryPointChild`, `contentChild`, `tabItems`) are passed as BindJS children builders so the component composes them with BindJS layout.
3. Provides an `onAction(action)` callback through the environment (`env.a2ui.dispatch`) for `Button.action` and input `value` writes, which the interpreter turns into A2UI `userAction` or data-model updates.

Components MUST NOT depend on platform extensions to render their A2UI-defined behavior; they MAY use them for refinement guarded by `env.platform`.

## 4. Custom components

A custom A2UI component is written once as a BindJS component and added to the catalog package. There is no per-platform renderer to write. When an agent references a custom name, the host resolves it in the active catalog package; an unknown name renders nothing and is logged (A2UI's unknown-component rule).

Catalogs MAY arrive at runtime as packages (fetched, digest-verified, cached) or be bundled with the host. This is the same package resource the MCP Apps binding defines, which is what lets one catalog serve both A2UI-over-MCP and native MCP Apps Views.

## 5. Catalog manifest (proposal to A2UI)

A2UI catalogs today are JSON schema documents (names and property schemas). A small, optional addition would let a catalog point at implementations:

```jsonc
{
  "catalogId": "com.shop.catalog/v3",
  "components": { "...": { "$schema": "..." } },
  "implementations": [
    { "runtime": "bindjs", "spec": "1.0", "package": "ui://shop/packages/product-ui@12", "sha256": "..." }
  ]
}
```

When the catalog is served over MCP, `package` is a `ui://` resource URI fetched with `resources/read`; elsewhere it MAY be an `https://` URL. A renderer that knows the runtime renders the custom components; one that does not falls back to its own implementations or to the basic catalog. This is the only change to A2UI this binding suggests, and it is optional.

## 6. Conformance

An implementation conforms when it renders the A2UI conformance suite's in-scope cases through a BindJS catalog package on at least one platform, and states which A2UI versions it supports. `a2ui-bindjs` states v0.9.1 and v1.0 on React, SwiftUI, and Jetpack Compose.
