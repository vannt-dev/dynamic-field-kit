import { FieldDescription, Properties } from '@dynamic-field-kit/core';
import React from 'react';
import DynamicInput from './DynamicInput';

interface Props {
  fieldDescription: FieldDescription;
  renderInfos: Properties;
  onValueChangeField: (value: unknown, key: string) => void;
}

const FieldInput = ({
  fieldDescription,
  renderInfos,
  onValueChangeField,
}: Props) => {
  const { name, type, label, options, className, description } =
    fieldDescription;

  return (
    <DynamicInput
      type={type}
      label={label}
      value={renderInfos[name]}
      options={options}
      className={className}
      description={description as React.ReactNode}
      onChange={(v) => onValueChangeField(v, name)}
    />
  );
};

export default FieldInput;
