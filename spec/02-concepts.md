# BindJS Specification 1.0, chapter 02: Core Concepts and Design

> Part of the BindJS Specification (`metabindai/bindjs`). Normative unless marked informative. Changes go through BEPs (`proposals/`).

## Core Concepts and Design

### Design Philosophy and Principles

BindJS is built around several key principles that guide its design and usage:

1. **Declarative over imperative** — You describe what your UI should look like, not how to build it. This leads to more predictable code that's easier to reason about.

2. **Composition over inheritance** — Complex interfaces are built by combining smaller, reusable components rather than through class inheritance.

3. **Immutability** — Components don't mutate their state directly; instead, they return new state descriptions when changes occur.

4. **Modifier pattern** — Components are customized using chainable modifiers that return new components with updated properties.

5. **Platform independence** — The language abstracts away platform-specific details while ensuring native rendering quality on each target platform.

6. **Functional approach** — Components are primarily functional, focusing on transforming state into UI rather than managing lifecycle methods.

```javascript
// The modifier pattern in action
Text("Hello World")
  .font(24)
  .bold()
  .foregroundStyle(Color("blue"))
  .padding(10)
```

### Custom Components

Reusable components are defined the same way as any other BindJS component: with `defineComponent`, exported as the module default. There is no separate "custom component" primitive — every component is just a `defineComponent` call.

```javascript
const properties = {
  title: PropertyString({ title: 'Button Title', defaultValue: 'Button', required: true }),
}

const body = (props, children) =>
  Button({
    label: Text(props.title).foregroundStyle(Color('white')).fontWeight('bold'),
    action: () => props.onPress?.(),
  })
    .padding(16)
    .background(Color('blue'))
    .cornerRadius(8)

export default defineComponent({
  metadata: { title: 'PrimaryButton' },
  properties,
  body,
})
```

Once published, the component is callable from any other component in the same package:

```javascript
PrimaryButton({ title: 'Save Changes', onPress: () => console.log('Saving…') })
```

### State Management

Use `useState` for component-local state:

```javascript
const body = (props, children) => {
  const [count, setCount] = useState(0)

  return VStack({ spacing: 16 }, [
    Text(`Count: ${count}`).font('headline'),
    Button('Increment', () => setCount(count + 1)),
  ])
}
```

For state shared across components, use `useStore(key, defaultValue, scope?)`.

---