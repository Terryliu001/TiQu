/**
 * 画布：渲染 PDF 页、叠加题目框、拖动/缩放/新建。
 *
 * 交互口径（沿用刷起的"点中才可拖"）：
 * - 点击框 = 选中（并打开右侧 AI）；按住拖动超过 3px 才开始移动，不会误触；
 * - 选中的框才出手柄；拖手柄缩放；
 * - 空白处按住拖 = 画新框（编辑模式下）；
 * - 空白单击 = 取消选中。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Question, Rect } from '../types';
import { useApp } from '../store';
import { makeManualQuestion } from '../core/corrections';
import { gradeOf } from '../core/cut/confidence';
import { questionsOnPage } from '../core/cut/split';
import { Icon } from './icons';

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se';

interface DragState {
  id: string;
  mode: DragMode;
  startX: number;
  startY: number;
  page: number;
  rect: Rect;
  moved: boolean;
}

export function Canvas() {
  const pdf = useApp((s) => s.pdf);
  const pageSizes = useApp((s) => s.pageSizes);
  const currentPage = useApp((s) => s.currentPage);
  const zoom = useApp((s) => s.zoom);
  const questions = useApp((s) => s.questions);
  const selectedId = useApp((s) => s.selectedId);
  const editing = useApp((s) => s.editing);
  const select = useApp((s) => s.select);
  const setPage = useApp((s) => s.setPage);
  const setZoom = useApp((s) => s.setZoom);
  const commit = useApp((s) => s.commit);
  const showToast = useApp((s) => s.showToast);
  const cutting = useApp((s) => s.cutting);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [rendering, setRendering] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [preview, setPreview] = useState<{ id: string; rect: Rect } | null>(null);
  const [draft, setDraft] = useState<Rect | null>(null);
  const draftStart = useRef<{ x: number; y: number } | null>(null);

  const page = pageSizes[currentPage];
  const pageW = page?.width ?? 595;
  const pageH = page?.height ?? 842;

  const boxes = useMemo(
    () => questionsOnPage(questions, currentPage),
    [questions, currentPage],
  );

  // 渲染当前页
  useEffect(() => {
    let cancelled = false;
    if (!pdf || !canvasRef.current) return;
    setRendering(true);
    pdf
      .renderPage(currentPage, canvasRef.current, 1.7)
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setRendering(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pdf, currentPage]);

  // 打开新文件时按窗口宽度适配
  useEffect(() => {
    if (!pdf) return;
    const container = scrollRef.current;
    if (!container) return;
    const available = container.clientWidth - 96;
    const next = Math.max(0.5, Math.min(1.35, available / pageW));
    setZoom(Number(next.toFixed(3)));
    // pageW 只在换项目时变，不跟 zoom 联动
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf]);

  // 底部提示条：8 秒后自动淡出，别一直挡着卷面
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  const toPagePoint = useCallback(
    (clientX: number, clientY: number) => {
      const rect = pageRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return { x: (clientX - rect.left) / zoom, y: (clientY - rect.top) / zoom };
    },
    [zoom],
  );

  // ---------- 拖动 / 缩放 ----------
  const onBoxPointerDown = (event: React.PointerEvent<HTMLDivElement>, question: Question, rect: Rect) => {
    event.stopPropagation();
    if (selectedId !== question.id) select(question.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      id: question.id,
      mode: 'move',
      startX: event.clientX,
      startY: event.clientY,
      page: currentPage,
      rect: { ...rect },
      moved: false,
    });
    setPreview({ id: question.id, rect: { ...rect } });
  };

  const onHandlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    question: Question,
    rect: Rect,
    mode: DragMode,
  ) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      id: question.id,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      page: currentPage,
      rect: { ...rect },
      moved: false,
    });
    setPreview({ id: question.id, rect: { ...rect } });
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const dx = (event.clientX - drag.startX) / zoom;
    const dy = (event.clientY - drag.startY) / zoom;
    if (!drag.moved && Math.hypot(dx, dy) * zoom < 3) return;

    const next = drag.moved ? { ...drag, moved: true } : { ...drag, moved: true };
    if (!drag.moved) setDrag(next);

    let rect: Rect;
    if (drag.mode === 'move') {
      rect = { ...drag.rect, left: drag.rect.left + dx, top: drag.rect.top + dy };
    } else {
      const r = { ...drag.rect };
      if (drag.mode.includes('e')) r.width = Math.max(16, drag.rect.width + dx);
      if (drag.mode.includes('s')) r.height = Math.max(12, drag.rect.height + dy);
      if (drag.mode.includes('w')) {
        r.left = Math.min(drag.rect.left + drag.rect.width - 16, drag.rect.left + dx);
        r.width = drag.rect.width + (drag.rect.left - r.left);
      }
      if (drag.mode.includes('n')) {
        r.top = Math.min(drag.rect.top + drag.rect.height - 12, drag.rect.top + dy);
        r.height = drag.rect.height + (drag.rect.top - r.top);
      }
      rect = r;
    }
    setPreview({ id: drag.id, rect });
  };

  const onPointerUp = () => {
    if (drag && drag.moved) {
      const final = preview?.rect;
      if (final) {
        if (drag.mode === 'move') {
          commit({
            t: 'move',
            id: drag.id,
            dx: final.left - drag.rect.left,
            dy: final.top - drag.rect.top,
          });
        } else {
          commit({ t: 'resize', id: drag.id, page: drag.page, rect: final });
        }
      }
    }
    setDrag(null);
    setPreview(null);
  };

  // ---------- 新建框 ----------
  const onSurfacePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    select(null);
    if (!editing) return;
    const point = toPagePoint(event.clientX, event.clientY);
    draftStart.current = point;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraft({ left: point.x, top: point.y, width: 0, height: 0 });
  };

  const onSurfacePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draftStart.current) return;
    const point = toPagePoint(event.clientX, event.clientY);
    const start = draftStart.current;
    setDraft({
      left: Math.min(start.x, point.x),
      top: Math.min(start.y, point.y),
      width: Math.abs(point.x - start.x),
      height: Math.abs(point.y - start.y),
    });
  };

  const onSurfacePointerUp = () => {
    const start = draftStart.current;
    draftStart.current = null;
    const rect = draft;
    setDraft(null);
    if (!start || !rect) return;
    if (rect.width < 24 || rect.height < 16) return;
    const question = makeManualQuestion(currentPage, rect, `新 ${questions.length + 1}`);
    commit({ t: 'add', question });
    select(question.id);
    showToast('已加一个题目框');
  };

  // ---------- 浮条动作 ----------
  const selected = questions.find((q) => q.id === selectedId) ?? null;
  const selectedBox = boxes.find((b) => b.question.id === selectedId) ?? null;

  const rename = () => {
    if (!selected) return;
    const label = window.prompt('题号', selected.label);
    if (label && label.trim()) commit({ t: 'rename', id: selected.id, label: label.trim() });
  };

  const merge = () => {
    if (!selected) return;
    const index = questions.findIndex((q) => q.id === selected.id);
    if (index <= 0) {
      showToast('已经是第一题，没有可以并入的上一题');
      return;
    }
    commit({ t: 'merge', id: selected.id });
  };

  const split = () => {
    if (!selected || !selectedBox) return;
    const slice = selected.slices.find((s) => s.page === currentPage) ?? selected.slices[0];
    if (!slice) return;
    const y = slice.rect.top + slice.rect.height / 2;
    commit({
      t: 'split',
      id: selected.id,
      page: slice.page,
      y,
      newId: `m_${Date.now().toString(36)}`,
      label: `${selected.label}′`,
    });
    showToast('已从中间拆成两题');
  };

  const remove = () => {
    if (!selected) return;
    commit({ t: 'delete', id: selected.id });
    select(null);
  };

  // 浮条位置：优先贴框下方，底部放不下就翻到上方
  const barStyle = (() => {
    if (!selectedBox || drag) return null;
    const r = effectiveRect(selectedBox.slice.rect);
    const top = r.top + r.height + 10;
    const flip = (top + 44) * zoom > pageH * zoom;
    return {
      left: Math.max(0, Math.min(r.left * zoom, pageW * zoom - 300)),
      top: flip ? r.top * zoom - 44 : top * zoom,
    } as React.CSSProperties;
  })();

  function effectiveRect(rect: Rect): Rect {
    return preview && preview.id === selectedId ? preview.rect : rect;
  }

  return (
    <section className="stage">
      <div className="stage-tools">
        <button className="icon-btn sm" onClick={() => setZoom(zoom - 0.1)} title="缩小（-）">
          <Icon name="minus" size={14} />
        </button>
        <span className="txt">{Math.round(zoom * 100)}%</span>
        <button className="icon-btn sm" onClick={() => setZoom(zoom + 0.1)} title="放大（+）">
          <Icon name="plus" size={14} />
        </button>
        <span className="sep" />
        <button className="icon-btn sm" onClick={() => fitToWidth(scrollRef.current, pageW, setZoom)} title="适应宽度（0）">
          <Icon name="fit" size={14} />
        </button>
        <span className="sep" />
        <button className="icon-btn sm" disabled={currentPage <= 0} onClick={() => setPage(currentPage - 1)} title="上一页">
          <span style={{ transform: 'rotate(90deg)', display: 'grid' }}>
            <Icon name="chev" size={14} />
          </span>
        </button>
        <span className="txt" style={{ minWidth: 58 }}>
          {currentPage + 1} / {pageSizes.length || 0}
        </span>
        <button
          className="icon-btn sm"
          disabled={currentPage >= pageSizes.length - 1}
          onClick={() => setPage(currentPage + 1)}
          title="下一页"
        >
          <span style={{ transform: 'rotate(-90deg)', display: 'grid' }}>
            <Icon name="chev" size={14} />
          </span>
        </button>
      </div>

      <div className="stage-scroll scroll" ref={scrollRef}>
        <div
          className="page-frame"
          ref={pageRef}
          style={{ width: pageW * zoom, height: pageH * zoom }}
        >
          <canvas
            ref={canvasRef}
            className="page-canvas"
            style={{ width: pageW * zoom, height: pageH * zoom, opacity: rendering ? 0.72 : 1 }}
          />

          <div className="page-overlay">
            <div
              className="page-hit"
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'auto',
                cursor: editing ? 'crosshair' : 'default',
              }}
              onPointerDown={onSurfacePointerDown}
              onPointerMove={onSurfacePointerMove}
              onPointerUp={onSurfacePointerUp}
            />

            {boxes.map(({ question, slice }) => {
              const rect = effectiveRect(slice.rect);
              const isSelected = question.id === selectedId;
              const grade = gradeOf(question.confidence);
              return (
                <div
                  key={`${question.id}-${slice.page}`}
                  className={`qbox${isSelected ? ' selected' : ''}${drag?.id === question.id && drag.moved ? ' dragging' : ''}`}
                  style={{
                    left: rect.left * zoom,
                    top: rect.top * zoom,
                    width: rect.width * zoom,
                    height: rect.height * zoom,
                    zIndex: isSelected ? 5 : 2,
                  }}
                  onPointerDown={(e) => onBoxPointerDown(e, question, slice.rect)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onDoubleClick={() => select(question.id)}
                >
                  {grade !== 'green' && <span className={`grade-bar ${grade}`} />}
                  <span className={`tag${question.source === 'manual' ? ' manual' : ''}`}>
                    {question.label}
                  </span>

                  {isSelected && (
                    <div className="handles">
                      {(['nw', 'ne', 'sw', 'se'] as DragMode[]).map((pos) => (
                        <div
                          key={pos}
                          className="handle"
                          data-pos={pos}
                          onPointerDown={(e) => onHandlePointerDown(e, question, slice.rect, pos)}
                          onPointerMove={onPointerMove}
                          onPointerUp={onPointerUp}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {draft && (
              <div
                className="qbox draft"
                style={{
                  left: draft.left * zoom,
                  top: draft.top * zoom,
                  width: draft.width * zoom,
                  height: draft.height * zoom,
                  zIndex: 6,
                }}
              />
            )}

            {selected && barStyle && (
              <div className="qbar" style={barStyle}>
                <button onClick={rename}>
                  <Icon name="tag" size={13} />
                  改题号
                </button>
                <button onClick={merge}>
                  <Icon name="merge" size={13} />
                  并入上题
                </button>
                <button onClick={split}>
                  <Icon name="split" size={13} />
                  拆分
                </button>
                <span className="fsep" />
                <button className="danger" onClick={remove}>
                  <Icon name="trash" size={13} />
                  删除
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="page-foot">
          第 {currentPage + 1} 页 · 本页 {boxes.length} 个框
        </div>
      </div>

      <div className="stage-hint" style={{ opacity: showHint && !selected ? 1 : 0, transition: 'opacity 300ms ease' }}>
        <Icon name="bolt" size={13} />
        {cutting
          ? `${cutting.phase === 'scan' ? '版面切题' : cutting.phase === 'text' ? '读取文本层' : '准备中'} ${cutting.page}/${cutting.total}`
          : editing
            ? '空白处拖动可画新框'
            : '点击框选中，拖动移动，拖角缩放'}
        <span style={{ width: 1, height: 12, background: 'var(--line)' }} />
        <kbd className="kbd">↑</kbd>
        <kbd className="kbd">↓</kbd>
        切题
        <kbd className="kbd">E</kbd>
        编辑
      </div>

      {cutting && (
        <div className="progress">
          <div className="bar" style={{ width: `${Math.round((cutting.page / Math.max(1, cutting.total)) * 100)}%` }} />
        </div>
      )}
    </section>
  );
}

function fitToWidth(
  container: HTMLDivElement | null,
  pageWidth: number,
  setZoom: (zoom: number) => void,
) {
  if (!container) return;
  const available = container.clientWidth - 96;
  setZoom(Number(Math.max(0.4, Math.min(3, available / pageWidth)).toFixed(3)));
}
