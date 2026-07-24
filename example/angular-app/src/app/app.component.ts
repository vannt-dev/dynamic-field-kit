import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MultiFieldInput } from '@dynamic-field-kit/angular';
import { FieldDescription } from '@dynamic-field-kit/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MultiFieldInput],
  templateUrl: './app.component.html',
})
export class AppComponent {
  fields: FieldDescription[] = [
    { name: 'firstName', type: 'text', label: 'First Name' },
    { name: 'lastName', type: 'text', label: 'Last Name' },
    {
      name: 'fullName',
      type: 'text',
      label: 'Full Name (computed)',
      // Derived from the two fields above whenever either one changes.
      computeValue: (data) =>
        `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
    },
    { name: 'age', type: 'number', label: 'Age' },
    {
      name: 'contacts',
      type: 'group',
      label: 'Contacts',
      // Repeatable field group: data.contacts becomes an array of items
      // shaped by these sub-fields, with Add/Remove controls automatic.
      fields: [
        { name: 'email', type: 'text', label: 'Email' },
        { name: 'phone', type: 'text', label: 'Phone' },
      ],
      defaultItem: { email: '', phone: '' },
      minItems: 0,
      maxItems: 5,
    },
  ];

  layout = {
    type: 'responsive' as const,
    mobile: 'column' as const,
    desktop: { type: 'grid' as const, columns: 2, gap: 16 },
  };

  data: any = {};

  onChange(data: any) {
    this.data = data;
    console.log('data', data);
  }
}
