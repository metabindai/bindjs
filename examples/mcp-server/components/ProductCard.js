/*
 * The entry component of `ui://shop/views/product-card`, and the whole of the tool
 * `product_card`: `inputSchema` from `properties`, `title` and `description` from
 * `metadata`, annotations from `metadata.annotations` (binding `mcp-apps.md`, 2.5).
 *
 * Every property here is something a model can actually decide — which product, how much
 * room, which badges — so the derivation in 2.5 applies unchanged and there is nothing to
 * filter out. The facts (name, price, image, colours) are not properties at all: the
 * component fetches them itself, through the bridge, once it knows the SKU.
 *
 * Write every `description` for the agent. It is the text a model reasons over when it
 * decides whether and how to fill the field (specification, chapter 11, section 1).
 */

const properties = {
    sku: PropertyString({
        title: 'SKU',
        description: 'Stock keeping unit of the product to show. Get one from `product_search`.',
        required: true,
        examples: ['woven-dusk-throw', 'contour-lounge-chair'],
    }),

    height: PropertyEnum({
        title: 'Height',
        description:
            'How much room the card takes. Use "large" when the product is the subject of the turn, "compact" when it is one of several.',
        options: [
            { value: 'compact', label: 'Compact' },
            { value: 'large', label: 'Large' },
        ],
        defaultValue: 'compact',
    }),

    badges: PropertyArray({
        title: 'Badges',
        description: 'Zero or more badges shown under the title.',
        validation: { maxItems: 3 },
        valueType: PropertyComponent({
            title: 'Badge',
            description: 'A badge to place under the title.',
            allowedComponents: ['SaleBadge', 'NewBadge'],
        }),
    }),
}

const body = (props) => {
    const host = useMCPHost()
    const [product, setProduct] = useState(null)
    const [added, setAdded] = useState(false)

    /*
     * The facts, fetched rather than passed in. `.onAppear` is the canonical place for
     * fetch-on-mount (chapter 08), and `toolCall` resolves to the tool's structured data
     * directly — the runtime unwraps `structuredContent` for us (chapter 05).
     *
     * This is the round trip that a component-declared fetch would remove: the data would
     * arrive with the first render instead of one hop after it.
     */
    const load = () => {
        if (!host || !props.sku) {
            return
        }

        host.toolCall('product_lookup', { sku: props.sku })
            .then((data) => setProduct(((data && data.products) || [])[0] || null))
            .catch((error) => host.log('error', 'product_lookup failed', { message: String(error) }))
    }

    const buy = () => {
        setAdded(true)

        // Every way out of a component is the bridge (binding section 5). `toolCall` is
        // `tools/call`, mediated by the host; `updateModelContext` tells the model what the
        // customer is looking at without spending a turn.
        host.toolCall('add_to_cart', { sku: props.sku }).catch((error) => {
            host.log('error', 'add_to_cart failed', { message: String(error) })
            setAdded(false)
        })

        host.updateModelContext({ selected: props.sku })
    }

    /*
     * Two renders, and the first one has no facts. The props arrive streamed while the
     * model is still writing them (`tool-input-partial`, binding 2.4), so `height` and
     * `badges` lay the card out at its final size before the lookup returns; everything
     * else is a placeholder until it does. "Components MUST tolerate absent props" (2.4)
     * is the rule, and this is what taking it seriously looks like.
     */
    const placeholder = Color('secondary').opacity(0.15)
    const imageHeight = props.height === 'large' ? 220 : 120

    return VStack({ spacing: 12, alignment: 'leading' }, [
        product && product.image
            ? Image({ url: product.image, contentMode: 'fill' })
                .resizable()
                .frame({ height: imageHeight })
                .clipped()
                .cornerRadius(10)
            : RoundedRectangle({ cornerRadius: 10 }).fill(placeholder).frame({ height: imageHeight }),

        VStack({ spacing: 6, alignment: 'leading' }, [
            product
                ? Text(product.name).font('headline').lineLimit(2)
                : RoundedRectangle({ cornerRadius: 4 }).fill(placeholder).frame({ maxWidth: 180, height: 17 }),

            // Model-authored, so these are up in the first render, before the lookup lands.
            // Slot values arrive already resolved: the runtime looked each instance's
            // `_component` up in the package and called it with the remaining fields.
            (props.badges || []).length ? HStack({ spacing: 6 }, props.badges) : Empty(),

            product
                ? PriceTag({ price: product.price })
                : RoundedRectangle({ cornerRadius: 4 }).fill(placeholder).frame({ maxWidth: 64, height: 20 }),

            product && (product.colors || []).length
                ? HStack(
                    { spacing: 4 },
                    product.colors.map((color) =>
                        Circle().fill(Color(color)).frame({ width: 12, height: 12 }).id(color)
                    )
                )
                : Empty(),
        ]),

        // Nothing to buy until the lookup has said what this is.
        Button(added ? 'Added' : 'Buy', buy).disabled(added || !product),
    ])
        .padding(16)
        .background(Color('secondary').opacity(0.12))
        .cornerRadius(14)
        .onAppear(load)
}

exports.default = defineComponent({
    metadata: {
        title: 'Product card',
        description:
            'Show one product with its price, badges, and a buy action. Use after the customer names or picks a product.',
        category: 'Commerce',
        annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    properties,
    body,
    previews: [
        Self({
            sku: 'woven-dusk-throw',
            height: 'large',
            badges: [{ _type: 'ComponentInstance', _component: 'SaleBadge', _id: 'b1', percent: 20 }],
        }).previewName('Large, on sale'),

        Self({ sku: 'sotto-coasters' }).previewName('Compact'),
    ],
})
