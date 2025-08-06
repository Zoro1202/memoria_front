// NoteSearchModal.js
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, FileText, Calendar, Clock, Plus } from 'lucide-react';
import './NoteSearchModal.css';

const NoteSearchModal = ({ isOpen, onClose, notes = {}, onNoteSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredResults, setFilteredResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const resultsContainerRef = useRef(null); // 스크롤 컨테이너 ref 추가
  const selectedItemRef = useRef(null); // 선택된 아이템 ref 추가

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

  // 선택된 항목으로 스크롤 함수
  const scrollToSelectedItem = (index) => {
    const container = resultsContainerRef.current;
    const selectedItem = container?.querySelector(`[data-index="${index}"]`);
    
    if (container && selectedItem) {
      const containerRect = container.getBoundingClientRect();
      const itemRect = selectedItem.getBoundingClientRect();
      
      // 선택된 항목이 컨테이너 밖에 있는지 확인
      const isAbove = itemRect.top < containerRect.top;
      const isBelow = itemRect.bottom > containerRect.bottom;
      
      if (isAbove || isBelow) {
        selectedItem.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      }
    }
  };

  // 검색 결과 필터링 및 정렬
  useEffect(() => {
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      const results = notesArray.filter(note => {
        if (!note || typeof note !== 'object') return false;
        
        const titleMatch = note.title?.toLowerCase().includes(searchLower);
        const cleanContent = note.content?.replace(/[#*\[\]]/g, '').toLowerCase();
        const contentMatch = cleanContent?.includes(searchLower);
        
        return titleMatch || contentMatch;
      });
      
      // 검색 관련성 점수 계산 및 정렬
      results.sort((a, b) => {
        const aTitle = a.title?.toLowerCase().includes(searchLower);
        const bTitle = b.title?.toLowerCase().includes(searchLower);
        
        // 제목에서 매치되는 것이 우선
        if (aTitle && !bTitle) return -1;
        if (!aTitle && bTitle) return 1;
        
        // 둘 다 제목 매치거나 둘 다 내용 매치인 경우, 최신 순
        const aTime = new Date(a.update_at || a.created_at || 0).getTime();
        const bTime = new Date(b.update_at || b.created_at || 0).getTime();
        return bTime - aTime;
      });
      
      setFilteredResults(results);
    } else {
      // 검색어가 없을 때: 전체 목록 (최신 수정순)
      const allNotes = [...notesArray].sort((a, b) => {
        const aTime = new Date(a.update_at || a.created_at || 0).getTime();
        const bTime = new Date(b.update_at || b.created_at || 0).getTime();
        return bTime - aTime; // 최신 수정된 것부터
      });
      
      setFilteredResults(allNotes);
    }
    
    setSelectedIndex(0);
  }, [searchTerm, notesArray]);

  // 선택 인덱스가 변경될 때 스크롤 조정
  useEffect(() => {
    if (filteredResults.length > 0) {
      // 약간의 지연을 두어 DOM 업데이트 후 스크롤
      setTimeout(() => {
        scrollToSelectedItem(selectedIndex);
      }, 50);
    }
  }, [selectedIndex, filteredResults]);

  // 모달이 열릴 때마다 초기화
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => {
        const newIndex = prev < filteredResults.length - 1 ? prev + 1 : prev;
        return newIndex;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => {
        const newIndex = prev > 0 ? prev - 1 : 0;
        return newIndex;
      });
    } else if (e.key === 'Enter' && filteredResults[selectedIndex]) {
      handleNoteSelect(filteredResults[selectedIndex]);
    }
  };

  const handleNoteSelect = (note) => {
    onNoteSelect(note);
    onClose();
    setSearchTerm('');
  };

  // 날짜 포맷팅 함수
  const formatDate = (dateString, showTime = false) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      if (showTime) {
        return `오늘 ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
      }
      return '오늘';
    } else if (diffDays === 1) {
      return '어제';
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks}주 전`;
    } else {
      return date.toLocaleDateString('ko-KR', {
        year: diffDays > 365 ? 'numeric' : undefined,
        month: 'short',
        day: 'numeric'
      });
    }
  };

  // 검색어 하이라이트 함수
  const highlightSearchTerm = (text, searchTerm) => {
    if (!searchTerm.trim() || !text) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
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
            placeholder="노트 제목이나 내용으로 검색..."
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
        <div className="search-results" ref={resultsContainerRef}>
          {filteredResults.length === 0 ? (
            <div className="no-results">
              <FileText size={48} className="no-results-icon" />
              <p>{searchTerm.trim() ? `"${searchTerm}"에 대한 검색 결과가 없습니다.` : '노트가 없습니다.'}</p>
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
                    모든 노트 ({filteredResults.length}개) • 최근 수정순
                  </span>
                )}
              </div>
              
              {filteredResults.map((note, index) => (
                <div
                  key={note.note_id || index}
                  data-index={index} // 스크롤을 위한 인덱스 추가
                  className={`result-item ${index === selectedIndex ? 'selected' : ''}`}
                  onClick={() => handleNoteSelect(note)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="result-item-content">
                    {/* 메인 정보 */}
                    <div className="result-main">
                      <div className="result-item-header">
                        <FileText size={16} className="result-icon" />
                        <span 
                          className="result-title"
                          dangerouslySetInnerHTML={{
                            __html: highlightSearchTerm(note.title || '제목 없음', searchTerm)
                          }}
                        />
                        <span className="result-id">#{note.note_id}</span>
                      </div>
                      
                      {note.content && note.content.trim() && (
                        <p 
                          className="result-preview"
                          dangerouslySetInnerHTML={{
                            __html: highlightSearchTerm(
                              note.content
                                .replace(/[#*\[\]]/g, '')
                                .replace(/\n+/g, ' ')
                                .trim()
                                .slice(0, 80) + (note.content.length > 80 ? '...' : ''),
                              searchTerm
                            )
                          }}
                        />
                      )}
                      
                      {/* 날짜 정보 */}
                      <div className="result-dates">
                        {note.created_at && (
                          <span className="date-info created">
                            생성: {formatDate(note.created_at)}
                          </span>
                        )}
                        {note.update_at && (
                          <span 
                            className="date-info updated"
                            title={`최종 수정: ${new Date(note.update_at).toLocaleString('ko-KR')}`}
                          >
                            수정: {formatDate(note.update_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="search-modal-footer">
          <div className="search-info">
            <span className="search-tips">
              <kbd>↑</kbd><kbd>↓</kbd> 탐색 · <kbd>Enter</kbd> 열기 · <kbd>Esc</kbd> 닫기
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteSearchModal;
