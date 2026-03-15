import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';

// Import adapter components from monorepo source for development
import { DynamicInput, FieldInput, MultiFieldInput } 
  from '@dynamic-field-kit/angular';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, DynamicInput, FieldInput, MultiFieldInput],
  bootstrap: [AppComponent]
})
export class AppModule {}
