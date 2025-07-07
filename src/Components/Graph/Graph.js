// Graph.js - 이상영
import React, { useState, useRef, useEffect, useMemo } from "react";
import ForceGraph2D from "react-force-graph-2d";
import "./Graph.css"; // Assuming you have a CSS file for styles
import toast from "react-hot-toast";
import { forceRadial, } from 'd3-force-3d'; // ForceGraph2D 에서 쓰고있는거 뽀려옴. 프로젝트 의존성에는 없는데 사용 가능.
import useWindowSize from "./Utils/Resize";
//data : graph data, onSelect : 노드 클릭시 부모 컴포넌트로 노트 열기 콜백 함수
export default function GraphView({ data, onSelect }) {
  const fgRef = useRef(); // useRef

  //#region Graph State들 관련
  //Display
  const [nodeSize, setNodeSize] = useState(10);//노드 사이즈
  const [linkWidth, setLinkWidth] = useState(1); // 링크 두께
  const [zoom, setZoom] = useState(0.5);  // 텍스트 표시 시작점임.
  const [hoverNode, setHoverNode] = useState(null); // 마우스 올려논 노드 표시
  const [w, h] = useWindowSize();
  //Physics
  const [centerForce, setCenterForce] = useState(0.2); // 중심 장력(중력같은느낌?)
  const [linkStrength, setLinkStrength] = useState(1); // 링크 거리가 유지되는 힘?
  const [repulsion, setRepulsion] = useState(-150); // 노드 간 척력
  const [linkDistance, setLinkDistance] = useState(100); // 링크 거리
  const [panelOpen, setPanelOpen] = useState(false); // 판넬 오픈 state
  //#endregion

  // 피직스 설정, 슬라이더(플로팅 판넬)에서 값 가져옴
  useEffect(() => {
    if (fgRef.current) {
      // fgRef.current.zoom(zoom, 400);
      const fg = fgRef.current.d3Force;

      // fgRef.current.d3Force('center').strength(centerForce); // 이거 안됨 값이 커지거나 작아지면, 그래프가 이상해짐 center force는 확실히 아닌듯
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
  // 링크 수에 따라 크기 구하기(절대값 아님. 상대값임. 최소 크기 1, 링크 1마다 0.1씩 늘어남)
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
            {panelOpen ? '⮝ 닫기' : '⮟ 열기'}
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
        ref={fgRef} // useref 를 사용해 forcegraph2d 값 변경
        width={w}
        height={h}
        graphData={data} // 그래프 데이타를 부모로부터 data 프롭으로 받아옴
        backgroundColor="#0f0f0f" // 백그라운드 컬러
        nodeRelSize={nodeSize} // 노드의 실제 클릭 사이즈 (밑에nodePointerAreaPaint에서 다시 구성함)
        linkWidth={linkWidth} // 링크 넓이
        linkColor={(link) => { // 링크 색깔 : 포커스된 노드에 연결된 링크만 강조 표시
          const sourceId = link.source.id || link.source; // 소스
          const targetId = link.target.id || link.target; // 타겟
          const isConnected =
            hoverNode &&
            (hoverNode.id === sourceId || hoverNode.id === targetId);

          return isConnected ? "#f59e0b" : "#52525b";// 연결 노드만 밝게
        }}
        onNodeClick={(node) => { // 노드 클릭 시 해당 노드의 노트를 onSelect(콜백)으로 넘김 -> 부모쪽에서 opentab으로 노트 열기
          // fgRef.current.zoom(1, 300);
          fgRef.current.centerAt(node.x, node.y, 1000); // center at 으로 노드에 카메라 맞추기 1초
          fgRef.current.zoom(2, 1000); // // zoom하기 1.5초
          toast.success(`${node.id} 클릭!`); // 1.5초 후에 노트 열기
          // fgRef.current.d3ReheatSimulation();
          setTimeout(() => onSelect(node.id), 1000); // 1.5초 후에 노트 열기(노트 오류..)
          // onSelect(node.id);
        }}
        // hovernode state로 어쩌고 저쩌고
        nodeCanvasObject={(node, ctx, globalScale) => { // 노드 그리기 설정
          const r = getRadius(node, globalScale); // r : 반지름
          ctx.beginPath(); // path 그리기 시작
          ctx.arc(node.x, node.y, r, 0,2*Math.PI, false); // 노드 그리기 : 시작 각도 : 0, 끝 각도 2파이(360) -> 원 그리기, 화면 크기에 상관없이 일관된 크기를 유지
          ctx.fillStyle = (hoverNode && // 노드 색깔 포커스된 노드와 연결된 노드 강조 표시
            (hoverNode.id === node.id || 
            data.links.some(l => (l.source.id === hoverNode.id && l.target.id === node.id) || //some :함수 인자로 넣어서 요소중에 하나라도 참이면 참 반환 함.
                                  (l.target.id === hoverNode.id && l.source.id === node.id))))
              ? '#f59e0b'             // 연결 노드만 밝게
              : (node.inactive ? '#52525b' : '#a1a1aa');
          ctx.fill(); // fill 로 색칠
          if (globalScale >= zoom) { // globalscale(현재 줌)이 zoom 값보다 커야 텍스트 표시 
            const fontSize = 12 / globalScale; // 원 그리기처럼 화면 크기 상관없이 일관된 크기 유지
            ctx.font = `${fontSize}px Sans-Serif`; //폰트 설정
            ctx.fillStyle = "#f4f4f5"; // 폰트 색깔 설정
            // ctx.fillText(node.id, node.x + (10 + nodeSize) / globalScale, node.y + 4 / globalScale);
            ctx.fillText(node.id, (node.x + (5/globalScale))+ r, node.y + 4 / globalScale); // 텍스트 지정된 위치에 그리기 : 위치도 폰트 사이즈처럼 화면 크기에 상관없이 고정되게 함.
          }
        }}
        nodePointerAreaPaint={(node, color, ctx, globalScale) => { // 노드 실제 클릭되는 사이즈(히트박스?) 그리기 위에 노드 그리는건 다름
          const r = getRadius(node, globalScale); // r 구하기
          ctx.fillStyle = color;                 // 노드 색깔 위랑 같아야함.
          ctx.beginPath(); // 그리기
          ctx.arc(node.x, node.y, r, 0,2*Math.PI, false); // 노드 동그라미 그리기 위랑 완전 같아야함.
          ctx.fill(); // 색칠
        }}    
        //호버, 드래그 시 선택된 노드 변경 state로 관리 
        onNodeHover={(setHoverNode)} // 호버
        onNodeDrag={(setHoverNode)} // 드래그
        onNodeDragEnd={()=>setHoverNode(null)} // 드래그 끝날때 널값 안넣어주면 가끔 강조 계속 유지됨
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
