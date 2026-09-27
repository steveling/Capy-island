// Canvas setup, resizing and tiny shared helpers ($, rnd, pick, dist, esc).
'use strict';

const $ = s => document.querySelector(s);
const cv = $('#c');
let ctx = cv.getContext('2d');
let W,
  H,
  DPR,
  SCALE,
  ER = 1,
  AMB = null,
  WG = null,
  islReady = false;
const EC = new Map();
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = innerWidth;
  H = innerHeight;
  cv.width = W * DPR;
  cv.height = H * DPR;
  cv.style.width = W + 'px';
  cv.style.height = H + 'px';
  SCALE = Math.max(0.8, Math.min(1.7, Math.min(W, H) / 400));
  ER = Math.min(DPR * SCALE, 3);
  EC.clear();
  AMB = null;
  WG = null;
  ctx = cv.getContext('2d');
  if (islReady) buildIsland();
}
addEventListener('resize', resize);
resize();
const EMO = '"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';
const rnd = (a, b) => a + Math.random() * (b - a),
  pick = a => a[Math.floor(Math.random() * a.length)],
  dist = (a, b, c, d) => Math.hypot(a - c, b - d);
const esc = s => String(s == null ? '' : s).replace(/[&<>"'`]/g, c => '&#' + c.charCodeAt(0) + ';');
