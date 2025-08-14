import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { TextEditor } from './Util/textEditor';
import { Decorations } from './Util/Decorations';
import { createEditor, Editor, Transforms, Text, Range, Path } from 'slate';
import { withHistory } from 'slate-history';
import { withReact, Slate, Editable, useSlate } from 'slate-react';
import { Calendar, Clock, User, Hash, ArrowRight, ArrowLeft} from 'lucide-react';
import { withCursors, withYjs, YjsEditor, withYHistory } from '@slate-yjs/core';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { withNormalize } from "./Util/Normalize";
import { randomCursorData } from "./Util/alpha";
import * as Y from 'yjs';
import { css, cx } from '@emotion/css';
import { toggleMark } from './Util/Toolbar';

import { useNotes } from '../../Contexts/NotesContext';
import { useTabs } from "../../Contexts/TabsContext";
import { toast } from 'react-hot-toast';
import './Note.css';
import { useGroups } from "../../Contexts/GroupContext";

import LinkedNotes from "../Sidebar/util/LinkedNotes";

// =================================================
// Markdown <-> Slate 변환 로직 (원본 유지)
// =================================================
const serialize = nodes => {
  if (!nodes || !Array.isArray(nodes)) return '';
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
  if (typeof markdown !== 'string') return [{ type: 'paragraph', children: [{ text: '' }] }];
  const lines = markdown.split('\n');
  const nodes = [];
  let listBuffer = null;
  const flushListBuffer = () => { if (listBuffer) { nodes.push(listBuffer); listBuffer = null; } };

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
      if (!listBuffer) listBuffer = { type: 'bulleted-list', children: [] };
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
  const sanitized = nodes.map(node => ({
    ...node,
    children: Array.isArray(node.children) && node.children.length > 0 ? node.children : [{ text: '' }],
  }));
  return sanitized.length > 0 ? sanitized : [{ type: 'paragraph', children: [{ text: '' }] }];
};
// region noteView
export default function NoteView({ id, markdown, onChange }) {
  const { createNoteFromTitle, notes, upsertNote, deleteNote, refreshSingleNote, loadNotes, createYjsProvider } = useNotes();
  const { openTab, updateTitle, clostTab_noteID, activeTabId, noteIdFromTab, tabs } = useTabs();
  const { selectedGroupId, user } = useGroups();
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [hoverEditor] = useState(() => withReact(withHistory(createEditor())));
  const [hoverValue, setHoverValue] = useState([]);
  const [isHovering, setIsHovering] = useState(false);
  const hoverTimer = useRef(null);
  const [showMetadata, setShowMetadata] = useState(false);
  const decorate = useMemo(() => Decorations(), []);
  const titleEditor = useMemo(() => withReact(withHistory(createEditor())), []);
  const titleValue = useMemo(() => [{ type: 'heading-one', children: [{ text: id || '' }] }], [id]);

  const [linkedNotesOpen, setLinkedNotesOpen] = useState(false);

  // ✅ markdown 기반 초기값 사용 (이전엔 항상 빈 문단)
  const initialValue = useMemo(() => deserialize(markdown || ''), [markdown]);

  const [value, setValue] = useState([]);
  const [connected, setConnected] = useState(false);
  const [synced, setSynced] = useState(false);

  // ✅ note 변경 시마다 새로운 Y.Doc (렌더마다 새로 만들지 않도록 메모)
  const ydoc = useMemo(() => new Y.Doc(), [id]);

  // ✅ provider name: "노트별" 방으로 통일 (subject_id 포함하면 협업이 분리됨)
  const noteNumericId = notes?.[id]?.note_id;
  const roomName = noteNumericId ? `note-${noteNumericId}` : undefined;

  const provider = useMemo(() => {
    if (!roomName) return null;
    return new HocuspocusProvider({
      url: "wss://yjs.memoriatest.kro.kr",
      name: roomName,
      document: ydoc,
      onConnect: () => setConnected(true),
      onDisconnect: () => { setConnected(false); setSynced(false); },
      onSynced: () => setSynced(true),
      connect: true,
    });
  }, [roomName, ydoc]);

  // ✅ 공유 텍스트 타입 (키는 고정 'content' — 문서(방) 단위로 분리되므로 충돌 없음)
  const editor = useMemo(() => {
    if (!provider) return null;
    const sharedType = provider.document.get('content', Y.XmlText);
    return withNormalize(
      withReact(
        withYHistory(
          withCursors(
            withYjs(createEditor(), sharedType, { autoConnect: false }),
            provider.awareness,
            { data: randomCursorData(user?.displayName || 'unknown') }
          )
        )
      )
    );
  }, [provider, user?.displayName]);

  // provider 연결/해제
  useEffect(() => {
    if (!provider) return;
    provider.connect();
    return () => provider.disconnect();
  }, [provider]);

  // editor <-> provider 동기화 (연결 이후)
  useEffect(() => {
    if (!editor) return;
    if (connected) {
      YjsEditor.connect(editor);
    }
    return () => {
      try { YjsEditor.disconnect(editor); } catch (_) {}
    };
  }, [editor, connected]);

  // 노트 메타데이터
  const noteMetadata = useMemo(() => {
    const noteData = notes?.[id];
    if (!noteData) return null;
    return {
      note_id: noteData.note_id,
      created_at: noteData.created_at,
      update_at: noteData.update_at,
      subject_id: noteData.subject_id,
      group_id: noteData.group_id
    };
  }, [notes, id]);

  const formatDate = (dateString) => {
    if (!dateString) return '정보 없음';
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getRelativeTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    if (diffMinutes < 1) return '방금 전';
    if (diffMinutes < 60) return `${diffMinutes}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
    return `${Math.floor(diffDays / 30)}개월 전`;
  };

    //region Leaf 컴포넌트
    const Leaf = ({ attributes, children, leaf, onMouseEnterLink, onMouseLeaveLink }) => {
        const { selection } = useSlate();
        const isHovered = isHovering === leaf.linkId;

        const handleMouseEnter = e => {
            if (leaf.obsidianLink) onMouseEnterLink(e, leaf.linkValue);
        };

        const handleMouseLeave = () => {
            if (leaf.obsidianLink) onMouseLeaveLink();
        };

        const showSyntax = useMemo(() => {
            if (!selection || !leaf) return false;

            const leafRange = leaf.markdownRange || (leaf.anchor && leaf.focus ? { anchor: leaf.anchor, focus: leaf.focus } : null);
            if (!leafRange?.anchor || !leafRange?.focus) return false;

            // If selection is expanded, show syntax if the leaf's range intersects with the selection
            if (!Range.isCollapsed(selection)) return Range.intersection(selection, leafRange) !== null;
            
            // If selection is collapsed, show syntax if the cursor is inside the full markdown range
            if (leaf.markdownRange) {
                const { anchor } = selection;
                const { markdownRange } = leaf;
                const isSamePath = Path.equals(anchor.path, markdownRange.anchor.path);
                if (!isSamePath) return false;
                return anchor.offset >= markdownRange.anchor.offset && anchor.offset <= markdownRange.focus.offset;
            }
            return false;
        }, [selection, leaf.markdownRange, leaf.anchor, leaf.focus]);


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
                onMouseEnter={e => leaf.obsidianLink && handleMouseEnter(e, leaf.linkId)}
                onMouseLeave={() => leaf.obsidianLink && handleMouseLeave()}
                data-link={leaf.obsidianLink ? leaf.linkValue : undefined}
                className={cx(
                leaf.className,
                css`
                ${leaf.obsidianLink &&
                css`
                    color: #5765f2;
                    text-decoration: underline;
                    cursor: pointer;
                    position: relative; 
                `}
                
                ${(leaf.boldSyntax || leaf.italicSyntax || leaf.codeSyntax) &&
                css`
                    color: ${showSyntax ? '#c5c5c5' : 'transparent'} !important;
                    opacity: ${showSyntax ? 1 : 0} !important;
                    ${!showSyntax && css`
                    position: absolute !important;
                    pointer-events: none !important;
                    `}
                `}
                ${leaf.linkSyntax &&
                css`
                    color: ${showSyntax || isHovered ? '#c5c5c5' : 'transparent'} !important;
                    opacity: ${showSyntax || isHovered ? 1 : 0} !important;
                    ${!(showSyntax || isHovered) && css`
                    position: absolute !important;
                    pointer-events: none !important;
                    `}
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
                `)}
            >
                {children}
                {isHovered && (
                <div
                    style={{
                    position: 'absolute',
                    top: '100%',
                    left: '0',
                    backgroundColor: 'white',
                    border: '1px solid #ccc',
                    padding: '10px',
                    zIndex: 1,
                    }}
                >
                    {leaf.linkValue}
                </div>
                )}
            </span>
            );
    };

  const MetadataPanel = () => {
    if (!noteMetadata) return null;
    return (
      <div className={css`margin:20px 0;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;color:#64748b;`}>
        <div className={css`display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;`}>
          <h4 className={css`margin:0;font-size:14px;font-weight:600;color:#475569;`}>노트 정보</h4>
          <button onClick={() => setShowMetadata(false)} className={css`background:none;border:none;color:#64748b;cursor:pointer;padding:4px;border-radius:4px;&:hover{background:#e2e8f0;}`}>✕</button>
        </div>
        <div className={css`display:grid;grid-template-columns:1fr 1fr;gap:16px;@media (max-width:640px){grid-template-columns:1fr;}`}>
          <div className={css`display:flex;flex-direction:column;gap:8px;`}>
            <div className={css`display:flex;align-items:center;gap:6px;`}><Calendar size={14}/><span className={css`font-weight:500;`}>생성일</span></div>
            <div className={css`margin-left:20px;`}>
              <div>{formatDate(noteMetadata.created_at)}</div>
              <div className={css`font-size:11px;color:#94a3b8;margin-top:2px;`}>{getRelativeTime(noteMetadata.created_at)}</div>
            </div>
          </div>
          <div className={css`display:flex;flex-direction:column;gap:8px;`}>
            <div className={css`display:flex;align-items:center;gap:6px;`}><Clock size={14}/><span className={css`font-weight:500;`}>최종 수정</span></div>
            <div className={css`margin-left:20px;`}>
              <div>{formatDate(noteMetadata.update_at)}</div>
              <div className={css`font-size:11px;color:#94a3b8;margin-top:2px;`}>{getRelativeTime(noteMetadata.update_at)}</div>
            </div>
          </div>
          <div className={css`display:flex;flex-direction:column;gap:8px;`}>
            <div className={css`display:flex;align-items:center;gap:6px;`}><Hash size={14}/><span className={css`font-weight:500;`}>노트 ID</span></div>
            <div className={css`margin-left:20px;font-family:'Fira Code',monospace;background:#e2e8f0;padding:2px 6px;border-radius:4px;display:inline-block;`}>#{noteMetadata.note_id}</div>
          </div>
          {noteMetadata.subject_id && (
            <div className={css`display:flex;flex-direction:column;gap:8px;`}>
              <div className={css`display:flex;align-items:center;gap:6px;`}><User size={14}/><span className={css`font-weight:500;`}>작성자</span></div>
              <div className={css`margin-left:20px;font-size:12px;color:#475569;`}>{noteMetadata.subject_id}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleMouseEnterLink = useCallback((e, link) => {
    if (e.target.closest('.hover-preview-popup')) return;
    clearTimeout(hoverTimer.current);
    setIsHovering(true);
    const rect = e.target.getBoundingClientRect();
    setPopupPosition({ top: rect.top + window.scrollY, left: rect.right + window.scrollX + 8 });
    const content = notes?.[link]?.content || '내용 없음';
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
    hoverTimer.current = setTimeout(() => setIsHovering(false), 200);
  }, []);

  const handlePopupMouseEnter = () => { clearTimeout(hoverTimer.current); };
  const handlePopupMouseLeave = () => { setIsHovering(false); };

  const renderLeaf = useCallback(props => (
    <Leaf {...props} onMouseEnterLink={handleMouseEnterLink} onMouseLeaveLink={handleMouseLeaveLink} />
  ), [handleMouseEnterLink, handleMouseLeaveLink]);

  const handleClick = useCallback(e => {
    const target = e.target.closest('[data-link]');
    if (target) {
      const link = target.getAttribute('data-link');
      if (notes?.[link]) {
        openTab({ title: link, type: 'note', noteId: notes[link].note_id });
      } else {
        createNoteFromTitle(link);
      }
    }
  }, [createNoteFromTitle, openTab, notes]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const handleDeleteClick = () => { setPendingDeleteId(id); setIsDeleteModalOpen(true); };
  const confirmDelete = () => {
    if (pendingDeleteId == null) return;
    if (notes?.[pendingDeleteId]) {
      deleteNote(notes[pendingDeleteId].note_id, selectedGroupId);
      clostTab_noteID(pendingDeleteId);
    }
    setPendingDeleteId(null);
    setIsDeleteModalOpen(false);
  };

  useEffect(() => {
    const container = document.getElementById('root');
    container?.addEventListener('click', handleClick);
    return () => container?.removeEventListener('click', handleClick);
  }, [handleClick]);

  // Ctrl+S 저장 — 현행 로직 유지 (필요시 Yjs에서 직접 문자열 추출하도록 변경 가능)
  const handleKeyDown = useCallback(async (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      const newTitle = Editor.string(titleEditor, []).trim();
      const newContent = serialize(editor ? editor.children : initialValue);
      if (!selectedGroupId) return toast.error("저장할 그룹이 선택되지 않았습니다.");
      if (!newTitle) return toast.error("제목은 비워둘 수 없습니다.");

      const noteData = notes?.[id];
      const realNoteId = noteData ? noteData.note_id : null;
      const toastId = toast.loading("저장 중...");
      try {
        const result = await upsertNote(selectedGroupId, newTitle, newContent, realNoteId);
        let titleChanged = false;
        if (id !== newTitle) { updateTitle(id, newTitle); titleChanged = true; }
        await loadNotes(selectedGroupId);
        const finalNoteId = result.noteId || realNoteId;
        if (finalNoteId) {
          if (titleChanged) {
            await refreshSingleNote(finalNoteId, selectedGroupId, { oldTitle: id, newTitle });
          } else {
            await refreshSingleNote(finalNoteId, selectedGroupId);
          }
        }
        toast.success('저장되었습니다!', { id: toastId });
      } catch (error) {
        toast.error(`저장 실패: ${error.message}`, { id: toastId });
      }
    }
  }, [id, notes, editor, titleEditor, selectedGroupId, upsertNote, updateTitle, loadNotes, refreshSingleNote, initialValue]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className={css`display:flex;position:relative;background:#fff;border-radius:12px;box-shadow:0 5px 15px rgba(0,0,0,0.1);font-family:'Segoe UI',sans-serif;line-height:1.7;height:calc(100vh - 55px);overflow:hidden;`}>
      <div className={css`flex:1;padding:30px 40px;overflow-y:auto;min-width:0;`}>
        <div className={css`display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;`}>
          <div className={css`flex:1;`}>
            <Slate editor={titleEditor} initialValue={titleValue}>
              <Editable renderElement={({ attributes, children }) => (
                <h1 {...attributes} style={{ fontSize: '2em', fontWeight: 'bold', margin: 0 }}>{children}</h1>
              )} placeholder="제목을 입력하세요..." />
            </Slate>
          </div>

                    {/* 메타데이터 토글 버튼 */}
          {noteMetadata && (
                        <button
                            onClick={() => setShowMetadata(!showMetadata)}
                            className={css`
                            background: none;
                            border: 1px solid #e2e8f0;
                            color: #64748b;
                            cursor: pointer;
                            padding: 8px 12px;
                            border-radius: 6px;
                            font-size: 12px;
                            margin-left: 16px;
                            transition: all 0.15s;
                            
                            &:hover {
                                background: #f1f5f9;
                                border-color: #cbd5e1;
                            }
                        `}
                        >
              {showMetadata ? '정보 숨기기' : '노트 정보'}
            </button>
          )}
        </div>

        {noteMetadata && !showMetadata && (
          <div className={css`display:flex;gap:16px;margin-bottom:20px;font-size:12px;color:#64748b;padding-bottom:12px;border-bottom:1px solid #f1f5f9;`}>
            {noteMetadata.created_at && (<span className={css`display:flex;align-items:center;gap:4px;`}><Calendar size={12}/>생성: {getRelativeTime(noteMetadata.created_at)}</span>)}
            {noteMetadata.update_at && (<span className={css`display:flex;align-items:center;gap:4px;`}><Clock size={12}/>수정: {getRelativeTime(noteMetadata.update_at)}</span>)}
          </div>
        )}

        {showMetadata && <MetadataPanel />}

        {/* 본문 에디터 */}
        {editor && (
          <TextEditor
            value={value}
            editor={editor}
            initialValue={initialValue}
            onchange={setValue}
            decorate={decorate}
            renderLeaf={renderLeaf}
            onDeleteClick={handleDeleteClick}
            onDOMBeforeInput={event => {
              switch (event.inputType) {
                case 'formatBold': event.preventDefault(); return toggleMark(editor, 'bold');
                case 'formatItalic': event.preventDefault(); return toggleMark(editor, 'italic');
                case 'formatUnderline': event.preventDefault(); return toggleMark(editor, 'underline');
                default: return;
              }
            }}
          />
        )}

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

      {/* 오른쪽: LinkedNotes 사이드바 */}
            <div
                className={css`
                    width: ${linkedNotesOpen ? "350px" : "0px"};
                    transition: width 0.2s;
                    background: #fcfcfd;
                    border-left: 1px solid #e5e7eb;
                    box-shadow: -2px 0 8px rgba(80, 100, 98, 0.06);
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    z-index: 1;
                `}
            >
                {/* 토글 버튼 */}
                <button
                    onClick={() => setLinkedNotesOpen(open => !open)}
                    className={css`
                        position: absolute;
                        top: 5px;
                        left: -50px;
                        width: 34px;
                        height: 34px;
                        border-radius: 17px;
                        background: #f5f7fa;
                        border: 1px solid #e5e7eb;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        z-index: 2;
                        transition: left 0.2s;
                        `}
                    aria-label={linkedNotesOpen ? "연결노트 닫기" : "연결노트 열기"}
                >
                    {linkedNotesOpen
                        ? <ArrowRight size={18} color="#64748b" />
                        : <ArrowLeft size={18} color="#64748b" />
                    }
        </button>

                {/* LinkedNotes 내용 (열릴 때만) */}
                {linkedNotesOpen && (
                    <div
                        className={css`
                            height: 100%;
                            overflow-y: auto;
                            padding: 32px 18px 18px 24px;
                            transition: opacity 0.2s;
                        `}
                    >
          <LinkedNotes />
                    </div>
                )}
            </div>
      </div>
  );
}