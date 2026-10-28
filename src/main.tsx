import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/tokens.css';
import './styles/app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// 首屏骨架淡出：等第一帧画完再移除，避免中间闪一下白。
requestAnimationFrame(() => {
  const boot = document.getElementById('boot');
  if (!boot) return;
  boot.style.opacity = '0';
  setTimeout(() => boot.remove(), 300);
});
