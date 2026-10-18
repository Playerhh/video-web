import { copyFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const pagesBase = '/video-web/'

function githubPagesSpaFallback() {
    return {
        name: 'github-pages-spa-fallback',
        apply: 'build',
        closeBundle() {
            copyFileSync(resolve('dist/index.html'), resolve('dist/404.html'))
            writeFileSync(resolve('dist/.nojekyll'), '')
        },
    }
}

// https://vite.dev/config/
// React Compiler 先保持关闭。项目仍在打磨，编译器会改变渲染行为，确认稳定后再单独开启。
// import { reactCompilerPreset } from '@rolldown/plugin-babel'
// const ReactCompilerConfig = { /* 可按需配置 */ }
// function reactCompiler() {
//     return reactCompilerPreset({
//         preset: {
//             plugins: [['babel-plugin-react-compiler', ReactCompilerConfig]],
//         },
//     })
// }

export default defineConfig(({ mode }) => ({
    base: mode === 'production' ? pagesBase : '/',
    plugins: [
        react(),
        githubPagesSpaFallback(),
        // reactCompiler(),
    ],
    server: {
        proxy: {
            '/api': 'http://127.0.0.1:3001',
        },
    },
    build: {
        esbuild: {
            drop: ['console', 'debugger'],
        },
        rollupOptions: {
            output: {
                chunkFileNames: 'assets/js/[name]-[hash].js',
                assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
                codeSplitting: {
                    groups: [
                        {
                            name: 'react',
                            test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
                            priority: 20,
                        },
                    ],
                },
            },
        },
    },
}))
