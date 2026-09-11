/*
 * The entry component of `ui://shop/views/product-search`, and the whole of the tool
 * `product_search`. Same construction as `ProductCard` — a View, an entry component, and a
 * tool derived from it — differing only in the component and in what it takes.
 *
 * Its one property is the query, which is exactly what the model has. The results are the
 * server's, and the component fetches them through the bridge.
 */

const properties = {
    query: PropertyString({
        title: 'Query',
        description: 'What the customer is looking for. Matched against product names and descriptions.',
        required: true,
        examples: ['walnut', 'stoneware', 'linen'],
    }),
}

const body = (props) => {
    const host = useMCPHost()
    const [results, setResults] = useState(null)

    const load = () => {
        if (!host || !props.query) {
            return
        }

        host.toolCall('product_lookup', { query: props.query })
            .then((data) => setResults((data && data.products) || []))
            .catch((error) => host.log('error', 'product_lookup failed', { message: String(error) }))
    }

    const placeholder = Color('secondary').opacity(0.15)

    /** A card per result: thumbnail, then name over price. */
    const row = (result) =>
        HStack({ spacing: 12, alignment: 'center' }, [
            result.image
                ? Image({ url: result.image })
                      .resizable()
                      .scaledToFill()
                      .frame({ width: 56, height: 56 })
                      .clipped()
                      .cornerRadius(10)
                : RoundedRectangle({ cornerRadius: 10 }).fill(placeholder).frame({ width: 56, height: 56 }),

            VStack({ spacing: 3, alignment: 'leading' }, [
                Text(result.name).font('subheadline').fontWeight('semibold').lineLimit(1),
                Text(result.price).font('footnote').foregroundStyle(Color('secondary')),
            ]),

            Spacer(),
        ])
            .padding(10)
            .background(Color('secondary').opacity(0.07))
            .cornerRadius(14)
            .id(result.sku)
            // Picking a result asks the model to open that product. The card it draws is
            // `product_card`, called with this SKU.
            .onTapGesture(() => host && host.sendMessage(`Show me the ${result.name}`))

    /** The same shape with nothing in it, so the list does not jump when it loads. */
    const skeleton = (index) =>
        HStack({ spacing: 12, alignment: 'center' }, [
            RoundedRectangle({ cornerRadius: 10 }).fill(placeholder).frame({ width: 56, height: 56 }),

            VStack({ spacing: 6, alignment: 'leading' }, [
                RoundedRectangle({ cornerRadius: 4 }).fill(placeholder).frame({ maxWidth: 150, height: 13 }),
                RoundedRectangle({ cornerRadius: 4 }).fill(placeholder).frame({ maxWidth: 52, height: 11 }),
            ]),

            Spacer(),
        ])
            .padding(10)
            .background(Color('secondary').opacity(0.07))
            .cornerRadius(14)
            .id(index)

    return VStack({ spacing: 8, alignment: 'leading' }, [
        Text(results ? `${results.length} results for “${props.query}”` : `Searching for “${props.query}”…`)
            .font('subheadline')
            .foregroundStyle(Color('secondary')),

        VStack({ spacing: 8 }, results ? results.map(row) : [0, 1, 2].map(skeleton)),
    ]).onAppear(load)
}

exports.default = defineComponent({
    metadata: {
        title: 'Search results',
        description: 'Search the catalogue and show the matches, each tappable to open its card.',
        category: 'Commerce',
        annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    properties,
    body,
    previews: [Self({ query: 'walnut' }).previewName('Walnut')],
})
