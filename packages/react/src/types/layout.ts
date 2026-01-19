type BaseLayout =
    | "column"
    | "row"
    | {
        type: "grid"
        columns?: number
        gap?: number
    }

export type LayoutConfig =
    | BaseLayout
    | {
        type: "responsive"
        mobile: BaseLayout
        desktop: BaseLayout
    }
