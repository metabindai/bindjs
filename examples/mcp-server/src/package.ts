/**
 * Building the package document from `components/`.
 *
 * A package (specification, chapter 10) is the unit of distribution and the component
 * allowlist for a render: a name it did not ship has no implementation and renders
 * nothing. On MCP Apps it is a `ui://` resource of type `application/bindjs-package+json`
 * (binding section 2.3).
 *
 * Two details are load-bearing:
 *
 * - **The bytes are the identity.** `sha256` is over the `text` field as served, so the
 *   document is serialized exactly once here and that string is what is hashed, what is
 *   measured, and what is sent. Re-serializing before sending would be a different
 *   document with the same digest claim.
 * - **`name` plus `version` is immutable.** Editing a component under a published version
 *   is not allowed; it is a new version, and on this surface a new resource URI.
 */
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { introspect, type ComponentDeclaration } from './introspect.js'

const COMPONENTS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'components')

/** Names must be JS identifiers, and unique after the runtime's sanitization. */
const COMPONENT_NAME = /^[A-Za-z_$][A-Za-z0-9_$]*$/

export interface BindJSPackage {
    name: string
    version: string
    spec: string
    /** Optional (chapter 10): the component a surface renders when it names none. */
    entry?: string
    /** The exact bytes served as the resource's `text`, and the bytes `sha256` covers. */
    document: string
    sha256: string
    size: number
    /** What each component declared, for deriving tool definitions. */
    declarations: Map<string, ComponentDeclaration>
}

export function buildPackage(options: {
    name: string
    version: string
    spec: string
    entry?: string
}): BindJSPackage {
    const components: Record<string, string> = {}
    const declarations = new Map<string, ComponentDeclaration>()

    // Sorted, so the same sources always produce the same bytes and the same digest.
    for (const file of readdirSync(COMPONENTS_DIR).filter((name) => name.endsWith('.js')).sort()) {
        const name = file.slice(0, -'.js'.length)

        if (!COMPONENT_NAME.test(name)) {
            throw new Error(`${file}: "${name}" is not a valid component name`)
        }

        const source = readFileSync(join(COMPONENTS_DIR, file), 'utf8')

        components[name] = source
        declarations.set(name, introspect(source, name))
    }

    if (options.entry !== undefined && !declarations.has(options.entry)) {
        throw new Error(`entry component "${options.entry}" is not in the package`)
    }

    const document = JSON.stringify(
        {
            name: options.name,
            version: options.version,
            spec: options.spec,
            // Omitted when there is no single default: every View here names its own.
            ...(options.entry === undefined ? {} : { entry: options.entry }),
            components,
        },
        null,
        2
    )

    return {
        ...options,
        document,
        sha256: createHash('sha256').update(document, 'utf8').digest('hex'),
        size: Buffer.byteLength(document, 'utf8'),
        declarations,
    }
}
