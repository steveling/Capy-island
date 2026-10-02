// Flying between islands: the screen starts in the clouds, and they part to show the island you landed on
// (a friend's, or home), while your plane zooms through the gap.
'use strict';

function cloudsPart() {
  const old = document.getElementById('clouds');
  if (old) old.remove();
  const el = document.createElement('div');
  el.id = 'clouds';
  el.setAttribute('aria-hidden', 'true');
  const calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (calm)
    el.classList.add('calm'); // just a soft fade
  else {
    // two banks of puffy clouds, one sliding out to each side
    for (const side of [-1, 1])
      for (let i = 0; i < 16; i++) {
        const c = document.createElement('div'),
          size = 26 + Math.random() * 26, // vmax
          x = side < 0 ? Math.random() * 62 : 38 + Math.random() * 62, // % of the width
          y = Math.random() * 110 - 5;
        c.className = 'cpuff';
        c.style.cssText =
          `left:${x}%;top:${y}%;width:${size}vmax;height:${size * 0.82}vmax;margin:${-size * 0.41}vmax 0 0 ${-size / 2}vmax;` +
          `--dx:${side * (75 + Math.random() * 45)}vw;--dy:${(Math.random() - 0.5) * 18}vh;` +
          `animation-delay:${(0.1 + Math.random() * 0.25).toFixed(2)}s`;
        el.appendChild(c);
      }
    const p = document.createElement('div');
    p.className = 'cplane';
    p.textContent = typeof myCraft === 'function' && CRAFTS[myCraft()] ? CRAFTS[myCraft()].e : '🛩️';
    el.appendChild(p);
  }
  document.body.appendChild(el);
  try {
    SND.whoosh();
  } catch (e) {}
  setTimeout(() => el.remove(), 2400);
}
