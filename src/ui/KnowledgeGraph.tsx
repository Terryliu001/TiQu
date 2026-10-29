/**
 * 知识关系图谱：d3-force 力学布局 + Canvas 2D 自绘（Obsidian 风格）。
 *
 * 交互：滚轮缩放（以光标为锚点）、空白拖拽平移、节点拖拽、hover 高亮邻居、
 * 点击选中。按章节着色，节点大小随度数变化，标签随缩放/选中状态淡入。
 * 不依赖任何图表库，绘制只动 transform，空闲时不重绘。
 */
import { useEffect, useRef } from 'react';
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
} from 'd3-force';
import { useKnowledge } from '../store/knowledge';
import { getChapter } from '../core/knowledge/seed';
import type { GraphLink, GraphNode, Term } from '../core/knowledge/types';

interface Props {
  terms: Term[];
  links: GraphLink[];
}

type Transform = { scale: number; tx: number; ty: number };

function radiusOf(n: GraphNode): number {
  return Math.max(6, Math.min(17, 6 + n.degree * 1.3));
}

export function KnowledgeGraph({ terms, links }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<Simulation<GraphNode, GraphLink> | null>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const transformRef = useRef<Transform>({ scale: 1, tx: 0, ty: 0 });
  const posCache = useRef<Map<string, { x: number; y: number }>>(new Map());
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const dragRef = useRef<{ id: string | null; panning: boolean; lastX: number; lastY: number }>({
    id: null,
    panning: false,
    lastX: 0,
    lastY: 0,
  });

  const selectedId = useKnowledge((s) => s.selectedId);
  const hoverId = useKnowledge((s) => s.hoverId);
  const select = useKnowledge((s) => s.select);
  const hover = useKnowledge((s) => s.hover);

  // draw 闭包只构建一次，用 ref 读取最新的选中/悬停，避免高亮不刷新
  const selRef = useRef(selectedId);
  const hovRef = useRef(hoverId);
  selRef.current = selectedId;
  hovRef.current = hoverId;

  const draw = useRef<() => void>(() => {});

  // 构建/重建仿真
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const { width, height } = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    sizeRef.current = { w: width, h: height, dpr };
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // 拷贝节点，复用在位坐标以保持布局稳定
    const prev = posCache.current;
    const degree = new Map<string, number>();
    for (const l of links) {
      const s = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id;
      const t = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id;
      degree.set(s, (degree.get(s) ?? 0) + 1);
      degree.set(t, (degree.get(t) ?? 0) + 1);
    }
    const nodes: GraphNode[] = terms.map((t, i) => {
      const chapter = getChapter(t.chapter);
      const p = prev.get(t.id);
      const scatter = p ?? {
        x: Math.cos(i * 2.399) * 340 + (Math.random() - 0.5) * 80,
        y: Math.sin(i * 2.399) * 340 + (Math.random() - 0.5) * 80,
      };
      return {
        id: t.id,
        name: t.name,
        chapter: t.chapter,
        color: chapter.color,
        summary: t.summary,
        degree: degree.get(t.id) ?? 0,
        x: scatter.x,
        y: scatter.y,
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
      };
    });
    const simLinks: GraphLink[] = links.map((l) => ({ ...l }));
    nodesRef.current = nodes;
    linksRef.current = simLinks;

    const sim = forceSimulation<GraphNode>(nodes)
      .force('charge', forceManyBody<GraphNode>().strength(-260).distanceMax(420))
      .force('link', forceLink<GraphNode, GraphLink>(simLinks).id((d) => d.id).distance(64).strength(0.35))
      .force('center', forceCenter(0, 0))
      .force('collide', forceCollide<GraphNode>((d) => radiusOf(d) + 7))
      .alpha(0.9)
      .alphaDecay(0.035);
    simRef.current = sim;

    draw.current = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const { w, h, dpr } = sizeRef.current;
      const { scale, tx, ty } = transformRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // 主题相关颜色
      const isDark = document.documentElement.dataset.theme === 'dark';
      const edgeColor = isDark ? 'rgba(150,170,190,0.18)' : 'rgba(60,72,90,0.16)';
      const edgeHot = isDark ? 'rgba(180,205,230,0.5)' : 'rgba(40,60,90,0.5)';
      const labelColor = isDark ? 'rgba(225,232,240,0.92)' : 'rgba(32,40,52,0.92)';
      const labelDim = isDark ? 'rgba(200,210,222,0.35)' : 'rgba(70,80,95,0.32)';

      // 邻居关系（用于高亮）
      const neighbors = new Map<string, Set<string>>();
      const active = hovRef.current ?? selRef.current;
      for (const l of simLinks) {
        const s = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
        const t = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
        if (!neighbors.has(s)) neighbors.set(s, new Set());
        if (!neighbors.has(t)) neighbors.set(t, new Set());
        neighbors.get(s)!.add(t);
        neighbors.get(t)!.add(s);
      }
      const isHot = (id: string) => active && (id === active || neighbors.get(active)?.has(id));

      ctx.lineWidth = 1;
      for (const l of simLinks) {
        // forceLink 运行后会把 source/target 由 id 字符串替换为节点对象
        const s = l.source as unknown as GraphNode;
        const t = l.target as unknown as GraphNode;
        const hot = active && (s.id === active || t.id === active);
        ctx.strokeStyle = hot ? edgeHot : edgeColor;
        ctx.beginPath();
        ctx.moveTo(s.x * scale + tx, s.y * scale + ty);
        ctx.lineTo(t.x * scale + tx, t.y * scale + ty);
        ctx.stroke();
      }

      for (const n of nodes) {
        const r = radiusOf(n);
        const cx = n.x * scale + tx;
        const cy = n.y * scale + ty;
        const hot = Boolean(isHot(n.id));
        const dim = active && !hot && n.id !== active;

        ctx.globalAlpha = dim ? 0.35 : 1;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();
        ctx.lineWidth = n.id === selectedId ? 3 : hot ? 2 : 1;
        ctx.strokeStyle = n.id === selectedId ? '#fff' : isDark ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.85)';
        ctx.stroke();
        ctx.globalAlpha = 1;

        // 标签：选中/邻居恒显；缩放够大时全显
        const showLabel = hot || scale > 0.95;
        if (showLabel) {
          ctx.font = `${n.id === selectedId ? 13 : 11.5}px "Noto Serif SC", "Songti SC", serif`;
          ctx.fillStyle = n.id === selectedId ? labelColor : hot ? labelColor : labelDim;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(n.name, cx, cy + r + 3);
        }
      }
      ctx.globalAlpha = 1;
    };

    sim.on('tick', () => {
      for (const n of nodes) posCache.current.set(n.id, { x: n.x, y: n.y });
      draw.current();
    });

    const refit = () => {
      const xs = nodes.map((n) => n.x);
      const ys = nodes.map((n) => n.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const bw = Math.max(1, maxX - minX);
      const bh = Math.max(1, maxY - minY);
      const pad = 70;
      const s = Math.min((width - pad * 2) / bw, (height - pad * 2) / bh, 1.4);
      transformRef.current = {
        scale: s,
        tx: width / 2 - ((minX + maxX) / 2) * s,
        ty: height / 2 - ((minY + maxY) / 2) * s,
      };
      draw.current();
    };

    // 初始缩放以容纳全部节点；仿真收尾再校正一次
    requestAnimationFrame(refit);
    sim.on('end', refit);

    // 容器尺寸变化（窗口缩放）时同步画布并重绘
    const ro = new ResizeObserver(() => {
      const rect = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      sizeRef.current = { w: rect.width, h: rect.height, dpr };
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      draw.current();
    });
    ro.observe(wrap);

    return () => {
      sim.stop();
      ro.disconnect();
    };
    // 仅在词条/边集合变化时重建
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terms, links]);

  // 选中/悬停变化触发重绘（不重建仿真）
  useEffect(() => {
    draw.current();
  }, [selectedId, hoverId]);

  // 主题切换后重绘
  useEffect(() => {
    const observer = new MutationObserver(() => draw.current());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const toWorld = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const { scale, tx, ty } = transformRef.current;
    return {
      x: (clientX - rect.left - tx) / scale,
      y: (clientY - rect.top - ty) / scale,
    };
  };

  const pick = (clientX: number, clientY: number): GraphNode | null => {
    const { x, y } = toWorld(clientX, clientY);
    let found: GraphNode | null = null;
    let best = Infinity;
    for (const n of nodesRef.current) {
      const d = Math.hypot(n.x - x, n.y - y);
      if (d < radiusOf(n) + 4 && d < best) {
        best = d;
        found = n;
      }
    }
    return found;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const node = pick(e.clientX, e.clientY);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    if (node) {
      dragRef.current.id = node.id;
      node.fx = node.x;
      node.fy = node.y;
      simRef.current?.alphaTarget(0.15).restart();
    } else {
      dragRef.current.panning = true;
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (drag.id) {
      const { x, y } = toWorld(e.clientX, e.clientY);
      const node = nodesRef.current.find((n) => n.id === drag.id);
      if (node) {
        node.fx = x;
        node.fy = y;
      }
      return;
    }
    if (drag.panning) {
      const t = transformRef.current;
      t.tx += e.clientX - drag.lastX;
      t.ty += e.clientY - drag.lastY;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      draw.current();
      return;
    }
    // hover 检测（轻量，直接查最近节点）
    const node = pick(e.clientX, e.clientY);
    hover(node?.id ?? null);
  };

  const endDrag = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (drag.id) {
      const node = nodesRef.current.find((n) => n.id === drag.id);
      if (node) {
        node.fx = null;
        node.fy = null;
      }
      simRef.current?.alphaTarget(0);
      drag.id = null;
    }
    drag.panning = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };

  const onClick = (e: React.MouseEvent) => {
    const node = pick(e.clientX, e.clientY);
    select(node?.id ?? null);
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const t = transformRef.current;
    const factor = Math.exp(-e.deltaY * 0.0014);
    const next = Math.max(0.3, Math.min(3.5, t.scale * factor));
    // 以光标为锚点缩放
    t.tx = mx - ((mx - t.tx) * next) / t.scale;
    t.ty = my - ((my - t.ty) * next) / t.scale;
    t.scale = next;
    draw.current();
  };

  return (
    <div className="kg-wrap" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="kg-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={(e) => {
          endDrag(e);
          hover(null);
        }}
        onClick={onClick}
        onWheel={onWheel}
      />
    </div>
  );
}
