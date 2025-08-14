// src/components/LinkedNotes.js
import React, { useMemo, useState } from 'react';
import { ArrowDownFromLine, ArrowUpToLine } from 'lucide-react';
import { useNotes } from '../../../Contexts/NotesContext';
import { useTabs } from '../../../Contexts/TabsContext';

/**
 * 현재 활성 탭이 note 인 경우,
 *  - outbound  : 현재 노트 → 다른 노트
 *  - inbound   : 다른 노트 → 현재 노트
 * 를 리스트로 보여 주는 컴포넌트
 */
export default function LinkedNotes() {
  // #region 컨텍스트 
  const { notes, links } = useNotes();
  const { tabs, activeTabId, openTab } = useTabs();

  
  // #region 각 노트별 확장 여부
  const [expanded, setExpanded] = useState({});
  

  // #region 현재 활성 노트 탭
  const activeTab = tabs.find(
    (t) => t.id === activeTabId && t.type === 'note'
  );

  // #region 확장/축소 토글 함수
  const handleToggle = (title) => {
    setExpanded(prev => ({ ...prev, [title]: !prev[title] }));
  };

  //#region 현재 열려있는 노트
  const activeNoteTitle = useMemo(() => {
    if (!activeTab) return null;        // 내부에서 처리
    // const found = Object.entries(notes).find(
    //   ([, v]) => v.note_id === activeTab.noteId
    // ); // found ? found[0] : 
    return activeTab.title;
  }, [notes, activeTabId]);
  //#region 노트에 연결된 링크들
  const { outboundTitles, inboundTitles } = useMemo(() => {
    if (!activeTab) return { outboundTitles: [], inboundTitles: [] };
    const outbound = [];
    const inbound = [];
    links.forEach(({ source, target }) => {
      if (source === activeNoteTitle) outbound.push(target);
      if (target === activeNoteTitle) inbound.push(source);
    });
    return {
      outboundTitles: [...new Set(outbound)],
      inboundTitles:  [...new Set(inbound)],
    };
  }, [links, activeNoteTitle]);

  // #region 탭 열기
  const handleOpen = (title) => {
    const note = notes[title];
    if (!note) return; // 아직 로컬에 없는 노트일 수도 있음
    openTab({
      type    : 'note',
      title,
      noteId  : note.note_id
    });
  };

  //#region DOM
  return (
    <div style={{ padding: '1rem', borderLeft: '1px solid #ddd' }}>
      <h3 style={{ marginTop: 0 }}>연결된 노트</h3>

      {/* Outbound ---------------------------------------------------------- */}
      <section>
        <h4 style={{ margin: '0.5rem 0' }}>이 노트가 링크한 문서</h4>
        {outboundTitles.length === 0 ? (
          <p style={{ color: '#888', margin: 0 }}>없음</p>
        ) : (
          <ul style={{ paddingLeft: 18 }}>
            {outboundTitles.map(title => {
              const note = notes[title];
              const isOpen = !!expanded[title];
              return (
                <li key={title} style={{ marginBottom: '0.75rem' }}>
                  <button
                    style={{
                      background: 'none', border: 'none', padding: 0,
                      color: '#0a6aff', cursor: 'pointer', fontWeight: 'bold'
                    }}
                    onClick={() => handleOpen(title)}
                  >
                    {title}
                  </button>
                  <button
                    onClick={() => handleToggle(title)}
                    style={{
                      marginLeft: 8, background: 'none', border: 'none',
                      cursor: 'pointer', verticalAlign: 'middle', padding: 0,
                      display: 'inline-flex', alignItems: 'center'
                    }}
                    aria-label={isOpen ? '접기' : '확장'}
                  >
                    {isOpen
                      ? <ArrowUpToLine size={18} color="#666" />
                      : <ArrowDownFromLine size={18} color="#666" />
                    }
                  </button>
                  {/* 확장된 경우에만 본문 표시 */}
                  {isOpen && note && (
                    <div
                      style={{
                        marginTop: 2, fontSize: 13, color: '#333',
                        background: '#fafbff', border: '1px solid #eee',
                        borderRadius: 4, padding: '0.5rem',
                        maxHeight: 300, overflowY: 'auto', whiteSpace: 'pre-line'
                      }}
                    >
                      {note.content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

        )}
      </section>

      {/* Inbound (Backlinks) ---------------------------------------------- */}
      <section style={{ marginTop: '1rem' }}>
        <h4 style={{ margin: '0.5rem 0' }}>이 노트를 링크한 문서</h4>
        {inboundTitles.length === 0 ? (
          <p style={{ color: '#888', margin: 0 }}>없음</p>
        ) : (
          <ul style={{ paddingLeft: 18 }}>
            {inboundTitles.map(title => {
              const note = notes[title];
              const isOpen = !!expanded[title];
              return (
                <li key={title} style={{ marginBottom: '0.75rem' }}>
                  <button
                    style={{
                      background: 'none', border: 'none', padding: 0,
                      color: '#0a6aff', cursor: 'pointer', fontWeight: 'bold'
                    }}
                    onClick={() => handleOpen(title)}
                  >
                    {title}
                  </button>
                  <button
                    onClick={() => handleToggle(title)}
                    style={{
                      marginLeft: 8, background: 'none', border: 'none',
                      cursor: 'pointer', verticalAlign: 'middle', padding: 0,
                      display: 'inline-flex', alignItems: 'center'
                    }}
                    aria-label={isOpen ? '접기' : '확장'}
                  >
                    {isOpen
                      ? <ArrowUpToLine size={18} color="#666" />
                      : <ArrowDownFromLine size={18} color="#666" />
                    }
                  </button>
                  {/* 확장된 경우에만 본문 표시 */}
                  {isOpen && note && (
                    <div
                      style={{
                        marginTop: 2, fontSize: 13, color: '#333',
                        background: '#fafbff', border: '1px solid #eee',
                        borderRadius: 4, padding: '0.5rem',
                        maxHeight: 300, overflowY: 'auto', whiteSpace: 'pre-line'
                      }}
                    >
                      {note.content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
