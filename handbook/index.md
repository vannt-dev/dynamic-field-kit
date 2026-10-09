---
layout: home

hero:
  name: Dynamic Field Kit
  text: Forms from a field list
  tagline: Describe the fields once. Render them in React, Vue or Angular with your own components.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Live demos
      link: https://vannt-dev.github.io/dynamic-field-kit/
    - theme: alt
      text: GitHub
      link: https://github.com/vannt-dev/dynamic-field-kit

features:
  - title: One schema, four frameworks
    details: A framework-agnostic core holds the field list, conditions, validation and layout. Thin adapters render it in React, Vue 3, Angular and Svelte 5.
    link: /guide/fields
  - title: Your components, not ours
    details: The kit ships no design system. Register a renderer per field type and every form in the app uses it.
    link: /guide/registries
  - title: Validation and conditions
    details: Built-in validators, async rules, fields that appear, lock or change options depending on other values.
    link: /guide/validation
  - title: Repeatable groups and wizards
    details: '"Add another item" without leaving the schema, and a multi-step engine with per-step validation.'
    link: /guide/groups
  - title: Forms from a JSON Schema
    details: Build the field list, defaults and validators from the schema an API already publishes.
    link: /guide/json-schema
  - title: Drafts and undo
    details: Keep a form across reloads and give it undo and redo, with two small helpers that work in any adapter.
    link: /guide/drafts
---
