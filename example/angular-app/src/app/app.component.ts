import { Component } from '@angular/core';
import { FieldDescription } from '@dynamic-field-kit/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  fields: FieldDescription[] = [
    { name: 'name', type: 'text', label: 'Name' },
    { name: 'age', type: 'number', label: 'Age' }
  ];

  data: any = {};

  onChange(data: any) {
    this.data = data;
    console.log('data', data);
  }
}
