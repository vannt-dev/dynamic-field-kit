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
    { name: 'name', type: 'text', label: 'Name' },
    { name: 'age', type: 'number', label: 'Age' },
  ];

  data: any = {};

  onChange(data: any) {
    this.data = data;
    console.log('data', data);
  }
}
