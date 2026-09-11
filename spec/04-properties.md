# BindJS Specification 1.0, chapter 04: Properties system

> [!NOTE]
> Part of the BindJS Specification (`metabindai/bindjs`). Normative unless marked informative. Changes go through BEPs ([`proposals/`](../proposals/)).

## Overview

The properties system declares what configurable inputs a component accepts. The same schema drives three things: type-safe props for the component body, validation at runtime, and form-control generation in editors that integrate BindJS.

Components declare their inputs in the `properties` field of `defineComponent`. The value is a record where each key is a property name and each value is created using a property helper function (`PropertyString`, `PropertyNumber`, and so on). The helpers are also available as a callable `properties` factory `() => { ... }` for cases where the schema needs runtime context.

> [!NOTE]
> The list of helpers, options, and inspector fields documented here mirrors the canonical TypeScript declarations (`metabind.d.ts`); keep the two in sync.

These property definitions serve multiple purposes:

1. **Type generation.** Generates the typed props for the body function.
2. **Validation.** Defines validation rules for property values.
3. **Form generation.** Editors integrating BindJS use the schema to generate input controls.
4. **Documentation.** Provides descriptions and examples.

The system generates TypeScript types from these definitions, so the body function receives properly typed props without requiring manual interface definitions.

## How properties work

1. **Property definition.** A component declares a `properties` schema in its `defineComponent` call.
2. **Runtime resolution.** At render time the runtime resolves the schema and produces a typed props object that the body function receives.
3. **Editor integration.** Editors integrating BindJS read the schema to render input controls; updates flow back through the runtime as new prop values.
4. **Re-render.** When props change, the body re-runs with the new values.

## Property schema structure

A component's `properties` field is a record (or a function returning a record) of property definitions:

```javascript
const properties = {
  title: PropertyString({
    title: 'Component Title',
    description: 'The main title displayed in the component',
    required: true,
    defaultValue: 'Default Title',
    inspector: {
      placeholder: 'Enter title...',
      showLabel: true,
      helpDescription: 'This title appears at the top of the component',
    },
    validation: { minLength: 1, maxLength: 100 },
  }),

  fontSize: PropertyNumber({
    title: 'Font Size',
    description: 'Size of the title font in points',
    defaultValue: 16,
    validation: { min: 8, max: 72 },
    inspector: { control: 'slider', step: 1, showLabel: true },
  }),

  showIcon: PropertyBoolean({
    title: 'Show Icon',
    description: 'Whether to display an icon next to the title',
    defaultValue: false,
  }),

  alignment: PropertyEnum({
    title: 'Text Alignment',
    description: 'How the text should be aligned',
    options: [
      { value: 'left', label: 'Left' },
      { value: 'center', label: 'Center' },
      { value: 'right', label: 'Right' },
      { value: 'justify', label: 'Justified' },
    ],
    defaultValue: 'left',
    inspector: { control: 'segmented' },
  }),
}

export default defineComponent({ properties, body })
```

## Property helper functions

### PropertyString

For text input fields with optional validation and formatting:

```javascript
PropertyString({
  title: 'Text Content',
  description: 'The text to display',
  required: true,
  defaultValue: 'Default text',
  examples: ['Hello World', 'Welcome to our app'],

  validation: {
    minLength: 1,
    maxLength: 500,
    pattern: '^[a-zA-Z0-9 ]+$',
    format: 'text', // 'text', 'email', or 'url'
  },

  inspector: {
    placeholder: 'Enter text...',
    control: 'singleline', // 'singleline' | 'multiline' | 'code'
    showLabel: true,
    helpDescription: 'Enter the text you want to display',
  },
})
```

For multiline text, set `inspector.control: 'multiline'` and optionally `numberOfLines`. To enable a markdown formatting toolbar, set `inspector.markdown: true`.

```javascript
PropertyString({
  title: 'Description',
  description: 'Detailed description text',
  inspector: {
    control: 'multiline',
    numberOfLines: 5,
    markdown: true,
    placeholder: 'Enter description...',
  },
  validation: { maxLength: 1000 },
})
```

For source code, use `inspector.control: 'code'`.

### PropertyNumber

For numeric input (any real number) with optional constraints:

