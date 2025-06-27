import { css } from '@emotion/css'
import React, { useEffect, useMemo, useRef } from 'react'
import { Editor, Range, createEditor } from 'slate'
import { withHistory } from 'slate-history'
import { Editable, Slate, useFocused, useSlate, withReact } from 'slate-react'
import { Button, Icon, Menu, Portal } from './noteComponent'

export const HToolbar = () => {
  return <HoveringToolbar />
}

export const toggleMark = (editor, format) => {
  const isActive = isMarkActive(editor, format)
  if (isActive) {
    Editor.removeMark(editor, format)
  } else {
    Editor.addMark(editor, format, true)
  }
}

const isMarkActive = (editor, format) => {
  const marks = Editor.marks(editor)
  return marks ? marks[format] === true : false
}

const HoveringToolbar = () => {
  const ref = useRef(null)
  const editor = useSlate()
  const inFocus = useFocused()

  useEffect(() => {
    const el = ref.current
    const { selection } = editor
    if (!el) return
    if (!selection || !inFocus || Range.isCollapsed(selection) || Editor.string(editor, selection) === '') {
      el.removeAttribute('style')
      return
    }

    const domSelection = window.getSelection()
    const domRange = domSelection.getRangeAt(0)
    const rect = domRange.getBoundingClientRect()

    el.style.opacity = '1'
    el.style.top = `${rect.top + window.pageYOffset - el.offsetHeight}px`
    el.style.left = `${rect.left + window.pageXOffset - el.offsetWidth / 2 + rect.width / 2}px`
  })

  return (
    <Portal>
      <Menu
        ref={ref}
        className={css`
          padding: 8px;
          position: absolute;
          z-index: 1;
          top: -10000px;
          left: -10000px;
          background: #222;
          border-radius: 4px;
          opacity: 0;
          transition: opacity 0.75s;
        `}
        onMouseDown={e => e.preventDefault()}
      >
        <FormatButton format="bold" icon="format_bold" />
        <FormatButton format="italic" icon="format_italic" />
        <FormatButton format="underline" icon="format_underlined" />
        <FormatButton format="obsidianLink" icon="add_link"/>
      </Menu>
    </Portal>
  )
}

const FormatButton = ({ format, icon }) => {
  const editor = useSlate()
  return (
    <Button
      reversed
      active={isMarkActive(editor, format)}
      onClick={() => toggleMark(editor, format)}
    >
      <Icon>{icon}</Icon>
    </Button>
  )
}