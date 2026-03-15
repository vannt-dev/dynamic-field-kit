import 'zone.js';

// Ensure example registrations run on startup
import '@dynamic-field-kit/angular';

// Register custom field types (text, number) with the shared fieldRegistry
import './app/fieldRegistry';

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.error(err));
