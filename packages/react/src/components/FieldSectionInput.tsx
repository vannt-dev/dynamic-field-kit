import { FieldDescription, Properties } from '@dynamic-field-kit/core';
import React, { useCallback, useMemo } from 'react';
import { sectionPathMap } from '../section';
import MultiFieldInput from './MultiFieldInput';

interface Props {
  fieldDescription: FieldDescription;
  /** The fields of the section. */
  fields: FieldDescription[];
  /** The object the section stores. */
  values: Properties;
  rootData?: Properties;
  errors?: Record<string, string[]>;
  touched?: Record<string, boolean>;
  disabled?: boolean;
  onBlurField?: (key: string) => void;
  onChange: (values: Properties) => void;
}

/**
 * A titled section: one nested form over the object `data[name]`, with the
 * errors, touched flags and blur of its fields keyed `${name}.${childName}`.
 */
const FieldSectionInput = ({
  fieldDescription,
  fields,
  values,
  rootData,
  errors,
  touched,
  disabled,
  onBlurField,
  onChange,
}: Props) => {
  const { name, label, className } = fieldDescription;

  const sectionErrors = useMemo(
    () => sectionPathMap(errors, name),
    [errors, name],
  );
  const sectionTouched = useMemo(
    () => sectionPathMap(touched, name),
    [touched, name],
  );
  const handleBlur = useCallback(
    (key: string) => onBlurField?.(`${name}.${key}`),
    [onBlurField, name],
  );

  // A fieldset names the group for assistive technology through its legend,
  // and disables every control inside it natively.
  return (
    <fieldset className={className} disabled={disabled}>
      {label && <legend>{label}</legend>}
      <MultiFieldInput
        fieldDescriptions={fields}
        properties={values}
        rootData={rootData}
        errors={sectionErrors}
        touched={sectionTouched}
        onBlurField={handleBlur}
        onChange={onChange}
      />
    </fieldset>
  );
};

export default FieldSectionInput;
