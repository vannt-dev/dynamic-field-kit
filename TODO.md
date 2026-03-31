# Clean up Angular Components Plan (based on ngx-iot-mplis patterns)

## Status: In Progress

### Completed:
- [x] Understand current components and ngx-iot-mplis structure via list/read tools.
- [x] Create BaseInputComponent (`packages/angular/src/components/BaseInput.ts`)
- [x] Create BaseImports (`packages/angular/src/components/imports.ts`)

### Steps Remaining:
1. [x] Update DynamicInput.ts: Extended BaseInput, prop mapping, valueChange sub, ngOnChanges proxy.
2. [x] Update FieldInput.ts: Use BaseImports, pass more props, typed emit.
3. [x] Update MultiFieldInput.ts: Tailwind classes, trackBy typed, BaseImports.
4. [x] Exports added to public-api.ts.
5. [ ] Test
6. attempt_completion

Completed edits. Ready for test.

## Git Commit All Source Plan (Approved)

### Steps:
1. [ ] Stage all unstaged changes (`git add .`)
2. [ ] Verify full status (`git status`)
3. [ ] Commit changes (`git commit -m "..."`)
4. [ ] Verify commit log (`git log --oneline -5`)