```javascript
PropertyNumber({
  title: 'Width',
  description: 'Width in pixels',
  defaultValue: 300,
  validation: { min: 0, max: 1000 },
  inspector: {
    control: 'input', // 'input' or 'slider'
    step: 10,
    placeholder: 300,
    showLabel: true,
    helpDescription: 'Width must be between 0 and 1000 pixels',
  },
})
```

### PropertyInteger

Same shape as `PropertyNumber`, but restricted to integer values. Emits `{ type: "integer" }` in the underlying JSON Schema, which is useful when downstream consumers need to declare an integer type explicitly (for example, an OpenAPI path parameter typed as `integer`).

```javascript
PropertyInteger({
  title: 'Page',
  description: 'Page number (1-based)',
  defaultValue: 1,
  validation: { min: 1, max: 100 },
  inspector: { control: 'input', step: 1 },
})
```

Use `PropertyNumber` when any real number is acceptable; use `PropertyInteger` when the consumer needs an integer guarantee at the schema level.

### PropertyBoolean

For toggle or switch controls:

```javascript
PropertyBoolean({
  title: 'Enabled',
  description: 'Whether the feature is enabled',
  defaultValue: true,

  inspector: {
    showLabel: true,
    visible: true,
    helpDescription: 'Toggle to enable or disable this feature'
  }
})
```

### PropertyEnum

For selection from a predefined set of options. Options can be plain strings or numbers, or objects with `value` plus `label` (for text labels) or `value` plus `icon` (for icon-only segmented controls).

```javascript
PropertyEnum({
  title: 'Theme',
  description: 'Visual theme for the component',
  options: [
    { value: 'light', label: 'Light Theme' },
    { value: 'dark', label: 'Dark Theme' },
    { value: 'auto', label: 'Auto (System)' },
  ],
  defaultValue: 'auto',
  required: true,
  inspector: {
    control: 'segmented', // 'segmented' (inline buttons) or 'dropdown' (select menu)
    showLabel: true,
    helpDescription: 'Choose how the component should appear',
  },
})
```

For an icon-only segmented control:

```javascript
PropertyEnum({
  title: 'Alignment',
  options: [
    { value: 'leading', icon: 'align-left' },
    { value: 'center', icon: 'align-center' },
    { value: 'trailing', icon: 'align-right' },
  ],
  defaultValue: 'leading',
  inspector: { control: 'segmented' },
})
```

### PropertyAsset

For media file selection:

```javascript
PropertyAsset({
  title: 'Background Image',
  description: 'Image to use as background',
  assetTypes: ['image'], // Can include 'video', 'audio', etc.
  required: false,

  inspector: {
    showLabel: true,
    helpDescription: 'Recommended size: 1920x1080px',
    visible: true
  }
})
```

### PropertyArray

For lists of values:

```javascript
// Simple array of strings
PropertyArray({
  title: 'Tags',
  description: 'Tags for categorization',
  defaultValue: ['new', 'featured'],

  valueType: PropertyString({
    title: 'Tag',
    validation: {
      maxLength: 20
    }
  }),

  validation: {
    minItems: 1,
    maxItems: 10
  },

  inspector: {
    helpDescription: 'Add up to 10 tags',
    showLabel: true
  }
})

// Array of components
PropertyArray({
  title: 'Gallery Images',
  description: 'Images to display in the gallery',

  valueType: PropertyComponent({
    title: 'Image',
    environment: {
      gallery: true
    }
  }),

  validation: {
    maxItems: 20
  }
})
```

### PropertyComponent

For embedding child components:

```javascript
PropertyComponent({
  title: 'Header Component',
  description: 'Custom header component',

  environment: {
    theme: 'dark',
    context: 'header'
  },

  inspector: {
    showLabel: true,
    visible: true
  }
})
```

### PropertyContent

For referencing content items:

```javascript
PropertyContent({
  title: 'Related Article',
  description: 'Link to a related article',
  required: false,

  inspector: {
    showLabel: true,
    helpDescription: 'Select an article to link'
  }
})
```

### PropertyDate

For date selection:

```javascript
PropertyDate({
  title: 'Publish Date',
  description: 'When to publish the content',
  defaultValue: '2024-01-01',

  validation: {
    minDate: '2024-01-01',
    maxDate: '2025-12-31'
  },

  inspector: {
    placeholder: 'Select date...',
    showLabel: true,
    helpDescription: 'Must be within the current year'
  }
})
```

