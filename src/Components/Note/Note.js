import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
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
import './Note.css';
import { useGroups } from "../../Contexts/GroupContext";

// =================================================
// Markdown <-> Slate 변환 로직
// =================================================

const serialize = nodes => {
    if (!nodes || !Array.isArray(nodes)) {
        return '';
    }
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
    const children = n.children ? serialize(n.children) : '';
    switch (n.type) {
      case 'heading-one': return `# ${children}\n`;
      case 'heading-two': return `## ${children}\n`;
      case 'heading-three': return `### ${children}\n`;
      case 'block-quote': return `> ${children}\n`;
      case 'bulleted-list': return `${children}`;
      case 'list-item': return `* ${children}\n`;
      case 'divider': return '---\n';
      case 'paragraph':
      default:
        return `${children}\n`;
    }
  }).join('');
};

const deserialize = (markdown) => {
  if (typeof markdown !== 'string') {
    return [{ type: 'paragraph', children: [{ text: '' }] }];
  }

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
      nodes.push({ type: 'heading-one', children: [{ text: line.substring(2) || '' }] });
    } else if (line.startsWith('## ')) {
      flushListBuffer();
      nodes.push({ type: 'heading-two', children: [{ text: line.substring(3) || '' }] });
    } else if (line.startsWith('### ')) {
      flushListBuffer();
      nodes.push({ type: 'heading-three', children: [{ text: line.substring(4) || '' }] });
    } else if (line.startsWith('> ')) {
      flushListBuffer();
      nodes.push({ type: 'block-quote', children: [{ text: line.substring(2) || '' }] });
    } else if (line.startsWith('* ') || line.startsWith('- ')) {
      const listItem = { type: 'list-item', children: [{ text: line.substring(2) || '' }] };
      if (!listBuffer) {
        listBuffer = { type: 'bulleted-list', children: [] };
      }
      listBuffer.children.push(listItem);
    } else if (line.trim() === '---' || line.trim() === '___') {
      flushListBuffer();
      nodes.push({ type: 'divider', children: [{ text: '' }] });
    } else {
      flushListBuffer();
      nodes.push({ type: 'paragraph', children: [{ text: line || '' }] });
    }
  }

  flushListBuffer();

  // ✅ children이 없는 노드가 없도록 검사
  const sanitized = nodes.map(node => ({
    ...node,
    children:
      Array.isArray(node.children) && node.children.length > 0
        ? node.children
        : [{ text: '' }],
  }));

  return sanitized.length > 0 ? sanitized : [{ type: 'paragraph', children: [{ text: '' }] }];
};



