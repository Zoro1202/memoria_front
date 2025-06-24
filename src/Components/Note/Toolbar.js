// NoteToolbar.jsx
import {
  Toolbar,
  FormattingButtonGroup,    // ← 여기 링크 토글 포함
  ListButtonGroup,
  HeadingLevelButtonGroup,
  ToggleCodeBlockButton,
  InsertHorizontalRuleButton,
  UndoButton,
  RedoButton,
  VerticalDivider,                // 버튼 사이 구분용
} from '@remirror/react-ui';

export default function NoteToolbar() { 
  const container = document.getElementById('global-toolbar');
  if (!container) return null;
  
   
  return (
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
  );
}
