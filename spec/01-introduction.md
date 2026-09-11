# BindJS Specification 1.0, chapter 01: Introduction and architecture

> [!NOTE]
> Part of the BindJS Specification (`metabindai/bindjs`). Normative unless marked informative. Changes go through BEPs ([`proposals/`](../proposals/)).

## Introduction

### What is BindJS

BindJS is the open component language for agent UI. A component is written once in JavaScript, with its logic, against a SwiftUI-shaped API of functional composition and method chaining. A runtime executes it in an isolated context and emits a JSON view tree; a renderer on each platform draws that tree as native SwiftUI on iOS, Jetpack Compose on Android, or React on the web. The renderer never sees code, only the tree, and a custom component needs no per-platform renderer.

### Why BindJS

Agents render UI in places the author does not control: an MCP Apps View inside Claude, ChatGPT, or VS Code; an A2UI surface driven by a Gemini-class host; an assistant embedded in a company's own iOS, Android, or web app. Most formats in this space describe UI as data for components the host already has. BindJS carries the component implementation with the definition, so a custom component is written once, with its logic, and rendered natively on every platform the host runs on, instead of once per rendering technology.

Two properties make that safe to carry. The output boundary is data: only a view tree reaches the platform. And the code runs with no ambient authority: no DOM, no filesystem, no network except through host-managed channels, no host interaction except through the host's bridge. A host can therefore treat BindJS content the way it treats any data format, while authors keep real components: state, gestures, animation, and native widgets on every target.

BindJS consists of several parts:

- **Runtime**: a small JavaScript runtime that executes component code, manages state, and emits a JSON AST describing the UI.
- **AST and component catalog**: the wire format and the catalog of component and modifier names a renderer must understand.
- **Renderers**: per-platform implementations that turn the AST into native views (SwiftUI, Jetpack Compose, React).
- **Properties system**: typed input schemas attached to components for editor inspection, validation, and form generation.
- **Modifier system**: chainable styling and behavior modifiers applied through method chaining.

### Authoring primitives

BindJS files declare one of two primitives, each exported as the module's default:

- **`defineComponent({ body, properties, metadata, previews, thumbnail, icon })`**: a UI component (the common case).
- **`defineButtonStyle({ body, metadata })`**: a custom button style applied through the `.buttonStyle()` modifier.

The canonical type definitions for these primitives, all property helpers, and the component and modifier surface ship as TypeScript declaration files (`metabind.d.ts`) with the runtime package `@metabindai/bindjs-runtime`. Where the declarations and this specification disagree, this specification is normative.

> [!NOTE]
> Data sources (`defineDataSource`) are outside this specification.

## Architecture overview

### Spec architecture

A conforming BindJS implementation has four pieces:

1. **Runtime**: executes JavaScript component code, manages state, and emits a JSON AST describing the UI tree.
2. **Component and modifier registry**: maps component names (`Text`, `VStack`, `MyCard`) and modifier names (`padding`, `font`, `onTapGesture`) to implementations the renderer knows how to draw.
3. **Renderer**: walks the AST and produces native views on the target platform.
4. **Modifier pipeline**: applies chained modifiers in order before the renderer paints the underlying view.

### Execution flow

1. You author component code in JavaScript using the BindJS API.
2. The runtime executes that code with the BindJS globals (hooks, property constructors, animation builders) injected.
3. Component bodies return AST structures describing the UI tree.
4. The renderer walks the AST and produces native views.

The reference implementations realize this with three runtimes (the web JS engine, JavaScriptCore on iOS, `androidx.javascriptengine` on Android) and three renderers (React, SwiftUI, Jetpack Compose). See [chapter 10](10-ast-and-host-spi.md) for the AST and host SPI, and [`conformance/`](../conformance/README.md) for what each renderer provides.

---

## Getting started

A worked introduction (basic component structure, type inference from `properties`, the optional `defineComponent` fields, and `defineButtonStyle`) is in the [authoring guide](authoring-guide.md), which is informative.
