// markdownSerializer.js
import { MarkdownSerializer, defaultMarkdownSerializer } from 'prosemirror-markdown';
import './Obsidian.css';

export function createMarkdownSerializer() {
  /* ① 기본 규칙 복사 */
  const baseNodes = { ...defaultMarkdownSerializer.nodes };
  const baseMarks = { ...defaultMarkdownSerializer.marks };

  /* ② Remirror의 bold, italic 등 다른 마크다운 매핑 추가 */
  if (!baseMarks.bold)
    baseMarks.bold = { ...baseMarks.strong };
  if (!baseMarks.italic)
    baseMarks.italic = { ...baseMarks.em };
  if (!baseMarks.link)
    baseMarks.link = {...baseMarks.link};
  
  baseNodes.list_item = (state, node, parent, index) => {
    const attrs = node.attrs ?? {};
    const isTask    = node.type.name === 'taskListItem';
    const isChecked = !!attrs.checked;

    let bullet = '* ';
    if (parent && parent.type.name === 'orderedList') {
      const order = (parent.attrs?.order ?? 1) + index;
      bullet = `${order}. `;
    }

    const checkbox = isTask ? (isChecked ? '[x] ' : '[ ] ') : '';
    state.wrapBlock(node, bullet + checkbox, '', () => state.renderContent(node));
  };

  /* ✔️ taskList alias */
  baseNodes.taskList     = baseNodes.bullet_list;
  baseNodes.taskListItem = baseNodes.list_item;

  baseMarks.underline = {
    open: '<u>',
    close: '</u>',
    mixable: true,
    expelEnclosingWhitespace: false,
  };

  /* ✔️ strike(취소선) mark 추가 */
  baseMarks.strike = {
    open: '~~',
    close: '~~',
    mixable: true,
    expelEnclosingWhitespace: false,
  };

  const aliasTable = {
    bulletList:   'bullet_list',
    orderedList:  'ordered_list',
    listItem:     'list_item',
    codeBlock:    'code_block',
    horizontalRule:  'horizontal_rule',   // 수평선
    image:           'image',
  };

  Object.entries(aliasTable).forEach(([camel, snake]) => {
    if (!baseNodes[camel] && baseNodes[snake]) baseNodes[camel] = baseNodes[snake];
  });

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