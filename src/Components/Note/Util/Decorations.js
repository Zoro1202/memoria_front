// Decorations.js
import Prism from 'prismjs'
import 'prismjs/components/prism-markdown'
import { Text } from 'slate'

export const Decorations = () => {
  return ([node, path]) => {
    const ranges = []
    if (!Text.isText(node)) return ranges

    const text = node.text
    let offset = 0

    const getLength = token => {
      if (typeof token === 'string') return token.length
      if (typeof token.content === 'string') return token.content.length
      return token.content.reduce((l, t) => l + getLength(t), 0)
    }

    const tokens = Prism.tokenize(text, Prism.languages.markdown)

    for (const token of tokens) {
      const length = getLength(token)
      const end = offset + length

      if (typeof token === 'string') {
        offset = end
        continue
      }

      const { type, content } = token

      // ✅ Bold (ex: **bold** or __bold__)
      if (type === 'bold') {
        const match = /(\*\*|__)(.+?)\1/.exec(text.slice(offset))
        if (match) {
          const matchStart = offset + match.index
          const matchEnd = matchStart + match[0].length
          ranges.push({
            syntaxToken: true,
            anchor: { path, offset: matchStart },
            focus: { path, offset: matchStart + match[1].length },
          })
          ranges.push({
            bold: true,
            anchor: { path, offset: matchStart + match[1].length },
            focus: { path, offset: matchEnd - match[1].length },
          })
          ranges.push({
            syntaxToken: true,
            anchor: { path, offset: matchEnd - match[1].length },
            focus: { path, offset: matchEnd },
          })
          offset = matchEnd
          continue
        }
      }

      // ✅ Italic (ex: *italic* or _italic_)
      if (type === 'italic') {
        const match = /(\*|_)([^*_]+?)\1/.exec(text.slice(offset))
        if (match) {
          const matchStart = offset + match.index
          const matchEnd = matchStart + match[0].length
          ranges.push({
            syntaxToken: true,
            anchor: { path, offset: matchStart },
            focus: { path, offset: matchStart + 1 },
          })
          ranges.push({
            italic: true,
            anchor: { path, offset: matchStart + 1 },
            focus: { path, offset: matchEnd - 1 },
          })
          ranges.push({
            syntaxToken: true,
            anchor: { path, offset: matchEnd - 1 },
            focus: { path, offset: matchEnd },
          })
          offset = matchEnd
          continue
        }
      }

      // ✅ Strikethrough (ex: ~~strike~~)
      if (type === 'strikethrough') {
        const match = /~~(.+?)~~/.exec(text.slice(offset))
        if (match) {
          const matchStart = offset + match.index
          const matchEnd = matchStart + match[0].length
          ranges.push({
            syntaxToken: true,
            anchor: { path, offset: matchStart },
            focus: { path, offset: matchStart + 2 },
          })
          ranges.push({
            strikethrough: true,
            anchor: { path, offset: matchStart + 2 },
            focus: { path, offset: matchEnd - 2 },
          })
          ranges.push({
            syntaxToken: true,
            anchor: { path, offset: matchEnd - 2 },
            focus: { path, offset: matchEnd },
          })
          offset = matchEnd
          continue
        }
      }

      // ✅ Highlight (==highlight==)
      if (type === 'highlight') {
        const match = /==(.+?)==/.exec(text.slice(offset))
        if (match) {
          const matchStart = offset + match.index
          const matchEnd = matchStart + match[0].length
          ranges.push({
            syntaxToken: true,
            anchor: { path, offset: matchStart },
            focus: { path, offset: matchStart + 2 },
          })
          ranges.push({
            highlight: true,
            anchor: { path, offset: matchStart + 2 },
            focus: { path, offset: matchEnd - 2 },
          })
          ranges.push({
            syntaxToken: true,
            anchor: { path, offset: matchEnd - 2 },
            focus: { path, offset: matchEnd },
          })
          offset = matchEnd
          continue
        }
      }

      // ✅ Heading 처리 (이미 존재하는 코드는 유지)
      if (type === 'heading' && typeof content === 'string') {
        const match = /^(#{1,6})(\s*)(.+)/.exec(content)
        if (match) {
          const hashes = match[1]
          const spaces = match[2]
          const headingText = match[3]
          const hashLen = hashes.length
          const spaceLen = spaces.length
          const start = offset

          ranges.push({
            syntaxToken: true,
            anchor: { path, offset: start },
            focus: { path, offset: start + hashLen },
          })

          if (spaceLen > 0) {
            ranges.push({
              syntaxToken: true,
              anchor: { path, offset: start + hashLen },
              focus: { path, offset: start + hashLen + spaceLen },
            })
          }

          ranges.push({
            heading: true,
            anchor: { path, offset: start + hashLen + spaceLen },
            focus: { path, offset: start + getLength(token) },
          })
          offset += getLength(token)
          continue
        }
      }

      // ✅ Horizontal rule (--- or ***)
      if (type === 'hr' || text.trim() === '---' || text.trim() === '***') {
        ranges.push({
          syntaxToken: true,
          anchor: { path, offset },
          focus: { path, offset: end },
        })
        offset = end
        continue
      }

      // fallback: 그대로 강조
      ranges.push({
        [type]: true,
        anchor: { path, offset },
        focus: { path, offset: end },
      })

      offset = end
    }

    // ✅ [[Obsidian]] 링크 감지
    const regex = /\[\[([^\]]+)\]\]/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const full = match[0];
      const linkText = match[1];
      const startIdx = match.index;
      const endIdx = startIdx + full.length;

      // [[ 부분
      ranges.push({
        syntaxToken: true,
        anchor: { path, offset: startIdx },
        focus: { path, offset: startIdx + 2 },
      });
      // 링크 본문
      ranges.push({
        obsidianLink: true,
        linkValue: linkText,
        anchor: { path, offset: startIdx + 2 },
        focus: { path, offset: endIdx - 2 },
      });
      // ]] 부분
      ranges.push({
        syntaxToken: true,
        anchor: { path, offset: endIdx - 2 },
        focus: { path, offset: endIdx },
      });
    }

    return ranges
  }
}