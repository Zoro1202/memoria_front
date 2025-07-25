// NoteList.js
import React, { useState, useEffect, useRef } from 'react';
import './GroupList.css'; // 동일한 스타일 사용
import { PlusCircle, X, Trash2, FileText, Search } from 'lucide-react';
import { useNotes } from '../../../Contexts/NotesContext';
import { useGroups } from '../../../Contexts/GroupContext';
import { useTabs } from '../../../Contexts/TabsContext';
import { toast } from 'react-hot-toast';

const NoteList = ({ onNoteSelect }) => {
  const { 
    notes, 
    loading, 
    currentGroupId, 
    loadNotes_lagacy, 
    deleteNote, 
    upsertNote 
  } = useNotes();
  
  const { selectedGroupId } = useGroups();
  const { openNote } = useTabs(); // 탭에서 노트 열기 함수
  
  const [isOpen, setIsOpen] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef(null);

  // 그룹이 변경될 때마다 노트 로드
  // useEffect(() => {
  //   if (selectedGroupId) {
  //     loadNotes_lagacy(selectedGroupId);
  //   }
  // }, [selectedGroupId]);

  // 입력창이 표시될 때 포커스
  useEffect(() => {
    if (showAdd && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showAdd]);

  // 노트 배열로 변환 및 검색 필터링
  const notesArray = Object.values(notes || {}).filter(note => 
    note.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 노트 선택 핸들러
  const handleNoteSelect = (note) => {
    setSelectedNoteId(note.note_id);
    if (onNoteSelect) {
      onNoteSelect(note);
    }
    // 탭에서 노트 열기
    if (openNote) {
      openNote(note);
    }
    toast.success(`"${note.title}" 노트가 열렸습니다.`);
  };

  // 노트 삭제 핸들러
  const handleNoteDelete = async (note, e) => {
    e.stopPropagation(); // 부모 클릭 이벤트 방지
    
    if (window.confirm(`"${note.title}" 노트를 정말 삭제하시겠습니까?`)) {
      try {
        await deleteNote(note.note_id, selectedGroupId);
        if (selectedNoteId === note.note_id) {
          setSelectedNoteId(null);
        }
        toast.success(`"${note.title}" 노트가 삭제되었습니다.`);
      } catch (error) {
        toast.error('노트 삭제에 실패했습니다.');
      }
    }
  };

  // 새 노트 생성
  const confirmCreate = async () => {
    const title = newTitle.trim();
    if (!title) {
      toast.error('노트 제목을 입력하세요');
      return;
    }

    // 중복 제목 체크
    if (notes[title]) {
      toast.error('이미 존재하는 노트 제목입니다.');
      return;
    }

    try {
      const content = `# ${title}\n\n**새 노트!**\n`;
      const result = await upsertNote(selectedGroupId, title, content, -2);
      
      toast.success(`"${title}" 노트가 생성되었습니다.`);
      setShowAdd(false);
      setNewTitle('');
      
      // 생성된 노트 자동 선택
      setTimeout(() => {
        const newNote = { note_id: result.noteId, title, content };
        handleNoteSelect(newNote);
      }, 500);
      
    } catch (error) {
      toast.error(error.message || '노트 생성에 실패했습니다.');
    }
  };

  // 키보드 처리
  const handleKey = (e) => {
    if (e.key === 'Enter') {
      confirmCreate();
    }
    if (e.key === 'Escape') {
      setShowAdd(false);
      setNewTitle('');
    }
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className="group-list-loading">
        <div className="spinner"></div>
        <span>노트 목록을 불러오는 중...</span>
      </div>
    );
  }

  // 그룹이 선택되지 않은 상태
  if (!selectedGroupId) {
    return (
      <div className="group-list-loading">
        <FileText size={32} style={{ color: '#d1d5db', marginBottom: '8px' }} />
        <span style={{ color: '#6b7280', fontSize: '14px' }}>
          그룹을 선택해주세요
        </span>
      </div>
    );
  }

  return (
    <div className="group-list-wrapper">
      {/* 헤더 */}
      <div className="groups-header">
        <h3 className="group-title">
          노트 목록 ({notesArray.length})
        </h3>
        <button
          className="group-toggle-btn"
          onClick={() => setIsOpen(prev => !prev)}
          aria-label={isOpen ? '접기' : '펼치기'}
        >
          {isOpen ? '▲' : '▼'}
        </button>
      </div>

      {/* 목록 */}
      {isOpen && (
        <div className="groups-container expanded">
          <div className="groups-content">
            {/* 검색창 */}
            <div className="search-container" style={{ marginBottom: '12px' }}>
              <div style={{ position: 'relative' }}>
                <Search 
                  size={14} 
                  style={{ 
                    position: 'absolute', 
                    left: '8px', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    color: '#6b7280'
                  }} 
                />
                <input
                  type="text"
                  placeholder="노트 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px 6px 28px',
                    fontSize: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#2383e2'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>
            </div>

            {/* 기존 노트들 */}
            {notesArray.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '20px', 
                color: '#6b7280',
                fontSize: '14px'
              }}>
                {searchTerm ? '검색 결과가 없습니다' : '노트가 없습니다'}
              </div>
            ) : (
              notesArray.map((note) => (
                <div 
                  key={note.note_id}
                  className={`note-item-container ${selectedNoteId === note.note_id ? 'selected' : ''}`}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    marginBottom: '2px',
                    borderRadius: '6px',
                    overflow: 'hidden'
                  }}
                >
                  <button
                    className="group-item-sel"
                    onClick={() => handleNoteSelect(note)}
                    style={{ 
                      flex: 1,
                      textAlign: 'left',
                      border: 'none',
                      background: 'none',
                      padding: '8px',
                      cursor: 'pointer',
                      borderRadius: '6px 0 0 6px'
                    }}
                  >
                    <div className="note-info">
                      <div className="note-title" style={{
                        fontWeight: '500',
                        fontSize: '14px',
                        color: '#37352f',
                        marginBottom: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        <FileText size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        {note.title}
                      </div>
                      {note.content && (
                        <div style={{
                          fontSize: '11px',
                          color: '#6b7280',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {note.content.replace(/[#\*\[\]]/g, '').slice(0, 30)}...
                        </div>
                      )}
                    </div>
                  </button>
                  
                  <button
                    className="group-item-del"
                    onClick={(e) => handleNoteDelete(note, e)}
                    style={{
                      border: 'none',
                      background: 'none',
                      padding: '8px',
                      cursor: 'pointer',
                      color: '#6b7280',
                      borderRadius: '0 6px 6px 0',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#fee2e2';
                      e.target.style.color = '#dc2626';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.color = '#6b7280';
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}

            {/* 새 노트 추가 버튼 또는 입력폼 */}
            {!showAdd ? (
              <button 
                className="group-item add-group-btn" 
                onClick={() => setShowAdd(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '8px',
                  margin: '8px 0 0 0',
                  background: 'none',
                  border: '1px dashed #d1d5db',
                  borderRadius: '6px',
                  color: '#6b7280',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = '#2383e2';
                  e.target.style.color = '#2383e2';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.color = '#6b7280';
                }}
              >
                <PlusCircle size={14} style={{ marginRight: '6px' }} />
                새 노트 생성
              </button>
            ) : (
              <div className="add-group-form" style={{ 
                display: 'flex', 
                gap: '4px', 
                alignItems: 'center',
                marginTop: '8px',
                padding: '4px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                backgroundColor: '#f9fafb'
              }}>
                <input
                  ref={inputRef}
                  className="add-group-input"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="새 노트 제목"
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    fontSize: '13px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    outline: 'none'
                  }}
                />
                <button 
                  className="add-group-confirm" 
                  onClick={confirmCreate}
                  style={{
                    padding: '6px 12px',
                    background: '#2383e2',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  추가
                </button>
                <button
                  className="add-group-cancel"
                  onClick={() => { 
                    setShowAdd(false); 
                    setNewTitle(''); 
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#6b7280',
                    borderRadius: '4px'
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteList;
