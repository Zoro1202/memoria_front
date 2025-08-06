import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { TextEditor } from './Util/textEditor';
import { Decorations } from './Util/Decorations';
import { Shortcuts } from './Util/Shortcuts';
import { createEditor, Editor, Transforms, Text, Range, Point, Path, Node } from 'slate';
import { withHistory } from 'slate-history';
import { withReact, Slate, Editable, ReactEditor, useSlate } from 'slate-react';
import { Calendar, Clock, User, Hash, ArrowRight, ArrowLeft, Link } from 'lucide-react';
import { css, cx } from '@emotion/css';
import { toggleMark } from './Util/Toolbar';

import { useNotes } from '../../Contexts/NotesContext';
import { useTabs } from "../../Contexts/TabsContext";
import { toast } from 'react-hot-toast';
import './Note.css';
import { useGroups } from "../../Contexts/GroupContext";

import LinkedNotes from "../Sidebar/util/LinkedNotes";

// =================================================
// Markdown <-> Slate 변환 로직
// =================================================
//#region 마크다운>Slate Serialize
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
//#region slate>마크다운 deserialize
const deserialize = (markdown) => {
    if (typeof markdown !== 'string') return [{ type: 'paragraph', children: [{ text: '' }] }];
    
    const lines = markdown.split('\n');
    const nodes = [];
    let listBuffer = null;

    const flushListBuffer = () => { if (listBuffer) {nodes.push(listBuffer);listBuffer = null;} };

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
function transformCursorPosition(cursorPos, op) {
    let newPos = cursorPos;

    if (Array.isArray(op.p) && op.p[0] === 'content') {
        const index = op.p[1] || 0;

        // 전체 교체인 경우 (p.length === 1)
        if (op.p.length === 1 && op.od && op.oi) {
            // 전체 교체 시에는 커서 위치를 그대로 유지
            // (단, 새 문서 길이를 초과하지 않도록)
            newPos = Math.min(cursorPos, op.oi.length);
            return newPos;
        }

        // 부분 변경인 경우에만 기존 로직 적용
        if (op.si) {
            if (index <= newPos) {
                newPos += op.si.length;
            }
        } else if (op.sd) {
            const delLen = op.sd.length;
            if (index + delLen <= newPos) {
                newPos -= delLen;
            } else if (index < newPos) {
                newPos = index;
            }
        }
    }

    return Math.max(0, newPos);
}
//region 현재 커서 위치
function getCursorIndex(editor) {
  if (!editor.selection) return null;

  const { anchor } = editor.selection; // anchor 또는 focus 사용
  let offset = 0;

  // 에디터 내 모든 텍스트 노드 순회
  for (const [node, path] of Node.texts(editor)) {
    if (Editor.isStart(editor, anchor, path)) {
      // anchor가 이 노드의 시작점과 일치하면 현재 offset + anchor.offset 리턴
      return offset + anchor.offset;
    }
    // anchor가 아직 이 노드 위치보다 뒤에 있으면 누적
    offset += node.text.length;
  }

  return null; // 포인터 위치 찾지 못한 경우
}

//region 커서 위치 지정
function moveCursorToIndex(editor, pos) {
  let offset = 0;
  let targetPoint = null;

  // 편집기 내부 노드들을 순회
  for (const [node, path] of Node.texts(editor)) {
    const length = node.text.length;

    if (offset + length >= pos) {
      // pos가 이 텍스트 노드 범위 내에 있음
      targetPoint = { path, offset: pos - offset };
      break;
    }
    offset += length;
  }

  if (targetPoint) {
    Transforms.select(editor, { anchor: targetPoint, focus: targetPoint }); // 커서 단일 위치 지정
    Transforms.collapse(editor, { edge: 'start' }); // 혹은 'end' 원하는 방향
  } else {
    // 범위 벗어난 위치 처리: 텍스트 끝으로 설정
    const end = Editor.end(editor, []);
    Transforms.select(editor, end);
  }
}

// #region NoteView
export default function NoteView({ id, markdown, onChange }) {
    const { createNoteFromTitle, notes, upsertNote, deleteNote, refreshSingleNote, loadNotes, connectNote, docRef } = useNotes();
    const { openTab, updateTitle, clostTab_noteID, activeTabId, noteIdFromTab } = useTabs();
    const { selectedGroupId } = useGroups();
    const [selection, setSelection] = useState(null);
    const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
    const [hoverEditor] = useState(() => withReact(withHistory(createEditor())));
    const [hoverValue, setHoverValue] = useState([]);
    const [isHovering, setIsHovering] = useState(false);
    const hoverTimer = useRef(null);
    const [showMetadata, setShowMetadata] = useState(false); // 메타데이터 표시 토글
    const decorate = useMemo(() => Decorations(), []);
    const editor = useMemo(() => withHistory(withReact(createEditor())), []); const titleEditor = useMemo(() => withReact(withHistory(createEditor())), []);
    const titleValue = useMemo(() => [{ type: 'heading-one', children: [{ text: id || '' }], }], [id]);

    // eslint-disable-next-line
    const initialValue = useMemo(() => deserialize(markdown), [id, markdown]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState(null);

    // region 링크된 노트들 띄우는 오른쪽 사이드바 토글
    const [linkedNotesOpen, setLinkedNotesOpen] = useState(true);
    const handleSelectionChange = useCallback((newSelection) => { setSelection(newSelection)}, [])

    useEffect(()=>{
        connectNote(String(notes[id].note_id), {
            onload : (data)=>{
                console.log('onload!', data, docRef.current);
                //# region input 핸들러
                // console.log('[title input] 감지됨:', e.target.value);
                // const oldVal = doc.data.title || '';
                // const newVal = e.target.value;
                // const ops = generateTextDiffOps(oldVal, newVal, ['title']);
                // console.log('[title input op]', ops);
                // if (ops.length > 0) {
                //     doc.submitOp(ops, (err) => {
                //         if (err) console.error('[title input] op 전송 실패', err);
                //         else console.log('[title input] op 전송 성공');
                //     });
                // }
                //#endregion
/**
                //#region 커서 핸들러들
                doc.on('before op', (ops, source) => {
                    console.log('[before op] 이벤트 트리거 - source:', source, 'ops:', ops);  // 추가: 이벤트 트리거 확인
                    if (source) {
                    
                    console.log('[before op] saveCursorPos 후 cursorPos:', cursorPos);
                    }
                });
                
                
                doc.on('before op batch', (ops, source) => {
                //   if (source) {
                //     console.log('로컬 op 전 커서 저장');
                //     callbacks?.saveCursorPos?.();
                //   }
                });
                // //  원격 op 적용 시 커서 변환 및 복원
                doc.on('op', (ops, source) => {
                  if (source) return; // 로컬 작업이면 무시

                //   if (isTypingKorean) {
                //     queuedOps.push(ops);
                //     return;
                //   }

                  console.log('[op] 조합 중 원격 변경 감지, 신중히 처리');

                  ops.forEach((op, idx) => {
                    const before = cursorPos;
                    cursorPos = transformCursorPosition(cursorPos, op);
                    console.log(`[op] transform[${idx}] ${before} → ${cursorPos}`, op);
                  });
    
                  // 문서 내용 업데이트
    
                  // 커서·포커스 복원
                  if (hadFocus) {
                  }
                });
                // //#endregion
**/
            }, 
            onError : (err)=>{
                console.log('onError!', err);
            }});

    }, [activeTabId]);
    const noteMetadata = useMemo(() => {
        const noteData = notes[id];
        if (!noteData) return null;

        return {
            note_id: noteData.note_id,
            created_at: noteData.created_at,
            update_at: noteData.update_at,
            subject_id: noteData.subject_id,
            group_id: noteData.group_id
        };
    }, [notes, id]);
    // 날짜 포맷팅 함수
    const formatDate = (dateString) => {
        if (!dateString) return '정보 없음';
        const date = new Date(dateString);
        return date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // 상대 시간 표시 함수
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

    // 메타데이터 컴포넌트
    const MetadataPanel = () => {
        if (!noteMetadata) return null;

        return (
            <div className={css`
                margin: 20px 0;
                padding: 16px;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                font-size: 13px;
                color: #64748b;
            `}>
                <div className={css`
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                `}>
                    <h4 className={css`
                        margin: 0;
                        font-size: 14px;
                        font-weight: 600;
                        color: #475569;
                    `}>
                        노트 정보
                    </h4>
                    <button
                        onClick={() => setShowMetadata(false)}
                        className={css`
                            background: none;
                            border: none;
                            color: #64748b;
                            cursor: pointer;
                            padding: 4px;
                            border-radius: 4px;
                            
                            &:hover {
                                background: #e2e8f0;
                            }
                        `}
                    >
                        ✕
                    </button>
                </div>

                <div className={css`
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                    
                    @media (max-width: 640px) {
                        grid-template-columns: 1fr;
                    }
                `}>
                    {/* 생성 정보 */}
                    <div className={css`
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    `}>
                        <div className={css`
                            display: flex;
                            align-items: center;
                            gap: 6px;
                        `}>
                            <Calendar size={14} />
                            <span className={css`font-weight: 500;`}>생성일</span>
                        </div>
                        <div className={css`margin-left: 20px;`}>
                            <div>{formatDate(noteMetadata.created_at)}</div>
                            <div className={css`
                                font-size: 11px;
                                color: #94a3b8;
                                margin-top: 2px;
                            `}>
                                {getRelativeTime(noteMetadata.created_at)}
                            </div>
                        </div>
                    </div>

                    {/* 수정 정보 */}
                    <div className={css`
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    `}>
                        <div className={css`
                            display: flex;
                            align-items: center;
                            gap: 6px;
                        `}>
                            <Clock size={14} />
                            <span className={css`font-weight: 500;`}>최종 수정</span>
                        </div>
                        <div className={css`margin-left: 20px;`}>
                            <div>{formatDate(noteMetadata.update_at)}</div>
                            <div className={css`
                                font-size: 11px;
                                color: #94a3b8;
                                margin-top: 2px;
                            `}>
                                {getRelativeTime(noteMetadata.update_at)}
                            </div>
                        </div>
                    </div>

                    {/* 추가 정보 */}
                    <div className={css`
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    `}>
                        <div className={css`
                            display: flex;
                            align-items: center;
                            gap: 6px;
                        `}>
                            <Hash size={14} />
                            <span className={css`font-weight: 500;`}>노트 ID</span>
                        </div>
                        <div className={css`
                            margin-left: 20px;
                            font-family: 'Fira Code', monospace;
                            background: #e2e8f0;
                            padding: 2px 6px;
                            border-radius: 4px;
                            display: inline-block;
                        `}>
                            #{noteMetadata.note_id}
                        </div>
                    </div>

                    {/* 작성자 정보 */}
                    {noteMetadata.subject_id && (
                        <div className={css`
                            display: flex;
                            flex-direction: column;
                            gap: 8px;
                        `}>
                            <div className={css`
                                display: flex;
                                align-items: center;
                                gap: 6px;
                            `}>
                                <User size={14} />
                                <span className={css`font-weight: 500;`}>작성자</span>
                            </div>
                            <div className={css`
                                margin-left: 20px;
                                font-size: 12px;
                                color: #475569;
                            `}>
                                {noteMetadata.subject_id}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };
    //region link hover Enter 콜백
    const handleMouseEnterLink = useCallback((e, link) => {
        // 팝업 내부인지 체크
        // console.log(e, link);
        if (e.target.closest('.hover-preview-popup'))  return; // 팝업 안쪽이면 hover 무시
        
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
    // region link hover Leave 콜백
    const handleMouseLeaveLink = useCallback(() => {
        hoverTimer.current = setTimeout(() => {
            setIsHovering(false);
        }, 200);
    }, []);    
    // region 노트 모달 관련
    const handlePopupMouseEnter = () => {
        clearTimeout(hoverTimer.current);
    };

    const handlePopupMouseLeave = () => { 
        setIsHovering(false);
    };
    //region renderLeaf
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
            if (notes[link]) {
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
    //region ctrl+s 
    const handleKeyDown = useCallback(async (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if(noteIdFromTab(activeTabId) !== id) return; // 현재 탭이 아니면 저장하지 않음
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
                const result = await upsertNote(selectedGroupId, newTitle, newContent, realNoteId);
                let titleChanged = false;
                // 제목이 변경된 경우
                if (id !== newTitle) {
                    updateTitle(id, newTitle);
                    titleChanged = true;
                }
                loadNotes(selectedGroupId);  // 노트 목록 다시 불러오기 

                // ✅ 저장된 노트의 최신 메타데이터만 가져오기
                // handleKeyDown에서 호출 방식 개선
                const finalNoteId = result.noteId || realNoteId;
                if (finalNoteId) {
                    if (titleChanged) {
                        // 제목이 변경된 경우
                        await refreshSingleNote(finalNoteId, selectedGroupId, {
                            oldTitle: id,
                            newTitle: newTitle
                        });
                    } else {
                        // 메타데이터만 업데이트
                        await refreshSingleNote(finalNoteId, selectedGroupId);
                    }
                }


                toast.success('저장되었습니다!', { id: toastId });
            } catch (error) {
                toast.error(`저장 실패: ${error.message}`, { id: toastId });
            }
        }
        //region 커서 위치 변경 테스트
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            console.log('current : ',getCursorIndex(editor));
            moveCursorToIndex(editor, 10);
            console.log('current : ',getCursorIndex(editor));

        }
    }, [id, notes, editor, titleEditor, upsertNote, updateTitle, selectedGroupId, refreshSingleNote]);
    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
    //#region 
    const handleTitleChanged = () => {
        console.log(`title Changed!`);
    }
    const handleContentChanged = (value) => {
        const newMarkdown = serialize(value); 
        onChange(newMarkdown);
        console.log(`content Changed!`);
    }

    return (
        <div
            className={css`
                display: flex;
                position: relative;
                /*margin: 50px auto;*/
                /* max-width: 1200px;  필요에 따라 조정 */
                background: #fff;
                border-radius: 12px;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
                font-family: 'Segoe UI', sans-serif;
                line-height: 1.7;
                height: calc(100vh - 55px);  /* 원하는 높이로 고정 (스크롤 처리 용이하게) */
                overflow: hidden;
                `}
        >
            {/* 왼쪽: 노트 본문 (flex-grow:1로 확장) */}
            <div
                className={css`
                    flex: 1;
                    padding: 30px 40px;
                    overflow-y: auto;
                    min-width: 0; /* 유연한 줄바꿈 위해 */
                `}
            >
                {/* 제목 영역 */}
                <div className={css`
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 20px;
                `}>
                    <div className={css`flex: 1;`}>
                        <Slate editor={titleEditor} initialValue={titleValue} onChange={handleTitleChanged}> 
                            <Editable
                                renderElement={({ attributes, children }) => (
                                    <h1 {...attributes} style={{ fontSize: '2em', fontWeight: 'bold', margin: 0 }}>
                                        {children}
                                    </h1>
                                )}
                                placeholder="제목을 입력하세요..."
                            />
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

                {/* 간단한 메타데이터 표시 (항상 보이는 버전) */}
                {noteMetadata && !showMetadata && (
                    <div className={css`
                        display: flex;
                        gap: 16px;
                        margin-bottom: 20px;
                        font-size: 12px;
                        color: #64748b;
                        padding-bottom: 12px;
                        border-bottom: 1px solid #f1f5f9;
                    `}>
                        {noteMetadata.created_at && (
                            <span className={css`
                                display: flex;
                                align-items: center;
                                gap: 4px;
                            `}>
                                <Calendar size={12} />
                                생성: {getRelativeTime(noteMetadata.created_at)}
                            </span>
                        )}
                        {noteMetadata.update_at && (
                            <span className={css`
                                display: flex;
                                align-items: center;
                                gap: 4px;
                            `}>
                                <Clock size={12} />
                                수정: {getRelativeTime(noteMetadata.update_at)}
                            </span>
                        )}
                    </div>
                )}

                {/* 상세 메타데이터 패널 */}
                {showMetadata && <MetadataPanel />}

                {/* 본문 에디터 */}
                <TextEditor
                    onSelectionChange={handleSelectionChange}
                    editor={editor}
                    initialValue={initialValue}
                    onchange={handleContentChanged}
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
                {/* 기존 hover preview와 delete modal */}
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