### PropertyGroup

For grouping related properties:

```javascript
PropertyGroup({
  title: 'Author Information',
  description: 'Details about the content author',

  properties: {
    name: PropertyString({
      title: 'Name',
      required: true,
      validation: {
        maxLength: 50
      }
    }),
    email: PropertyString({
      title: 'Email',
      validation: {
        format: 'email'
      }
    }),
    bio: PropertyString({
      title: 'Biography',
      inspector: {
        control: 'multiline',
        numberOfLines: 3
      }
    }),
    avatar: PropertyAsset({
      title: 'Profile Picture',
      assetTypes: ['image']
    })
  },

  inspector: {
    showLabel: true,
    visible: true
  }
})
```

### Slots of child components

Layout components declare where children can be placed by combining `PropertyComponent` (single slot) or `PropertyArray` of `PropertyComponent` (list slot) with the `allowedComponents` option.

#### Single section (default)

```javascript
const properties = {
  title: PropertyString({ title: 'Page Title', required: true }),

  // Convention: use "components" for the single/default slot
  components: PropertyArray({
    title: 'Page Content',
    description: 'Main content components',
    valueType: PropertyComponent({
      allowedComponents: ['Heading', 'Paragraph', 'Image', 'Quote'],
    }),
    inspector: { visible: false },
  }),
}
```

#### Multiple sections

```javascript
const properties = {
  sidebar: PropertyArray({
    title: 'Sidebar Content',
    description: 'Components for the sidebar',
    valueType: PropertyComponent({ allowedComponents: ['NavList', 'Promo'] }),
    validation: { maxItems: 5 },
    inspector: { visible: false },
  }),

  main: PropertyArray({
    title: 'Main Content',
    description: 'Primary content area',
    valueType: PropertyComponent({ allowedComponents: ['Heading', 'Paragraph', 'Image'] }),
    validation: { minItems: 1 },
    inspector: { visible: false },
  }),
}
```

#### Domain-specific naming

```javascript
// FAQ Layout
const properties = {
  faqs: PropertyArray({
    title: 'FAQ Items',
    description: 'Frequently asked questions',
    valueType: PropertyComponent({ allowedComponents: ['FAQItem'] }),
    inspector: { visible: false },
  }),
}

// Recipe Layout
const properties = {
  ingredients: PropertyArray({
    title: 'Ingredients',
    description: 'Recipe ingredients',
    valueType: PropertyComponent({ allowedComponents: ['Ingredient'] }),
    inspector: { visible: false },
  }),
  steps: PropertyArray({
    title: 'Instructions',
    description: 'Step-by-step instructions',
    valueType: PropertyComponent({ allowedComponents: ['Step'] }),
    inspector: { visible: false },
  }),
}
```

For a single-component slot (not a list), drop the `PropertyArray` wrapper:

```javascript
header: PropertyComponent({
  title: 'Header',
  allowedComponents: ['SiteHeader', 'MinimalHeader'],
}),
```

## Property structure reference

### Base fields (all property types)

All property helper functions accept these base fields:

```javascript
{
  title: string,              // Display name in the UI
  description: string,        // Detailed description for documentation
  required: boolean,          // Whether the field is required
  defaultValue: any,          // Type-specific default value
  examples: array,            // Example values for documentation

  inspector: {                // UI configuration
    showLabel: boolean,     // Show field label
    visible: boolean,       // Field visibility
    helpDescription: string // Additional help text
  },

  validation: {              // Type-specific validation rules
    // See individual property types for available rules
  }
}
```

### Inspector configuration

The `inspector` object controls how the property appears in editors that render the schema as form controls:

```javascript
inspector: {
  // Common (all types)
  showLabel: boolean,         // Whether to show the field label
  showDivider: boolean,       // Whether to show a divider below the field
  helpDescription: string,    // Tooltip / info text
  visible: (props) => boolean, // Dynamic visibility; return false to hide

  // String-specific
  placeholder: string,
  control: 'singleline' | 'multiline' | 'code',
  markdown: boolean,          // Enable a markdown formatting toolbar
  numberOfLines: number,      // Visible lines for multiline fields

  // Number / Integer-specific
  control: 'input' | 'slider',
  step: number,
  placeholder: number,

  // Enum-specific
  control: 'segmented' | 'dropdown',

  // Date-specific
  placeholder: string,
}
```