const Leaf = ({ attributes, children, leaf, onMouseEnterLink, onMouseLeaveLink }) => {
    const handleMouseEnter = e => {
      if (leaf.obsidianLink) onMouseEnterLink(e, leaf.linkValue);
    };

    const handleMouseLeave = () => {
      if (leaf.obsidianLink) onMouseLeaveLink();
    };

    if (leaf.syntaxToken) {
        return (
            <span
                {...attributes}
                className={css`
                    font-size: 0.1px; 
                    opacity: 0; 
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
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
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


export default function NoteView({ id, markdown, onChange }) {
    const { createNoteFromTitle, notes, upsertNote, deleteNote } = useNotes();
    const { openTab, updateTitle, clostTab_noteID } = useTabs();
    const { selectedGroupId } = useGroups();
    
    const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
    const [hoverEditor] = useState(() => withReact(withHistory(createEditor())));
    const [hoverValue, setHoverValue] = useState([]);
    const [isHovering, setIsHovering] = useState(false);
    const hoverTimer = useRef(null); 

    const decorate = useMemo(() => Decorations(), []);
    const editor = useMemo(() => Shortcuts(withReact(withHistory(createEditor()))), []);
    const titleEditor = useMemo(() => withReact(withHistory(createEditor())), []);
    
    const titleValue = useMemo(() => [{
        type: 'heading-one',
        children: [{ text: id || '' }],
    }], [id]);

    // eslint-disable-next-line
    const initialValue = useMemo(() => deserialize(markdown), [id, markdown]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState(null);


    const handleMouseEnterLink = useCallback((e, link) => {
      // 팝업 내부인지 체크
      if (e.target.closest('.hover-preview-popup')) {
        return; // 팝업 안쪽이면 hover 무시
      }

      clearTimeout(hoverTimer.current);
      setIsHovering(true);

      const rect = e.target.getBoundingClientRect();
      setPopupPosition({
        top: rect.top + window.scrollY,
        left: rect.right + window.scrollX + 8,
      });

      const content = notes[link]?.content || '내용 없음';
      const slateNodes = deserialize(content);
      setHoverValue(slateNodes);

      Editor.withoutNormalizing(hoverEditor, () => {
        const totalNodes = hoverEditor.children.length;
        for (let i = totalNodes - 1; i >= 0; i--) {
          Transforms.removeNodes(hoverEditor, { at: [i] });
        }
        Transforms.insertNodes(hoverEditor, slateNodes, { at: [0] });
      });
    }, [notes, hoverEditor]);

    const handleMouseLeaveLink = useCallback(() => {
      hoverTimer.current = setTimeout(() => {
        setIsHovering(false);
      }, 200);
    }, []);

    const handlePopupMouseEnter = () => {
      clearTimeout(hoverTimer.current);
    };

    const handlePopupMouseLeave = () => {
      setIsHovering(false);
    };

    const renderLeaf = useCallback(props => (
      <Leaf {...props} onMouseEnterLink={handleMouseEnterLink} onMouseLeaveLink={handleMouseLeaveLink} />
    ), [handleMouseEnterLink, handleMouseLeaveLink]);

    useEffect(() => {
        // 제목 편집기 동기화
        if (titleEditor) {
            const currentTitleInEditor = Editor.string(titleEditor, []);
            if (currentTitleInEditor !== id) {
                Transforms.delete(titleEditor, {
                    at: {
                        anchor: Editor.start(titleEditor, []),
                        focus: Editor.end(titleEditor, []),
                    },
                });
                Transforms.insertText(titleEditor, id || '', { at: [0, 0] });
            }
        }

        // 본문 편집기 동기화
        if (editor) {
            const currentMarkdown = serialize(editor.children);
            if (currentMarkdown !== markdown) {
                Editor.withoutNormalizing(editor, () => {
                    const totalNodes = editor.children.length;
                    for (let i = totalNodes - 1; i >= 0; i--) {
                        Transforms.removeNodes(editor, { at: [i] });
                    }
                    const newNodes = (initialValue && initialValue.length > 0)
                        ? initialValue
                        : [{ type: 'paragraph', children: [{ text: '' }] }];
                    Transforms.insertNodes(editor, newNodes, { at: [0] });
                    Transforms.select(editor, Editor.start(editor, []));
                });
                editor.onChange();
            }
        }
    }, [id, markdown, titleEditor, editor, initialValue]);

    const handleClick = useCallback(e => {
        const target = e.target.closest('[data-link]');
        if (target) {
            const link = target.getAttribute('data-link');
            if(notes[link]) {
                openTab({ title: link, type: 'note', noteId: link });
            } else {
                createNoteFromTitle(link);
            }
        }
    }, [createNoteFromTitle, openTab, notes]);

    const handleDeleteClick = () => {
      setPendingDeleteId(id); // 삭제 대기 중인 노트 ID 저장
      setIsDeleteModalOpen(true); // 모달 열기
    };

    const confirmDelete = () => {
      if (pendingDeleteId === null) return;

      deleteNote(notes[pendingDeleteId].note_id, selectedGroupId);
      console.log(`노트 삭제!`);
      clostTab_noteID(pendingDeleteId);

      setPendingDeleteId(null);
      setIsDeleteModalOpen(false);
    };

    
    useEffect(() => {
        const container = document.getElementById('root');
        container?.addEventListener('click', handleClick);
        return () => container?.removeEventListener('click', handleClick);
    }, [handleClick]);

    const handleKeyDown = useCallback(async (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            const newTitle = Editor.string(titleEditor, []).trim();
            const newContent = serialize(editor.children);

            if (!selectedGroupId) {
                toast.error("저장할 그룹이 선택되지 않았습니다.");
                return;
            }
            if (!newTitle) {
                toast.error("제목은 비워둘 수 없습니다.");
                return;
            }

            const noteData = notes[id];
            const realNoteId = noteData ? noteData.note_id : null;

            const toastId = toast.loading("저장 중...");
            try {
                await upsertNote(selectedGroupId, newTitle, newContent, realNoteId, id);

                if (id !== newTitle) {
                    updateTitle(id, newTitle);
                }
                toast.success('저장되었습니다!', { id: toastId });
            } catch (error) {
                toast.error(`저장 실패: ${error.message}`, { id: toastId });
            }
        }
    }, [id, notes, editor, titleEditor, upsertNote, updateTitle, selectedGroupId]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

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
                onchange={value => { const newMarkdown = serialize(value); onChange(newMarkdown); }}
                decorate={decorate}
                renderLeaf={renderLeaf}
                onDeleteClick={handleDeleteClick}
                onDOMBeforeInput={event => {
                  switch (event.inputType) {
                    case 'formatBold'     : event.preventDefault(); return toggleMark(editor, 'bold');
                    case 'formatItalic'   : event.preventDefault(); return toggleMark(editor, 'italic');
                    case 'formatUnderline': event.preventDefault(); return toggleMark(editor, 'underline');
                    default : return;
                  }
                }}
            />
            {isHovering && (
                <div
                    onMouseEnter={handlePopupMouseEnter}
                    onMouseLeave={handlePopupMouseLeave}
                    className={`hover-preview-popup ${css`
                      position: fixed;
                      top: ${popupPosition.top}px;
                      left: ${popupPosition.left}px;
                      background: white;
                      border: 1px solid #ccc;
                      padding: 8px;
                      max-width: 500px;
                      max-height: 80vh;
                      overflow: auto;
                      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                      z-index: 9999;
                    `}`}
                  >
                  <Slate editor={hoverEditor} initialValue={hoverValue}>
                    <Editable
                      readOnly
                      decorate={decorate}
                      renderLeaf={renderLeaf}
                    />
                  </Slate>
                </div>
            )}
            {isDeleteModalOpen && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <p>정말 이 노트를 삭제하시겠습니까?</p>
                  <div className="modal-buttons">
                    <button onClick={confirmDelete}>예</button>
                    <button onClick={() => {
                      setIsDeleteModalOpen(false);
                      setPendingDeleteId(null);
                    }}>아니오</button>
                  </div>
                </div>
              </div>
            )}
        </div>
    );
}