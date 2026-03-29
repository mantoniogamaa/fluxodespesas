import { currency } from './helpers.js';

export function drawBarChart(canvas, entries = []) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.clientWidth || 320;
  const height = canvas.height || 220;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const styles = getComputedStyle(document.documentElement);
  const text = styles.getPropertyValue('--text').trim() || '#F0F4FF';
  const text2 = styles.getPropertyValue('--text2').trim() || '#8896B0';
  const accent = styles.getPropertyValue('--accent').trim() || '#3B82F6';
  const border = styles.getPropertyValue('--border2').trim() || '#263245';
  const bg = styles.getPropertyValue('--surface3').trim() || '#1C2535';

  if (!entries.length) {
    ctx.fillStyle = text2;
    ctx.font = '12px sans-serif';
    ctx.fillText('Sem dados para exibir', 16, 24);
    return;
  }

  const top = 24;
  const left = 12;
  const right = 12;
  const barHeight = 18;
  const gap = 16;
  const usableWidth = width - left - right - 120;
  const max = Math.max(...entries.map((entry) => Number(entry.value) || 0), 1);

  entries.slice(0, 6).forEach((entry, index) => {
    const y = top + index * (barHeight + gap);
    const value = Number(entry.value) || 0;
    const barWidth = Math.max(8, (value / max) * usableWidth);

    ctx.fillStyle = text;
    ctx.font = '12px sans-serif';
    ctx.fillText(entry.label, left, y - 4);

    ctx.fillStyle = bg;
    ctx.fillRect(left, y, usableWidth, barHeight);

    ctx.fillStyle = accent;
    ctx.fillRect(left, y, barWidth, barHeight);

    ctx.fillStyle = border;
    ctx.strokeRect(left, y, usableWidth, barHeight);

    ctx.fillStyle = text2;
    ctx.font = '11px sans-serif';
    ctx.fillText(currency(value), left + usableWidth + 12, y + 13);
  });
}
