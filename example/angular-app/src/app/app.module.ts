import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { DynamicFieldKitModule } from '@dynamic-field-kit/angular';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, DynamicFieldKitModule],
  bootstrap: [AppComponent],
})
export class AppModule {}
