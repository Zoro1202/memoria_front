//Note.js
import React, { useCallback, useEffect, useRef } from "react";
import { Remirror, useRemirror, EditorComponent } from '@remirror/react';
import { MarkdownExtension } from '@remirror/extension-markdown';
import { wysiwygPreset } from '@remirror/preset-wysiwyg';
import { useNotes } from '../../Contexts/NotesContext'; // notes Context
import { useTabs } from "../../Contexts/TabsContext";
import { ObsidianLinkExtension } from '../Obsidian/Obsidian';
import { createMarkdownSerializer } from '../Obsidian/MDSerializer';
import {toast,} from 'react-hot-toast';
import './Note.css';
  
export default function NoteView({ id, markdown, onChange }) {
  const markdownRef = useRef(markdown);
  const { updateNote ,createNoteFromTitle, updateGraphLinksFromContent  } = useNotes();
  const { noteIdFromTab, activeTabId, closeTab, openTab } = useTabs();
  const { manager, state } = useRemirror({
    extensions: () => [
      ...wysiwygPreset(),
      new ObsidianLinkExtension(),
      new MarkdownExtension(),
    ],
    stringHandler: 'markdown',
    content: markdown,
    selection: 'end',
  });
  
  /* 커스텀 serializer 준비 (schema 몰라도 됨) */
  const mdSerializer = createMarkdownSerializer();

  const handleClick = useCallback((e) => {
      const target = e.target.closest('.obsidian-link');
      console.log(`target : ${target}`);
      if (target) {
        const href = target.getAttribute('data-href');
        console.log(`href : ${href}`);
        if (href) {
          createNoteFromTitle(href); // 그래프 뷰에서 클릭한 노트가 content에서 첫 줄이 # 제목이 아니면 자동으로 붙이기
          
          openTab({ title: href, type: "note", noteId: href }); 
          // 원하는 함수 실행 (예: 새 창 열기)
          // window.open(`/wiki/${encodeURIComponent(href)}`, '_blank');
          toast.success(`${href} 클릭`);
        }
      }
    },[markdown]);

  useEffect(() => {
    // 마운트 후 모든 링크에 클릭 이벤트 바인딩
    const container = document.getElementById(id);
    container?.addEventListener('click', handleClick);

    return () => container?.removeEventListener('click', handleClick);
  }, [id]);

  const handleKeyDown = useCallback((e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();

        /* 1. 최신 마크다운 직접 가져오기 */
        const content = mdSerializer.serialize(manager.view.state.doc);   // [[링크]] 포함

        /* 2. 노트 ID 계산 & 저장 */
        const firstLine = content.split('\n')[0].replace(/^#\s*/, '').trim();
        const baseId    = firstLine || 'Untitled';
        const noteId    = updateNote(id, baseId, content);

        /* 3. 탭 갱신 */
        if (noteId !== noteIdFromTab(activeTabId)) {
          closeTab(activeTabId);
          openTab({ title: noteId, type: 'note', noteId });
        }
        // 최신 doc → markdown
        const md = mdSerializer.serialize(manager.view.state.doc); // [[링크]] 포함
        toast.success('저장!');
        // 다운로드
        const blob = new Blob([md], { type: 'text/markdown' });
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement('a'), {
          href: url,
          download: `${noteId}.md`,
        });
        a.click();
        URL.revokeObjectURL(url);

        toast.success('다운로드 완료');
      }
    },[manager, id, activeTabId, markdown]);

  // CTRL + S
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [manager, id, activeTabId]);


  // DOM
  return (
    <div id={id} className="note-editor">
      <Remirror
        manager={manager}
        initialContent={state}
        onChange={({ helpers }) => {
          const updateMarkdown = mdSerializer.serialize(manager.view.state.doc);
          markdownRef.current = updateMarkdown;

          updateGraphLinksFromContent(id, updateMarkdown); // ✅ 핵심 호출

          onChange(manager.view.state.doc);
        }}
        autoFocus
      >
        <EditorComponent />
      </Remirror>
      {/* <Toaster/> 이거 상위 프로퍼티에 넣음(VaultApp)*/}
    </div>
  );
}
