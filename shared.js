/* ============================================================
   shared.js — Angkatan XVI
   Voice Chat (WebRTC) + Leaderboard + Name Prompt
   FIX: name-based LB key (no duplicates) + fixed voice audio
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

  /* ── Identity — keyed by NAME (sanitized) to avoid duplicates ── */
  let myId   = localStorage.getItem('lbUid')  || ('u_' + Math.random().toString(36).substr(2,9));
  let myName = localStorage.getItem('lbName') || '';
  localStorage.setItem('lbUid', myId);

  // lbKey = sanitized name used as Firebase key (so same name = same record)
  function lbKey(name) {
    return (name || '').toLowerCase().replace(/[^a-z0-9ก-๙]/g, '_').substr(0, 40) || myId;
  }

  /* ── Globals ── */
  window.LB_addPoints = addPoints;
  window.LB_addWin    = addWin;
  window.LB_myId      = () => myId;
  window.LB_myName    = () => myName;

  /* ── Boot ── */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  function boot() {
    injectStyles();
    injectHTML();
    // If name was set via profil.html, pick it up
    const savedName = localStorage.getItem('lbName');
    if (savedName) myName = savedName;
    if (!myName) showNameModal();
    else afterName();
  }

  /* ══════════════════════════════════════════
     NAME MODAL
  ══════════════════════════════════════════ */
  function showNameModal(isSwitch) {
    // re-render so selected state is fresh
    let m = document.getElementById('_sh_nm');
    if (!m) { injectHTML(); m = document.getElementById('_sh_nm'); }

    // Update subtitle
    const sub = m.querySelector('._sh_nms');
    if (sub) sub.textContent = isSwitch ? 'Pilih akun untuk digunakan' : 'Pilih namamu dulu sebelum main';

    // Update button text if already has a selection
    const cur = localStorage.getItem('lbName') || '';
    if (cur) {
      window._sh_selectedName = cur;
      const btn = document.getElementById('_sh_nmbtn');
      if (btn) { btn.disabled = false; btn.textContent = 'Masuk sebagai ' + cur.split(' ')[0]; }
    }

    m.style.display = 'flex';
    // Focus search after short delay (mobile keyboards)
    setTimeout(() => {
      const inp = document.getElementById('_sh_search');
      if (inp) inp.focus();
    }, 220);

    const btn = document.getElementById('_sh_nmbtn');
    if (btn) { btn.onclick = confirmName; }
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
      // Update floating button label
      updateSwitchBtn();
      // Update Firebase presence
      const db = getDB();
      if (db) {
        // Remove old presence, create new
        if (oldName !== v) {
          db.ref('shared/online/' + myId).update({ name: v });
          db.ref('shared/lb2/' + lbKey(v)).transaction(cur => {
            if (!cur) return { name: v, points: 0, onlineMs: 0, wins: 0, games: 0, lastSeen: Date.now() };
            return { ...cur, name: v, lastSeen: Date.now() };
          });
        }
      }
      showToast('✓ Akun diganti ke ' + v.split(' ')[0]);
    } else {
      afterName();
    }
  }
  window._shConfirm = confirmName;

  function updateSwitchBtn() {
    const btn = document.getElementById('_sh_swbtn');
    const av = document.getElementById('_sh_swav');
    const lbl = document.getElementById('_sh_swlbl');
    if (!btn) return;
    const n = myName || '—';
    const initial = n[0].toUpperCase();
    if (av) av.textContent = initial;
    if (lbl) lbl.textContent = n.split(' ')[0];
    btn.title = 'Masuk sebagai: ' + n + '\nKlik untuk ganti akun';
  }

  // Public API
  window.switchAccount = () => showNameModal(true);

  function afterName() {
    getDB();
    startOnlineTracking();
    buildVoiceWidget();
    // update switch button after widget is built
    setTimeout(updateSwitchBtn, 100);
  }

  /* ══════════════════════════════════════════
     ONLINE + LEADERBOARD TRACKING
  ══════════════════════════════════════════ */
  let sessionStart = Date.now();

  function startOnlineTracking() {
    const db = getDB();
    if (!db) { setTimeout(startOnlineTracking, 600); return; }
    const ref = db.ref('shared/online/' + myId);
    ref.set({ name: myName, since: Date.now(),
      avatar: localStorage.getItem('profileAvatar')||'',
      mood: localStorage.getItem('profileMood')||'' });
    ref.onDisconnect().remove();
    // Ensure LB entry exists with correct name
    db.ref('shared/lb2/' + lbKey(myName)).transaction(cur => {
      if (!cur) return { name: myName, points: 0, onlineMs: 0, wins: 0, games: 0, lastSeen: Date.now() };
      return { ...cur, name: myName, lastSeen: Date.now() };
    });
    window.addEventListener('beforeunload', () => {
      saveOnlineTime();
      ref.remove();
    });
    // Heartbeat every 60s
    setInterval(() => ref.update({ name: myName, beat: Date.now(), avatar: localStorage.getItem('profileAvatar')||'', mood: localStorage.getItem('profileMood')||'' }), 60000);
    // Save time every 5 min
    setInterval(saveOnlineTime, 300000);
  }

  function saveOnlineTime() {
    const db = getDB();
    if (!db) return;
    const ms = Date.now() - sessionStart;
    if (ms < 5000) return;
    sessionStart = Date.now(); // reset so we don't double-count
    db.ref('shared/lb2/' + lbKey(myName)).transaction(cur => {
      if (!cur) return { name: myName, points: 0, onlineMs: ms, wins: 0, games: 0, lastSeen: Date.now() };
      return { ...cur, name: myName, onlineMs: (cur.onlineMs || 0) + ms, lastSeen: Date.now() };
    });
  }

  function addPoints(name, uid, pts) {
    const db = getDB();
    if (!db || !pts) return;
    const n = name || myName;
    db.ref('shared/lb2/' + lbKey(n)).transaction(cur => {
      if (!cur) return { name: n, points: pts, onlineMs: 0, wins: 0, games: 1, lastSeen: Date.now() };
      return { ...cur, name: n, points: (cur.points || 0) + pts, games: (cur.games || 0) + 1, lastSeen: Date.now() };
    });
  }

  function addWin(name, uid) {
    const db = getDB();
    if (!db) return;
    const n = name || myName;
    db.ref('shared/lb2/' + lbKey(n)).transaction(cur => {
      if (!cur) return { name: n, points: 0, onlineMs: 0, wins: 1, games: 1, lastSeen: Date.now() };
      return { ...cur, name: n, wins: (cur.wins || 0) + 1, lastSeen: Date.now() };
    });
  }

  /* ══════════════════════════════════════════
     VOICE CHAT — WebRTC
     Architecture: each peer stores signaling
     under shared/voice/sig/{targetId}/{msgId}
  ══════════════════════════════════════════ */
  const pcs   = {};   // peerId → RTCPeerConnection
  let localStream = null;
  let inVoice = false;
  let voiceRoomRef = null;
  let sigListener = null;

  function buildVoiceWidget() {
    document.getElementById('_sh_vcbtn').addEventListener('click', toggleVoice);
    document.getElementById('_sh_lbbtn').addEventListener('click', () => {
      window.open('leaderboard.html', '_blank');
    });
    // Watch room presence always (to show who's in voice)
    const db = getDB();
    if (!db) { setTimeout(buildVoiceWidget, 500); return; }
    db.ref('shared/voice/room').on('value', snap => updateVoiceList(snap.val() || {}));
  }

  async function toggleVoice() {
    if (inVoice) leaveVoice();
    else await joinVoice();
  }

  async function joinVoice() {
    const db = getDB();
    if (!db) { showToast('Koneksi belum siap...'); return; }

    // Request mic
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (e) {
      if (e.name === 'NotAllowedError') showToast(' Izin mikrofon ditolak. Cek pengaturan browser!');
      else if (e.name === 'NotFoundError') showToast(' Mikrofon tidak ditemukan!');
      else showToast(' Gagal akses mikrofon: ' + e.message);
      return;
    }

    inVoice = true;
    updateVoiceBtn();

    // Announce presence
    voiceRoomRef = db.ref('shared/voice/room/' + myId);
    voiceRoomRef.set({ name: myName, joined: Date.now() });
    voiceRoomRef.onDisconnect().remove();
    showToast('️ Gabung voice chat!');

    // Listen for incoming signals (offers/answers/ICE)
    const mySigRef = db.ref('shared/voice/sig/' + myId);
    mySigRef.remove(); // clear old signals
    sigListener = mySigRef.on('child_added', snap => {
      const data = snap.val();
      snap.ref.remove();
      if (data) handleSignal(data);
    });

    // Connect to everyone already in room
    db.ref('shared/voice/room').once('value', snap => {
      const room = snap.val() || {};
      Object.keys(room).forEach(peerId => {
        if (peerId !== myId) {
          createPC(peerId, true); // we send offer to existing members
        }
      });
    });
  }

  function leaveVoice() {
    inVoice = false;
    Object.keys(pcs).forEach(id => closePC(id));
    if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
    const db = getDB();
    if (db) {
      if (voiceRoomRef) voiceRoomRef.remove();
      if (sigListener) db.ref('shared/voice/sig/' + myId).off('child_added', sigListener);
      db.ref('shared/voice/sig/' + myId).remove();
    }
    updateVoiceBtn();
    showToast(' Keluar dari voice chat');
  }

  function createPC(peerId, isOfferer) {
    if (pcs[peerId]) return pcs[peerId];
    const db = getDB();
    if (!db) return null;

    const pc = new RTCPeerConnection(ICE);
    pcs[peerId] = pc;

    // Add local tracks
    if (localStream) {
      localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
    }

    // Receive remote audio
    pc.ontrack = evt => {
      const stream = evt.streams[0];
      if (!stream) return;
      let audio = document.getElementById('_sh_aud_' + peerId);
      if (!audio) {
        audio = document.createElement('audio');
        audio.id = '_sh_aud_' + peerId;
        audio.autoplay = true;
        audio.playsInline = true;
        document.body.appendChild(audio);
      }
      audio.srcObject = stream;
      // Force play (handle autoplay policy)
      audio.play().catch(() => {
        // Need user gesture — add click-to-unmute
        showToast(' Klik di mana saja untuk aktifkan suara');
        const unlock = () => { audio.play(); document.removeEventListener('click', unlock); };
        document.addEventListener('click', unlock);
      });
    };

    // Send ICE candidates to peer
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
      if (['disconnected','failed','closed'].includes(pc.connectionState)) {
        closePC(peerId);
      }
    };

    if (isOfferer) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          db.ref('shared/voice/sig/' + peerId).push({
            from: myId, type: 'offer', sdp: pc.localDescription.sdp
          });
        } catch(e) { console.warn('offer err', e); }
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
        db.ref('shared/voice/sig/' + from).push({
          from: myId, type: 'answer', sdp: pc.localDescription.sdp
        });
      } catch(e) { console.warn('answer err', e); }
    }
    else if (type === 'answer') {
      const pc = pcs[from];
      if (pc && pc.signalingState !== 'stable') {
        try { await pc.setRemoteDescription({ type: 'answer', sdp }); } catch(e) { console.warn('set answer err', e); }
      }
    }
    else if (type === 'ice') {
      const pc = pcs[from];
      if (pc && candidate) {
        try {
          await pc.addIceCandidate({ candidate, sdpMid, sdpMLineIndex });
        } catch(e) { /* ignore */ }
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
      btn.innerHTML = '<span id="_sh_vccnt"></span>';
      btn.title = 'Keluar voice chat';
      btn.style.background = 'linear-gradient(135deg,#dc2626,#b91c1c)';
      btn.style.animation = 'sh_pulse 2s ease infinite';
    } else {
      btn.innerHTML = '️<span id="_sh_vccnt"></span>';
      btn.title = 'Masuk voice chat';
      btn.style.background = 'linear-gradient(135deg,#1d3461,#0f3460)';
      btn.style.animation = '';
    }
  }

  function updateVoiceList(roomData) {
    const list = document.getElementById('_sh_vclist');
    const panel = document.getElementById('_sh_vcpanel');
    if (!list) return;
    const entries = Object.entries(roomData);
    const cnt = document.getElementById('_sh_vccnt');
    if (cnt) cnt.textContent = entries.length > 0 ? entries.length : '';
    if (panel) panel.style.display = (entries.length > 0 || inVoice) ? 'block' : 'none';
    list.innerHTML = entries.length === 0
      ? '<p style="color:rgba(255,255,255,.3);font-size:.72rem;text-align:center;margin:.3rem 0">Kosong — klik ️ untuk gabung!</p>'
      : entries.map(([uid, p]) =>
          `<div style="display:flex;align-items:center;gap:.45rem;padding:.22rem 0">
            <span style="width:8px;height:8px;border-radius:50%;background:#22c55e;display:inline-block;flex-shrink:0${uid===myId?';box-shadow:0 0 6px #22c55e':''};"></span>
            <span style="font-size:.77rem;font-weight:600;color:${uid===myId?'#e8c97a':'#fff'}">${esc(p.name||'?')}${uid===myId?' (kamu)':''}</span>
          </div>`).join('');

    // Connect to newly arrived peers
    if (inVoice) {
      entries.forEach(([peerId]) => {
        if (peerId !== myId && !pcs[peerId]) createPC(peerId, true);
      });
      // Disconnect from left peers
      Object.keys(pcs).forEach(peerId => {
        if (!roomData[peerId]) closePC(peerId);
      });
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
._sh_nmt{font-family:'Barlow Condensed',sans-serif;font-size:1.8rem;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#fff;line-height:1;}
._sh_nmt em{color:#F9C74F;font-style:italic;}
._sh_nms{font-size:.75rem;color:rgba(255,255,255,.38);margin-top:.3rem;font-family:'Space Mono',monospace;letter-spacing:.5px;}
._sh_srch{padding:.6rem 1.4rem;flex-shrink:0;position:relative;}
._sh_srch input{width:100%;padding:.7rem 1rem .7rem 2.4rem;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#fff;font-size:.95rem;outline:none;font-family:'Barlow',sans-serif;-webkit-appearance:none;transition:border-color .2s;}
._sh_srch input:focus{border-color:rgba(249,199,79,.5);}
._sh_srch input::placeholder{color:rgba(255,255,255,.28);}
._sh_srch svg{position:absolute;left:1.9rem;top:50%;transform:translateY(-50%);width:1rem;height:1rem;color:rgba(255,255,255,.3);pointer-events:none;}
._sh_list{overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;}
._sh_list::-webkit-scrollbar{width:3px;}._sh_list::-webkit-scrollbar-thumb{background:rgba(249,199,79,.3);}
._sh_item{display:flex;align-items:center;gap:.85rem;padding:.85rem 1.4rem;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.04);transition:background .12s;-webkit-tap-highlight-color:transparent;user-select:none;}
._sh_item:active,._sh_item:hover{background:rgba(249,199,79,.08);}
._sh_item.selected{background:rgba(249,199,79,.12);border-left:3px solid #F9C74F;}
._sh_av{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;font-weight:700;color:#000;flex-shrink:0;}
._sh_nm2{font-size:.92rem;font-weight:600;color:#F0EFE8;flex:1;}
._sh_chk{width:20px;height:20px;border-radius:50%;border:2px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s;}
._sh_item.selected ._sh_chk{background:#F9C74F;border-color:#F9C74F;color:#000;}
._sh_empty{padding:2rem;text-align:center;color:rgba(255,255,255,.3);font-size:.82rem;font-family:'Space Mono',monospace;}
._sh_foot{padding:.9rem 1.4rem;flex-shrink:0;background:#0F0F14;border-top:1px solid rgba(255,255,255,.06);}
#_sh_nmbtn{width:100%;padding:.9rem;background:#F9C74F;color:#000;border:none;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:1.2rem;font-weight:900;letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:opacity .18s;-webkit-tap-highlight-color:transparent;}
#_sh_nmbtn:hover{opacity:.88;}
#_sh_nmbtn:disabled{opacity:.35;cursor:not-allowed;}

/* ─── Voice / LB buttons ─── */
#_sh_vc{position:fixed;bottom:5.5rem;left:.9rem;z-index:900;display:flex;flex-direction:column;align-items:center;gap:.4rem;}
#_sh_vcbtn,#_sh_lbbtn{width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.15);color:#fff;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,.5);transition:background .2s,transform .18s;position:relative;}
#_sh_vcbtn{background:#16161E;}
#_sh_lbbtn{background:#16161E;border-color:rgba(249,199,79,.3);color:#F9C74F;}
#_sh_vcbtn:hover,#_sh_lbbtn:hover{transform:scale(1.08);}
#_sh_vccnt{position:absolute;top:-2px;right:-2px;min-width:14px;height:14px;border-radius:50%;background:#22c55e;color:#fff;font-size:.5rem;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 2px;border:1.5px solid #06060A;}
#_sh_vcpanel{display:none;position:absolute;bottom:52px;left:0;width:200px;background:#16161E;border-radius:10px;padding:.8rem;border:1px solid rgba(255,255,255,.08);box-shadow:0 8px 32px rgba(0,0,0,.6);}
._sh_vph{font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:#F9C74F;font-weight:700;margin-bottom:.5rem;font-family:'Space Mono',monospace;}

/* ─── Switch account button ─── */
#_sh_swbtn{width:auto;min-width:44px;height:44px;border-radius:22px;background:#16161E;border:1px solid rgba(249,199,79,.4);color:#F9C74F;cursor:pointer;display:flex;align-items:center;gap:.35rem;padding:0 .7rem 0 .45rem;box-shadow:0 4px 16px rgba(0,0,0,.5);transition:background .2s,transform .18s;-webkit-tap-highlight-color:transparent;}
#_sh_swbtn:hover,#_sh_swbtn:active{background:rgba(249,199,79,.12);transform:scale(1.05);}
#_sh_swav{width:28px;height:28px;border-radius:50%;background:#F9C74F;color:#000;font-family:'Barlow Condensed',sans-serif;font-size:.9rem;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
#_sh_swlbl{font-family:'Barlow Condensed',sans-serif;font-size:.85rem;font-weight:700;letter-spacing:.5px;text-transform:uppercase;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
@media(max-width:480px){#_sh_swlbl{display:none;}#_sh_swbtn{padding:0 .45rem;border-radius:50%;min-width:44px;}}

/* ─── Toast ─── */
#_sh_toast{position:fixed;top:60px;left:50%;transform:translateX(-50%);background:#16161E;color:#fff;padding:.55rem 1.3rem;font-size:.8rem;z-index:9998;opacity:0;transition:opacity .3s;pointer-events:none;border:1px solid rgba(249,199,79,.2);white-space:nowrap;max-width:92vw;font-family:'Space Mono',monospace;}
`; document.head.appendChild(s);
  }

  function injectHTML() {
    if (document.getElementById('_sh_nm')) return;
    const NAMES=["Abdullah Raziq Hanan","Adelia Felicia","Aditya Narendra Pambudi","Afiqah Humayra Arresky","Ahmad Abdullah Hafi Munaji","Ahmad Faezya Rafa","Ahmad Hamdan Nurzati","Alesha Zevanna Annayla Alfian","Alexandra Shavira Kaysa","Alisha Nur Afiyah","Alisya Zella Naura Saputro","Alita Admiral","Alkhalifi Hasyimi","Andra Alghifari","Angelina Natalia Tennes","Aqillah Khayyirah","Arsenio Al Fattan Wibowo","Azim Evano Rahman","Azima Zafeera Khairiya","Azka Aisy Muhammad Firdaus","Chaerul Risyad Ferdansyah","Deeandra Mikhailla Hariyadi","Devan Rafandra Pratama","Faqih Hamizan Rahman","Farrel Azka Firlana","Fattah Altaf Qusyairi","Gavin Ahmad Farisakha Sahilin","Ghaisan Adib Mubasyir","Giovanny Syahputra","Gusti Muhammad An-Nafis","Hana Aish Sumayyah","Hilmi Muhammad Nidho Mudhin","Javier Al Majid","Kanaya Lubna Janitra Hafizah","Keisha Pratiwi Syahrizal","Khalika Ismatullah Assahla","Muhammad Abdurrahman Dzaki","Muhammad Ahza Farezell","Muhammad Alfindra Auvar Rahardja","Muhammad Asyraf Al Farisi","Muhammad El Junot Razqal","Muhammad Fahri Ardani","Muhammad Hafidz Setiadi","Muhammad Hafiz Faad Abqory","Muhammad Juna Defa Alfarizie","Muhammad Mezameru Arsyada","Muhammad Zaki Raditya","Muhammad Zamzam Zidna Fahn","Muhammad Zharif Syatir","Nada Fajriah Salsabilla","Nayhan Abqari","Nuhammad Rezky Tri Ramadhan","Nur Aisyah","Nurul Farhana Aqilah Chandra","Samytha Larisa Azzalea","Shazia Amira Zhafirah","Shidqia Nabila Azzahra","Super Novel Hardian","Syaqila Marwa Putri Deandra","Syifa Fathiyah Zahra","Syrenia Carrisa Althafunnisa","Zahratu Syifa"];

    const COLORS = ['#FF6B6B','#00D4AA','#8B7CF6','#F9C74F','#38BDF8','#FB923C','#4ADE80','#F472B6'];
    function nameColor(n){ let h=0; for(let c of n) h=(h*31+c.charCodeAt(0))&0xFFFFFF; return COLORS[h%COLORS.length]; }

    let selectedName = localStorage.getItem('lbName') || '';
    if (selectedName) window._sh_selectedName = selectedName;
    let filteredNames = [...NAMES];

    // ── Name Modal ──
    const nm = document.createElement('div');
    nm.id = '_sh_nm';

    function renderList(names) {
      return names.map(n => {
        const initial = n[0];
        const color = nameColor(n);
        const sel = n === selectedName;
        return `<div class="_sh_item${sel?' selected':''}" data-name="${n}" onclick="_shPick('${n.replace(/'/g,"\'")}')">
          <div class="_sh_av" style="background:${color}">${initial}</div>
          <span class="_sh_nm2">${n}</span>
          <div class="_sh_chk">${sel?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>':''}</div>
        </div>`;
      }).join('') || '<div class="_sh_empty">Nama tidak ditemukan</div>';
    }

    nm.innerHTML = `<div class="_sh_nmc">
      <div class="_sh_drag"></div>
      <div class="_sh_head">
        <div class="_sh_nmt">Angkatan <em>XVI</em></div>
        <div class="_sh_nms">Pilih namamu dulu sebelum main</div>
      </div>
      <div class="_sh_srch">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input id="_sh_search" type="search" placeholder="Cari nama..." autocomplete="off" spellcheck="false">
      </div>
      <div class="_sh_list" id="_sh_listbox">${renderList(NAMES)}</div>
      <div class="_sh_foot">
        <button id="_sh_nmbtn" onclick="window._shConfirm&&window._shConfirm()" ${selectedName?'':'disabled'}>
          ${selectedName ? 'Masuk sebagai ' + selectedName.split(' ')[0] : 'Pilih nama dulu'}
        </button>
      </div>
    </div>`;
    document.body.appendChild(nm);

    window._shPick = function(name) {
      selectedName = name;
      window._sh_selectedName = name;
      document.getElementById('_sh_listbox').innerHTML = renderList(filteredNames);
      const btn = document.getElementById('_sh_nmbtn');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Masuk sebagai ' + name.split(' ')[0];
        btn.onclick = function() { window._shConfirm && window._shConfirm(); };
      }
    };

    const searchEl = document.getElementById('_sh_search');
    if (searchEl) {
      searchEl.addEventListener('input', function() {
        const q = this.value.toLowerCase();
        filteredNames = q ? NAMES.filter(n => n.toLowerCase().includes(q)) : [...NAMES];
        document.getElementById('_sh_listbox').innerHTML = renderList(filteredNames);
      });
    }

    // swipe-down to close on mobile
    let startY = 0;
    nm.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, {passive:true});
    nm.addEventListener('touchmove', e => {
      const dy = e.touches[0].clientY - startY;
      if (dy > 80) nm.style.display = 'none';
    }, {passive:true});

    // ── Voice widget ──
    const vc = document.createElement('div');
    vc.id = '_sh_vc';
    const swInitial = (myName||'?')[0].toUpperCase();
    vc.innerHTML = `
      <div id="_sh_vcpanel">
        <div class="_sh_vph">Voice Chat</div>
        <div id="_sh_vclist"></div>
      </div>
      <button id="_sh_swbtn" title="Ganti akun" onclick="window.switchAccount()" style="position:relative;">
        <span id="_sh_swav">${swInitial}</span>
        <span id="_sh_swlbl">${(myName||'').split(' ')[0]||'Akun'}</span>
      </button>
      <button id="_sh_vcbtn" title="Voice"><svg style="width:1rem;height:1rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg><span id="_sh_vccnt"></span></button>
      <button id="_sh_lbbtn" title="Leaderboard" onclick="location.href='leaderboard.html'"><svg style="width:1rem;height:1rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg></button>`;
    document.body.appendChild(vc);

    vc.addEventListener('mouseenter', () => {
      const p = document.getElementById('_sh_vcpanel');
      if (p) p.style.display = 'block';
    });
    vc.addEventListener('mouseleave', () => {
      const p = document.getElementById('_sh_vcpanel');
      if (p && !inVoice) p.style.display = 'none';
    });

    // Toast
    const t = document.createElement('div');
    t.id = '_sh_toast';
    document.body.appendChild(t);
  }


})();
