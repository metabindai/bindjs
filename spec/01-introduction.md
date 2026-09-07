# BindJS Specification 1.0, chapter 01: Introduction and Architecture

> Part of the BindJS Specification (`metabindai/bindjs`). Normative unless marked informative. Changes go through BEPs (`proposals/`).

## Introduction

### What is BindJS

BindJS is the open component language for agent UI. A component is written once in JavaScript, with its logic, against a SwiftUI-shaped API of functional composition and method chaining. A runtime executes it in an isolated context and emits a JSON view tree; a renderer on each platform draws that tree as native SwiftUI on iOS, Jetpack Compose on Android, or React on the web. The renderer never sees code, only the tree, and a custom component needs no per-platform renderer.

### Why BindJS

Agents render UI in places the author does not control: an MCP Apps View inside Claude, ChatGPT, or VS Code; an A2UI surface driven by a Gemini-class host; an assistant embedded in a company's own iOS, Android, or web app. Most formats in this space describe UI as data for components the host already has. BindJS carries the component implementation with the definition, so a custom component is written once, with its logic, and rendered natively on every platform the host runs on, instead of once per rendering technology.

Two properties make that safe to carry. The output boundary is data: only a view tree reaches the platform. And the code runs with no ambient authority: no DOM, no filesystem, no network except through host-managed channels, no host interaction except through the host's bridge. A host can therefore treat BindJS content the way it treats any data format, while authors keep real components: state, gestures, animation, and native widgets on every target.

BindJS consists of several parts:

- **Runtime** — a small JavaScript runtime that executes component code, manages state, and emits a JSON AST describing the UI
- **AST + component catalog** — the wire format and the catalog of component / modifier names a renderer must understand
- **Renderers** — per-platform implementations that turn the AST into native views (SwiftUI, Jetpack Compose, React)
- **Properties system** — typed input schemas attached to components for editor inspection, validation, and form generation
- **Modifier system** — chainable styling and behavior modifiers applied via method chaining

### Authoring Primitives

BindJS files declare one of two primitives, each exported as the module's default:

- **`defineComponent({ body, properties, metadata, previews, thumbnail, icon })`** — a UI component (the common case)
- **`defineButtonStyle({ body, metadata })`** — a custom button style applied via the `.buttonStyle()` modifier

The canonical type definitions for these primitives, all property helpers, and the component/modifier surface ship as TypeScript declaration files (`metabind.d.ts`) with the runtime package `@metabindai/bindjs-runtime`. Where the declarations and this specification disagree, this specification is normative.

> Data sources (`defineDataSource`) are outside this specification.

## Architecture Overview

### Spec architecture

A conforming BindJS implementation has four pieces:

1. **Runtime** — executes JavaScript component code, manages state, and emits a JSON AST describing the UI tree.
2. **Component / modifier registry** — maps component names (`Text`, `VStack`, `MyCard`) and modifier names (`padding`, `font`, `onTapGesture`) to implementations the renderer knows how to draw.
3. **Renderer** — walks the AST and produces native views on the target platform.
4. **Modifier pipeline** — applies chained modifiers in order before the renderer paints the underlying view.

### Execution flow

1. Component code is authored in JavaScript using the BindJS API.
2. The runtime executes that code with the BindJS globals (hooks, property constructors, animation builders) injected.
3. Component bodies return AST structures describing the UI tree.
4. The renderer walks the AST and produces native views.

The reference implementations realise this with three runtimes (the web JS engine, JavaScriptCore on iOS, `androidx.javascriptengine` on Android) and three renderers (React, SwiftUI, Jetpack Compose). See chapter 09 for the AST and host SPI, and `conformance/` for what each renderer provides.

---

## Getting Started

### Basic Component Structure

A BindJS component packages a `body` render function and an optional `properties` schema, plus optional `metadata`, `previews`, `thumbnail`, and `icon` fields, into a single `defineComponent` call exported as the module default.

```javascript
const properties = {
  title: PropertyString({ title: 'Title', required: true, defaultValue: 'Default Title' }),
  showSecondary: PropertyBoolean({ title: 'Show Secondary', defaultValue: true }),
}

const body = (props, children) => {
  return VStack({ spacing: 20 }, [
    Text(props.title)
      .font('headline')
      .foregroundStyle(Color('primary')),

    props.showSecondary
      ? HStack({ spacing: 10 }, [
          Button('Click Me', () => console.log('Clicked')),
          Text('Secondary text').foregroundStyle(Color('secondary')),
        ])
      : Empty(),
  ])
}

export default defineComponent({
  metadata: { title: 'My Component', description: 'Example BindJS component' },
  properties,
  body,
})
```

The `properties` and `body` are usually defined as top-level constants for
readability, but `defineComponent` is the canonical export. The body's `props`
type is inferred from the `properties` schema (see below).

Key differences from traditional React:
- No JSX — uses function calls and method chaining
- Components return an AST, not React elements
- Props and children are typed via the `properties` schema
- State is managed through runtime hooks (`useState`, `useStore`, `useEnvironment`, etc.)
- Modifiers are applied via method chaining

### Type Safety from `properties`

The body function's `props` argument is fully typed against the `properties` schema. There is no manual `ComponentProps` interface — the type is inferred via `InferProps<typeof properties>` inside the `defineComponent` overload.

```javascript
const properties = {
  title: PropertyString({ title: 'Title', required: true }),
  count: PropertyNumber({ title: 'Count', defaultValue: 0 }),
  isEnabled: PropertyBoolean({ title: 'Enabled', defaultValue: true }),
}

// Inferred body signature:
//   (props: { title: string; count: number; isEnabled: boolean },
//    children: Component[]) => Component
const body = (props, children) => {
  return VStack([
    Text(props.title),
    Text(`Count: ${props.count}`),
    props.isEnabled ? Text('Enabled') : Empty(),
  ])
}

export default defineComponent({ properties, body })
```

Property helpers (`PropertyString`, `PropertyNumber`, `PropertyBoolean`, `PropertyEnum`, `PropertyInteger`, `PropertyArray`, `PropertyDate`, `PropertyAsset`, `PropertyContent`, `PropertyComponent`, `PropertyGroup`) are described in the Properties System chapter.

### Optional `defineComponent` fields

#### `metadata`
Identification and discoverability info surfaced in editors, galleries, and documentation:

```javascript
defineComponent({
  metadata: {
    title: 'My Custom Component',
    description: 'A reusable UI component',
    category: 'Layout',
  },
  body,
})
```

#### `previews`
Preview instances rendered in galleries and design tools. Use `Self({...})` to instantiate the component itself with sample props:

```javascript
defineComponent({
  properties,
  body,
  previews: [
    Self({ title: 'Preview Title', showSecondary: true }).previewName('Default'),
    Self({ title: 'Long title goes here', showSecondary: false }).previewName('Long title'),
  ],
})
```

#### `thumbnail` and `icon`
- `thumbnail` — an SVG string or a render function returning a `Component`, used in the component picker
- `icon` — a short icon name string used in menus and context menus

### Sibling primitive — `defineButtonStyle`

The same module pattern is used for `defineButtonStyle`:

```javascript
// Custom button style — applied via .buttonStyle()
export default defineButtonStyle({
  body: (configuration, props) =>
    Capsule()
      .fill(Color(props?.color || 'blue'))
      .overlay(configuration.label)
      .frame({ height: 44 }),
})
```

---