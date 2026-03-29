import { CATEGORIES, PAGE_META } from './constants.js';

export const currency = (value = 0) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
export const percent = (value = 0) => `${Number(value || 0).toFixed(0)}%`;
export const dateBr = (value) => {
  if (!value) return '—';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR');
};
export const text = (value, fallback = '—') => (value ?? '').toString().trim() || fallback;
export const escapeHtml = (value = '') => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

export function byId(id) { return document.getElementById(id); }
export function qs(selector, scope = document) { return scope.querySelector(selector); }
export function qsa(selector, scope = document) { return Array.from(scope.querySelectorAll(selector)); }

export function categoryLabel(catId) {
  return CATEGORIES.find((item) => item.id === catId)?.label || 'Outros';
}

export function pageMeta(page) {
  return PAGE_META[page] || { title: 'Fluxo', subtitle: 'Painel' };
}

export function sum(items, selector) {
  return (items || []).reduce((acc, item) => acc + Number(selector(item) || 0), 0);
}

export function getInitials(name = '') {
  return name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'FL';
}

export function debounce(fn, wait = 180) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
