// Graph.js
import React, { useState, useRef, useEffect } from "react";
import ForceGraph2D from "react-force-graph-2d";
import "./Graph.css"; // Assuming you have a CSS file for styles

export default function GraphView({ data, onSelect }) {
  const fgRef = useRef(); // useRef

  //Slider에 들어가는 State들 관련
  //Display
  const [nodeSize, setNodeSize] = useState(4);
  const [linkWidth, setLinkWidth] = useState(1);
  const [zoom, setZoom] = useState(1.5);
  //Physics
  const [centerForce, setCenterForce] = useState(0.5);
  const [linkStrength, setLinkStrength] = useState(1);
  const [repulsion, setRepulsion] = useState(-50);
  const [linkDistance, setLinkDistance] = useState(100);

  const [hoverNode, setHoverNode] = useState(null); // 마우스 올려논 노드 표시
  // Slider 설정
  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.zoom(zoom, 400);
      const fg = fgRef.current.d3Force;
      fg("center").strength(centerForce);
      fg("link").distance(linkDistance).strength(linkStrength);
      fg("charge").strength(repulsion);
    } // 설정 값(의존성 배열)들이 바뀌면 실행.
  }, [zoom, centerForce, linkStrength, repulsion, linkDistance]);

  // DOM
  return (
    <div className="graph-container">
      <div className="floating-panel">
        <h2 className="section-title">Display</h2>
        <Slider label="Node Size" value={nodeSize} setValue={setNodeSize} min={2} max={12} />
        <Slider label="Link Width" value={linkWidth} setValue={setLinkWidth} min={0.5} max={4} step={0.5} />
        <Slider label="Zoom" value={zoom} setValue={setZoom} min={0.5} max={3} step={0.1} />

        <h2 className="section-title">Physics</h2>
        <Slider label="Center Force" value={centerForce} setValue={setCenterForce} min={0} max={10} step={0.1} />
        <Slider label="Link Strength" value={linkStrength} setValue={setLinkStrength} min={0} max={2} step={0.1} />
        <Slider label="Repulsion" value={repulsion} setValue={setRepulsion} min={-300} max={0} step={10} />
        <Slider label="Link Distance" value={linkDistance} setValue={setLinkDistance} min={20} max={300} step={10} />
      </div>

      <ForceGraph2D
        ref={fgRef}
        graphData={data}
        backgroundColor="#0f0f0f"
        nodeRelSize={nodeSize}
        linkWidth={linkWidth}
        linkColor={(link) => {
          const sourceId = link.source.id || link.source;
          const targetId = link.target.id || link.target;
          const isConnected =
            hoverNode &&
            (hoverNode.id === sourceId || hoverNode.id === targetId);

          return isConnected ? "#f59e0b" : "#52525b";
        }}
        onNodeClick={(node) => onSelect(node.id)}
        nodeCanvasObject={(node, ctx, globalScale) => {
          ctx.beginPath();
          ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI, false);
          ctx.fillStyle = (hoverNode &&
            (hoverNode.id === node.id ||
            data.links.some(l => ((l.source.id || l.source) === hoverNode.id && (l.target.id || l.target) === node.id) ||
                                  ((l.target.id || l.target) === hoverNode.id && (l.source.id || l.source) === node.id))))
              ? '#f59e0b'             // 연결 노드만 밝게
              : (node.inactive ? '#52525b' : '#a1a1aa');
          ctx.fill();

          if (globalScale >= zoom) {
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.fillStyle = "#f4f4f5";
            ctx.fillText(node.id, node.x + 8, node.y + 4);
          }
        }}
        onNodeHover={(setHoverNode)}
      />
    </div>
  );
}

//그래프 뷰의 설정들을 변경하기 위한 Slider
function Slider({ label, value, setValue, min, max, step = 1 }) {
  return (
    <div className="slider-wrapper">
      <label className="slider-label">
        <span>{label}</span>
        <span className="value">{value}</span>
      </label>
      <input
        className="slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(parseFloat(e.target.value))}
      />
    </div>
  );
}
