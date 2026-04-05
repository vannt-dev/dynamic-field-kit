import { FieldRendererProps } from '@dynamic-field-kit/core';

export default function TextRenderer({
  value,
  onValueChange,
  className,
}: FieldRendererProps<string>) {
  return (
    <input
      className={className}
      value={(value as string) ?? ''}
      onChange={(e) => onValueChange?.(e.target.value)}
    />
  );
}
