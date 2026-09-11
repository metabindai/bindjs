/**
 * An MCP server that serves BindJS Views.
 *
 * Everything here is the wire shape in `bindings/mcp-apps.md`, so the handlers are the
 * low-level ones rather than `McpServer`'s helpers, and the resources and tools are
 * written out as literals: the point of the example is the exact JSON, `_meta` blocks
 * included, and that reads better spelled out than generated.
 *
 * Three kinds of tool:
 *
 * - `product_card` and `product_search` are **View-channel** tools (binding 2.4). Each
 *   points at a View, and its arguments *are* that View's entry component's props,
 *   streamed to the component as the model writes them. Each is derived whole from its
 *   component (2.5) — nothing is hand-written and nothing is filtered out, because every
 *   property is something a model can actually decide. Neither returns UI: the call
 *   answers with a line for the transcript.
 * - `product_lookup` is an ordinary data tool with no View. The components call it through
 *   the bridge once they have rendered, and it is where the facts come from.
 * - `add_to_cart` is the action the card calls when the customer taps Buy.
 *
 * The lookup hop is the interesting part. `product_lookup` returns exactly what
 * `ProductCard` and `SearchResults` need, one render after they first appear. A component
 * that could declare its own fetch would receive that same payload with the first render
 * instead, and this tool would not need to exist.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
    CallToolRequestSchema,
    ListResourcesRequestSchema,
    ListToolsRequestSchema,
    ReadResourceRequestSchema,
    type CallToolResult,
    type Tool,
} from '@modelcontextprotocol/sdk/types.js'

import { buildPackage } from './package.js'
import { objectSchema, type Lookup } from './schema.js'

/** The View content type this server serves. Registered for MCP Apps by the binding. */
const VIEW_MIME_TYPE = 'application/bindjs+json'

/** The package content type (specification, chapter 10; binding section 2.3). */
const PACKAGE_MIME_TYPE = 'application/bindjs-package+json'

/** The MCP Apps capability a host declares in `initialize` to say what it renders. */
const UI_EXTENSION = 'io.modelcontextprotocol/ui'

const PACKAGE_URI = 'ui://shop/packages/product-ui@12'

/**
 * Where the product images are served from.
 *
 * They are bundled in `data/images` and served by the HTTP entry point, so the example
 * has no external dependency and nothing to rot. This origin is also what the Views
 * allowlist in `csp.resourceDomains`, so the allowlist and the images are one fact.
 *
 * Point it elsewhere with `ASSET_ORIGIN` — over stdio, where nothing is serving `/assets`,
 * that is the way to make the images resolve.
 */
const ASSET_ORIGIN = process.env.ASSET_ORIGIN ?? 'http://localhost:8787'

const API_ORIGIN = 'https://api.shop.example'

/*
 * No `entry`. It is optional (specification, chapter 10), and it is the component a
 * surface renders when it names none — but both Views here name their own, so a default
 * would only pick a winner between them for no reason.
 */
const bindjs = buildPackage({ name: 'com.shop.product-ui', version: '12.0.0', spec: '1.0' })

const lookup: Lookup = (name) => bindjs.declarations.get(name)

/**
 * A View's `_meta.ui.bindjs` (binding section 3).
 *
 * It goes on the listing *and* on the `resources/read` content item, because a host can
 * arrive either way: `resources/list`, or straight from a tool's `_meta.ui.resourceUri`
 * to `resources/read`. Section 2.1 requires exactly one of an inline `package` or this
 * `package` reference to be present, and the View document carries no inline package, so
 * a read without this block would hand back a View whose package cannot be found.
 *
 * `sha256` and `size` describe the *package*, not the View. On the listing they duplicate
 * what the package's own entry already says; on a read they are the only copy.
 */
function viewMeta(component: string) {
    return {
        spec: bindjs.spec,
        component,
        package: PACKAGE_URI,
        sha256: bindjs.sha256,
        size: bindjs.size,
    }
}

/**
 * A View names an entry component (binding 2.1), so each rendering tool gets its own.
 * What they share is the package: both reference `ui://shop/packages/product-ui@12`, so a
 * host fetches and verifies those bytes once. The View is the entry point; the package is
 * the implementation.
 */
const VIEWS = [
    { uri: 'ui://shop/views/product-card', title: 'Product card', component: 'ProductCard', tool: 'product_card' },
    { uri: 'ui://shop/views/product-search', title: 'Search results', component: 'SearchResults', tool: 'product_search' },
]

for (const view of VIEWS) {
    // A View naming a component the package did not ship renders nothing and is logged by
    // the host (chapter 09). Better to fail here, at startup, than to serve it.
    if (!bindjs.declarations.has(view.component)) {
        throw new Error(`${view.uri} names "${view.component}", which the package does not ship`)
    }
}

