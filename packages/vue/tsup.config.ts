import { defineConfig } from "tsup"
import { VueLoaderPlugin } from "vue-loader"

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    sourcemap: true,
    // Vue is external
    external: [
        'vue',
        '@vue/runtime-core'
    ],
    // BẮT BUỘC
    noExternal: [
        '@dynamic-field-kit/core'
    ],
    // Add loader for .vue files
    loader: {
        '.vue': 'ts'
    },
    // Add VueLoaderPlugin
    plugins: [
        new VueLoaderPlugin()
    ]
})