`visible` is a function: it receives the current resolved props and returns a boolean. Use it to conditionally show fields based on the value of another property (for example, only show a `customColor` field when `colorMode === 'custom'`).

### Validation rules

The `validation` object contains type-specific validation rules:

```javascript
// String validation
validation: {
  minLength: number,
  maxLength: number,
  pattern: string,           // Regex pattern
  format: 'text' | 'email' | 'url',
}

// Number / Integer validation
validation: {
  min: number,
  max: number,
}

// Array validation
validation: {
  minItems: number,
  maxItems: number,
}

// Date validation
validation: {
  minDate: string,           // ISO date string
  maxDate: string,           // ISO date string
}
```

## Property type reference

The full set of property helpers, in the order they're documented above:

| Helper | Runtime type | JSON Schema type | Notes |
|---|---|---|---|
| `PropertyString` | `string` | `string` | Text, with `singleline`, `multiline`, or `code` controls |
| `PropertyNumber` | `number` | `number` | Real numbers; `input` or `slider` control |
| `PropertyInteger` | `integer` | `integer` | Integer-only; same shape as `PropertyNumber` |
| `PropertyBoolean` | `boolean` | `boolean` | Toggle |
| `PropertyEnum` | `enum` | `string` or `number` enum | `segmented` or `dropdown` control |
| `PropertyDate` | `date` | `string` (ISO 8601) | Date picker |
| `PropertyArray` | `array` | `array` | Repeatable list, item type set by `valueType` |
| `PropertyGroup` | `group` | nested `object` | Nested fields under one collapsible section |
| `PropertyAsset` | `asset` | host-defined | Image, video, audio, or 3D model picker; resolved by the host's asset system |
| `PropertyContent` | `content` | host-defined | Reference to another content item; resolved by the host's content system |
| `PropertyComponent` | `component` | n/a | Embedded child component, with `allowedComponents` constraint |

## Real-world examples: Story components

### StoryPhoto properties

```javascript
const properties = {
  asset: PropertyAsset({
    title: 'Image',
    description: 'The photo to display. Supports common image formats (JPEG, PNG, WebP).',
    required: true,
    assetTypes: ['image'],
    inspector: {
      helpDescription: 'For best results, use high-quality images at least 1200px wide',
      showLabel: true,
    },
  }),

  caption: PropertyString({
    title: 'Caption',
    description: 'Optional caption text displayed below the image.',
    examples: ['Photo by John Doe / Unsplash', 'The team celebrating the launch'],
    validation: { maxLength: 500 },
    inspector: {
      control: 'multiline',
      numberOfLines: 3,
      placeholder: 'Add a caption (optional)...',
      helpDescription: 'Captions help provide context and improve accessibility',
      showLabel: true,
    },
  }),
}
```

### StoryPhotoGallery properties

```javascript
const properties = {
  title: PropertyString({
    title: 'Gallery Title',
    description: 'Optional title for the photo gallery',
    validation: { maxLength: 100 },
    inspector: { placeholder: 'Enter gallery title...', showLabel: true },
  }),

  photos: PropertyArray({
    title: 'Photos',
    description: 'Collection of photos to display',
    valueType: PropertyComponent({
      title: 'Photo',
      allowedComponents: ['StoryPhoto'],
      environment: { gallery: true, thumbnailSize: 'medium' },
    }),
    validation: { minItems: 1, maxItems: 20 },
    inspector: {
      helpDescription: 'Add between 1 and 20 photos to the gallery',
      showLabel: true,
    },
  }),
}
```

---

## Schema generation and LLM understanding

Every property helper has a deterministic mapping to JSON Schema. A consumer (an inspector form, a validator, an agent) can read a component's `properties` schema and know exactly what a valid props object for that component looks like, without having to execute the body. This is the contract that makes BindJS usable as a target for editor-driven and agent-generated UI, and it is normative in 1.0: a conforming implementation that publishes a schema for a component MUST derive it by the rules in this section, so that every host presents the same interface for the same component. (The derivation is also called the *agent contract*; see [chapter 02](02-agent-surfaces.md).)

