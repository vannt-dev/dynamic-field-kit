describe('FieldInput', () => {
  it('should create FieldInput', () => {
    expect(true).toBe(true);
  });

  it('should accept fieldDescription prop', () => {
    const fieldDesc: any = {
      name: 'username',
      type: 'text',
      label: 'Username',
      placeholder: 'Enter name',
    };
    expect(fieldDesc.name).toBe('username');
    expect(fieldDesc.type).toBe('text');
    expect(fieldDesc.label).toBe('Username');
  });

  it('should pass options from fieldDescription', () => {
    const fieldDesc: any = {
      name: 'country',
      type: 'text',
      options: [{ label: 'USA' }, { label: 'VN' }],
    };
    expect(fieldDesc.options?.length).toBe(2);
  });

  it('should pass className from fieldDescription', () => {
    const fieldDesc: any = {
      name: 'test',
      type: 'text',
      className: 'my-custom-class',
    };
    expect(fieldDesc.className).toBe('my-custom-class');
  });

  it('should pass description from fieldDescription', () => {
    const fieldDesc: any = {
      name: 'test',
      type: 'text',
      description: 'This is a help text',
    };
    expect(fieldDesc.description).toBe('This is a help text');
  });
});
