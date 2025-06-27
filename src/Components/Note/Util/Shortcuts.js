import {
  Editor,
  Element as SlateElement,
  Point,
  Range,
  Transforms,
  Text,
  Node,
} from 'slate'

const BLOCK_SHORTCUTS = {
  '*': 'list-item',
  '-': 'list-item',
  '+': 'list-item',
  '>': 'block-quote',
  '#': 'heading-one',
  '##': 'heading-two',
  '###': 'heading-three',
  '####': 'heading-four',
  '#####': 'heading-five',
  '######': 'heading-six',
  '---': 'divider',
  '___': 'divider',
}

export const Shortcuts = editor => {
  const { deleteBackward, insertText, insertBreak } = editor

  editor.insertText = text => {
    const { selection } = editor

    if (text === ' ' && selection && Range.isCollapsed(selection)) {
      const { anchor } = selection
      const block = Editor.above(editor, {
        match: n => SlateElement.isElement(n) && Editor.isBlock(editor, n),
      })
      const path = block ? block[1] : []
      const start = Editor.start(editor, path)
      const range = { anchor, focus: start }
      const beforeText = Editor.string(editor, range)

      const type = BLOCK_SHORTCUTS[beforeText]
      if (type) {
        Transforms.select(editor, range)
        Transforms.delete(editor)
        Transforms.setNodes(editor, { type })

        if (type === 'list-item') {
          const list = { type: 'bulleted-list', children: [] }
          Transforms.wrapNodes(editor, list, {
            match: n =>
              !Editor.isEditor(n) &&
              SlateElement.isElement(n) &&
              n.type === 'list-item',
          })
        }

        return
      }
    }

    // Inline 스타일 적용 (**bold**, _italic_)
    if ((text === '*' || text === '_') && selection && Range.isCollapsed(selection)) {
      const success = applyInlineMarkdown(editor, text)
      if (success) return
    }

    insertText(text)
  }

  editor.insertBreak = () => {
    const { selection } = editor
    if (!selection || !Range.isCollapsed(selection)) return insertBreak()

    const blockEntry = Editor.above(editor, {
      match: n => SlateElement.isElement(n) && Editor.isBlock(editor, n),
    })
    if (!blockEntry) return insertBreak()

    const [block, path] = blockEntry
    const text = Node.string(block).trim()

    if (text === '---' || text === '___') {
      Transforms.removeNodes(editor, { at: path })
      Transforms.insertNodes(editor, {
        type: 'divider',
        children: [{ text: '' }],
      }, { at: path })
      return
    }

    insertBreak()
  }

  editor.deleteBackward = (...args) => {
    const { selection } = editor
    if (selection && Range.isCollapsed(selection)) {
      const match = Editor.above(editor, {
        match: n => SlateElement.isElement(n) && Editor.isBlock(editor, n),
      })
      if (match) {
        const [block, path] = match
        const start = Editor.start(editor, path)
        if (
          SlateElement.isElement(block) &&
          block.type !== 'paragraph' &&
          Point.equals(selection.anchor, start)
        ) {
          Transforms.setNodes(editor, { type: 'paragraph' })
          if (block.type === 'list-item') {
            Transforms.unwrapNodes(editor, {
              match: n =>
                !Editor.isEditor(n) &&
                SlateElement.isElement(n) &&
                n.type === 'bulleted-list',
              split: true,
            })
          }
          return
        }
      }
    }
    deleteBackward(...args)
  }

  return editor
}

// ✅ 마크다운 기호가 보이지 않도록 텍스트 삭제 후 스타일 적용
const applyInlineMarkdown = (editor, char) => {
  const { selection } = editor
  const [start] = Range.edges(selection)

  const beforePoint = Editor.before(editor, start, { unit: 'character', distance: 20 })
  if (!beforePoint) return false

  const range = { anchor: beforePoint, focus: start }
  const beforeText = Editor.string(editor, range)

  const pattern = char === '*' ? /\*\*(.+)\*\*$/ : /_(.+)_$/
  const match = beforeText.match(pattern)
  if (!match) return false

  const matchedText = match[1]
  const matchStartOffset = beforeText.lastIndexOf(match[0])
  const anchor = Editor.before(editor, start, {
    distance: beforeText.length - matchStartOffset,
  })

  if (!anchor) return false

  const fullRange = Editor.range(editor, anchor, start)
  Transforms.select(editor, fullRange)
  Transforms.delete(editor)

  Transforms.insertText(editor, matchedText)
  Transforms.setNodes(
    editor,
    { [char === '*' ? 'bold' : 'italic']: true },
    { match: Text.isText, split: true }
  )

  return true
}
