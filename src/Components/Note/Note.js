//Note.js
import React, { useCallback, useEffect, useRef, useMemo } from "react";
import { TextEditor } from './Util/textEditor'
import { Decorations } from './Util/Decorations'
import { Shortcuts } from './Util/Shortcuts'
import { createEditor } from 'slate'
import { withHistory } from 'slate-history'
import { withReact } from 'slate-react'
import { css } from '@emotion/css'
import { HToolbar, toggleMark } from './Util/Toolbar'
import {Slate, Editable} from 'slate-react'

import { useNotes } from '../../Contexts/NotesContext'; // notes Context
import { useTabs } from "../../Contexts/TabsContext";
import {toast,} from 'react-hot-toast';

  //id, markdown, onChange(callback), ToolberCmp(툴바) 프롭으로 전달
export default function NoteView({ id, markdown, onChange }) {
  const decorate = useMemo(() => Decorations(), [])
  const editor = useMemo(() => Shortcuts(withReact(withHistory(createEditor()))), [])

  const titleEditor = useMemo(() => withReact(withHistory(createEditor())), [])
  const titleValue = useMemo(() => [
    {
      type: 'heading-one',
      children: [{ text: '' }],
    },
  ], [])

  //#region 클릭 이벤트 (data-link)
  const handleClick = useCallback(e => {
    const target = e.target.closest('[data-link]')
    if (target) {
      const link = target.getAttribute('data-link')
      console.log(link)
    }
  }, [])

  useEffect(() => {
    const container = document.getElementById('root')
    container?.addEventListener('click', handleClick)
    return () => container?.removeEventListener('click', handleClick)
  }, [handleClick])
  //#endregion
  //#region DOM
  return (
    <div
      className={css`
        posision: relative;
        max-width: 700px;
        margin: 50px auto;
        background: #fff;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        font-family: 'Segoe UI', sans-serif;
        line-height: 1.7;
      `}
    >
      <Slate editor={titleEditor} initialValue={titleValue}>
        
        <Editable
          renderElement={({ attributes, children }) => (
            <h1 {...attributes} style={{ fontSize: '2em', fontWeight: 'bold' }}>
              {children}
            </h1>
          )}
          placeholder="제목을 입력하세요..."
          style={{ marginBottom: '20px' }}
        />
      </Slate>

      <Slate editor={editor} initialValue={initialValue}>
      <HToolbar />
      <TextEditor
        editor={editor}
        initialValue={initialValue}
        decorate={decorate}
        renderLeaf={Leaf}
        onDOMBeforeInput={event => {
          switch (event.inputType) {
            case 'formatBold':
              event.preventDefault()
              return toggleMark(editor, 'bold')
            case 'formatItalic':
              event.preventDefault()
              return toggleMark(editor, 'italic')
            case 'formatUnderline':
              event.preventDefault()
              return toggleMark(editor, 'underline')
          }
        }}
      />
      </Slate>
    </div>
  )
}

const Leaf = ({ attributes, children, leaf }) => {
  return (
    <span
      {...attributes}
      data-link={leaf.obsidianLink ? leaf.linkValue : undefined}
      className={css`
        ${leaf.obsidianLink &&
        css`
          color: #5765f2;
          text-decoration: underline;
          cursor: pointer;
        `}
        font-weight: ${leaf.bold && '600'};
        font-style: ${leaf.italic && 'italic'};
        text-decoration: ${leaf.underlined && 'underline'};
        ${leaf.title &&
        css`
          display: block;
          font-weight: bold;
          font-size: 1.5em;
          margin: 1em 0 0.5em;
        `}
        ${leaf.list &&
        css`
          padding-left: 1em;
          font-size: 1em;
        `}
        ${leaf.hr &&
        css`
          display: block;
          border: none;
          border-top: 1px solid #e0e0e0;
          margin: 1em 0;
        `}
        ${leaf.blockquote &&
        css`
          display: block;
          padding-left: 1em;
          border-left: 3px solid #ccc;
          color: #666;
          font-style: italic;
        `}
        ${leaf.code &&
        css`
          font-family: 'Fira Code', monospace;
          background-color: #f5f5f5;
          padding: 0.2em 0.4em;
          border-radius: 4px;
        `}
        ${leaf.bracket &&
        css`
          color: #c5c5c5;
        `}
      `}
    >
      {children}
    </span>
  )
}

const initialValue = [
  { 
    type: 'paragraph',
    children: [
      { text: '내용을 입력하시오..\nasdfasdf\nasdfasdf' }
    ]
  }
]
