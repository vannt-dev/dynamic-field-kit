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
  onChange: (items: Properties[]) => void;
}

const FieldGroupInput = ({ fieldDescription, items, onChange }: Props) => {
  const { fields = [], label, addLabel, removeLabel } = fieldDescription;

  const handleItemChange = useCallback(
    (index: number, next: Properties) => {
      const nextItems = items.slice();
      nextItems[index] = next;
      onChange(nextItems);
    },
    [items, onChange]
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
    [fieldDescription, items, onChange]
  );

  return (
    <div className={fieldDescription.className}>
      {label && <div>{label}</div>}
      {items.map((item, index) => (
        <div
          key={index}
          style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}
        >
          <div style={{ flex: 1 }}>
            <MultiFieldInput
              fieldDescriptions={fields}
              properties={item}
              onChange={(next) => handleItemChange(index, next)}
            />
          </div>
          <button
            type="button"
            onClick={() => handleRemove(index)}
            disabled={!canRemoveGroupItem(fieldDescription, items)}
          >
            {removeLabel ?? 'Remove'}
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAdd}
        disabled={!canAddGroupItem(fieldDescription, items)}
      >
        {addLabel ?? 'Add'}
      </button>
    </div>
  );
};

export default FieldGroupInput;
