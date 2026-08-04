import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { readFile } from 'fs/promises'
// import { readFileSync } from 'fs'
import { URL, fileURLToPath } from 'node:url'
import { optimize } from 'svgo'
import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import { ViteMinifyPlugin } from 'vite-plugin-minify'
import vueDevTools from 'vite-plugin-vue-devtools'
import { compileTemplate } from 'vue/compiler-sfc'

const svgLoader = (): Plugin => ({
  name: 'vite.svg-loader',
  enforce: 'pre',
  async load(id: string) {
    if (!id.endsWith('.svg?component')) {
      return
    }

    const path = id.slice(0, -10),
      svg = await readFile(path, 'utf-8')

    const svgData = optimize(svg, {
      path,
      plugins: [
        {
          name: 'preset-default',
          params: {
            overrides: {
              convertPathData: false,
              mergePaths: false,
            },
          },
        },
      ],
    })
      .data.replace(/<style/g, '<component is="style"')
      .replace(/<\/style/g, '</component')
      .replace(/<svg([^>]+)>/, '<svg$1 v-bind="attrs"><slot />')

    const { code } = compileTemplate({
      id: JSON.stringify(id),
      source: svgData,
      filename: path,
      transformAssetUrls: false,
    })

    return `
      ${code}
      export default (props, { slots, attrs }) => render({
        attrs: {
          'aria-hidden': true,
          ...attrs
        },
        $slots: slots
      }, [])
    `
  },
})

const assets = [
  {
    regex: /\.(png|jpe?g|gif|svg|webp|avif)$/,
    output: `images/[name].[hash].[ext]`,
  },
  {
    regex: /index\.css$/,
    output: `css/app.[hash].[ext]`,
  },
  {
    regex: /\.css$/,
    output: `css/[name].[hash].[ext]`,
  },
  {
    regex: /\.(woff|woff2|eot|ttf|otf)$/,
    output: `fonts/[name].[hash].[ext]`,
  },
]

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const networks = (env.VITE_NETWORKS || '')
    .split('|')
    .filter((str) => str.trim() !== '')
    .map((str) => {
      const [id, url] = str.split('=')

      return { id: id.trim(), url: url.trim() }
    })

  const envWithTypes = {
    'import.meta.env.VITE_NETWORKS': networks,
    'import.meta.env.VITE_NETWORK_START_TIME': Number(env.VITE_NETWORK_START_TIME.replace(/_/g, '')),
    'import.meta.env.VITE_TOTAL_SUPPLY': JSON.stringify(env.VITE_TOTAL_SUPPLY.replace(/_/g, '')),
    'import.meta.env.VITE_EPOCH_LENGTH': Number(env.VITE_EPOCH_LENGTH.replace(/_/g, '')),
    'import.meta.env.VITE_SLOT_LENGTH': Number(env.VITE_SLOT_LENGTH.replace(/_/g, '')),
    'import.meta.env.VITE_ACTIVE_SLOTS_COEFF': Number(env.VITE_ACTIVE_SLOTS_COEFF.replace(/_/g, '')),
    'import.meta.env.VITE_SHELLEY_EPOCH': Number(env.VITE_SHELLEY_EPOCH.replace(/_/g, '')),
    'import.meta.env.VITE_GOGUEN_EPOCH': Number(env.VITE_GOGUEN_EPOCH.replace(/_/g, '')),
    'import.meta.env.VITE_BASHO_EPOCH': Number(env.VITE_BASHO_EPOCH.replace(/_/g, '')),
    'import.meta.env.VITE_VOLTAIRE_EPOCH': Number(env.VITE_VOLTAIRE_EPOCH.replace(/_/g, '')),
  }

  return {
    server: {
      allowedHosts: env.ALLOWED_HOSTS === 'true' ? true : (env.ALLOWED_HOSTS || '').split('|').map((str) => str.trim()),
      host: env.HOST === 'true' ? true : (env.HOST || '').trim() || 'localhost',
      port: Number(env.PORT) || 5173,
      strictPort: true,
      proxy: {
        [env.VITE_API_PATH]: {
          target: env.PROXY_API_TARGET || 'http://localhost:7828',
          rewrite: (path) => path.replace(env.VITE_API_PATH, ''),
        },
        '/images/': {
          target: env.PROXY_API_TARGET || 'http://localhost:7828',
        },
        [env.VITE_SOCKET_PATH]: {
          target: env.PROXY_SOCKET_TARGET || 'ws://localhost:7828',
          ws: true,
        },
      },
    },
    build: {
      assetsInlineLimit: 0,
      cssMinify: 'lightningcss',
      minify: 'terser',
      terserOptions: {
        module: true,
        compress: {
          drop_console: ['log', 'info'],
        },
        mangle: {
          module: true,
          toplevel: true,
        },
        format: {
          comments: false,
        },
      },
      rollupOptions: {
        output: {
          entryFileNames: 'js/app.[hash].js',
          chunkFileNames: () => {
            // console.log(asset)

            return 'js/[name].[hash].js'
          },
          assetFileNames: (asset) => {
            // console.log(asset)
            if (asset && asset.name) {
              const result = assets.find((a) => a.regex.test(asset.name as string))
              if (result) {
                return result.output
              }
            }

            return 'assets/[name].[hash].[ext]'
          },
          // sanitizeFileName: (name) => {
          //   if (name == 'index' || name == 'index.css') {
          //     return name
          //   }

          //   const hash = createHash('sha1')
          //   hash.update(name)
          //   return hash.digest('base64url').slice(0, 8) + extname(name)
          // }
        },
      },
    },
    plugins: [vue(), vueJsx(), vueDevTools(), ViteMinifyPlugin(), tailwindcss(), svgLoader()],
    define: envWithTypes,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
