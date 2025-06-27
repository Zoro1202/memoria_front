import Prism from 'prismjs'
import 'prismjs/components/prism-markdown'
import { Text } from 'slate'

export const Decorations = () => {
  return ([node, path]) => {
    const ranges = []
    if (!Text.isText(node)) return ranges

    const getLength = token => {
      if (typeof token === 'string') return token.length
      if (typeof token.content === 'string') return token.content.length
      return token.content.reduce((l, t) => l + getLength(t), 0)
    }

    // Prism 기반 문법 강조
    const tokens = Prism.tokenize(node.text, Prism.languages.markdown)
    let start = 0
    for (const token of tokens) {
      const length = getLength(token)
      const end = start + length
      if (typeof token !== 'string') {
        ranges.push({
          [token.type]: true,
          anchor: { path, offset: start },
          focus: { path, offset: end },
        })
      }
      start = end
    }

    // [[Obsidian]] 스타일 링크 감지
    const regex = /\[\[([^\]]+)\]\]/g
    let match
    while ((match = regex.exec(node.text)) !== null) {
      const fullMatch = match[0]
      const linkText = match[1]
      const startIdx = match.index
      const endIdx = startIdx + fullMatch.length

      ranges.push({
        bracket: true,
        anchor: { path, offset: startIdx },
        focus: { path, offset: startIdx + 2 },
      })

      ranges.push({
        obsidianLink: true,
        linkValue: linkText,
        anchor: { path, offset: startIdx + 2 },
        focus: { path, offset: endIdx - 2 },
      })

      ranges.push({
        bracket: true,
        anchor: { path, offset: endIdx - 2 },
        focus: { path, offset: endIdx },
      })
    }

    return ranges
  }
}