/**
 * The catalogue, standing in for a product database.
 *
 * Six real rows from a Metabind content project, trimmed to what a card needs. Enough
 * that a search filters rather than always returning everything: "walnut" matches three,
 * "table" and "chair" two each.
 */
interface Product {
    sku: string
    name: string
    /** Bare decimal, as the catalogue stores it. Formatted for display by `money`. */
    price: string
    colors: string[]
    /** A file in `data/images`, resolved against `ASSET_ORIGIN` when it goes out. */
    image: string
    description: string
}

const CATALOG: Product[] = JSON.parse(
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'products.json'), 'utf8')
)

/** `"119.00"` to `"$119"`, dropping the cents when they are zero. */
function money(price: string): string {
    return `$${price.replace(/\.00$/, '')}`
}

/** What `product_lookup` hands back, and what the components render. */
function row(product: Product) {
    return {
        sku: product.sku,
        name: product.name,
        price: money(product.price),
        description: product.description,
        colors: product.colors,
        image: `${ASSET_ORIGIN}/assets/${product.image}`,
    }
}

function text(body: string): CallToolResult {
    return { content: [{ type: 'text', text: body }] }
}

export function createServer(): Server {
    const server = new Server(
        // The server's own version, not the package's — they move independently.
        { name: 'bindjs-product-ui', version: '1.0.0' },
        { capabilities: { tools: {}, resources: {} } }
    )

    /**
     * Host negotiation.
     *
     * The host says what it renders in `initialize`, as MIME types under the MCP Apps
     * extension. This server has one representation of each View, so a host that did not
     * ask for `application/bindjs+json` gets the tools without any UI attached rather than
     * Views it cannot draw. A production server would list the same Views a second time as
     * `text/html;profile=mcp-app` and let the host pick.
     */
    const rendersBindJS = (): boolean => {
        const extension = server.getClientCapabilities()?.extensions?.[UI_EXTENSION] as
            | { mimeTypes?: unknown }
            | undefined

        return Array.isArray(extension?.mimeTypes) && extension.mimeTypes.includes(VIEW_MIME_TYPE)
    }

    /**
     * The two Views and the package they share.
     *
     * Every field in `_meta.ui.bindjs` is something the host can act on *before* it fetches
     * anything: whether it supports the specification major, whether it already holds this
     * package at this digest (then it skips the read), and whether it accepts a package it
     * did not bundle at all.
     */
    server.setRequestHandler(ListResourcesRequestSchema, async () => ({
        resources: rendersBindJS()
            ? [
                  ...VIEWS.map((view) => ({
                      uri: view.uri,
                      name: view.component,
                      title: view.title,
                      mimeType: VIEW_MIME_TYPE,
                      _meta: {
                          ui: {
                              // The host MUST hold the View to these when it loads assets
                              // or calls out. `product_lookup` goes through the bridge, so
                              // it needs no origin here.
                              csp: { connectDomains: [API_ORIGIN], resourceDomains: [ASSET_ORIGIN] },

                              bindjs: viewMeta(view.component),
                          },
                      },
                  })),

                  {
                      uri: PACKAGE_URI,
                      name: `${bindjs.name} ${bindjs.version}`,
                      title: 'Product UI package',
                      mimeType: PACKAGE_MIME_TYPE,
                      _meta: {
                          ui: {
                              bindjs: {
                                  spec: bindjs.spec,
                                  name: bindjs.name,
                                  version: bindjs.version,
                                  sha256: bindjs.sha256,
                                  size: bindjs.size,
                              },
                          },
                      },
                  },
              ]
            : [],
    }))

    server.setRequestHandler(ReadResourceRequestSchema, async ({ params }) => {
        const view = VIEWS.find((candidate) => candidate.uri === params.uri)

        // The View document (binding 2.1): the entry component, and the package by
        // reference. A server MAY inline the package instead, at the cost of a digest to
        // verify against and of sharing the package between Views — which is what these do.
        if (view) {
            return {
                contents: [
                    {
                        uri: view.uri,
                        mimeType: VIEW_MIME_TYPE,
                        text: JSON.stringify({ spec: bindjs.spec, component: view.component }),
                        _meta: { ui: { bindjs: viewMeta(view.component) } },
                    },
                ],
            }
        }

        // The package document (binding 2.3). `bindjs.document` is sent verbatim rather
        // than re-serialized: the `sha256` in `_meta` is over exactly these bytes, and the
        // host checks it before it executes anything. Re-serializing here would produce an
        // equivalent object and a different string, and the check would fail.
        if (params.uri === PACKAGE_URI) {
            return {
                contents: [
                    {
                        uri: PACKAGE_URI,
                        mimeType: PACKAGE_MIME_TYPE,
                        text: bindjs.document,
                    },
                ],
            }
        }

        throw new Error(`Unknown resource: ${params.uri}`)
    })

    server.setRequestHandler(ListToolsRequestSchema, async () => {
        const renderable = rendersBindJS()

        return {
            tools: [
                /*
                 * One tool per View, derived whole from that View's entry component
                 * (binding 2.5): `inputSchema` from `properties` run through the
                 * specification's derivation, `title` and `description` from `metadata`,
                 * annotations from `metadata.annotations`. Nothing is overridden, so the
                 * interface an agent sees is the same on every host that serves these
                 * components — including the union over `allowedComponents` for `badges`.
                 */
                ...VIEWS.map((view): Tool => {
                    const component = bindjs.declarations.get(view.component)!

                    return {
                        name: view.tool,
                        title: component.metadata.title,
                        description: component.metadata.description,
                        inputSchema: objectSchema(component.properties, lookup) as Tool['inputSchema'],
                        annotations: component.metadata.annotations,

                        // Without this the host has nothing to render into, so on a host
                        // that did not negotiate the type the tool is still callable — it
                        // just answers in prose.
                        ...(renderable ? { _meta: { ui: { resourceUri: view.uri } } } : {}),
                    }
                }),

                /*
                 * The data tool, with no View of its own. The rendered components call it
                 * through the bridge — `useMCPHost().toolCall('product_lookup', …)` becomes
                 * an ordinary `tools/call`, mediated by the host, so a View cannot reach a
                 * tool the iframe path could not reach (binding section 7).
                 *
                 * It declares an `outputSchema`, which is what lets the runtime hand the
                 * component `structuredContent` directly rather than a parsed text blob.
                 */
                {
                    name: 'product_lookup',
                    title: 'Look up products',
                    description:
                        'Fetch catalogue rows by SKU or by search query. Backs the rendered UI; also usable directly.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            sku: { type: 'string', description: 'Return just this product.' },
                            query: {
                                type: 'string',
                                description: 'Return every product whose name or description matches.',
                            },
                        },
                    },
                    outputSchema: {
                        type: 'object',
                        properties: {
                            products: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        sku: { type: 'string' },
                                        name: { type: 'string' },
                                        price: { type: 'string' },
                                        description: { type: 'string' },
                                        colors: { type: 'array', items: { type: 'string' } },
                                        image: { type: 'string', format: 'uri' },
                                    },
                                    required: ['sku', 'name', 'price', 'description', 'colors', 'image'],
                                },
                            },
                        },
                        required: ['products'],
                    },
                    annotations: { readOnlyHint: true, idempotentHint: true },
                },

                {
                    name: 'add_to_cart',
                    title: 'Add to cart',
                    description: 'Add a product to the customer’s cart.',
                    inputSchema: {
                        type: 'object',
                        properties: { sku: { type: 'string', description: 'The product’s stock keeping unit.' } },
                        required: ['sku'],
                    },
                    annotations: { readOnlyHint: false, idempotentHint: false },
                },
            ],
        }
    })

    server.setRequestHandler(CallToolRequestSchema, async ({ params }): Promise<CallToolResult> => {
        const args = (params.arguments ?? {}) as Record<string, any>

        /*
         * A View-channel tool returns nothing for the UI. The arguments the host already
         * validated against `inputSchema` are on their way to the entry component as its
         * props, over `ui/notifications/tool-input` — so this is only the model's side of
         * the transcript.
         */
        if (params.name === 'product_card') {
            const found = CATALOG.find((candidate) => candidate.sku === args.sku)

            if (!found) {
                return { ...text(`No product with SKU ${args.sku}.`), isError: true }
            }

            return text(`Showing the ${found.name} card.`)
        }

        if (params.name === 'product_search') {
            return text(`Showing results for ${JSON.stringify(String(args.query ?? ''))}.`)
        }

        if (params.name === 'product_lookup') {
            const needle = String(args.query ?? '').trim().toLowerCase()

            const products = args.sku
                ? CATALOG.filter((candidate) => candidate.sku === args.sku)
                : needle === ''
                  ? []
                  : CATALOG.filter(
                        (candidate) =>
                            candidate.name.toLowerCase().includes(needle) ||
                            candidate.description.toLowerCase().includes(needle)
                    )

            const data = { products: products.map(row) }

            // `content` carries the same object serialized, as MCP asks when a tool
            // declares an `outputSchema`.
            return { content: [{ type: 'text', text: JSON.stringify(data) }], structuredContent: data }
        }

        if (params.name === 'add_to_cart') {
            const found = CATALOG.find((candidate) => candidate.sku === args.sku)

            if (!found) {
                return { ...text(`No product with SKU ${args.sku}.`), isError: true }
            }

            return text(`Added ${found.name} (${money(found.price)}) to the cart.`)
        }

        throw new Error(`Unknown tool: ${params.name}`)
    })

    return server
}

export { PACKAGE_URI, VIEWS, VIEW_MIME_TYPE, bindjs }
