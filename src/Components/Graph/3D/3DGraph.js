// Graph.js - 이상영 (3D 버전)
import React, { useState, useRef, useEffect, useMemo } from "react";
import ForceGraph3D from "react-force-graph-3d";
import "../Graph.css"; // Assuming you have a CSS file for styles
import toast from "react-hot-toast";
import { forceRadial } from 'd3-force-3d';
import useWindowSize from "../Utils/Resize";
import * as THREE from 'three';

//data : graph data, onSelect : 노드 클릭시 부모 컴포넌트로 노트 열기 콜백 함수
export default function GraphView3D({ data, onSelect }) {
  const fgRef = useRef(); // useRef

  //#region Graph State들 관련
  //Display
  const [nodeSize, setNodeSize] = useState(10);//노드 사이즈
  const [linkWidth, setLinkWidth] = useState(1); // 링크 두께
  const [zoom, setZoom] = useState(0.5);  // 텍스트 표시 시작점임.
  const [hoverNode, setHoverNode] = useState(null); // 마우스 올려논 노드 표시
  const [w, h] = useWindowSize();
  //Physics
  const [centerForce, setCenterForce] = useState(0.25); // 중심 장력(중력같은느낌?)
  const [linkStrength, setLinkStrength] = useState(2); // 링크 거리가 유지되는 힘?
  const [repulsion, setRepulsion] = useState(-300); // 노드 간 척력
  const [linkDistance, setLinkDistance] = useState(100); // 링크 거리
  const [panelOpen, setPanelOpen] = useState(false); // 판넬 오픈 state
  //#endregion

  // 피직스 설정, 슬라이더(플로팅 판넬)에서 값 가져옴
  useEffect(() => {
  // 컴포넌트가 완전히 마운트되고 데이터가 있을 때만 실행
  if (fgRef.current && data && data.nodes && data.links) {
    const timer = setTimeout(() => {
      try {
        if (fgRef.current.d3Force) {
          const fg = fgRef.current.d3Force;

          fgRef.current
            .d3Force('center', null)
            .d3Force('radial', forceRadial(0, 0, 0, 0)
                              .strength(centerForce))
            .d3ReheatSimulation();

          fg("link").distance(linkDistance).strength(linkStrength);
          fg("charge").strength(repulsion);
          fgRef.current.d3ReheatSimulation();
        }
      } catch (error) {
        console.error('Force setup error:', error);
      }
    }, 100);

    return () => clearTimeout(timer);
  }
}, [data, zoom, centerForce, linkStrength, repulsion, linkDistance]);


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
  const getRadius = (node) => {
    const deg = degreeMap[node.id] ?? 0;     // 연결 수
    return nodeSize * (1 + deg / 10); // 1 + (0.1 * n) 크기 0.1씩 증가
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
          <Slider label="Node Size" value={nodeSize} setValue={setNodeSize} min={0} max={30} />
          <Slider label="Link Width" value={linkWidth} setValue={setLinkWidth} min={0} max={10} step={0.5} />
          <Slider label="Text Distance" value={zoom} setValue={setZoom} min={0} max={3} step={0.1} />

          <h2 className="section-title">Physics</h2>
          <Slider label="Center Force" value={centerForce} setValue={setCenterForce} min={0} max={1} step={0.01} />
          <Slider label="Link Strength" value={linkStrength} setValue={setLinkStrength} min={0} max={5} step={0.1} />
          <Slider label="Repulsion" value={repulsion} setValue={setRepulsion} min={-500} max={0} step={10} />
          <Slider label="Link Distance" value={linkDistance} setValue={setLinkDistance} min={10} max={300} step={10} />
        </div>
      </div>

      <ForceGraph3D
        ref={fgRef} // useref 를 사용해 forcegraph3d 값 변경
        width={w}
        height={h}
        graphData={data} // 그래프 데이타를 부모로부터 data 프롭으로 받아옴
        backgroundColor="#0f0f0f" // 백그라운드 컬러
        nodeRelSize={nodeSize} // 노드의 실제 크기
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
          // 3D에서는 카메라 이동 방식이 다름
          fgRef.current.cameraPosition(
            { x: node.x * 3, y: node.y * 3, z: node.z * 3 }, // 카메라 위치
            node, // 바라볼 대상
            1000 // 애니메이션 시간
          );
          toast.success(`${node.id} 클릭!`);
          setTimeout(() => onSelect(node.id), 1000); // 1초 후에 노트 열기
        }}
        // 3D 노드 모양 설정
        nodeThreeObject={(node) => {
          const r = getRadius(node);
          const geometry = new THREE.SphereGeometry(r, 16, 16);
          const material = new THREE.MeshLambertMaterial({
            color: (hoverNode && 
              (hoverNode.id === node.id || 
              data.links.some(l => (l.source.id === hoverNode.id && l.target.id === node.id) || 
                                    (l.target.id === hoverNode.id && l.source.id === node.id))))
                ? '#f59e0b'             // 연결 노드만 밝게
                : (node.inactive ? '#52525b' : '#a1a1aa')
          });
          const sphere = new THREE.Mesh(geometry, material);
          
          // 3D 텍스트 (스프라이트 사용)
          if (zoom <= 1) { // 줌 레벨에 따라 텍스트 표시
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const fontSize = 64;
            context.font = `${fontSize}px Arial`;
            context.fillStyle = '#f4f4f5';
            context.textAlign = 'center';
            context.fillText(node.id, canvas.width / 2, canvas.height / 2);
            
            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(r * 4, r * 2, 1);
            sprite.position.set(r * 2, r, 0);
            
            const group = new THREE.Group();
            group.add(sphere);
            group.add(sprite);
            return group;
          }
          
          return sphere;
        }}
        //호버, 드래그 시 선택된 노드 변경 state로 관리 
        onNodeHover={(setHoverNode)} // 호버
        onNodeDrag={(setHoverNode)} // 드래그
        onNodeDragEnd={()=>setHoverNode(null)} // 드래그 끝날때 널값 안넣어주면 가끔 강조 계속 유지됨
        // 3D 조명 설정
        enableNodeDrag={true}
        enableNavigationControls={true}
        showNavInfo={true}
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
