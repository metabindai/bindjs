/*
 * Package source form (specification, chapter 10, section 1): plain JavaScript, no ES
 * module syntax, no TypeScript, the definition assigned to `exports.default`. The bytes
 * of this file are what ships inside the package document, verbatim.
 */

const properties = {
    percent: PropertyInteger({
        title: 'Percent off',
        description: 'Discount as a whole percentage. 20 renders as "20% OFF".',
        required: true,
        examples: [10, 20, 50],
        validation: { min: 1, max: 90 },
    }),
}

const body = (props) =>
    Text(`${props.percent}% OFF`)
        .font('caption')
        .fontWeight('bold')
        .foregroundStyle(Color('white'))
        .padding('horizontal', 8)
        .padding('vertical', 3)
        .background(Color('red'))
        .cornerRadius(6)

exports.default = defineComponent({
    metadata: {
        title: 'Sale badge',
        description: 'Marks a product as discounted by a given percentage.',
        category: 'Commerce',
    },
    properties,
    body,
    previews: [Self({ percent: 20 }).previewName('20% off')],
})
