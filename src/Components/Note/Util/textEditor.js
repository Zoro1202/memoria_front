// Component/textEditor.jsx
import isHotkey from 'is-hotkey'
import React, { useCallback } from 'react'
import {
  Editor,
  Path,
  Element as SlateElement,
  Transforms,
  // createEditor,
} from 'slate'
// import { withHistory } from 'slate-history'
import { Editable, ReactEditor, Slate, useSlate } from 'slate-react'
import { Button, Icon, Toolbar } from './noteComponent'
import { HToolbar } from './Toolbar'
const HOTKEYS = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
  'mod+`': 'code',
}



const LIST_TYPES = ['numbered-list', 'bulleted-list']
const TEXT_ALIGN_TYPES = ['left', 'center', 'right', 'justify']

export const TextEditor = ({ editor, initialValue, decorate, renderLeaf, onchange, onDeleteClick }) => {
  const renderElement = useCallback(props => <Element {...props} />, [])

  return (
    <Slate editor={editor} initialValue={initialValue} onChange={onchange}>
      <HToolbar/>
      <Toolbar>
        <div style={{ display: 'flex', flexGrow: 1 }}>
          <MarkButton format="bold" icon="format_bold" />
          <MarkButton format="italic" icon="format_italic" />
          <MarkButton format="underline" icon="format_underlined" />
          <MarkButton format="code" icon="code" />
          <BlockButton format="heading-one" icon="looks_one" />
          <BlockButton format="heading-two" icon="looks_two" />
          <BlockButton format="block-quote" icon="format_quote" />
          <BlockButton format="numbered-list" icon="format_list_numbered" />
          <BlockButton format="bulleted-list" icon="format_list_bulleted" />
          <BlockButton format="left" icon="format_align_left" />
          <BlockButton format="center" icon="format_align_center" />
          <BlockButton format="right" icon="format_align_right" />
          <BlockButton format="justify" icon="format_align_justify" />
        </div>
        <div>
          <DeleteNoteButton onDeleteClick={onDeleteClick}/>
        </div>
      </Toolbar>
      <Editable
        decorate={decorate}
        renderLeaf={renderLeaf}
        renderElement={renderElement}
        placeholder="Enter some rich text…"
        spellCheck
        autoFocus
        onKeyDown={event => {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
            event.preventDefault();

            const { selection } = editor;
            if (selection) {
              Transforms.select(editor, {
                anchor: Editor.start(editor, []),
                focus: Editor.end(editor, []),
              });
            }
            return;
          }
          
          if (event.key === 'Enter') {
            event.preventDefault();
            const { selection } = editor;
            if (selection) {
              // 현재 위치에서 노드 분리
              Transforms.splitNodes(editor, { always: true });

              // 새로 생성된 노드를 paragraph 타입으로 설정
              Transforms.setNodes(editor, { type: 'paragraph' });
            }
            return;
          }
          for (const hotkey in HOTKEYS) {
            if (isHotkey(hotkey, event)) {
              event.preventDefault();
              const mark = HOTKEYS[hotkey];
              toggleMark(editor, mark);
              return;
            }
          }
        }}
      />
    </Slate>
  )
}

const toggleMark = (editor, format) => {
  const isActive = isMarkActive(editor, format)
  if (isActive) {
    Editor.removeMark(editor, format)
  } else {
    Editor.addMark(editor, format, true)
  }
}

const toggleBlock = (editor, format) => {
  const isActive = isBlockActive(
    editor,
    format,
    isAlignType(format) ? 'align' : 'type'
  )
  const isList = isListType(format)
  Transforms.unwrapNodes(editor, {
    match: n =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      isListType(n.type) &&
      !isAlignType(format),
    split: true,
  })
  let newProperties
  if (isAlignType(format)) {
    newProperties = {
      align: isActive ? undefined : format,
    }
  } else {
    newProperties = {
      type: isActive ? 'paragraph' : isList ? 'list-item' : format,
    }
  }
  Transforms.setNodes(editor, newProperties)
  if (!isActive && isList) {
    const block = { type: format, children: [] }
    Transforms.wrapNodes(editor, block)
  }
}

const isBlockActive = (editor, format, blockType = 'type') => {
  const { selection } = editor
  if (!selection) return false
  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: n => {
        if (!Editor.isEditor(n) && SlateElement.isElement(n)) {
          if (blockType === 'align' && isAlignElement(n)) {
            return n.align === format
          }
          return n.type === format
        }
        return false
      },
    })
  )
  return !!match
}

const isMarkActive = (editor, format) => {
  const marks = Editor.marks(editor)
  return marks ? marks[format] === true : false
}

const Element = ({ attributes, children, element }) => {
  const editor = useSlate();
  const path = ReactEditor.findPath(editor, element);

  const handleAddBlock = () => {
    const newBlock = { type: 'paragraph', children: [{ text: '' }] };
    Transforms.insertNodes(editor, newBlock, { at: Path.next(path) });
  };

  const style = {};
  if (isAlignElement(element)) {
    style.textAlign = element.align;
  }

  return (
  <div
    style={{ position: 'relative', paddingLeft: '40px' }}
    className="slate-block-wrapper"
  >
    <div
      className="add-button-wrapper"
      style={{
        position: 'absolute',
        left: '0px',
        top: '50%',
        transform: 'translateY(-50%)',
        opacity: 0,
        pointerEvents: 'none',
        transition: 'opacity 0.2s ease',
      }}
    >
      {/* <button
        onClick={handleAddBlock}
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        +
      </button> */}
    </div>
    
      {(() => {
        switch (element.type) {
          case 'block-quote':
            return <blockquote style={style} {...attributes}>{children}</blockquote>;
          case 'bulleted-list':
            return <ul style={style} {...attributes}>{children}</ul>;
          case 'heading-one':
            return <h1 style={style} {...attributes}>{children}</h1>;
          case 'heading-two':
            return <h2 style={style} {...attributes}>{children}</h2>;
          case 'list-item':
            return <li style={style} {...attributes}>{children}</li>;
          case 'numbered-list':
            return <ol style={style} {...attributes}>{children}</ol>;
          default:
            return <p style={style} {...attributes}>{children}</p>;
        }
      })()}
    </div>
  );
};

const BlockButton = ({ format, icon }) => {
  const editor = useSlate()
  return (
    <Button
      active={isBlockActive(
        editor,
        format,
        isAlignType(format) ? 'align' : 'type'
      )}
      onMouseDown={event => {
        event.preventDefault()
        toggleBlock(editor, format)
      }}
    >
      <Icon>{icon}</Icon>
    </Button>
  )
}

const MarkButton = ({ format, icon }) => {
  const editor = useSlate()
  return (
    <Button
      active={isMarkActive(editor, format)}
      onMouseDown={event => {
        event.preventDefault()
        toggleMark(editor, format)
      }}
    >
      <Icon>{icon}</Icon>
    </Button>
  )
}

const isAlignType = format => TEXT_ALIGN_TYPES.includes(format)
const isListType = format => LIST_TYPES.includes(format)
const isAlignElement = element => 'align' in element

const DeleteNoteButton = ({onDeleteClick}) => {
  // const handleDelete = () => {
  //   // 여기에 기능 추가

  //   console.log("노트 삭제 버튼 클릭됨");
  // };

  return (
    <Button onMouseDown={(e) => {
      e.preventDefault();
      onDeleteClick();
    }}>
      <Icon>delete</Icon>
    </Button>
  );
};
