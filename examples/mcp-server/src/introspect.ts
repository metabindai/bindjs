/**
 * Reading a component's declaration without a BindJS runtime.
 *
 * The tool definition is derived from the entry component (binding `mcp-apps.md`,
 * section 2.5), which means the server needs the component's `metadata` and `properties`.
 * It does not need to render anything, so it does not need a runtime: `properties` and
 * `metadata` are plain data built at the top level of the module, and `body` — the only
 * part that touches the component API — is never called.
 *
 * So we evaluate the package source with stand-in globals. The property helpers return
 * their own options tagged with a kind; `defineComponent` returns its argument; anything
 * else resolves to a chainable no-op, so a source that calls `Self(...)` in `previews` or
 * decorates a preview with `.previewName(...)` evaluates without a component API present.
 *
 * This is deliberately not a sandbox. The sources here are ours, read off local disk. A
 * server that accepted component sources from elsewhere would need the isolation of
 * binding section 4 — and at that point it would have a runtime anyway.
 */

/** A property helper's options, tagged with which helper produced them. */
export interface PropertyDeclaration {
    kind: PropertyKind
    title?: string
    description?: string
    required?: boolean
    defaultValue?: unknown
    examples?: unknown[]
    validation?: Record<string, unknown>
    options?: unknown[]
    valueType?: PropertyDeclaration
    properties?: Record<string, PropertyDeclaration>
    allowedComponents?: string[]
    assetTypes?: string[]
}

export type PropertyKind =
    | 'string'
    | 'number'
    | 'integer'
    | 'boolean'
    | 'enum'
    | 'date'
    | 'array'
    | 'group'
    | 'asset'
    | 'content'
    | 'component'

export interface ComponentMetadata {
    title?: string
    description?: string
    category?: string
    /** Mirrors MCP's tool annotations; the server copies them onto the tool. */
    annotations?: Record<string, boolean>
}

export interface ComponentDeclaration {
    metadata: ComponentMetadata
    properties: Record<string, PropertyDeclaration>
}

const PROPERTY_HELPERS: Record<string, PropertyKind> = {
    PropertyString: 'string',
    PropertyNumber: 'number',
    PropertyInteger: 'integer',
    PropertyBoolean: 'boolean',
    PropertyEnum: 'enum',
    PropertyDate: 'date',
    PropertyArray: 'array',
    PropertyGroup: 'group',
    PropertyAsset: 'asset',
    PropertyContent: 'content',
    PropertyComponent: 'component',
}

/**
 * A callable that swallows any call and any property access, and returns itself.
 *
 * Returning the proxy from both traps is what makes chains work: `Self({...})` and
 * `Self({...}).previewName('Default')` both land back here. Well-known symbols are the
 * exception — answering them with a callable would make the value look iterable, or
 * thenable, to code that checks.
 */
function inert(): unknown {
    const proxy: unknown = new Proxy(() => undefined, {
        get: (_target, key) => {
            if (typeof key === 'symbol') {
                return undefined
            }

            return key === 'toString' ? () => '' : proxy
        },
        apply: () => proxy,
        construct: () => proxy as object,
    })

    return proxy
}

function globalsFor(exports: { default?: unknown }): Record<string | symbol, unknown> {
    const globals: Record<string, unknown> = {
        exports,
        module: { exports },
        console,
        defineComponent: (definition: unknown) => definition,
        defineButtonStyle: (definition: unknown) => definition,
    }

    for (const [helper, kind] of Object.entries(PROPERTY_HELPERS)) {
        globals[helper] = (options: Record<string, unknown> = {}) => ({ kind, ...options })
    }

    return globals
}

/**
 * Evaluates one package source and returns what it declared.
 *
 * The `with` block is what lets an unresolved identifier fall through to the proxy rather
 * than throwing, so a source may reference component names we know nothing about.
 */
export function introspect(source: string, name: string): ComponentDeclaration {
    const exports: { default?: unknown } = {}
    const globals = globalsFor(exports)

    const scope = new Proxy(globals, {
        has: () => true,
        get: (target, key) => {
            // `with` consults this before every lookup; returning a truthy value would
            // hide every name in the block from the proxy.
            if (key === Symbol.unscopables) {
                return undefined
            }

            return key in target ? target[key as string] : inert()
        },
    })

    const evaluate = new Function('__scope', `with (__scope) { ${source}\n}`)

    try {
        evaluate(scope)
    } catch (error) {
        throw new Error(`${name}: could not evaluate the package source: ${(error as Error).message}`)
    }

    const declaration = exports.default as ComponentDeclaration | undefined

    if (!declaration || typeof declaration !== 'object') {
        throw new Error(`${name}: the source did not assign a definition to exports.default`)
    }

    return {
        metadata: declaration.metadata ?? {},
        properties: declaration.properties ?? {},
    }
}
