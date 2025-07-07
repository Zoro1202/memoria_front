// 파일: src/Components/Note/Note.js

import React, { useCallback, useEffect, useMemo } from "react";
import { TextEditor } from './Util/textEditor';
import { Decorations } from './Util/Decorations';
import { Shortcuts } from './Util/Shortcuts';
import { createEditor, Editor, Transforms, Text } from 'slate';
import { withHistory } from 'slate-history';
import { withReact, Slate, Editable } from 'slate-react';
import { css } from '@emotion/css';
import { toggleMark } from './Util/Toolbar';

import { useNotes } from '../../Contexts/NotesContext';
import { useTabs } from "../../Contexts/TabsContext";
import { toast } from 'react-hot-toast';

// =================================================
// Markdown <-> Slate 변환 로직 (수정 없음)
// =================================================

const serialize = nodes => {
    return nodes.map(n => {
      if (Text.isText(n)) {
      let string = n.text;
      if (n.bold) string = `**${string}**`;
      if (n.italic) string = `*${string}*`;
      if (n.strikethrough) string = `~~${string}~~`;
      if (n.code) string = `\`${string}\``;
      if (n.highlight) string = `==${string}==`;
      if (n.obsidianLink) return `[[${n.linkValue}]]`;
      return string;
    }
    const children = n.children.map(c => serialize([c])).join('');
    switch (n.type) {
      case 'heading-one': return `# ${children}\n`;
      case 'heading-two': return `## ${children}\n`;
      case 'heading-three': return `### ${children}\n`;
      case 'block-quote': return `> ${children}\n`;
      case 'bulleted-list': return children;
      case 'list-item': return `* ${children}\n`;
      case 'divider': return '---\n';
      case 'paragraph':
      default:
        return `${children}\n`;
    }
  }).join('');
};

const deserialize = markdown => {
  if (!markdown) return [{ type: 'paragraph', children: [{ text: '' }] }];
  const lines = markdown.split('\n');
  const nodes = [];
  let listBuffer = null;
  const flushListBuffer = () => {
    if (listBuffer) {
      nodes.push(listBuffer);
      listBuffer = null;
    }
  };
  for (const line of lines) {
    if (line.startsWith('# ')) {
      flushListBuffer();
      nodes.push({ type: 'heading-one', children: [{ text: line.substring(2) }] });
    } else if (line.startsWith('## ')) {
      flushListBuffer();
      nodes.push({ type: 'heading-two', children: [{ text: line.substring(3) }] });
    } else if (line.startsWith('### ')) {
      flushListBuffer();
      nodes.push({ type: 'heading-three', children: [{ text: line.substring(4) }] });
    }
    else if (line.startsWith('> ')) {
      flushListBuffer();
      nodes.push({ type: 'block-quote', children: [{ text: line.substring(2) }] });
    }
    else if (line.startsWith('* ') || line.startsWith('- ')) {
      const listItem = { type: 'list-item', children: [{ text: line.substring(2) }] };
      if (!listBuffer) {
        listBuffer = { type: 'bulleted-list', children: [] };
      }
      listBuffer.children.push(listItem);
    }
    else if (line.trim() === '---' || line.trim() === '___') {
      flushListBuffer();
      nodes.push({ type: 'divider', children: [{ text: '' }] });
    }
    else {
      flushListBuffer();
      nodes.push({ type: 'paragraph', children: [{ text: line }] });
    }
  }
  flushListBuffer();
  return nodes.length > 0 ? nodes : [{ type: 'paragraph', children: [{ text: '' }] }];
};

// ✅ [수정] NoteView 컴포넌트 전체를 아래 코드로 교체합니다.
// 복잡했던 AI 관련 로직을 모두 제거하고 원래의 단순한 구조로 복원합니다.
export default function NoteView({ id, markdown, onChange }) {
    // 필요한 Context만 가져옵니다.
    const { createNoteFromTitle, updateNote, updateGraphLinksFromContent } = useNotes();
    const { openTab, updateTitle } = useTabs();

    // useMemo 훅들은 그대로 유지합니다.
    const decorate = useMemo(() => Decorations(), []);
    const editor = useMemo(() => Shortcuts(withReact(withHistory(createEditor()))), []);
    const titleEditor = useMemo(() => withReact(withHistory(createEditor())), []);
    
    const titleValue = useMemo(() => [{
        type: 'heading-one',
        children: [{ text: typeof id === 'string' ? id : JSON.stringify(id) }],
    }], [id]);
    
    const initialValue = useMemo(() => deserialize(markdown), [id, markdown]);

    // id/markdown 동기화 useEffect는 그대로 유지합니다.
    useEffect(() => {
        // 제목 에디터의 내용을 현재 노트 ID(prop)와 동기화합니다.
        if (titleEditor) {
            const currentTitleInEditor = Editor.string(titleEditor, []);
            if (currentTitleInEditor !== id) {
                Transforms.delete(titleEditor, { at: { anchor: Editor.start(titleEditor, []), focus: Editor.end(titleEditor, []) } });
                Transforms.insertText(titleEditor, id || '', { at: [0, 0] });
            }
        }
        // 메인 에디터의 내용을 외부 markdown prop과 동기화합니다.
        if (editor) {
            const currentMarkdown = serialize(editor.children);
            if (currentMarkdown !== markdown) {
                editor.children = initialValue;
                editor.selection = null; 
            }
        }
    }, [id, markdown, titleEditor, editor, initialValue]);

    // 클릭 이벤트 핸들러는 그대로 유지합니다.
    const handleClick = useCallback(e => {
        const target = e.target.closest('[data-link]');
        if (target) {
            const link = target.getAttribute('data-link');
            createNoteFromTitle(link);
            openTab({ title: link, type: 'note', noteId: link });
        }
    }, [createNoteFromTitle, openTab]);

    useEffect(() => {
        const container = document.getElementById('root');
        container?.addEventListener('click', handleClick);
        return () => container?.removeEventListener('click', handleClick);
    }, [handleClick]);

    //#region ctrl + s 이벤트 (저장)
    const handleKeyDown = useCallback((e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            const newTitle = Editor.string(titleEditor, []).trim();
            const newContent = serialize(editor.children);
            
            const updatedId = updateNote(id, newTitle, newContent);
            updateGraphLinksFromContent(updatedId, newContent);
            
            if (id !== updatedId) {
                updateTitle(id, updatedId);
            }
            toast.success('저장되었습니다!');
        }
    }, [id, editor, titleEditor, updateNote, updateGraphLinksFromContent, updateTitle]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
    //#endregion

    //#region DOM 렌더링
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
            <TextEditor
                editor={editor}
                initialValue={initialValue}
                onchange={value => {
                    const newMarkdown = serialize(value);
                    onChange(newMarkdown);
                }}
                decorate={decorate}
                renderLeaf={Leaf}
                onDOMBeforeInput={event => {
                    switch (event.inputType) {
                        case 'formatBold':
                            event.preventDefault();
                            return toggleMark(editor, 'bold');
                        case 'formatItalic':
                            event.preventDefault();
                            return toggleMark(editor, 'italic');
                        case 'formatUnderline':
                            event.preventDefault();
                            return toggleMark(editor, 'underline');
                    }
                }}
            />
        </div>
    );
    //#endregion
}

// =================================================
// Leaf 컴포넌트 (수정 없음)
// =================================================

const Leaf = ({ attributes, children, leaf }) => {
    if (leaf.syntaxToken) {
        return (
            <span
                {...attributes}
                className={css`
                    font-size: 0.1px; 
                    opacity: 0; 
                    user-select: none; 
                    pointer-events: none; 
                    position: absolute; 
                `}
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