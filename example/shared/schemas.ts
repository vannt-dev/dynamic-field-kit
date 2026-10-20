// Field lists for the Storybook, mirroring the ones the example apps define.
// The apps keep theirs inline on purpose: each demo page shows its own source
// next to the running form, so the field list has to be in that file.
//
// Plain data apart from the validators, which come in as an argument: the file
// sits outside every app, and taking `validators` from the caller means it
// imports nothing at runtime that each app would have to resolve from here.

import type {
  FieldDescription,
  FormStep,
  validators as coreValidators,
} from '@dynamic-field-kit/core';
import { t } from './i18n';

export type Validators = typeof coreValidators;

// The registry's field types are open-ended (an app augments `FieldTypeMap`);
// these lists use plain strings, the way an app's own list would.
const list = (fields: unknown[]) => fields as FieldDescription[];

/** One field of every type the built-in renderers know, keyed by type. */
export function fieldTypeSamples(): Record<string, FieldDescription> {
  const options = [
    { label: t('Vietnam'), value: 'VN' },
    { label: t('United States'), value: 'US' },
  ];
  const samples = list([
    { name: 'text', type: 'text', label: t('Full name'), placeholder: 'Ada' },
    { name: 'number', type: 'number', label: t('Age'), min: 0, max: 120 },
    { name: 'password', type: 'password', label: t('Password') },
    {
      name: 'email',
      type: 'email',
      label: t('Email'),
      placeholder: 'example@domain.com',
    },
    { name: 'textarea', type: 'textarea', label: t('Extra note') },
    { name: 'checkbox', type: 'checkbox', label: t('Send me the newsletter') },
    { name: 'select', type: 'select', label: t('Country'), options },
    { name: 'radio', type: 'radio', label: t('Country'), options },
    {
      name: 'range',
      type: 'range',
      label: t('Satisfaction'),
      min: 1,
      max: 10,
      step: 1,
    },
    { name: 'file', type: 'file', label: 'File', accept: 'image/*' },
    { name: 'date', type: 'date', label: t('Date of birth') },
    { name: 'time', type: 'time', label: 'Time' },
    { name: 'datetime-local', type: 'datetime-local', label: 'Date and time' },
    { name: 'switch', type: 'switch', label: t('Send me the newsletter') },
  ]);
  return Object.fromEntries(samples.map((field) => [field.type, field]));
}

/** Basics: plain fields, a computed one and a repeatable group. */
export function basicsFields(): FieldDescription[] {
  return list([
    { name: 'firstName', type: 'text', label: t('First Name') },
    { name: 'lastName', type: 'text', label: t('Last Name') },
    {
      name: 'fullName',
      type: 'text',
      label: t('Full Name (computed)'),
      // Derived from the two fields above whenever either one changes.
      computeValue: (data: Record<string, unknown>) =>
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
      // Repeatable field group: data.contacts becomes an array of items shaped
      // by these sub-fields, with Add/Remove controls rendered automatically.
      fields: [
        { name: 'email', type: 'text', label: t('Email') },
        { name: 'phone', type: 'text', label: t('Phone') },
      ],
      defaultItem: { email: '', phone: '' },
      minItems: 0,
      maxItems: 5,
    },
  ]);
}

/** Form state: the HTML5 renderers with a couple of rules. */
export function formStateFields(validators: Validators): FieldDescription[] {
  return list([
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
      name: 'email',
      type: 'email',
      label: t('Email'),
      placeholder: 'example@domain.com',
      validate: validators.compose(
        validators.required(t('Email is required')),
        validators.email(t('Invalid email format')),
      ),
    },
    {
      name: 'gender',
      type: 'radio',
      label: t('Gender'),
      options: [
        { label: t('Male'), value: 'male' },
        { label: t('Female'), value: 'female' },
        { label: t('Other'), value: 'other' },
      ],
    },
    {
      name: 'birthDate',
      type: 'date',
      label: t('Date of birth'),
    },
    {
      name: 'satisfaction',
      type: 'range',
      label: t('Satisfaction'),
      min: 1,
      max: 10,
      step: 1,
    },
    {
      name: 'subscribeNewsletter',
      type: 'switch',
      label: t('Send me the newsletter'),
    },
  ]);
}

/** Validation and conditions: options from another field, hidden and locked fields. */
export function conditionFields(validators: Validators): FieldDescription[] {
  return list([
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
      // Options that depend on another field.
      options: (data: Record<string, unknown>) =>
        data.country === 'VN'
          ? [
              { label: t('Hanoi'), value: 'HN' },
              { label: t('Ho Chi Minh City'), value: 'HCM' },
            ]
          : data.country === 'US'
            ? [
                { label: 'New York', value: 'NY' },
                { label: 'Chicago', value: 'CHI' },
              ]
            : [],
      disabledCondition: (data: Record<string, unknown>) => !data.country,
      validate: validators.required(t('Please choose a city')),
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
      appearCondition: (data: Record<string, unknown>) =>
        data.enableExtra === 'yes',
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
      disabledCondition: (data: Record<string, unknown>) =>
        data.lockAll === 'locked',
    },
  ]);
}

/** The three steps of the wizard demo. */
export function wizardSteps(validators: Validators): FormStep[] {
  return [
    {
      id: 'account',
      title: t('Account'),
      fields: list([
        {
          name: 'email',
          type: 'email',
          label: t('Email'),
          placeholder: 'example@domain.com',
          validate: validators.compose(
            validators.required(t('Email is required')),
            validators.email(t('Invalid email format')),
          ),
        },
        {
          name: 'password',
          type: 'password',
          label: t('Password'),
          validate: validators.compose(
            validators.required(t('Password is required')),
            validators.minLength(8, t('At least 8 characters')),
          ),
        },
      ]),
    },
    {
      id: 'profile',
      title: t('Profile'),
      fields: list([
        {
          name: 'fullName',
          type: 'text',
          label: t('Full name'),
          validate: validators.required(t('Full name is required')),
        },
        {
          name: 'birthDate',
          type: 'date',
          label: t('Date of birth'),
        },
      ]),
    },
    {
      id: 'preferences',
      title: t('Preferences'),
      fields: list([
        {
          name: 'plan',
          type: 'radio',
          label: t('Plan'),
          options: [
            { label: t('Free'), value: 'free' },
            { label: 'Pro', value: 'pro' },
          ],
          validate: validators.required(t('Please choose a plan')),
        },
        {
          name: 'newsletter',
          type: 'switch',
          label: t('Send me the newsletter'),
        },
      ]),
    },
  ];
}
