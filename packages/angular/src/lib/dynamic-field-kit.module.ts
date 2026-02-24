import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'

import { DynamicInput } from '../components/DynamicInput'
import { FieldInput } from '../components/FieldInput'
import { MultiFieldInput } from '../components/MultiFieldInput'

import { ColumnLayout, RowLayout, GridLayout } from '../layout/defaultLayouts'

@NgModule({
  imports: [CommonModule, DynamicInput, FieldInput, MultiFieldInput, ColumnLayout, RowLayout, GridLayout],
  exports: [DynamicInput, FieldInput, MultiFieldInput, ColumnLayout, RowLayout, GridLayout],
})
export class DynamicFieldKitModule {}
