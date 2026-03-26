import { arweaveGateway, ipfsGateway } from '@/config.ts'
import createDOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'
import katex from 'katex'
import MarkdownIt from 'markdown-it'
import tm from 'markdown-it-texmath'

const md = MarkdownIt(),
  DOMPurify = createDOMPurify(new JSDOM('').window)

md.use(tm, {
  engine: katex,
  delimiters: 'dollars', // 'dollars', 'brackets', 'gitlab', 'julia' и др.
  katexOptions: {
    throwOnError: false,
    output: 'html',
  },
})

md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  const token = tokens[idx]!,
    aIndex = token.attrIndex('href') as number

  if (token.attrs?.[aIndex]) {
    let href = token.attrs[aIndex][1]

    if (href.startsWith('ipfs://')) {
      const namespace = href.slice(7, 12)

      href = ipfsGateway + (namespace === 'ipfs/' || namespace === 'ipns/' ? '' : '/ipfs') + href.slice(6)
    } else if (href.startsWith('ar://')) {
      href = arweaveGateway + href.slice(4)
    } else if (!/^(?:[a-z]+:|\/\/|#|\/)/i.test(href)) {
      href = 'http://' + href
    }

    token.attrs[aIndex][1] = href

    if (href.startsWith('https://') || href.startsWith('http://')) {
      token.attrPush(['target', '_blank'])
      token.attrPush(['rel', 'noopener noreferrer nofollow'])
    }
  }

  return self.renderToken(tokens, idx, options)
}

md.renderer.rules.image = (tokens, idx, options, env, self) => {
  const token = tokens[idx]!

  token.attrPush(['referrerpolicy', 'no-referrer'])
  token.attrPush(['loading', 'lazy'])

  return self.renderToken(tokens, idx, options)
}

export const md2html = (mdStr: string): string =>
  DOMPurify.sanitize(md.render(mdStr), {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['referrerpolicy', 'target'],
  })
