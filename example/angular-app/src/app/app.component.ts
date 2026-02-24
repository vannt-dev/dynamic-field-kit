import { Component } from '@angular/core';
import { FieldDescription } from '@dynamic-field-kit/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  fields: FieldDescription[] = [
    { name: 'name', type: 'text', label: 'Name' }
  ];

  onChange(data: any) {
    console.log('data', data);
  }
}
