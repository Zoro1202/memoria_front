// NoteSearchModal.js
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, FileText, Calendar, Hash } from 'lucide-react';
import './NoteSearchModal.css';

// SearchModal.js 수정
const NoteSearchModal = ({ isOpen, onClose, notes = {}, onNoteSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredResults, setFilteredResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // notes 객체를 배열로 변환
  const notesArray = useMemo(() => {
    if (Array.isArray(notes)) {
      return notes;
    }
    
    if (notes && typeof notes === 'object') {
      return Object.values(notes).filter(note => 
        note && typeof note === 'object' && note.title
      );
    }
    
    return [];
  }, [notes]);

  // 검색 결과 필터링 - 빈 검색어일 때 전체 목록 표시
  useEffect(() => {
    if (searchTerm.trim()) {
      // 검색어가 있을 때: 필터링된 결과
      const searchLower = searchTerm.toLowerCase();
      const results = notesArray.filter(note => {
        if (!note || typeof note !== 'object') return false;
        
        const titleMatch = note.title?.toLowerCase().includes(searchLower);
        const cleanContent = note.content?.replace(/[#\*\[\]]/g, '').toLowerCase();
        const contentMatch = cleanContent?.includes(searchLower);
        
        return titleMatch || contentMatch;
      });
      
      // 관련성 순으로 정렬 (제목 매치가 우선)
      results.sort((a, b) => {
        const aTitle = a.title?.toLowerCase().includes(searchLower);
        const bTitle = b.title?.toLowerCase().includes(searchLower);
        
        if (aTitle && !bTitle) return -1;
        if (!aTitle && bTitle) return 1;
        
        // 제목이 같은 우선순위면 알파벳 순
        return a.title?.localeCompare(b.title) || 0;
      });
      
      setFilteredResults(results);
    } else {
      // 검색어가 없을 때: 전체 목록 (최신순)
      const allNotes = [...notesArray].sort((a, b) => {
        // note_id가 클수록 최신 (또는 수정일시가 있다면 그걸로)
        return (b.note_id || 0) - (a.note_id || 0);
      });
      
      setFilteredResults(allNotes);
    }
    
    setSelectedIndex(0);
  }, [searchTerm, notesArray]);

  // 모달이 열릴 때마다 검색어 초기화 및 포커스
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < filteredResults.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === 'Enter' && filteredResults[selectedIndex]) {
      handleNoteSelect(filteredResults[selectedIndex]);
    }
  };

  const handleNoteSelect = (note) => {
    onNoteSelect(note);
    onClose();
    setSearchTerm('');
  };

  if (!isOpen) return null;

  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div 
        className="search-modal-container" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* 검색 입력창 */}
        <div className="search-modal-header">
          <Search size={20} className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            placeholder="노트, 내용으로 검색하거나 아래에서 선택..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="search-input"
          />
          <button onClick={onClose} className="close-button">
            <X size={20} />
          </button>
        </div>

        {/* 검색 결과 */}
        <div className="search-results">
          {filteredResults.length === 0 ? (
            <div className="no-results">
              <FileText size={48} className="no-results-icon" />
              <p>노트가 없습니다.</p>
            </div>
          ) : (
            <div className="results-list">
              <div className="results-header">
                {searchTerm.trim() ? (
                  <span className="results-count">
                    "{searchTerm}"에 대한 {filteredResults.length}개의 결과
                  </span>
                ) : (
                  <span className="results-count">
                    모든 노트 ({filteredResults.length}개)
                  </span>
                )}
              </div>
              
              {filteredResults.map((note, index) => (
                <div
                  key={note.note_id || index}
                  className={`result-item ${index === selectedIndex ? 'selected' : ''}`}
                  onClick={() => handleNoteSelect(note)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="result-item-header">
                    <FileText size={16} className="result-icon" />
                    <span className="result-title">{note.title || '제목 없음'}</span>
                    <span className="result-id">#{note.note_id}</span>
                  </div>
                  
                  {note.content && (
                    <p className="result-preview">
                      {note.content
                        .replace(/[#\*\[\]]/g, '')
                        .replace(/\n+/g, ' ')
                        .slice(0, 100)}
                      {note.content.length > 100 ? '...' : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="search-modal-footer">
          <div className="search-info">
            {/* <span className="search-tips">
              <kbd>↑</kbd><kbd>↓</kbd> 탐색 · <kbd>Enter</kbd> 열기 · <kbd>Esc</kbd> 닫기
            </span> */}
            <span>검색해보시지</span>
          </div>
        </div>
      </div>
    </div>
  );
};


export default NoteSearchModal;
