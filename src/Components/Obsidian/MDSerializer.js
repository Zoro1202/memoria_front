// markdownSerializer.js
import { MarkdownSerializer, defaultMarkdownSerializer } from 'prosemirror-markdown';
import './Obsidian.css';

export function createMarkdownSerializer() {
  /* ① 기본 규칙 복사 */
  const baseNodes = { ...defaultMarkdownSerializer.nodes };
  const baseMarks = { ...defaultMarkdownSerializer.marks };

  /* ② Remirror의 bold → '**' 매핑 추가 */
  if (!baseMarks.bold) {
    baseMarks.bold = { ...baseMarks.strong };
    baseMarks.italic = { ...baseMarks.em };
  }
  
  /* ③ obsidianLink 규칙 추가 */
  baseMarks.obsidianLink = {
    open : '[[',
    close: ']]',
    mixable: true,
    expelEnclosingWhitespace: false,
  };

  /* ④ nodes → marks 순서!  */
  return new MarkdownSerializer(baseNodes, baseMarks);
}