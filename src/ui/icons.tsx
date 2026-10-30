/**
 * 自绘图标。统一 24 视框、1.6 线宽、圆头。
 * 不用图标库：这套图形要跟"发丝线 + 圆角"的界面语言一致，外部库语汇不合。
 */
export function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <symbol id="i-logo" viewBox="0 0 24 24">
          <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M9.5 9.3a2.5 2.5 0 1 1 3.5 2.3c-.7.35-1 .9-1 1.6v.4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="12" cy="16.6" r="1" fill="currentColor" />
        </symbol>
        <symbol id="i-chev" viewBox="0 0 24 24">
          <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-search" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <path d="M15.6 15.6L20 20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </symbol>
        <symbol id="i-sun" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </symbol>
        <symbol id="i-moon" viewBox="0 0 24 24">
          <path d="M20 14.5A8.2 8.2 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-gear" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <path d="M19.3 13.5a7.7 7.7 0 0 0 0-3l1.8-1.3-1.9-3.3-2.1.9a7.6 7.6 0 0 0-2.6-1.5L14.2 3h-3.8l-.3 2.3a7.6 7.6 0 0 0-2.6 1.5l-2.1-.9L3.5 9.2l1.8 1.3a7.7 7.7 0 0 0 0 3l-1.8 1.3 1.9 3.3 2.1-.9a7.6 7.6 0 0 0 2.6 1.5l.3 2.3h3.8l.3-2.3a7.6 7.6 0 0 0 2.6-1.5l2.1.9 1.9-3.3z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-rescan" viewBox="0 0 24 24">
          <path d="M12 3.5l1.6 4.4L18 9.5l-4.4 1.6L12 15.5l-1.6-4.4L6 9.5l4.4-1.6z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M18.4 14.6l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-ai" viewBox="0 0 24 24">
          <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8A2.5 2.5 0 0 1 17.5 17H12l-4.6 3.2V17H6.5A2.5 2.5 0 0 1 4 14.5z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M9 10.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </symbol>
        <symbol id="i-close" viewBox="0 0 24 24">
          <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </symbol>
        <symbol id="i-minus" viewBox="0 0 24 24">
          <path d="M6 12h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </symbol>
        <symbol id="i-plus" viewBox="0 0 24 24">
          <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </symbol>
        <symbol id="i-fit" viewBox="0 0 24 24">
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-tag" viewBox="0 0 24 24">
          <path d="M11 4h6.5A2.5 2.5 0 0 1 20 6.5V13l-7.6 7.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="16" cy="8" r="1.4" fill="currentColor" />
        </symbol>
        <symbol id="i-merge" viewBox="0 0 24 24">
          <path d="M5 6h5l4 6-4 6H5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 12h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </symbol>
        <symbol id="i-split" viewBox="0 0 24 24">
          <path d="M4 8h16M4 16h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M12 3v4M12 17v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </symbol>
        <symbol id="i-trash" viewBox="0 0 24 24">
          <path d="M5 7h14M9.5 7V4.8h5V7M7 7l.8 12.2a1.6 1.6 0 0 0 1.6 1.5h5.2a1.6 1.6 0 0 0 1.6-1.5L17 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-undo" viewBox="0 0 24 24">
          <path d="M9 7H5v-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 7a8 8 0 1 1-1 7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </symbol>
        <symbol id="i-redo" viewBox="0 0 24 24">
          <path d="M15 7h4v-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M19 7a8 8 0 1 0 1 7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </symbol>
        <symbol id="i-send" viewBox="0 0 24 24">
          <path d="M5 12h13M12.5 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-stop" viewBox="0 0 24 24">
          <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />
        </symbol>
        <symbol id="i-clip" viewBox="0 0 24 24">
          <path d="M8.5 12.5l6-6a3.2 3.2 0 0 1 4.5 4.5l-8 8a5 5 0 0 1-7-7l7.4-7.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </symbol>
        <symbol id="i-copy" viewBox="0 0 24 24">
          <rect x="9" y="9" width="10.5" height="10.5" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M15 6.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </symbol>
        <symbol id="i-thumb" viewBox="0 0 24 24">
          <path d="M7 21V10l4.2-6.2c.4-.6 1.4-.3 1.5.4l.4 4.3h4.4a2 2 0 0 1 2 2.4l-1.2 6.6A2.6 2.6 0 0 1 15.8 21H7z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M7 10H4v11h3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-file" viewBox="0 0 24 24">
          <path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M13 3v6h6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-bolt" viewBox="0 0 24 24">
          <path d="M13 3L6 13h5l-1 8 8-11h-5z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-lock" viewBox="0 0 24 24">
          <rect x="5" y="10.5" width="14" height="9.5" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </symbol>
        <symbol id="i-edit" viewBox="0 0 24 24">
          <path d="M4 20l.9-4.4L15.6 4.9a2.1 2.1 0 0 1 3 0l.5.5a2.1 2.1 0 0 1 0 3L8.4 19.1z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M13.8 6.7l3.5 3.5" stroke="currentColor" strokeWidth="1.6" />
        </symbol>
        <symbol id="i-check" viewBox="0 0 24 24">
          <path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-keyboard" viewBox="0 0 24 24">
          <rect x="3" y="6" width="18" height="12" rx="2.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M7 10h.01M11 10h.01M15 10h.01M18 10h.01M7 13.5h.01M18 13.5h.01M9 13.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </symbol>
        <symbol id="i-graph" viewBox="0 0 24 24">
          <circle cx="6" cy="7" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="18" cy="7" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="12" cy="18" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M7.8 8.6 10.4 16M16.2 8.6 13.6 16M8.2 7h7.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </symbol>
        <symbol id="i-doc" viewBox="0 0 24 24">
          <rect x="5" y="3.5" width="14" height="17" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </symbol>
        <symbol id="i-spark" viewBox="0 0 24 24">
          <path d="M12 3.2l1.7 4.9 4.9 1.7-4.9 1.7L12 16.4l-1.7-4.9L5.4 9.8l4.9-1.7z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M18.4 15.2l.6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6z" fill="currentColor" />
        </symbol>
        <symbol id="i-shelf" viewBox="0 0 24 24">
          <rect x="3.6" y="5" width="3.8" height="12.2" rx="0.9" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <rect x="8.6" y="7" width="3.8" height="10.2" rx="0.9" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M14.4 7.9l3.6 1.1-3.2 9.3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M3 19.6h17.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </symbol>
      </defs>
    </svg>
  );
}

export function Icon({
  name,
  size = 16,
  className,
  style,
}: {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg width={size} height={size} className={className} style={style} aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  );
}
