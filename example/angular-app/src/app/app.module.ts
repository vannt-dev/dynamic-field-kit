import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';

// Import adapter components from monorepo source for development
import { DynamicInput } from '@dynamic-field-kit/angular/src/components/DynamicInput';
import { FieldInput } from '@dynamic-field-kit/angular/src/components/FieldInput';
import { MultiFieldInput } from '@dynamic-field-kit/angular/src/components/MultiFieldInput';
import { TextFieldComponent } from '@dynamic-field-kit/angular/src/examples/text-field.component';

@NgModule({
  declarations: [AppComponent, DynamicInput, FieldInput, MultiFieldInput, TextFieldComponent],
  imports: [BrowserModule],
  bootstrap: [AppComponent]
})
export class AppModule {}
