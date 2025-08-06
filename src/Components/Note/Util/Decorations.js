import Prism from 'prismjs'
import 'prismjs/components/prism-markdown'
import { Text } from 'slate'

export const Decorations = () => {
  return ([node, path]) => {
    const ranges = [];
    
    if (!Text.isText(node)) {
      return ranges;
    }

    const text = node.text;
    
    const patterns = [
      { regex: /(\*\*)([^*]+)(\*\*)/g, type: 'bold' },
      { regex: /(__)([^*]+)(__)/g, type: 'italic' },
      { regex: /(`)([^`]+)(`)/g, type: 'code' },
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        const [fullMatch, before, content] = match;
        const start = match.index;
        const end = start + fullMatch.length;
        
        const markdownRange = {
          anchor: { path, offset: start },
          focus: { path, offset: end },
        };

        ranges.push({
          [`${pattern.type}Syntax`]: true,
          anchor: { path, offset: start },
          focus: { path, offset: start + before.length },
          markdownRange,
        });
        
        ranges.push({
          [pattern.type]: true,
          anchor: { path, offset: start + before.length },
          focus: { path, offset: start + before.length + content.length },
          markdownRange,
        });
        
        ranges.push({
          [`${pattern.type}Syntax`]: true,
          anchor: { path, offset: start + before.length + content.length },
          focus: { path, offset: end },
          markdownRange,
        });
      }
    });

    const getLength = token => {
      if (typeof token === 'string') return token.length
      if (typeof token.content === 'string') return token.content.length
      return token.content.reduce((l, t) => l + getLength(t), 0)
    }

    const tokens = Prism.tokenize(node.text, Prism.languages.markdown)
    let start = 0
    for (const token of tokens) {
      const length = getLength(token)
      const end = start + length
      if (typeof token !== 'string') {
        if (!['bold', 'italic', 'code'].includes(token.type)) {
          ranges.push({
            [token.type]: true,
            anchor: { path, offset: start },
            focus: { path, offset: end },
          })
        }
      }
      start = end 
    }

    const linkRegex = /\[\[([^\]]+)\]\]/g
    let linkMatch
    while ((linkMatch = linkRegex.exec(node.text)) !== null) {
      const fullMatch = linkMatch[0]
      const linkText = linkMatch[1]
      const startIdx = linkMatch.index
      const endIdx = startIdx + fullMatch.length

      const markdownRange = {
        anchor: { path, offset: startIdx },
        focus: { path, offset: endIdx },
      };

      ranges.push({
        linkSyntax: true,
        anchor: { path, offset: startIdx },
        focus: { path, offset: startIdx + 2 },
        markdownRange,
      })

      ranges.push({
        obsidianLink: true,
        linkValue: linkText,
        linkId: `link-${path.join('-')}-${startIdx}`,
        className: `link-${path.join('-')}-${startIdx}`,
        anchor: { path, offset: startIdx + 2 },
        focus: { path, offset: endIdx - 2 },
        markdownRange,
      })

      ranges.push({
        linkSyntax: true,
        anchor: { path, offset: endIdx - 2 },
        focus: { path, offset: endIdx },
        markdownRange,
      })
    }

    return ranges
  }
}