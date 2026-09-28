// Grown-ups panel (hold ⚙️): backup and restore.
'use strict';

// ---------- GROWN-UPS: backup & restore (press and hold the gear) ----------
(function () {
  const g = $('#gear');
  let t = null;
  const cancel = () => {
    clearTimeout(t);
    t = null;
    g.classList.remove('hold');
  };
  g.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (busy && !MP.dockOpen && $('#modal').classList.contains('hidden')) return;
    g.classList.add('hold');
    clearTimeout(t);
    t = setTimeout(() => {
      cancel();
      grownups();
    }, 1500);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev =>
    g.addEventListener(ev, () => {
      if (t) {
        cancel();
        toast('For grown-ups: press and hold ⚙️');
      }
    })
  );
  g.addEventListener('contextmenu', e => e.preventDefault());
})();
function backupObj() {
  save();
  return {
    app: 'capy-island',
    v: 1,
    key: KEY,
    date: new Date().toISOString(),
    save: JSON.parse(JSON.stringify(S))
  };
}
const b64enc = s => btoa(unescape(encodeURIComponent(s))),
  b64dec = s => decodeURIComponent(escape(atob(s)));
function backupName() {
  const d = new Date(),
    z = n => String(n).padStart(2, '0');
  return `capy-island-backup-${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}.json`;
}
function grownups(msg) {
  modal(`<h2>⚙️ Grown-ups</h2>${msg ? `<p class="note">${msg}</p>` : ''}<p class="c" style="font-size:14px">Save a backup of ${esc(S.name || 'the')}'s island so it can't get lost (Chrome can clear website data).</p>
 <button class="btn big" onclick="saveBackup()">💾 Save backup file</button><button class="btn big white" onclick="copyBackup()">📋 Copy backup code</button><div id="bkcode"></div>
 <h3>Restore a backup</h3><div class="row" style="margin-top:0"><label class="btn white">📂 Choose file<input type="file" id="bkfile" accept=".json,application/json,text/plain" style="display:none"></label></div>
 <p class="c" style="font-size:14px;margin:10px 0 4px">…or paste a backup code:</p><textarea class="bk" id="bkpaste" placeholder="Paste backup code here"></textarea><div class="row"><button class="btn white" onclick="restoreText(document.getElementById('bkpaste').value)">Restore from code</button></div>
 ${plPanelHtml()}${CL.on ? clPanelHtml() : ''}
 <h3>🔑 Island code</h3><p class="c" style="font-size:14px;margin-top:0">Friends use the same code every time. If it got shared with someone it shouldn't, make a new one.</p><div class="row" style="margin-top:0"><button class="btn white" onclick="newIslandCode()">🔄 New island code</button></div><p class="c" style="font-size:12px;color:#b0487c">Capy Island v4 · save key ${KEY}</p><div class="row"><button class="btn" onclick="closeModal()">Close</button></div>`);
  $('#bkfile').onchange = e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > 2e6) {
      grownups('😕 That file is too big to be a Capy Island backup.');
      return;
    }
    const r = new FileReader();
    r.onload = () => restoreText(String(r.result));
    r.onerror = () => grownups("😕 Couldn't read that file.");
    r.readAsText(f);
  };
  if (CL.on) clPanelWire();
}
// forget this island's code (the old one stops working); the next time it opens it gets a new one
window.newIslandCode = async () => {
  if (MP.role) return grownups('Please finish visiting / close your island first. ✈️');
  if (CL.on)
    try {
      if (!CL.ready) throw 0;
      await clRpc('new_island_code');
    } catch (e) {
      return grownups("😕 Couldn't make a new code right now. Check the internet and try again.");
    }
  S.code = '';
  save();
  grownups("🔑 Done! The old code won't work any more. Your island gets a new one next time it opens.");
};
window.saveBackup = async () => {
  const json = JSON.stringify(backupObj(), null, 1),
    name = backupName();
  try {
    const file = new File([json], name, { type: 'application/json' });
    if (navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'Capy Island backup',
        text: `Capy Island backup (${new Date().toLocaleDateString()})`
      });
      toast('Backup shared! 💾');
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' })),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('Backup downloaded! 💾<br>' + name, 3500);
};
window.copyBackup = () => {
  const code = 'CAPY1:' + b64enc(JSON.stringify(backupObj()));
  const box = $('#bkcode');
  if (box) {
    box.innerHTML =
      '<p class="c" style="font-size:13px;margin:8px 0 4px">Backup code (keep it somewhere safe):</p><textarea class="bk" readonly id="bkout"></textarea>';
    $('#bkout').value = code;
  }
  const ok = () => toast('Backup code copied! 📋'),
    no = () => {
      toast('Select the code and copy it 📋');
      try {
        $('#bkout').select();
      } catch (e) {}
    };
  try {
    navigator.clipboard.writeText(code).then(ok, no);
  } catch (e) {
    no();
  }
};
function parseBackup(txt) {
  txt = String(txt || '').trim();
  if (!txt) throw 0;
  let o;
  if (txt[0] !== '{') {
    const c = txt.replace(/^CAPY1:/, '').replace(/\s+/g, '');
    o = JSON.parse(b64dec(c));
  } else o = JSON.parse(txt);
  let sv = o && o.app === 'capy-island' ? o.save : o;
  const date = o && o.date ? new Date(o.date) : null;
  const obj = v => v && typeof v === 'object' && !Array.isArray(v);
  if (
    !obj(sv) ||
    !obj(sv.neigh) ||
    !obj(sv.bag) ||
    typeof sv.coins !== 'number' ||
    typeof sv.name !== 'string' ||
    (sv.room && !Array.isArray(sv.room)) ||
    (sv.trees && !Array.isArray(sv.trees))
  )
    throw 0;
  for (const k in sv.bag) if (!ITEMS[k] || typeof sv.bag[k] !== 'number') throw 0;
  return { save: sv, date: date && !isNaN(date) ? date : null };
}
window.restoreText = txt => {
  let b;
  try {
    b = parseBackup(txt);
  } catch (e) {
    grownups("😕 That doesn't look like a Capy Island backup.<br>Nothing was changed.");
    return;
  }
  if (MP.role) {
    grownups('Please finish visiting / close your island first. ✈️');
    return;
  }
  window._pendingRestore = b;
  const when = b.date ? b.date.toLocaleString() : 'an unknown date';
  modal(
    `<h2>⚙️ Restore backup?</h2><p class="c" style="font-size:17px">This will replace the current island with the backup from <b>${esc(when)}</b>${b.save.name ? ` (${esc(b.save.name)}'s island, 🪙 ${b.save.coins | 0})` : ''}.<br><br>Continue?</p><div class="row"><button class="btn" onclick="doRestore()">Yes, restore</button><button class="btn white" onclick="grownups()">Cancel</button></div>`
  );
};
window.doRestore = () => {
  const b = window._pendingRestore;
  if (!b) return;
  restoring = true;
  try {
    localStorage.setItem(KEY, JSON.stringify(b.save));
  } catch (e) {
    restoring = false;
    grownups("😕 Couldn't save the backup on this phone.");
    return;
  }
  if (CL.on) clMetaSet({ localTs: Date.now(), dirty: true });
  location.replace(location.pathname);
};
try {
  navigator.storage &&
    navigator.storage.persist &&
    navigator.storage
      .persisted()
      .then(p => p || navigator.storage.persist())
      .catch(() => {});
} catch (e) {}
