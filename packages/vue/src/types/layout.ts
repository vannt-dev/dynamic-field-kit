export type LayoutConfig =
  | string
  | {
      type: string;
      [k: string]: any;
    };
