// Graph.js
import React, { useState, useRef, useEffect, useMemo } from "react";
import ForceGraph2D from "react-force-graph-2d";
import "./Graph.css"; // Assuming you have a CSS file for styles
import toast from "react-hot-toast";
import { forceX, forceY, forceRadial } from 'd3-force-3d'; // 또는 'd3-force'
export default function GraphView({ data, onSelect }) {
  const fgRef = useRef(); // useRef

  //Slider에 들어가는 State들 관련
  //Display
  const [nodeSize, setNodeSize] = useState(10);
  const [linkWidth, setLinkWidth] = useState(1);
  const [zoom, setZoom] = useState(1.5);
  const [hoverNode, setHoverNode] = useState(null); // 마우스 올려논 노드 표시

  //Physics
  const [centerForce, setCenterForce] = useState(0.1);
  const [linkStrength, setLinkStrength] = useState(1);
  const [repulsion, setRepulsion] = useState(-50);
  const [linkDistance, setLinkDistance] = useState(100);
  const [panelOpen, setPanelOpen] = useState(true);

  // 피직스 설정, 슬라이더(플로팅 판넬)에서 값 가져옴
  useEffect(() => {
    if (fgRef.current) {
      // fgRef.current.zoom(zoom, 400);
      const fg = fgRef.current.d3Force;

      // fgRef.current.d3Force('center').strength(centerForce); // 이거 안됨 값이 커지거나 작아지면, 그래프가 이상해짐 center force는 확실히 아닌듯
      //d3를 사용해야하는데 라이브러리가 뭔지 모르겔므
      fgRef.current
        .d3Force('center', null)                 // 기본 forceCenter 제거
        .d3Force('radial', forceRadial(0, 0, 0)  // radius=0 → (0,0)로 수렴
                          .strength(centerForce))
        .d3ReheatSimulation();

      fg("link").distance(linkDistance).strength(linkStrength);
      fg("charge").strength(repulsion);
      fgRef.current.d3ReheatSimulation();
    } // 설정 값(의존성 배열)들이 바뀌면 실행.
  }, [zoom, centerForce, linkStrength, repulsion, linkDistance]);

  //연결된 링크 수 구하기
  const degreeMap = useMemo(() => {
    const map = Object.create(null);   // { [nodeId]: number }

    data.links.forEach(l => {
        const s = l.source.id ?? l.source;  // 객체/문자열 둘 다 대비
        const t = l.target.id ?? l.target;

        map[s] = (map[s] || 0) + 1;
        map[t] = (map[t] || 0) + 1;
      });

    return map; // 필요하면 maxDegree도 여기서 함께 반환
  }, [data.links]);
  // 링크 수에 따라 크기
  const getRadius = (node, scale = 1) => {
    const deg = degreeMap[node.id] ?? 0;     // 연결 수
    return (nodeSize * (1+deg/10)) / scale; // 1 + (0.1 * n) 크기 0.1씩 증가
  };

  // DOM
  return (
    <div className="graph-container">
      <div className="floating-panel-wrapper">
        <div className="panel-header">
          <button
            className="toggle-button"
            onClick={() => setPanelOpen(prev => !prev)}
          >
            {panelOpen ? '⮟ 닫기' : '⮝ 열기'}
          </button>
        </div>

        <div className={`panel-body ${panelOpen ? '' : 'closed'}`}>
          <h2 className="section-title">Display</h2>
          <Slider label="Node Size" value={nodeSize} setValue={setNodeSize} min={2} max={30} />
          <Slider label="Link Width" value={linkWidth} setValue={setLinkWidth} min={0.5} max={4} step={0.5} />
          <Slider label="Zoom" value={zoom} setValue={setZoom} min={0.5} max={3} step={0.1} />

          <h2 className="section-title">Physics</h2>
          <Slider label="Center Force" value={centerForce} setValue={setCenterForce} min={0} max={1} step={0.01} />
          <Slider label="Link Strength" value={linkStrength} setValue={setLinkStrength} min={0} max={2} step={0.1} />
          <Slider label="Repulsion" value={repulsion} setValue={setRepulsion} min={-300} max={0} step={10} />
          <Slider label="Link Distance" value={linkDistance} setValue={setLinkDistance} min={20} max={300} step={10} />
        </div>
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
        onNodeClick={(node) => {
          // fgRef.current.zoom(1, 300);
          fgRef.current.centerAt(node.x, node.y, 1000); // center at 으로 노드에 카메라 맞추기 1초
          fgRef.current.zoom(2, 1000); // // zoom하기 1.5초
          toast.success(`${node.id} 클릭!`); // 1.5초 후에 노트 열기
          // fgRef.current.d3ReheatSimulation();
          setTimeout(() => onSelect(node.id), 1000); // 1.5초 후에 노트 열기(노트 오류..)
          // onSelect(node.id);
        }}
        // hovernode state로 어쩌고 저쩌고
        nodeCanvasObject={(node, ctx, globalScale) => {
          const r = getRadius(node, globalScale);
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0,2*Math.PI, false); // 시작 각도 : 0, 끝 각도 2파이(360) -> 원 그리기
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
            // ctx.fillText(node.id, node.x + (10 + nodeSize) / globalScale, node.y + 4 / globalScale);
            ctx.fillText(node.id, (node.x + (5/globalScale))+ r, node.y + 4 / globalScale);
          }
        }}
        nodePointerAreaPaint={(node, color, ctx, globalScale) => {
          const r = getRadius(node, globalScale);// globalScale 이미 내부 변환에 포함됨
          ctx.fillStyle = color;                 // 반드시 hit-color 사용!
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0,2*Math.PI, false);
          ctx.fill();
        }}    
        //호버, 드래그 시 선택된 노드 변경 state로 관리 
        onNodeHover={(setHoverNode)}
        onNodeDrag={(setHoverNode)}
        onNodeDragEnd={()=>setHoverNode(null)}
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
