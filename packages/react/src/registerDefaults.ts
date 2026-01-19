export async function registerDefaults() {
    await import("./layout/defaultLayouts")
    await import("./layout/responsiveLayout")
}
