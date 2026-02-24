// Public API surface for the Angular package (used by ng-packagr)
export * from './components/DynamicInput'
export * from './components/FieldInput'
export * from './components/MultiFieldInput'
export * from './layout'
export * from './types/layout'
export * from './lib/dynamic-field-kit.module'

// Ensure default registrations run when library is imported
import './registerDefaults'
