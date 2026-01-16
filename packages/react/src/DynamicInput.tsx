import { getField } from "./FieldRegistry"

interface Props {
    type: string
    value?: unknown
    onValueChange?: (value: unknown) => void
    isInvalid?: boolean
    messageError?: string
}

const DynamicInput = (props: Props) => {
    const Component = getField(props.type)

    if (!Component) {
        console.warn(`No renderer registered for field type "${props.type}"`)
        return null
    }

    return (
        <Component
            value={props.value}
            onChange={props.onValueChange}
            isInvalid={props.isInvalid}
            messageError={props.messageError}
        />
    )
}

export default DynamicInput
