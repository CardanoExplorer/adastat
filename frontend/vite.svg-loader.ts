import { readFile } from 'fs/promises'
import { optimize } from 'svgo'
import type { Plugin } from 'vite'
import { compileTemplate } from 'vue/compiler-sfc'

export default (): Plugin => ({
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

    // const svgData = optimize(svg, {
    //   path,
    //   plugins: [
    //     {
    //       name: 'preset-default',
    //       params: {
    //         overrides: {
    //           convertPathData: false,
    //           mergePaths: false,
    //         },
    //       },
    //     },
    //   ],
    // }).data.match(/<svg([^>]*)>([\s\S]*)<\/svg>/)
    // if (!svgData) return 'export default () => null'

    // const attrs = JSON.stringify({
    //     'aria-hidden': true,
    //     ...parseAttrs(svgData[1]),
    //   }),
    //   innerHtml = JSON.stringify(svgData[2])

    // return `
    //   import { createVNode, mergeProps } from 'vue'

    //   export default ({ class: propsClass, ...props }) => createVNode('svg', mergeProps(
    //     ${attrs},
    //     props,
    //     {
    //       innerHTML: ${innerHtml}
    //     }
    //   ))
    // `
  },
})
