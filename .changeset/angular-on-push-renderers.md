---
'@dynamic-field-kit/angular': patch
---

A registered field component that uses `OnPush` change detection now shows the props the form hands it after the first render. They were assigned to the component without marking it for check, so a value the form set itself, such as a computed field, did not show. From Angular 22 every component that names no strategy is `OnPush`, so on 22 this hit every registered field component.
