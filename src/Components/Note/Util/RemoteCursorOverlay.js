// RemoteCursorOverlay.js
import {
  useRemoteCursorOverlayPositions,
} from '@slate-yjs/react';
import clsx from 'clsx';
import React, { useRef } from 'react';
import { addAlpha } from './alpha'; // 색상 변환 유틸

function Caret({ caretPosition, data }) {
  const caretStyle = {
    ...caretPosition,
    background: data?.color,
  };

  const labelStyle = {
    transform: 'translateY(-100%)',
    background: data?.color,
  };

  return (
    <div style={caretStyle} className="w-0.5 absolute">
      <div
        className="absolute text-xs text-white whitespace-nowrap top-0 rounded rounded-bl-none px-1.5 py-0.5"
        style={labelStyle}
      >
        {data?.name}
      </div>
    </div>
  );
}

function RemoteSelection({ data, selectionRects, caretPosition }) {
  if (!data) {
    return null;
  }

  const selectionStyle = {
    backgroundColor: addAlpha(data.color, 0.5),
  };

  return (
    <>
      {selectionRects.map((position, i) => (
        <div
          style={{ ...selectionStyle, ...position }}
          className="absolute pointer-events-none"
          key={i}
        />
      ))}
      {caretPosition && <Caret caretPosition={caretPosition} data={data} />}
    </>
  );
}

export function RemoteCursorOverlay({ className, children }) {
  const containerRef = useRef(null);
  const [cursors] = useRemoteCursorOverlayPositions({
    containerRef,
  });

  return (
    <div className={clsx('relative', className)} ref={containerRef}>
      {children}
      {cursors.map((cursor) => (
        <RemoteSelection key={cursor.clientId} {...cursor} />
      ))}
    </div>
  );
}
