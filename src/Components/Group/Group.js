// HierGraph.js
import React, { useRef, useMemo, useState, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import toast from 'react-hot-toast';
import { forceRadial } from 'd3-force-3d';
import {getResourceAPI} from '../../Contexts/APIs/ResourceAPI';




/**
 * raw 데이터를 기반으로 상위 그룹 그래프와 하위 그래프들을 생성합니다.
 * (그룹 간 링크 계산 로직 추가됨)
 * @param {object} raw - { nodes, links } 형태의 데이터
 * @returns {{groupGraph: object, subGraphs: object}}
 */
function buildHierGraphs(raw) {
  // 1. 노드를 그룹별로 분류
  const groupBucket = {};
  const noteIdToGroupMap = new Map(raw.nodes.map(n => [n.id, n.group]));

  raw.nodes.forEach((n) => {
    const gid = n.group || 'unknown';
    if (!groupBucket[gid]) groupBucket[gid] = [];
    groupBucket[gid].push(n);
  });

  // 2. 그룹 간 링크 계산
  const groupLinks = [];
  const groupLinksSet = new Set(); // 중복 링크 방지
  raw.links.forEach(link => {
    const sourceGroup = noteIdToGroupMap.get(link.source);
    const targetGroup = noteIdToGroupMap.get(link.target);

    // 소스 그룹과 타겟 그룹이 다를 경우, 그룹 간 링크로 추가
    if (sourceGroup && targetGroup && sourceGroup !== targetGroup) {
      const linkId = [sourceGroup, targetGroup].sort().join('->');
      if (!groupLinksSet.has(linkId)) {
        groupLinksSet.add(linkId);
        groupLinks.push({ source: sourceGroup, target: targetGroup });
      }
    }
  });

  // 3. 상위(그룹) 그래프 생성
  const groupGraph = {
    nodes: Object.entries(groupBucket).map(([gid, nodes]) => ({
      id: gid,
      size: nodes.length,
      level: 0,
    })),
    links: groupLinks, // 계산된 그룹 간 링크 사용
  };

  // 4. 각 그룹의 하위 그래프 생성
  const subGraphs = {};
  Object.entries(groupBucket).forEach(([gid, nodes]) => {
    const idSet = new Set(nodes.map((n) => n.id));
    subGraphs[gid] = {
      nodes: nodes.map((n) => ({ ...n, level: 1 })),
      links: raw.links.filter(
        (l) => idSet.has(l.source) && idSet.has(l.target)
      ),
    };
  });

  return { groupGraph, subGraphs };
}


/*─────────────────────────────────────
  2) 계층 ForceGraph 컴포넌트
─────────────────────────────────────*/
export default function HierGraph({ onSelect }) {
  const fgRef = useRef(null);

  const getNoteList = async (groupId)=>{
    const resourceAPI = getResourceAPI();
    try{
      const response = await resourceAPI.getGroupNotes(groupId);
      console.log('초기 데이터:', response);

        // logTestResult(`노트 데이터 로드 성공! 개수 : ${response.titles.length}, 링크 개수: ${response.links.length}`);
        // response.titles.forEach(g => {
        //   logTestResult(`노트 ${response.titles.indexOf(g) + 1} : 노트ID: ${g.note_id}, 타이틀: ${g.title}, 그룹ID: ${groupId}`);
        // });
        // response.links.forEach(g => {
        //   logTestResult(`링크 ${response.links.indexOf(g) + 1} : src: ${g.src_note_id}, dst_title: ${g.dst_title}`);
        // });
      return response;
    } catch(err)
    {
      console.log(err);
      return null;
    }
  }


  const raw = { "nodes": [
    /* ───── GroupA ───── */
    { "id": "A-1", "group": "GroupA", },
    { "id": "A-2", "group": "GroupA", },
    { "id": "A-3", "group": "GroupA", },
    { "id": "A-4", "group": "GroupA", },

    /* ───── GroupB ───── */
    { "id": "B-1", "group": "GroupB", },
    { "id": "B-2", "group": "GroupB", },
    { "id": "B-3", "group": "GroupB", },

    /* ───── GroupC ───── */
    { "id": "C-1", "group": "GroupC", },
    { "id": "C-2", "group": "GroupC", },
    { "id": "C-3", "group": "GroupC", },
    { "id": "C-4", "group": "GroupC", },
    { "id": "C-5", "group": "GroupC", },
    ],

    "links": [
    /* ───── GroupA 내부 ───── */
    { "source": "A-1", "target": "A-2" },
    { "source": "A-2", "target": "A-3" },
    { "source": "A-3", "target": "A-1" },
    { "source": "A-4", "target": "A-1" },

    /* ───── GroupB 내부 ───── */
    { "source": "B-1", "target": "B-2" },
    { "source": "B-2", "target": "B-3" },
    { "source": "B-3", "target": "B-1" },

    /* ───── GroupC 내부 ───── */
    { "source": "C-1", "target": "C-2" },
    { "source": "C-2", "target": "C-3" },
    { "source": "C-3", "target": "C-4" },
    { "source": "C-4", "target": "C-5" },
    { "source": "C-5", "target": "C-1" },

    /* ───── 그룹 간 링크(선택) ───── */
    { "source": "A-2", "target": "B-1" },
    { "source": "B-3", "target": "C-2" },
    { "source": "C-4", "target": "A-4" }
  ] };
  
  // 전처리
  const { groupGraph, subGraphs } = useMemo(
    () => buildHierGraphs(raw),
    [raw]
  );

  // 화면 상태
  const [view, setView] = useState('group'); // 'group' | 'sub'
  const [graph, setGraph] = useState(groupGraph);

  // 표시/물리 파라미터
  const nodeSize = 10;
  const zoomTrigger = 1.5; // 글자 표시 배율
  const [hoverNode, setHoverNode] = useState(null);
  const centerForce = 0.15;
  const repulsion = -150;

  /*-----------------------------------
    d3 force 값 갱신
  -----------------------------------*/
  useEffect(() => {
    if (!fgRef.current) return;

    fgRef.current
      .d3Force('center', null) // 기본 중심 force 제거
      .d3Force(
        'radial',
        forceRadial(0, 0, 0).strength(centerForce)
      )
      .d3Force('charge')
      .strength(repulsion);

    fgRef.current.d3ReheatSimulation();
  }, [centerForce, repulsion, graph]);

  /*-----------------------------------
    노드 반지름 계산
  -----------------------------------*/
  const getRadius = (node, scale = 1) => {
    // 그룹 노드면 하위 노드 수 기준
    if (node.level === 0) {
      return (nodeSize * (1 + node.size)) / scale;
    }
    // 서브 그래프 노드는 연결 수 기준
    const deg = graph.links.filter(
      (l) =>
        (l.source.id || l.source) === node.id ||
        (l.target.id || l.target) === node.id
    ).length;
    return (nodeSize * (1 + deg / 10)) / scale;
  };

  /*-----------------------------------
    노드 클릭
  -----------------------------------*/
  const handleNodeClick = (node) => {
    if (view === 'group') {
      // 1) 카메라 애니메이션
      fgRef.current.centerAt(node.x, node.y, 600);
      fgRef.current.zoom(4, 600);

      // 2) 애니메이션 종료 후 그래프 교체
      setTimeout(() => {
        const sub = subGraphs[node.id];
        if (!sub) {
          toast.error('하위 그래프 없음');
          return;
        }
        setGraph(sub);
        setView('sub');
        fgRef.current.zoomToFit(400);
      }, 620);
    } else {
      // 하위 그래프에서 클릭 → 외부 액션
      toast.success(`${node.id} 선택`);
      if (onSelect) onSelect(node.id);
    }
  };

  /*-----------------------------------
    상위 그래프로 돌아가기
  -----------------------------------*/
  const backToGroup = () => {
    setGraph(groupGraph);
    setView('group');
    setTimeout(() => fgRef.current.zoomToFit(400), 50);
  };

  /*-----------------------------------
    렌더
  -----------------------------------*/
  return (
    <div style={{ position: 'relative', height: '100%' }}>
      {view === 'sub' && (
        <button
          style={{ position: 'absolute', zIndex: 10, top: 10, left: 10 }}
          onClick={backToGroup}
        >
          ⮜ 그룹 보기
        </button>
      )}

      <ForceGraph2D
        ref={fgRef}
        graphData={graph}
        backgroundColor="#0f0f0f"
        nodeRelSize={nodeSize}
        onNodeClick={handleNodeClick}
        onNodeHover={setHoverNode}
        onNodeDrag={setHoverNode}
        onNodeDragEnd={() => setHoverNode(null)}
        /* 노드 커스텀 그리기 */
        nodeCanvasObject={(node, ctx, scale) => {
          const r = getRadius(node, scale);
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
          ctx.fillStyle =
            hoverNode && hoverNode.id === node.id
              ? '#f59e0b'
              : node.level === 0
              ? '#9ca3af'
              : '#a1a1aa';
          ctx.fill();

          // 확대되면 라벨 표시
          if (scale >= zoomTrigger) {
            const fontSize = 12 / scale;
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.fillStyle = '#f4f4f5';
            ctx.fillText(
              node.id,
              node.x + r + 2 / scale,
              node.y + 4 / scale
            );
          }
        }}
        /* hit-box */
        nodePointerAreaPaint={(node, color, ctx, scale) => {
          const r = getRadius(node, scale);
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
          ctx.fill();
        }}
      />
    </div>
  );
}
