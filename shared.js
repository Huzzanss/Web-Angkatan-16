/* ============================================================
   shared.js — Angkatan XVI
   Voice Chat (WebRTC) + Leaderboard + Name Prompt
   FIX: boot() langsung masuk tanpa paksa pilih nama
        notif msg dibersihkan dari SVG tag
============================================================ */
(function () {
  'use strict';

  const FB_CFG = {
    apiKey: 'AIzaSyBY-wq2_0z8eUe88IOngPls_LpY055Ndyg',
    authDomain: 'chat-angkatan-16.firebaseapp.com',
    databaseURL: 'https://chat-angkatan-16-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'chat-angkatan-16',
    storageBucket: 'chat-angkatan-16.appspot.com',
    messagingSenderId: '47699501502',
    appId: '1:47699501502:web:0d09e69d0b3ff39a7359ef'
  };

  const ICE = { iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' }
  ]};

  /* ── Firebase ── */
  let sdb = null;
  function getDB() {
    if (sdb) return sdb;
    try {
      let app = firebase.apps.find(a => a.name === '_sh_');
      if (!app) app = firebase.initializeApp(FB_CFG, '_sh_');
      sdb = app.database();
    } catch(e) {}
    return sdb;
  }

  /* ── Identity ── */
  let myId   = localStorage.getItem('lbUid') || ('u_' + Math.random().toString(36).substr(2,9));
  let myName = localStorage.getItem('lbName') || '';
  localStorage.setItem('lbUid', myId);

  function lbKey(name) {
    return (name || '').toLowerCase().replace(/[^a-z0-9ก-๙]/g, '_').substr(0, 40) || myId;
  }

  /* ── Globals ── */
  window.LB_addPoints = addPoints;
  window.LB_addWin    = addWin;
  window.LB_myId      = () => myId;
  window.LB_myName    = () => myName;

  /* ── Boot: langsung masuk, tidak paksa pilih nama ── */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  function boot() {
    injectStyles();
    injectHTML();
    const savedName = localStorage.getItem('lbName');
    if (savedName) myName = savedName;
    // ✅ LANGSUNG afterName() — tidak paksa modal
    afterName();
  }

  /* ══════════════════════════════════════════
     NAME MODAL — hanya muncul kalau klik switch account
  ══════════════════════════════════════════ */
  function showNameModal(isSwitch) {
    let m = document.getElementById('_sh_nm');
    if (!m) { injectHTML(); m = document.getElementById('_sh_nm'); }

    const sub = m.querySelector('._sh_nms');
    if (sub) sub.textContent = isSwitch ? 'Pilih akun untuk digunakan' : 'Pilih namamu untuk fitur game & bio';

    const cur = localStorage.getItem('lbName') || '';
    if (cur) {
      window._sh_selectedName = cur;
      const btn = document.getElementById('_sh_nmbtn');
      if (btn) { btn.disabled = false; btn.textContent = 'Masuk sebagai ' + cur.split(' ')[0]; }
    }

    m.style.display = 'flex';
    setTimeout(() => {
      const inp = document.getElementById('_sh_search');
      if (inp) inp.focus();
    }, 220);

    const btn = document.getElementById('_sh_nmbtn');
    if (btn) btn.onclick = confirmName;
    m._isSwitch = isSwitch || false;
  }

  function confirmName() {
    const v = (window._sh_selectedName || localStorage.getItem('lbName') || '').trim();
    if (!v) return;
    const isSwitch = document.getElementById('_sh_nm')?._isSwitch;
    const oldName = myName;
    myName = v;
    localStorage.setItem('lbName', v);
    ['lbName','wwName','unoName','spyName','gbPlayerName','wwPlayerName','auName','mgName'].forEach(k => localStorage.setItem(k, v));
    const nm = document.getElementById('_sh_nm');
    if (nm) nm.style.display = 'none';

    if (isSwitch) {
      updateSwitchBtn();
      const db = getDB();
      if (db && oldName !== v) {
        db.ref('shared/online/' + myId).update({ name: v });
        db.ref('shared/lb2/' + lbKey(v)).transaction(cur => {
          if (!cur) return { name: v, points: 0, onlineMs: 0, wins: 0, games: 0, lastSeen: Date.now() };
          return { ...cur, name: v, lastSeen: Date.now() };
        });
      }
      showToast('✓ Akun: ' + v.split(' ')[0]);
    } else {
      // refresh online tracking dengan nama baru
      startOnlineTracking();
      updateSwitchBtn();
    }
  }
  window._shConfirm = confirmName;

  function updateSwitchBtn() {
    const btn = document.getElementById('_sh_swbtn');
    const av  = document.getElementById('_sh_swav');
    const lbl = document.getElementById('_sh_swlbl');
    if (!btn) return;
    const n = myName || '—';
    if (av)  av.textContent  = n[0].toUpperCase();
    if (lbl) lbl.textContent = n.split(' ')[0];
    btn.title = myName ? 'Masuk sebagai: ' + n + '\nKlik untuk ganti akun' : 'Pilih akun';
  }

  window.switchAccount = () => showNameModal(true);

  function afterName() {
    getDB();
    startOnlineTracking();
    buildVoiceWidget();
    setTimeout(updateSwitchBtn, 100);
  }

  /* ══════════════════════════════════════════
     ONLINE + LEADERBOARD TRACKING
  ══════════════════════════════════════════ */
  let sessionStart = Date.now();
  let onlineTrackingStarted = false;

  function startOnlineTracking() {
    const db = getDB();
    if (!db) { setTimeout(startOnlineTracking, 600); return; }

    // Kalau belum ada nama, skip online tracking (tapi widget tetap jalan)
    if (!myName) return;

    if (onlineTrackingStarted) {
      // Update nama saja
      db.ref('shared/online/' + myId).update({ name: myName });
      return;
    }
    onlineTrackingStarted = true;

    const ref = db.ref('shared/online/' + myId);
    ref.set({
      name: myName, since: Date.now(),
      avatar: localStorage.getItem('profileAvatar') || '',
      mood:   localStorage.getItem('profileMood')   || ''
    });
    ref.onDisconnect().remove();

    db.ref('shared/lb2/' + lbKey(myName)).transaction(cur => {
      if (!cur) return { name: myName, points: 0, onlineMs: 0, wins: 0, games: 0, lastSeen: Date.now() };
      return { ...cur, name: myName, lastSeen: Date.now() };
    });

    window.addEventListener('beforeunload', () => { saveOnlineTime(); ref.remove(); });
    setInterval(() => ref.update({
      name: myName, beat: Date.now(),
      avatar: localStorage.getItem('profileAvatar') || '',
      mood:   localStorage.getItem('profileMood')   || ''
    }), 60000);
    setInterval(saveOnlineTime, 300000);
  }

  function saveOnlineTime() {
    const db = getDB();
    if (!db || !myName) return;
    const ms = Date.now() - sessionStart;
    if (ms < 5000) return;
    sessionStart = Date.now();
    db.ref('shared/lb2/' + lbKey(myName)).transaction(cur => {
      if (!cur) return { name: myName, points: 0, onlineMs: ms, wins: 0, games: 0, lastSeen: Date.now() };
      return { ...cur, name: myName, onlineMs: (cur.onlineMs||0) + ms, lastSeen: Date.now() };
    });
  }

  function addPoints(name, uid, pts) {
    const db = getDB();
    if (!db || !pts) return;
    const n = name || myName;
    if (!n) return;
    db.ref('shared/lb2/' + lbKey(n)).transaction(cur => {
      if (!cur) return { name: n, points: pts, onlineMs: 0, wins: 0, games: 1, lastSeen: Date.now() };
      return { ...cur, name: n, points: (cur.points||0) + pts, games: (cur.games||0) + 1, lastSeen: Date.now() };
    });
  }

  function addWin(name, uid) {
    const db = getDB();
    if (!db) return;
    const n = name || myName;
    if (!n) return;
    db.ref('shared/lb2/' + lbKey(n)).transaction(cur => {
      if (!cur) return { name: n, points: 0, onlineMs: 0, wins: 1, games: 1, lastSeen: Date.now() };
      return { ...cur, name: n, wins: (cur.wins||0) + 1, lastSeen: Date.now() };
    });
  }

  /* ══════════════════════════════════════════
     VOICE CHAT
  ══════════════════════════════════════════ */
  const pcs = {};
  let localStream = null, inVoice = false, voiceRoomRef = null, sigListener = null;

  function buildVoiceWidget() {
    const vcBtn = document.getElementById('_sh_vcbtn');
    const lbBtn = document.getElementById('_sh_lbbtn');
    if (vcBtn) vcBtn.addEventListener('click', toggleVoice);
    if (lbBtn) lbBtn.addEventListener('click', () => { window.open('leaderboard.html', '_blank'); });
    const db = getDB();
    if (!db) { setTimeout(buildVoiceWidget, 500); return; }
    db.ref('shared/voice/room').on('value', snap => updateVoiceList(snap.val() || {}));
  }

  async function toggleVoice() {
    if (inVoice) leaveVoice();
    else {
      // Harus punya nama untuk voice chat
      if (!myName) { showNameModal(false); showToast('Pilih nama dulu untuk voice chat'); return; }
      await joinVoice();
    }
  }

  async function joinVoice() {
    const db = getDB();
    if (!db) { showToast('Koneksi belum siap...'); return; }
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (e) {
      if (e.name === 'NotAllowedError') showToast('🎤 Izin mikrofon ditolak!');
      else showToast('🎤 Gagal akses mikrofon: ' + e.message);
      return;
    }
    inVoice = true;
    updateVoiceBtn();
    voiceRoomRef = db.ref('shared/voice/room/' + myId);
    voiceRoomRef.set({ name: myName, joined: Date.now() });
    voiceRoomRef.onDisconnect().remove();
    showToast('🎙️ Gabung voice chat!');
    const mySigRef = db.ref('shared/voice/sig/' + myId);
    mySigRef.remove();
    sigListener = mySigRef.on('child_added', snap => {
      const data = snap.val(); snap.ref.remove();
      if (data) handleSignal(data);
    });
    db.ref('shared/voice/room').once('value', snap => {
      const room = snap.val() || {};
      Object.keys(room).forEach(peerId => { if (peerId !== myId) createPC(peerId, true); });
    });
  }

  function leaveVoice() {
    inVoice = false;
    Object.keys(pcs).forEach(id => closePC(id));
    if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
    const db = getDB();
    if (db) {
      if (voiceRoomRef) voiceRoomRef.remove();
      if (sigListener)  db.ref('shared/voice/sig/' + myId).off('child_added', sigListener);
      db.ref('shared/voice/sig/' + myId).remove();
    }
    updateVoiceBtn();
    showToast('🔇 Keluar dari voice chat');
  }

  function createPC(peerId, isOfferer) {
    if (pcs[peerId]) return pcs[peerId];
    const db = getDB();
    if (!db) return null;
    const pc = new RTCPeerConnection(ICE);
    pcs[peerId] = pc;
    if (localStream) localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
    pc.ontrack = evt => {
      const stream = evt.streams[0];
      if (!stream) return;
      let audio = document.getElementById('_sh_aud_' + peerId);
      if (!audio) {
        audio = document.createElement('audio');
        audio.id = '_sh_aud_' + peerId; audio.autoplay = true; audio.playsInline = true;
        document.body.appendChild(audio);
      }
      audio.srcObject = stream;
      audio.play().catch(() => {
        showToast('🔊 Klik di mana saja untuk aktifkan suara');
        const unlock = () => { audio.play(); document.removeEventListener('click', unlock); };
        document.addEventListener('click', unlock);
      });
    };
    pc.onicecandidate = e => {
      if (!e.candidate || !db) return;
      db.ref('shared/voice/sig/' + peerId).push({
        from: myId, type: 'ice',
        candidate: e.candidate.candidate,
        sdpMid: e.candidate.sdpMid,
        sdpMLineIndex: e.candidate.sdpMLineIndex
      });
    };
    pc.onconnectionstatechange = () => {
      if (['disconnected','failed','closed'].includes(pc.connectionState)) closePC(peerId);
    };
    if (isOfferer) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          db.ref('shared/voice/sig/' + peerId).push({ from: myId, type: 'offer', sdp: pc.localDescription.sdp });
        } catch(e) {}
      };
    }
    return pc;
  }

  async function handleSignal(data) {
    if (!data || !inVoice) return;
    const { from, type, sdp, candidate, sdpMid, sdpMLineIndex } = data;
    if (!from || from === myId) return;
    const db = getDB();
    if (type === 'offer') {
      let pc = pcs[from];
      if (!pc) pc = createPC(from, false);
      if (!pc) return;
      try {
        await pc.setRemoteDescription({ type: 'offer', sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        db.ref('shared/voice/sig/' + from).push({ from: myId, type: 'answer', sdp: pc.localDescription.sdp });
      } catch(e) {}
    } else if (type === 'answer') {
      const pc = pcs[from];
      if (pc && pc.signalingState !== 'stable') {
        try { await pc.setRemoteDescription({ type: 'answer', sdp }); } catch(e) {}
      }
    } else if (type === 'ice') {
      const pc = pcs[from];
      if (pc && candidate) {
        try { await pc.addIceCandidate({ candidate, sdpMid, sdpMLineIndex }); } catch(e) {}
      }
    }
  }

  function closePC(peerId) {
    if (pcs[peerId]) { try { pcs[peerId].close(); } catch(e) {} delete pcs[peerId]; }
    const a = document.getElementById('_sh_aud_' + peerId);
    if (a) { a.srcObject = null; a.remove(); }
  }

  function updateVoiceBtn() {
    const btn = document.getElementById('_sh_vcbtn');
    if (!btn) return;
    if (inVoice) {
      btn.innerHTML = '🔴<span id="_sh_vccnt"></span>';
      btn.title = 'Keluar voice chat';
      btn.style.background = 'linear-gradient(135deg,#dc2626,#b91c1c)';
      btn.style.animation = 'sh_pulse 2s ease infinite';
    } else {
      btn.innerHTML = '🎙️<span id="_sh_vccnt"></span>';
      btn.title = 'Masuk voice chat';
      btn.style.background = 'linear-gradient(135deg,#1d3461,#0f3460)';
      btn.style.animation = '';
    }
  }

  function updateVoiceList(roomData) {
    const list  = document.getElementById('_sh_vclist');
    const panel = document.getElementById('_sh_vcpanel');
    if (!list) return;
    const entries = Object.entries(roomData);
    const cnt = document.getElementById('_sh_vccnt');
    if (cnt) cnt.textContent = entries.length > 0 ? entries.length : '';
    if (panel) panel.style.display = (entries.length > 0 || inVoice) ? 'block' : 'none';
    list.innerHTML = entries.length === 0
      ? '<p style="color:rgba(255,255,255,.3);font-size:.72rem;text-align:center;margin:.3rem 0">Kosong — klik 🎙️ untuk gabung!</p>'
      : entries.map(([uid, p]) =>
          `<div style="display:flex;align-items:center;gap:.45rem;padding:.22rem 0">
            <span style="width:8px;height:8px;border-radius:50%;background:#22c55e;display:inline-block;flex-shrink:0${uid===myId?';box-shadow:0 0 6px #22c55e':''}"></span>
            <span style="font-size:.77rem;font-weight:600;color:${uid===myId?'#e8c97a':'#fff'}">${esc(p.name||'?')}${uid===myId?' (kamu)':''}</span>
          </div>`).join('');
    if (inVoice) {
      entries.forEach(([peerId]) => { if (peerId !== myId && !pcs[peerId]) createPC(peerId, true); });
      Object.keys(pcs).forEach(peerId => { if (!roomData[peerId]) closePC(peerId); });
    }
  }

  /* ══════════════════════════════════════════
     TOAST
  ══════════════════════════════════════════ */
  function showToast(msg) {
    const t = document.getElementById('_sh_toast');
    if (!t) return;
    t.textContent = msg; t.style.opacity = '1';
    clearTimeout(window._shTT);
    window._shTT = setTimeout(() => { t.style.opacity = '0'; }, 3000);
  }

  function esc(t) { return String(t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  /* ══════════════════════════════════════════
     STYLES
  ══════════════════════════════════════════ */
  function injectStyles() {
    if (document.getElementById('_sh_css')) return;
    const s = document.createElement('style');
    s.id = '_sh_css';
    s.textContent = `
/* ─── Name Modal ─── */
#_sh_nm{position:fixed;inset:0;background:rgba(0,0,0,.92);backdrop-filter:blur(12px);z-index:9999;display:none;align-items:flex-end;justify-content:center;}
@media(min-width:600px){#_sh_nm{align-items:center;}}
._sh_nmc{background:#0F0F14;width:100%;max-width:460px;border-radius:20px 20px 0 0;padding:0;overflow:hidden;max-height:92dvh;display:flex;flex-direction:column;border:1px solid rgba(255,255,255,.08);border-bottom:none;}
@media(min-width:600px){._sh_nmc{border-radius:16px;border-bottom:1px solid rgba(255,255,255,.08);max-height:85dvh;}}
._sh_drag{width:40px;height:4px;border-radius:2px;background:rgba(255,255,255,.18);margin:12px auto 0;flex-shrink:0;}
._sh_head{padding:1.2rem 1.4rem .8rem;flex-shrink:0;}
._sh_nmt{font-family:'Playfair Display',serif;font-size:1.8rem;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#fff;line-height:1;font-style:italic;}
._sh_nmt em{color:#8BBB3A;font-style:normal;}
._sh_nms{font-size:.75rem;color:rgba(255,255,255,.38);margin-top:.3rem;font-family:'IBM Plex Mono',monospace;letter-spacing:.5px;}
._sh_srch{padding:.6rem 1.4rem;flex-shrink:0;position:relative;}
._sh_srch input{width:100%;padding:.7rem 1rem .7rem 2.4rem;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:0;color:#fff;font-size:.95rem;outline:none;font-family:'Lora',serif;-webkit-appearance:none;transition:border-color .2s;}
._sh_srch input:focus{border-color:rgba(139,187,58,.5);}
._sh_srch input::placeholder{color:rgba(255,255,255,.28);}
._sh_srch svg{position:absolute;left:1.9rem;top:50%;transform:translateY(-50%);width:1rem;height:1rem;color:rgba(255,255,255,.3);pointer-events:none;}
._sh_list{overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;}
._sh_list::-webkit-scrollbar{width:3px;}._sh_list::-webkit-scrollbar-thumb{background:rgba(139,187,58,.3);}
._sh_item{display:flex;align-items:center;gap:.85rem;padding:.85rem 1.4rem;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.04);transition:background .12s;-webkit-tap-highlight-color:transparent;user-select:none;}
._sh_item:active,._sh_item:hover{background:rgba(139,187,58,.08);}
._sh_item.selected{background:rgba(139,187,58,.12);border-left:3px solid #8BBB3A;}
._sh_av{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:700;color:#000;flex-shrink:0;}
._sh_nm2{font-size:.92rem;font-weight:600;color:#F0EFE8;flex:1;font-family:'Lora',serif;}
._sh_chk{width:20px;height:20px;border-radius:50%;border:2px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s;}
._sh_item.selected ._sh_chk{background:#8BBB3A;border-color:#8BBB3A;color:#000;}
._sh_empty{padding:2rem;text-align:center;color:rgba(255,255,255,.3);font-size:.82rem;font-family:'IBM Plex Mono',monospace;}
._sh_foot{padding:.9rem 1.4rem;flex-shrink:0;background:#0F0F14;border-top:1px solid rgba(255,255,255,.06);}
#_sh_nmbtn{width:100%;padding:.9rem;background:#8BBB3A;color:#000;border:none;font-family:'IBM Plex Mono',monospace;font-size:1rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:opacity .18s;-webkit-tap-highlight-color:transparent;}
#_sh_nmbtn:hover{opacity:.88;}
#_sh_nmbtn:disabled{opacity:.35;cursor:not-allowed;}

/* ─── Voice / LB buttons ─── */
#_sh_vc{position:fixed;bottom:5.5rem;left:.9rem;z-index:900;display:flex;flex-direction:column;align-items:center;gap:.4rem;}
#_sh_vcbtn,#_sh_lbbtn{width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.15);color:#fff;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,.5);transition:background .2s,transform .18s;position:relative;}
#_sh_vcbtn{background:#16161E;}
#_sh_lbbtn{background:#16161E;border-color:rgba(139,187,58,.3);color:#8BBB3A;}
#_sh_vcbtn:hover,#_sh_lbbtn:hover{transform:scale(1.08);}
#_sh_vccnt{position:absolute;top:-2px;right:-2px;min-width:14px;height:14px;border-radius:50%;background:#22c55e;color:#fff;font-size:.5rem;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 2px;border:1.5px solid #06060A;}
#_sh_vcpanel{display:none;position:absolute;bottom:52px;left:0;width:200px;background:#16161E;border-radius:0;padding:.8rem;border:1px solid rgba(255,255,255,.08);box-shadow:0 8px 32px rgba(0,0,0,.6);}
._sh_vph{font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:#8BBB3A;font-weight:700;margin-bottom:.5rem;font-family:'IBM Plex Mono',monospace;}

/* ─── Switch account button ─── */
#_sh_swbtn{width:auto;min-width:44px;height:44px;border-radius:22px;background:#16161E;border:1px solid rgba(139,187,58,.4);color:#8BBB3A;cursor:pointer;display:flex;align-items:center;gap:.35rem;padding:0 .7rem 0 .45rem;box-shadow:0 4px 16px rgba(0,0,0,.5);transition:background .2s,transform .18s;-webkit-tap-highlight-color:transparent;}
#_sh_swbtn:hover,#_sh_swbtn:active{background:rgba(139,187,58,.12);transform:scale(1.05);}
#_sh_swav{width:28px;height:28px;border-radius:50%;background:#8BBB3A;color:#000;font-family:'IBM Plex Mono',monospace;font-size:.9rem;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
#_sh_swlbl{font-family:'IBM Plex Mono',monospace;font-size:.72rem;font-weight:700;letter-spacing:.5px;text-transform:uppercase;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
@media(max-width:480px){#_sh_swlbl{display:none;}#_sh_swbtn{padding:0 .45rem;border-radius:50%;min-width:44px;}}

/* ─── Toast ─── */
#_sh_toast{position:fixed;top:60px;left:50%;transform:translateX(-50%);background:#16161E;color:#fff;padding:.55rem 1.3rem;font-size:.8rem;z-index:9998;opacity:0;transition:opacity .3s;pointer-events:none;border:1px solid rgba(139,187,58,.2);white-space:nowrap;max-width:92vw;font-family:'IBM Plex Mono',monospace;}

@keyframes sh_pulse{0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,.4);}50%{box-shadow:0 0 0 8px rgba(220,38,38,0);}}
`;
    document.head.appendChild(s);
  }

  /* ══════════════════════════════════════════
     HTML INJECT
  ══════════════════════════════════════════ */
  function injectHTML() {
    if (document.getElementById('_sh_nm')) return;

    const NAMES = ["Abdullah Raziq Hanan","Adelia Felicia","Aditya Narendra Pambudi","Afiqah Humayra Arresky","Ahmad Abdullah Hafi Munaji","Ahmad Faezya Rafa","Ahmad Hamdan Nurzati","Alesha Zevanna Annayla Alfian","Alexandra Shavira Kaysa","Alisha Nur Afiyah","Alisya Zella Naura Saputro","Alita Admiral","Alkhalifi Hasyimi","Andra Alghifari","Angelina Natalia Tennes","Aqillah Khayyirah","Arsenio Al Fattan Wibowo","Azim Evano Rahman","Azima Zafeera Khairiya","Azka Aisy Muhammad Firdaus","Chaerul Risyad Ferdansyah","Deeandra Mikhailla Hariyadi","Devan Rafandra Pratama","Faqih Hamizan Rahman","Farrel Azka Firlana","Fattah Altaf Qusyairi","Gavin Ahmad Farisakha Sahilin","Ghaisan Adib Mubasyir","Giovanny Syahputra","Gusti Muhammad An-Nafis","Hana Aish Sumayyah","Hilmi Muhammad Nidho Mudhin","Javier Al Majid","Kanaya Lubna Janitra Hafizah","Keisha Pratiwi Syahrizal","Khalika Ismatullah Assahla","Muhammad Abdurrahman Dzaki","Muhammad Ahza Farezell","Muhammad Alfindra Auvar Rahardja","Muhammad Asyraf Al Farisi","Muhammad El Junot Razqal","Muhammad Fahri Ardani","Muhammad Hafidz Setiadi","Muhammad Hafiz Faad Abqory","Muhammad Juna Defa Alfarizie","Muhammad Mezameru Arsyada","Muhammad Zaki Raditya","Muhammad Zamzam Zidna Fahn","Muhammad Zharif Syatir","Nada Fajriah Salsabilla","Nayhan Abqari","Nuhammad Rezky Tri Ramadhan","Nur Aisyah","Nurul Farhana Aqilah Chandra","Samytha Larisa Azzalea","Shazia Amira Zhafirah","Shidqia Nabila Azzahra","Super Novel Hardian","Syaqila Marwa Putri Deandra","Syifa Fathiyah Zahra","Syrenia Carrisa Althafunnisa","Zahratu Syifa"];

    const COLORS = ['#FF6B6B','#00D4AA','#8B7CF6','#8BBB3A','#38BDF8','#FB923C','#4ADE80','#F472B6'];
    function nameColor(n) { let h=0; for(let c of n) h=(h*31+c.charCodeAt(0))&0xFFFFFF; return COLORS[h%COLORS.length]; }

    let selectedName = localStorage.getItem('lbName') || '';
    if (selectedName) window._sh_selectedName = selectedName;
    let filteredNames = [...NAMES];

    // ── Name Modal ──
    const nm = document.createElement('div');
    nm.id = '_sh_nm';

    function renderList(names) {
      return names.map(n => {
        const color = nameColor(n);
        const sel = n === selectedName;
        return `<div class="_sh_item${sel?' selected':''}" data-name="${n}" onclick="_shPick('${n.replace(/'/g,"\\'")}')">
          <div class="_sh_av" style="background:${color}">${n[0]}</div>
          <span class="_sh_nm2">${n}</span>
          <div class="_sh_chk">${sel?'✓':''}</div>
        </div>`;
      }).join('') || '<div class="_sh_empty">Nama tidak ditemukan</div>';
    }

    const curNameDisplay = selectedName ? `Masuk sebagai ${selectedName.split(' ')[0]}` : 'Pilih nama dulu';
    nm.innerHTML = `<div class="_sh_nmc">
      <div class="_sh_drag"></div>
      <div class="_sh_head">
        <div class="_sh_nmt">Angkatan <em>XVI</em></div>
        <div class="_sh_nms">Pilih namamu untuk fitur game & bio</div>
      </div>
      <div class="_sh_srch">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input id="_sh_search" type="search" placeholder="Cari nama..." autocomplete="off" spellcheck="false">
      </div>
      <div class="_sh_list" id="_sh_listbox">${renderList(NAMES)}</div>
      <div class="_sh_foot">
        <button id="_sh_nmbtn" onclick="window._shConfirm&&window._shConfirm()" ${selectedName?'':'disabled'}>${curNameDisplay}</button>
      </div>
    </div>`;
    document.body.appendChild(nm);

    window._shPick = function(name) {
      selectedName = name;
      window._sh_selectedName = name;
      document.getElementById('_sh_listbox').innerHTML = renderList(filteredNames);
      const btn = document.getElementById('_sh_nmbtn');
      if (btn) { btn.disabled = false; btn.textContent = 'Masuk sebagai ' + name.split(' ')[0]; btn.onclick = () => window._shConfirm && window._shConfirm(); }
    };

    const searchEl = document.getElementById('_sh_search');
    if (searchEl) {
      searchEl.addEventListener('input', function() {
        const q = this.value.toLowerCase();
        filteredNames = q ? NAMES.filter(n => n.toLowerCase().includes(q)) : [...NAMES];
        document.getElementById('_sh_listbox').innerHTML = renderList(filteredNames);
      });
    }

    let startY = 0;
    nm.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, {passive:true});
    nm.addEventListener('touchmove', e => { if (e.touches[0].clientY - startY > 80) nm.style.display = 'none'; }, {passive:true});

    // ── Voice + Switch button widget ──
    const vc = document.createElement('div');
    vc.id = '_sh_vc';
    const swInitial = (myName||'?')[0].toUpperCase();
    const swLabel   = myName ? myName.split(' ')[0] : 'Akun';
    vc.innerHTML = `
      <div id="_sh_vcpanel">
        <div class="_sh_vph">Voice Chat</div>
        <div id="_sh_vclist"></div>
      </div>
      <button id="_sh_swbtn" title="${myName?'Ganti akun':'Pilih akun'}" onclick="window.switchAccount()">
        <span id="_sh_swav">${swInitial}</span>
        <span id="_sh_swlbl">${swLabel}</span>
      </button>
      <button id="_sh_vcbtn" title="Voice Chat">🎙️<span id="_sh_vccnt"></span></button>
      <button id="_sh_lbbtn" title="Leaderboard" onclick="location.href='leaderboard.html'">🏆</button>`;
    document.body.appendChild(vc);

    vc.addEventListener('mouseenter', () => { const p = document.getElementById('_sh_vcpanel'); if (p) p.style.display = 'block'; });
    vc.addEventListener('mouseleave', () => { const p = document.getElementById('_sh_vcpanel'); if (p && !inVoice) p.style.display = 'none'; });

    // ── Toast ──
    const t = document.createElement('div');
    t.id = '_sh_toast';
    document.body.appendChild(t);
  }

})();
