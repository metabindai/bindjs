const properties = {
    price: PropertyString({
        title: 'Price',
        description: 'Formatted price including the currency symbol, e.g. "$120".',
        required: true,
        examples: ['$120', '£99.50'],
        validation: { maxLength: 24 },
    }),

    was: PropertyString({
        title: 'Was',
        description: 'The previous price, struck through beside the current one. Omit when the product is not discounted.',
        examples: ['$150'],
        validation: { maxLength: 24 },
    }),
}

const body = (props) =>
    HStack({ spacing: 6, alignment: 'firstTextBaseline' }, [
        Text(props.price).font('title3').fontWeight('semibold'),

        props.was
            ? Text(props.was).font('subheadline').strikethrough().foregroundStyle(Color('secondary'))
            : Empty(),
    ])

exports.default = defineComponent({
    metadata: {
        title: 'Price tag',
        description: 'A price, optionally with the previous price struck through.',
        category: 'Commerce',
    },
    properties,
    body,
})
