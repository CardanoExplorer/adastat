import { resolveUrl } from '@/helpers/url.ts'
import createDOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'
import katex from 'katex'
import MarkdownIt from 'markdown-it'
import tm from 'markdown-it-texmath'

const md = MarkdownIt(),
  DOMPurify = createDOMPurify(new JSDOM('').window)

// eslint-disable-next-line no-control-regex
const controlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g

md.use(tm, {
  engine: katex,
  delimiters: 'dollars',
  katexOptions: {
    throwOnError: false,
    output: 'html',
  },
})

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx]!,
    aIndex = token.attrIndex('href') as number

  if (token.attrs?.[aIndex]) {
    const href = resolveUrl(token.attrs[aIndex][1])

    token.attrs[aIndex][1] = href.startsWith('https://') || href.startsWith('http://') ? href : 'http://' + href

    token.attrPush(['target', '_blank'])
    token.attrPush(['rel', 'noopener noreferrer nofollow'])
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
  DOMPurify.sanitize(md.render(mdStr.replace(controlChars, ' ')), {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['referrerpolicy', 'target'],
  })
