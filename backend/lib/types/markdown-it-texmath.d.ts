declare module 'markdown-it-texmath' {
  import MarkdownIt from 'markdown-it'

  interface TexMathOptions {
    engine?: any
    delimiters?: string
    macros?: Record<string, string>
  }

  function texmath(md: MarkdownIt, options?: TexMathOptions): void

  export default texmath
}