### What flows into the generated schema

- **Type structure**: `PropertyString`, `PropertyNumber`, `PropertyInteger`, `PropertyBoolean`, `PropertyEnum`, `PropertyDate`, `PropertyArray`, `PropertyGroup`, `PropertyAsset`, `PropertyContent`, and `PropertyComponent` each emit a corresponding JSON Schema fragment (`{ type: "string" }`, `{ type: "integer" }`, `{ type: "array", items: ... }`, and so on). Nested helpers (for example, `PropertyArray({ valueType: PropertyGroup({...}) })`) compose into nested schema.
- **`title`**: included as the schema's `title`. Used as the field label in editors and as a human-readable identifier for large language model (LLM) consumers.
- **`description`**: included as the schema's `description`. This is where you write the natural-language explanation an LLM (or a developer reading the schema) needs to understand the field's intent. Treat it as the primary documentation surface; it is what an LLM sees when reasoning about whether and how to populate the field.
- **`required` and `defaultValue`**: included as the schema's `required` array entries and `default` values.
- **`validation`**: `minLength`, `maxLength`, `min`, `max`, `pattern`, `minItems`, `maxItems`, and `uniqueItems` flow through as the equivalent JSON Schema constraints.
- **`examples`**: included as the schema's `examples` array, which both editors and LLMs use as concrete guidance.
- **`inspector` hints**: host-specific (control type, placeholder, help text). Editors that adopt them get richer forms; consumers that don't can ignore them.

### Recursive component schemas via `allowedComponents`

`PropertyComponent` declares a slot for a nested component, optionally constrained to a specific set of component types via `allowedComponents`:

```javascript
PropertyComponent({
  title: 'Hero',
  allowedComponents: ['StoryPhoto', 'StoryVideo', 'StoryParagraph'],
})
```

A schema generator can recursively walk this: look up each name in `allowedComponents`, generate a schema for that component's own `properties`, and emit the full set as a `oneOf` (or equivalent) in the parent's schema. Walk repeatedly and you get a schema for an entire component subtree, rooted at any starting component.

The same applies to `PropertyArray({ valueType: PropertyComponent({ allowedComponents: [...] }) })`: the array's `items` schema is the recursive expansion.

### Component instances in props (normative)

A `PropertyComponent` slot (or an array of them) is filled in a props object by a **component instance**: a JSON object whose discriminator fields name the component, followed by that component's own props.

```jsonc
{
  "_type": "ComponentInstance",
  "_component": "StoryParagraph",     // a name in the package (or a Core component)
  "_id": "p1",                        // stable id for state keying and streaming
  "text": "The discovery phase revealed..."
}
```

- The runtime MUST resolve `_component` in the package and call it with the remaining fields as props, recursively; `_type`, `_component`, and `_id` are removed before the call.
- The derived JSON Schema for a slot with `allowedComponents` MUST be a discriminated union on `_component` over the allowed names, each member carrying `_type` fixed to `"ComponentInstance"`, `_id` as a string, and that component's derived schema. Without `allowedComponents` the slot accepts any component in the package.
- **Streaming tolerance.** An object whose `_type` is a strict prefix of `"ComponentInstance"`, or whose `_component` is absent or not yet resolvable, MUST render as nothing and MUST NOT be passed to a component. This is what lets a host render tool input progressively while an agent is still emitting it.
- `_id` SHOULD be unique among siblings; the runtime uses it to key hook state so a re-rendered instance keeps its state across updates.

### Why this matters

The combination of typed properties, `description` as natural-language documentation, and `allowedComponents` as a navigable component graph means a single root component carries enough information for an LLM to generate a valid invocation of the whole subtree, or for a host to validate an LLM's output against the schema before rendering. The BindJS spec defines what each helper contributes; how a host consumes it (inspector forms, MCP tool input validation, LLM prompt augmentation) is implementation-specific.

For one such consumer, an MCP server that generates a tool `inputSchema` from a component's `properties` and validates tool input against it before rendering, see [`bindings/mcp-apps.md`, section 2.4](../bindings/mcp-apps.md#24-tool-input-as-props), and [chapter 02](02-agent-surfaces.md).
