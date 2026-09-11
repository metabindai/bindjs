/**
 * A form built from a tool's `inputSchema`.
 *
 * Worth remembering what these schemas are: for `product_card` and `product_search` the
 * server derived them from the components' `properties` (binding 2.5), so this form is
 * generated from a schema that was itself generated from a component. Nobody wrote it
 * twice, and every host that serves those components would show the same fields.
 *
 * Scalars get a control each. Anything structural — `badges` is an array of a
 * discriminated union over `allowedComponents` — falls back to a JSON box, because a
 * generic form builder that tried to render a `oneOf` would be a bigger thing than this
 * example needs.
 */
import { Box, Checkbox, Code, Flex, Select, Text, TextArea, TextField } from '@radix-ui/themes'

export type JsonSchema = Record<string, any>

export type FieldValues = Record<string, string>

/** Which control a property gets, and how its text turns back into JSON. */
type Kind = 'string' | 'number' | 'integer' | 'boolean' | 'enum' | 'json'

function kindOf(schema: JsonSchema): Kind {
    if (Array.isArray(schema.enum)) {
        return 'enum'
    }

    if (schema.type === 'string' || schema.type === 'number' || schema.type === 'integer' || schema.type === 'boolean') {
        return schema.type
    }

    return 'json'
}

/** The initial text for each field: the schema's default, or an example, or empty. */
export function initialValues(inputSchema: JsonSchema): FieldValues {
    const values: FieldValues = {}

    for (const [name, property] of Object.entries((inputSchema.properties ?? {}) as Record<string, JsonSchema>)) {
        if (property.default !== undefined) {
            values[name] = String(property.default)
        } else if (Array.isArray(property.examples) && property.examples.length > 0) {
            values[name] = String(property.examples[0])
        } else {
            values[name] = ''
        }
    }

    return values
}

/** Field text back to a JSON arguments object. Empty fields are omitted, not sent null. */
export function toArguments(inputSchema: JsonSchema, values: FieldValues): Record<string, unknown> {
    const args: Record<string, unknown> = {}

    for (const [name, property] of Object.entries((inputSchema.properties ?? {}) as Record<string, JsonSchema>)) {
        const raw = (values[name] ?? '').trim()

        if (raw === '') {
            continue
        }

        switch (kindOf(property)) {
            case 'number':
            case 'integer':
                args[name] = Number(raw)
                break
            case 'boolean':
                args[name] = raw === 'true'
                break
            case 'json':
                // Let it throw: a malformed literal should stop the call, not be sent.
                args[name] = JSON.parse(raw)
                break
            default:
                args[name] = raw
        }
    }

    return args
}

interface Props {
    inputSchema: JsonSchema
    values: FieldValues
    onChange: (values: FieldValues) => void
}

export function ToolForm({ inputSchema, values, onChange }: Props) {
    const properties = (inputSchema.properties ?? {}) as Record<string, JsonSchema>
    const required = new Set((inputSchema.required ?? []) as string[])
    const set = (name: string, value: string) => onChange({ ...values, [name]: value })

    if (Object.keys(properties).length === 0) {
        return (
            <Text size="2" color="gray">
                This tool takes no arguments.
            </Text>
        )
    }

    return (
        <Flex direction="column" gap="3">
            {Object.entries(properties).map(([name, property]) => {
                const kind = kindOf(property)

                return (
                    <Box key={name}>
                        <Flex align="baseline" gap="2" mb="1">
                            {/* Ghost, so a form is not a row of chips — but tinted, since
                                `var(--accent-11)` follows whatever accent the Theme sets. */}
                            <Code size="2" variant="ghost" weight="medium" style={{ color: 'var(--accent-11)' }}>
                                {name}
                            </Code>
                            {required.has(name) && (
                                <Text size="1" color="crimson">
                                    required
                                </Text>
                            )}
                            <Text size="1" color="gray">
                                {kind === 'json' ? 'json' : (property.type ?? 'string')}
                            </Text>
                        </Flex>

                        {/* The description is the text the model reasons over, so it is the
                            most useful label this form can show. */}
                        {property.description && (
                            <Text as="p" size="1" color="gray" mb="1">
                                {property.description}
                            </Text>
                        )}

                        {kind === 'enum' ? (
                            <Select.Root value={values[name] || ''} onValueChange={(value) => set(name, value)}>
                                <Select.Trigger placeholder="Choose…" />
                                <Select.Content>
                                    {(property.enum as unknown[]).map((option) => (
                                        <Select.Item key={String(option)} value={String(option)}>
                                            {String(option)}
                                        </Select.Item>
                                    ))}
                                </Select.Content>
                            </Select.Root>
                        ) : kind === 'boolean' ? (
                            <Checkbox
                                checked={values[name] === 'true'}
                                onCheckedChange={(checked) => set(name, checked ? 'true' : 'false')}
                            />
                        ) : kind === 'json' ? (
                            <TextArea
                                size="1"
                                rows={4}
                                spellCheck={false}
                                placeholder="[]"
                                value={values[name] ?? ''}
                                onChange={(event) => set(name, event.target.value)}
                                style={{ fontFamily: 'var(--code-font-family)' }}
                            />
                        ) : (
                            <TextField.Root
                                size="2"
                                placeholder={property.examples?.[0] != null ? String(property.examples[0]) : undefined}
                                value={values[name] ?? ''}
                                onChange={(event) => set(name, event.target.value)}
                            />
                        )}
                    </Box>
                )
            })}
        </Flex>
    )
}
