//Note.js
import React, { useCallback, useEffect, useRef } from "react";
import { Remirror, useRemirror, EditorComponent } from '@remirror/react';
import { MarkdownExtension } from '@remirror/extension-markdown';
import { wysiwygPreset } from '@remirror/preset-wysiwyg';
import {
  FloatingToolbar,//드래그 시 툴바
  Toolbar, // 상단 툴바
  FormattingButtonGroup,    // ← 여기 링크 토글 포함
  ListButtonGroup, // 리스트 버튼 그룹
  HeadingLevelButtonGroup, // 헤딩 레벨 버튼 그룹
  ToggleCodeBlockButton, // 코드 블록 토글 버튼
  InsertHorizontalRuleButton, // 수평선 삽입 버튼
  UndoButton, // 실행 취소 버튼
  RedoButton, // 다시 실행 버튼
  VerticalDivider,                // 버튼 사이 구분용
} from '@remirror/react-ui';
import { useNotes } from '../../Contexts/NotesContext'; // notes Context
import { useTabs } from "../../Contexts/TabsContext";
import { ObsidianLinkExtension } from '../Obsidian/Obsidian';
import { createMarkdownSerializer } from '../Obsidian/MDSerializer';
import {toast,} from 'react-hot-toast';
import './Note.css';
  //id, markdown, onChange(callback), ToolberCmp(툴바) 프롭으로 전달
export default function NoteView({ id, markdown, onChange }) {
  const markdownRef = useRef(markdown); // 마크다운 useRef 사용으로 DOM에서 변경한 변경사항 접근
  const { updateNote ,createNoteFromTitle, updateGraphLinksFromContent  } = useNotes(); // 노트 콘텍스트에서 기능 가져오기
  const { noteIdFromTab, activeTabId, closeTab, openTab } = useTabs(); // 탭스 콘텍스트에서 기능 가져오기
  const { manager, state } = useRemirror({ 
    extensions: () => [
      ...wysiwygPreset(),
      new ObsidianLinkExtension(),
      new MarkdownExtension(),
    ],
    stringHandler: 'markdown',
    content: markdown,
    selection: 'end',
  });// Remirror 라이브러리에서 기능 가져오기, 여러 설정들
  
  /* 커스텀 serializer 준비 (schema 몰라도 됨) */
  const mdSerializer = createMarkdownSerializer();

  const handleClick = useCallback((e) => { // 클릭 처리 핸들러 - 구현한 옵시디언풍 링크 마크다운을 클릭 감지.(리미러에서 기능 제공을 하긴 하는데 onclick으로(!) 코드를 무조건(!!) 문자열로 받는 바람에(!!!) 브라우저에서 코드를 조작할 수 있는 이슈가(!!!!) 있어서 여기서 클릭 감지로 실행........)
      const target = e.target.closest('.obsidian-link'); 
      console.log(`target : ${target}`);
      if (target) {
        const href = target.getAttribute('data-href');
        console.log(`href : ${href}`);
        if (href) { // 클릭한 개체의 클래스가 obsidian-link이고 data-href 속성이면 실행
          createNoteFromTitle(href); // 그래프 뷰에서 클릭한 노트가 content에서 첫 줄이 # 제목이 아니면 자동으로 붙이기
          
          openTab({ title: href, type: "note", noteId: href }); //탭 열기
          // 원하는 함수 실행 (예: 새 창 열기)
          // window.open(`/wiki/${encodeURIComponent(href)}`, '_blank');
          toast.success(`${href} 클릭`);
        }
      }
    },[createNoteFromTitle,openTab]);

  useEffect(() => {
    // 마운트 시 클릭 이벤트 바인딩
    const container = document.getElementById(id);
    container?.addEventListener('click', handleClick);

    return () => container?.removeEventListener('click', handleClick);
  }, [handleClick, id]);

  const handleKeyDown = useCallback((e) => { // 컨트롤 s 구현 (클릭 이벤트와 비슷함)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { // 누른 키가 컨트롤(metakey ⌘) + s 키면 실행
        e.preventDefault(); // html로 저장되는걸 막아줌. 다른 이벤트 실행을 막음.

        // 1. 최신 마크다운 직접 가져오기
        // 최신 doc → markdown
        const content = mdSerializer.serialize(manager.view.state.doc);   // [[링크]] 포함

        // 2. 노트 ID 계산 & 저장
        const firstLine = content.split('\n')[0].replace(/^#\s*/, '').trim();
        const baseId    = firstLine || 'Untitled';
        // const noteId    = updateNote(id, baseId, content); // 저장할때 이상하게 저장됨. 사용 X
        
        // if (noteId !== noteIdFromTab(activeTabId)) {
        //   closeTab(activeTabId);
        //   openTab({ title: noteId, type: 'note', noteId });
        // }
        //서버에 전송해야 함.(저장)
        toast.success('저장!'); // 토스트 띄우기
//#region 다운로드
        const blob = new Blob([content], { type: 'text/markdown' });
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement('a'), {
          href: url,
          download: `${baseId}.md`,
        });
        a.click();
        URL.revokeObjectURL(url);
        toast.success('다운로드 완료');
//#endregion
      }
    },[closeTab, mdSerializer, noteIdFromTab, openTab, updateNote, manager, id, activeTabId]);

  // CTRL + S 이벤트 등록
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [manager, id, activeTabId, handleKeyDown]);

  // DOM
  return (
    <div id={id} className="note-editor">
      <Remirror
        manager={manager}
        initialContent={state}
        onChange={({ helpers }) => { // helpers.getmarkdown을 쓰면 remirror에서 파싱하므로 이상한 값이 나옴. 직접 구현한 파싱 메서드 사용.
          const updateMarkdown = mdSerializer.serialize(manager.view.state.doc);
          markdownRef.current = updateMarkdown;

          updateGraphLinksFromContent(id, updateMarkdown); // ✅ 핵심 호출

          onChange(manager.view.state.doc);
        }}
        autoFocus
      >
        <Toolbar>
          <FormattingButtonGroup />          {/* 링크 / 언더라인 등 */}
          <VerticalDivider />
          <HeadingLevelButtonGroup />
          <ListButtonGroup />
          <ToggleCodeBlockButton />
          <InsertHorizontalRuleButton />
          <VerticalDivider />
          <UndoButton />
          <RedoButton />
          {/* Table 관련 버튼은 너무 복잡함 */}
        </Toolbar>
        <FloatingToolbar>
          <FormattingButtonGroup />
        </FloatingToolbar>
        <EditorComponent />
      </Remirror>
      {/* <Toaster/> 이거 상위 프로퍼티에 넣음(VaultApp)*/}
    </div>
  );
}
