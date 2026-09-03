import {
  canAddGroupItem,
  canRemoveGroupItem,
  createGroupItem,
  FieldDescription,
  indexGroupPathMap,
  Properties,
} from '@dynamic-field-kit/core';
import React, { useCallback, useMemo } from 'react';
import MultiFieldInput from './MultiFieldInput';

/** Shared so an untouched item's `touched` prop keeps a stable identity. */
const EMPTY_TOUCHED: Record<string, boolean> = Object.freeze({});

interface Props {
  fieldDescription: FieldDescription;
  items: Properties[];
  rootData?: Properties;
  errors?: Record<string, string[]>;
  touched?: Record<string, boolean>;
  onBlurField?: (key: string) => void;
  onChange: (items: Properties[]) => void;
}

const FieldGroupInput = ({
  fieldDescription,
  items,
  rootData,
  errors,
  touched,
  onBlurField,
  onChange,
}: Props) => {
  const {
    fields = [],
    label,
    addLabel,
    removeLabel,
    keyField,
  } = fieldDescription;

  const itemKey = (item: Properties, index: number): string | number =>
    keyField ? ((item[keyField] as string | number) ?? index) : index;

  const addText = addLabel ?? 'Add';
  const removeText = removeLabel ?? 'Remove';
  const groupName = label ?? fieldDescription.name;

  const errorsByItem = useMemo(
    () => indexGroupPathMap(errors, fieldDescription.name),
    [errors, fieldDescription.name],
  );
  const touchedByItem = useMemo(
    () => indexGroupPathMap(touched, fieldDescription.name),
    [touched, fieldDescription.name],
  );

  const handleItemChange = useCallback(
    (index: number, next: Properties) => {
      const nextItems = items.slice();
      nextItems[index] = next;
      onChange(nextItems);
    },
    [items, onChange],
  );

  const handleAdd = useCallback(() => {
    if (!canAddGroupItem(fieldDescription, items)) {
      return;
    }
    onChange([...items, createGroupItem(fieldDescription)]);
  }, [fieldDescription, items, onChange]);

  const handleRemove = useCallback(
    (index: number) => {
      if (!canRemoveGroupItem(fieldDescription, items)) {
        return;
      }
      onChange(items.filter((_, i) => i !== index));
    },
    [fieldDescription, items, onChange],
  );

  return (
    <div className={fieldDescription.className}>
      {label && <div>{label}</div>}
      {items.map((item, index) => (
        <div
          key={itemKey(item, index)}
          style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}
        >
          <div style={{ flex: 1 }}>
            <MultiFieldInput
              fieldDescriptions={fields}
              properties={item}
              rootData={rootData}
              errors={errorsByItem?.[index]}
              // An item with no touched keys still has to receive a map, or
              // the nested input reads `undefined` as "uncontrolled" and starts
              // tracking touched on its own - which then survives the owner
              // clearing the map. The constant keeps the prop identity stable.
              touched={
                touched === undefined
                  ? undefined
                  : (touchedByItem?.[index] ?? EMPTY_TOUCHED)
              }
              onBlurField={(key) =>
                onBlurField?.(`${fieldDescription.name}[${index}].${key}`)
              }
              onChange={(next) => handleItemChange(index, next)}
            />
          </div>
          <button
            type="button"
            aria-label={`${removeText} ${groupName} ${index + 1}`}
            onClick={() => handleRemove(index)}
            disabled={!canRemoveGroupItem(fieldDescription, items)}
          >
            {removeText}
          </button>
        </div>
      ))}
      <button
        type="button"
        aria-label={`${addText} ${groupName}`}
        onClick={handleAdd}
        disabled={!canAddGroupItem(fieldDescription, items)}
      >
        {addText}
      </button>
    </div>
  );
};

export default FieldGroupInput;
