export type LayoutConfig =
  | string
  | {
      type: string
      // free-form config passed to layout component
      [k: string]: any
    }
