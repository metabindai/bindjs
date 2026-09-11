const properties = {}

const body = () =>
    Text('NEW')
        .font('caption')
        .fontWeight('bold')
        .foregroundStyle(Color('white'))
        .padding('horizontal', 8)
        .padding('vertical', 3)
        .background(Color('blue'))
        .cornerRadius(6)

exports.default = defineComponent({
    metadata: {
        title: 'New badge',
        description: 'Marks a product as newly listed. Takes no properties.',
        category: 'Commerce',
    },
    properties,
    body,
})
