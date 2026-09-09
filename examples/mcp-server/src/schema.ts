/**
 * Deriving JSON Schema from a component's `properties`.
 *
 * This is the agent contract (specification, chapter 03, "Schema Generation and LLM
 * Understanding", and chapter 11, section 1). The derivation is normative: a host that
 * publishes a schema for a component MUST derive it by these rules, so that every host
 * presents the same interface for the same component. Here the schema becomes an MCP
 * tool's `inputSchema` (binding `mcp-apps.md`, section 2.5).
 *
 * Nothing in here executes a component. The schema is what an agent can be told about a
 * component without running it, which is exactly the point.
 */
import type { ComponentDeclaration, PropertyDeclaration } from './introspect.js'

export type JsonSchema = Record<string, unknown>

/** Resolves a component name against the package, for `allowedComponents` recursion. */
export type Lookup = (name: string) => ComponentDeclaration | undefined

/** `title`, `description`, `default`, and `examples` flow through from every helper. */
function base(property: PropertyDeclaration): JsonSchema {
    const schema: JsonSchema = {}

    if (property.title !== undefined) {
        schema.title = property.title
    }

    if (property.description !== undefined) {
        schema.description = property.description
    }

    if (property.defaultValue !== undefined) {
        schema.default = property.defaultValue
    }

    if (Array.isArray(property.examples) && property.examples.length > 0) {
        schema.examples = property.examples
    }

    return schema
}

/** Copies the validation rules a helper accepts onto their JSON Schema equivalents. */
function withValidation(schema: JsonSchema, property: PropertyDeclaration, mapping: Record<string, string>): JsonSchema {
    const validation = property.validation ?? {}

    for (const [rule, keyword] of Object.entries(mapping)) {
        if (validation[rule] !== undefined) {
            schema[keyword] = validation[rule]
        }
    }

    return schema
}

const STRING_FORMATS: Record<string, string> = { email: 'email', url: 'uri' }

/**
 * A component instance (specification, chapter 03, "Component instances in props"): the
 * discriminator fields that name the component, followed by that component's own props.
 */
function instanceSchema(name: string, lookup: Lookup, seen: Set<string>): JsonSchema {
    const declaration = lookup(name)

    if (!declaration) {
        throw new Error(`allowedComponents names "${name}", which the package does not ship`)
    }

    const discriminators: JsonSchema = {
        _type: { const: 'ComponentInstance' },
        _component: { const: name },
        _id: { type: 'string', description: 'Stable id, unique among siblings. Keys the instance’s state across updates.' },
    }

    // A component that can contain itself would otherwise expand forever. Stopping at the
    // discriminators keeps the schema finite and still names what is allowed there.
    if (seen.has(name)) {
        return {
            type: 'object',
            title: declaration.metadata.title ?? name,
            description: `${name}, nested recursively. Same properties as above.`,
            properties: discriminators,
            required: ['_type', '_component', '_id'],
        }
    }

    const nested = objectSchema(declaration.properties, lookup, new Set(seen).add(name))

    const schema: JsonSchema = {
        type: 'object',
        properties: { ...discriminators, ...(nested.properties as JsonSchema) },
        required: ['_type', '_component', '_id', ...((nested.required as string[]) ?? [])],
    }

    if (declaration.metadata.title !== undefined) {
        schema.title = declaration.metadata.title
    }

    if (declaration.metadata.description !== undefined) {
        schema.description = declaration.metadata.description
    }

    return schema
}

/** One property helper to one JSON Schema fragment. */
export function deriveProperty(property: PropertyDeclaration, lookup: Lookup, seen: Set<string> = new Set()): JsonSchema {
    const schema = base(property)

    switch (property.kind) {
        case 'string': {
            const format = STRING_FORMATS[String(property.validation?.format ?? '')]

            if (format !== undefined) {
                schema.format = format
            }

            return withValidation({ type: 'string', ...schema }, property, {
                minLength: 'minLength',
                maxLength: 'maxLength',
                pattern: 'pattern',
            })
        }

        case 'number':
            return withValidation({ type: 'number', ...schema }, property, { min: 'minimum', max: 'maximum' })

        case 'integer':
            return withValidation({ type: 'integer', ...schema }, property, { min: 'minimum', max: 'maximum' })

        case 'boolean':
            return { type: 'boolean', ...schema }

        case 'enum': {
            // Options are bare values, or objects carrying `value` plus a label or icon.
            const values = (property.options ?? []).map((option) =>
                option !== null && typeof option === 'object' ? (option as { value: unknown }).value : option
            )

            return {
                type: values.every((value) => typeof value === 'number') ? 'number' : 'string',
                ...schema,
                enum: values,
            }
        }

        case 'date':
            // `minDate` / `maxDate` have no keyword in core JSON Schema; they are carried
            // as the format-annotation keywords a validator with date support understands.
            return withValidation({ type: 'string', format: 'date', ...schema }, property, {
                minDate: 'formatMinimum',
                maxDate: 'formatMaximum',
            })

        case 'array': {
            if (!property.valueType) {
                throw new Error('PropertyArray without a valueType has no item schema')
            }

            return withValidation({ type: 'array', ...schema, items: deriveProperty(property.valueType, lookup, seen) }, property, {
                minItems: 'minItems',
                maxItems: 'maxItems',
                uniqueItems: 'uniqueItems',
            })
        }

        case 'group':
            return { ...schema, ...objectSchema(property.properties ?? {}, lookup, seen) }

        case 'component': {
            const allowed = property.allowedComponents ?? []

            // Without `allowedComponents` the slot accepts any component in the package,
            // so the schema can only name the discriminators.
            if (allowed.length === 0) {
                return {
                    type: 'object',
                    ...schema,
                    properties: {
                        _type: { const: 'ComponentInstance' },
                        _component: { type: 'string', description: 'Any component name in the package.' },
                        _id: { type: 'string' },
                    },
                    required: ['_type', '_component', '_id'],
                }
            }

            return { ...schema, oneOf: allowed.map((name) => instanceSchema(name, lookup, seen)) }
        }

        case 'asset':
        case 'content':
            /*
             * Host-defined (chapter 03, Property Type Reference): the value an agent would
             * write is an identifier the host resolves against its own asset or content
             * system, so there is no portable schema for it. A component meant to be called
             * by an agent is better off with a plain URL — see `ProductCard.imageUrl`.
             */
            return {
                type: 'string',
                ...schema,
                description: `${property.description ?? ''} (${property.kind} identifier; resolution is host-defined)`.trim(),
            }

        default:
            throw new Error(`unknown property kind: ${String(property.kind)}`)
    }
}

/** A `properties` map to an object schema, with `required` collected from the members. */
export function objectSchema(
    properties: Record<string, PropertyDeclaration>,
    lookup: Lookup,
    seen: Set<string> = new Set()
): JsonSchema {
    const derived: JsonSchema = {}
    const required: string[] = []

    for (const [name, property] of Object.entries(properties)) {
        derived[name] = deriveProperty(property, lookup, seen)

        if (property.required === true) {
            required.push(name)
        }
    }

    const schema: JsonSchema = { type: 'object', properties: derived }

    if (required.length > 0) {
        schema.required = required
    }

    return schema
}
