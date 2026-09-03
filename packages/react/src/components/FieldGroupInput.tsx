import {
  canAddGroupItem,
  canRemoveGroupItem,
  createGroupItem,
  FieldDescription,
  Properties,
} from '@dynamic-field-kit/core';
import React, { useCallback } from 'react';
import MultiFieldInput from './MultiFieldInput';

interface Props {
  fieldDescription: FieldDescription;
  items: Properties[];
  rootData?: Properties;
  errors?: Record<string, string[]>;
  onChange: (items: Properties[]) => void;
}

const FieldGroupInput = ({
  fieldDescription,
  items,
  rootData,
  errors,
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

  const errorsForItem = (index: number) => {
    if (errors === undefined) {
      return undefined;
    }
    const prefix = `${fieldDescription.name}[${index}].`;
    return Object.fromEntries(
      Object.entries(errors)
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, messages]) => [key.slice(prefix.length), messages]),
    );
  };

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
              errors={errorsForItem(index)}
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
