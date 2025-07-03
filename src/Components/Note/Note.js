// src/Components/Note/Note.js

import React, { useCallback, useEffect, useRef, useMemo, useState } from "react";
// ✅ [복원] TextEditor 컴포넌트를 사용합니다.
import { TextEditor } from './Util/textEditor';
import { Decorations } from './Util/Decorations';
import { Shortcuts } from './Util/Shortcuts';
// ✅ [수정] 실시간 반영을 위해 Transforms를 import 합니다.
import { createEditor, Editor, Range, Path, Transforms } from 'slate';
import { withHistory } from 'slate-history';
import { withReact, Slate, Editable, useSlate } from 'slate-react';
import { css } from '@emotion/css';
// ✅ [복원] HToolbar는 TextEditor 내부에서 사용되므로 여기서는 필요 없습니다.
import { toggleMark } from './Util/Toolbar';

import { useNotes } from '../../Contexts/NotesContext';
import { useTabs } from "../../Contexts/TabsContext";
import { toast } from 'react-hot-toast';

export default function NoteView({ id, markdown, onChange }) {
    // ✅ [수정] 필요한 Context 함수들을 가져옵니다.
    const { createNoteFromTitle, updateNote, updateGraphLinksFromContent } = useNotes();
    const { openTab, updateTitle } = useTabs(); // updateTitle은 useTabs에 있다고 가정

    // ✅ [복원] initialValue 상태는 이제 여기서 관리하지 않습니다.
    const decorate = useMemo(() => Decorations(), []);
    const editor = useMemo(() => Shortcuts(withReact(withHistory(createEditor()))), []);
    const titleEditor = useMemo(() => withReact(withHistory(createEditor())), []);

    // ✅ [수정] id가 변경될 때 titleValue를 업데이트 하도록 수정
    const titleValue = useMemo(() => [
        {
            type: 'heading-one',
            children: [{
                text: typeof id === 'string' ? id : JSON.stringify(id)
            }],
        },
    ], [id]);
    
    // ✅ [추가] 실시간 반영을 위한 useEffect 입니다. 이 부분만 추가되었습니다.
    useEffect(() => {
        // 제목 업데이트
        if (titleEditor) {
            const currentTitle = Editor.string(titleEditor, []);
            if (currentTitle !== id) {
                Transforms.delete(titleEditor, { at: { anchor: Editor.start(titleEditor, []), focus: Editor.end(titleEditor, []) } });
                Transforms.insertText(titleEditor, id || '', { at: [0, 0] });
            }
        }
        // 본문 업데이트
        if (editor) {
            const currentContent = Editor.string(editor, []);
            if (currentContent !== markdown) {
                Transforms.delete(editor, { at: { anchor: Editor.start(editor, []), focus: Editor.end(editor, []) } });
                Transforms.insertText(editor, markdown || '', { at: [0, 0] });
            }
        }
    }, [id, markdown, titleEditor, editor]);


    //#region 클릭 이벤트 (data-link) - 기존 코드와 동일
    const handleClick = useCallback(e => {
        const target = e.target.closest('[data-link]');
        if (target) {
            const link = target.getAttribute('data-link');
            console.log(link);
            createNoteFromTitle(link);
            openTab({ title: link, type: 'note', noteId: link });
        }
    }, [createNoteFromTitle, openTab]);

    useEffect(() => {
        const container = document.getElementById('root');
        container?.addEventListener('click', handleClick);
        return () => container?.removeEventListener('click', handleClick);
    }, [handleClick]);
    //#endregion

    //#region ctrl + s 이벤트 (마크다운) - 기존 코드와 동일 (내용만 수정)
    const handleKeyDown = useCallback((e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            const newTitle = Editor.string(titleEditor, []).trim();
            const newContent = Editor.string(editor, []).trim();
            
            const updatedId = updateNote(id, newTitle, newContent);
            updateGraphLinksFromContent(updatedId, newContent);
            
            if (id !== updatedId) {
                updateTitle(id, updatedId);
            }

            toast.success('저장!');
        }
    }, [id, editor, titleEditor, updateNote, updateGraphLinksFromContent, updateTitle]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
    //#endregion

    //#region DOM - ✅ 요청하신 코드 조각으로 교체
    return (
        <div
            className={css`
              position: relative;
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
            <TextEditor // 이 컴포넌트 안에서 Slate의 Editable이 사용될 것으로 예상됩니다.
                editor={editor}
                initialValue={[{ type: 'paragraph', children: [{ text: markdown || '' }] }]}
                // ⭐⭐⭐ 이 onchange 프롭스를 아래와 같이 수정하세요! ⭐⭐⭐
                onchange={value => {
                    // TextEditor에서 넘어오는 value는 Slate 객체일 것입니다.
                    // Editor.string() 함수를 사용하여 Slate 객체에서 순수 텍스트를 추출합니다.
                    const plainText = Editor.string(editor, []);

                    // 디버깅을 위한 로그 (이 로그가 이제 실제 텍스트를 보여줄 것입니다!)
                    console.log("NoteView 내부 TextEditor onChange - 추출된 텍스트:", plainText);
                    console.log("NoteView 내부 TextEditor onChange - 추출된 텍스트 타입:", typeof plainText);

                    // 부모 컴포넌트(VaultApp)의 onChange에는 순수 텍스트를 전달합니다.
                    onChange(plainText);
                }}
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
        </div>
    )
}
//#endregion


// ✅ [복원] Leaf 컴포넌트는 이전 코드 그대로 유지합니다.
const Leaf = ({ attributes, children, leaf }) => {
    const editor = useSlate();
    const { selection } = editor;

    const isVisible = useMemo(() => {
        if (!leaf.syntaxToken || !selection || !Range.isCollapsed(selection)) return false;

        const cursor = selection.anchor;
        const tokenAnchor = leaf.anchor;
        const tokenFocus = leaf.focus;

        if (!tokenAnchor || !tokenFocus) return false;

        const inSameNode = Path.equals(cursor.path, tokenAnchor.path);
        if (!inSameNode) return false;

        const cursorOffset = cursor.offset;
        const startOffset = tokenAnchor.offset;
        const endOffset = tokenFocus.offset;

        const margin = 2;
        return (
            cursorOffset >= startOffset - margin &&
            cursorOffset <= endOffset + margin
        );
    }, [selection, leaf]);

    if (leaf.syntaxToken) {
        return (
            <span
                {...attributes}
                style={
                    isVisible
                        ? {} // 보여주기
                        : { display: 'none' } // 완전히 숨김
                }
            >
                {children}
            </span>
        );
    }

    return (
        <span
            {...attributes}
            data-link={leaf.obsidianLink ? leaf.linkValue : undefined}
            className={css`
                ${leaf.obsidianLink && css`
                  color: #5765f2;
                  text-decoration: underline;
                  cursor: pointer;
                `}
                ${leaf.bold && `font-weight: bold;`}
                ${leaf.italic && `font-style: italic;`}
                ${leaf.underlined && `text-decoration: underline;`}
                ${leaf.strikethrough && `text-decoration: line-through;`}
                ${leaf.highlight && `background-color: yellow;`}
                ${leaf.heading && `font-weight: bold; font-size: 1.4em;`}
                ${leaf.hr && css`
                  display: block;
                  border: none;
                  border-top: 1px solid #ccc;
                  margin: 1em 0;
                `}
                ${leaf.code && css`
                  font-family: 'Fira Code', monospace;
                  background-color: #f5f5f5;
                  padding: 0.2em 0.4em;
                  border-radius: 4px;
                `}
                ${leaf.blockquote && css`
                  display: block;
                  padding-left: 1em;
                  border-left: 3px solid #ccc;
                  color: #666;
                  font-style: italic;
                `}
              `}
        >
            {children}
        </span>
    );
};