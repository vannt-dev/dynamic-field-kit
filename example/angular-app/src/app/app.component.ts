import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MultiFieldInput } from '@dynamic-field-kit/angular';
import {
  FieldDescription,
  validators,
  validateFields,
  validateFieldsAsync,
} from '@dynamic-field-kit/core';
import { DEMO_SOURCES } from './demo-sources';
import { EnterpriseDemoComponent } from './demos/enterprise.component';
import { SchemaDemoComponent } from './demos/schema.component';
import { WizardDemoComponent } from './demos/wizard.component';
import './fieldRegistry';
import { lang, setLang, t } from '../../../shared/i18n';

type Tab = 'legacy' | 'new' | 'enterprise' | 'wizard' | 'schema';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MultiFieldInput,
    EnterpriseDemoComponent,
    WizardDemoComponent,
    SchemaDemoComponent,
  ],
  templateUrl: './app.component.html',
})
export class AppComponent {
  t = t;
  lang = lang;
  setLang = setLang;

  activeTab: Tab = 'legacy';
  showCode = false;

  // The landing page only exists on the deployed site, one level above this
  // app's base path, so link to it absolutely.
  readonly ALL_DEMOS_URL = 'https://vannt-dev.github.io/dynamic-field-kit/';

  readonly tabs: { id: Tab; label: string; title: string; intro: string }[] = [
    {
      id: 'legacy',
      label: t('Basics'),
      title: 'Dynamic Field Kit — Angular',
      intro: t(
        'Registering components with fieldRegistry, dfk-multi-field-input, layouts, computed fields (computeValue) and repeatable groups.',
      ),
    },
    {
      id: 'new',
      label: 'Validation',
      title: t('Validators, dynamic options and conditions'),
      intro: t(
        'Built-in validators (required, email, compose), options that depend on another field, appearCondition / disabledCondition and async validation.',
      ),
    },
    {
      id: 'enterprise',
      label: 'Form state',
      title: t('Form state with createDynamicFormStore'),
      intro: t(
        'The signal store owns data, errors, touched and submit state; DevTools sits in the corner.',
      ),
    },
    {
      id: 'wizard',
      label: 'Wizard',
      title: 'Multi-Step Wizard',
      intro: t(
        'createWizardState, validateStep, goNext / goPrev. State is immutable: every navigation returns a new state.',
      ),
    },
    {
      id: 'schema',
      label: 'JSON Schema + Undo',
      title: t('JSON Schema, drafts and Undo / Redo'),
      intro: t(
        'fieldsFromJsonSchema builds the form from a JSON Schema, createFormDraft keeps the data across reloads, createFormHistory gives undo / redo.',
      ),
    },
  ];

  get current() {
    return this.tabs.find((tab) => tab.id === this.activeTab)!;
  }

  get hasSource(): boolean {
    return Boolean(DEMO_SOURCES[this.activeTab]);
  }

  currentSource(): string {
    return DEMO_SOURCES[this.activeTab] ?? '';
  }

  // 1. Legacy fields
  legacyFields: FieldDescription[] = [
    { name: 'firstName', type: 'text', label: t('First Name') },
    { name: 'lastName', type: 'text', label: t('Last Name') },
    {
      name: 'fullName',
      type: 'text',
      label: t('Full Name (computed)'),
      computeValue: (data) =>
        `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
    },
    { name: 'age', type: 'number', label: t('Age') },
    {
      name: 'contacts',
      type: 'group',
      label: t('Contacts'),
      addLabel: t('Add'),
      removeLabel: t('Remove'),
      className: 'demo-group',
      fields: [
        { name: 'email', type: 'text', label: t('Email') },
        { name: 'phone', type: 'text', label: t('Phone') },
      ],
      defaultItem: { email: '', phone: '' },
      minItems: 0,
      maxItems: 5,
    },
  ];
  legacyData: any = {};

  onLegacyChange(data: any) {
    this.legacyData = data;
  }

  // 2. New features fields
  newFields: FieldDescription[] = [
    {
      name: 'country',
      type: 'select',
      label: t('Country'),
      options: [
        { label: t('Vietnam'), value: 'VN' },
        { label: t('United States'), value: 'US' },
      ],
      validate: validators.required(t('Please choose a country')),
    },
    {
      name: 'city',
      type: 'select',
      label: t('City'),
      options: (data: any) => {
        if (data.country === 'VN') {
          return [
            { label: t('Hanoi'), value: 'HN' },
            { label: t('Ho Chi Minh City'), value: 'HCM' },
            { label: t('Da Nang'), value: 'DN' },
          ];
        }
        if (data.country === 'US') {
          return [
            { label: 'New York', value: 'NY' },
            { label: 'Los Angeles', value: 'LA' },
            { label: 'Chicago', value: 'CHI' },
          ];
        }
        return [];
      },
      disabledCondition: (data: any) => !data.country,
      validate: validators.required(t('Please choose a city')),
    },
    {
      name: 'email',
      type: 'text',
      label: t('Email'),
      placeholder: 'example@domain.com',
      validate: validators.compose(
        validators.required(t('Email is required')),
        validators.email(t('Invalid email format')),
      ),
    },
    {
      name: 'username',
      type: 'text',
      label: 'Username',
      placeholder: t('Enter a username (try "admin")'),
      validate: async (value: any) => {
        if (!value) {
          return t('Username is required');
        }
        if (String(value).toLowerCase() === 'admin') {
          return t('The name "admin" is taken');
        }
        return undefined;
      },
    },
    {
      name: 'enableExtra',
      type: 'select',
      label: t('Show the extra field?'),
      options: [
        { label: t('No'), value: 'no' },
        { label: t('Yes'), value: 'yes' },
      ],
    },
    {
      name: 'note',
      type: 'text',
      label: t('Extra note (appears when "Yes" is chosen)'),
      appearCondition: (data: any) => data.enableExtra === 'yes',
    },
    {
      name: 'lockAll',
      type: 'select',
      label: t('Lock the phone number field?'),
      options: [
        { label: t('Unlocked'), value: 'unlocked' },
        { label: t('Locked (disabled)'), value: 'locked' },
      ],
    },
    {
      name: 'phone',
      type: 'text',
      label: t('Phone number'),
      disabledCondition: (data: any) => data.lockAll === 'locked',
    },
  ];

  newData: any = { country: 'VN' };
  errors: Record<string, string[]> = {};
  newTouched: Record<string, boolean> = {};
  validating = false;

  layout = {
    type: 'responsive' as const,
    mobile: 'column' as const,
    desktop: { type: 'grid' as const, columns: 2, gap: 16 },
  };

  onNewChange(data: any) {
    this.newData = data;
    const res = validateFields(this.newFields, data);
    this.errors = res.errors;
  }

  onNewBlur(name: string) {
    this.newTouched = { ...this.newTouched, [name]: true };
  }

  async handleValidate() {
    this.validating = true;
    // Checking the whole form marks every field as visited.
    this.newTouched = Object.fromEntries(
      this.newFields.map((field) => [field.name, true]),
    );
    const res = await validateFieldsAsync(this.newFields, this.newData);
    this.errors = res.errors;
    this.validating = false;
  }

  hasErrors(): boolean {
    return Object.keys(this.errors).length > 0;
  }
}
