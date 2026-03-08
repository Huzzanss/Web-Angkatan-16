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
  function showNameModal() {
    const m = document.getElementById('_sh_nm');
    if (m) m.style.display = 'flex';
    const inp = document.getElementById('_sh_nminp');
    if (inp) {
      setTimeout(() => inp.focus(), 100);
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') confirmName(); });
    }
    const btn = document.getElementById('_sh_nmbtn');
    if (btn) btn.addEventListener('click', confirmName);
  }

  function confirmName() {
    const v = (document.getElementById('_sh_nminp').value || '').trim();
    if (!v) { document.getElementById('_sh_nminp').focus(); return; }
    myName = v;
    localStorage.setItem('lbName', v);
    // Sync to all game name keys
    ['lbName','wwName','unoName','spyName','gbPlayerName','wwPlayerName','auName','mgName'].forEach(k => localStorage.setItem(k, v));
    document.getElementById('_sh_nm').style.display = 'none';
    afterName();
  }

  function afterName() {
    getDB();
    startOnlineTracking();
    buildVoiceWidget();
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
      avatar: localStorage.getItem('profileAvatar')||'👤',
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
    setInterval(() => ref.update({ name: myName, beat: Date.now(), avatar: localStorage.getItem('profileAvatar')||'👤', mood: localStorage.getItem('profileMood')||'' }), 60000);
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
      if (e.name === 'NotAllowedError') showToast('❌ Izin mikrofon ditolak. Cek pengaturan browser!');
      else if (e.name === 'NotFoundError') showToast('❌ Mikrofon tidak ditemukan!');
      else showToast('❌ Gagal akses mikrofon: ' + e.message);
      return;
    }

    inVoice = true;
    updateVoiceBtn();

    // Announce presence
    voiceRoomRef = db.ref('shared/voice/room/' + myId);
    voiceRoomRef.set({ name: myName, joined: Date.now() });
    voiceRoomRef.onDisconnect().remove();
    showToast('🎙️ Gabung voice chat!');

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
    showToast('🔇 Keluar dari voice chat');
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
        showToast('🔊 Klik di mana saja untuk aktifkan suara');
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
    const list = document.getElementById('_sh_vclist');
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
@keyframes sh_pulse{0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,.5)}50%{box-shadow:0 0 0 8px rgba(220,38,38,0)}}

#_sh_nm{position:fixed;inset:0;background:rgba(0,0,0,.88);backdrop-filter:blur(14px);z-index:9999;display:none;align-items:center;justify-content:center;padding:1rem;font-family:'DM Sans',sans-serif;}
._sh_nmc{background:#111827;border-radius:26px;padding:2.5rem 2rem;max-width:400px;width:100%;text-align:center;border:1px solid rgba(255,255,255,.12);}
._sh_nmi{font-size:3.5rem;margin-bottom:.7rem;display:block;}
._sh_nmt{font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:700;color:#fff;margin-bottom:.25rem;}
._sh_nmt em{color:#e8c97a;font-style:italic;}
._sh_nms{font-size:.83rem;color:rgba(255,255,255,.4);margin-bottom:1.5rem;line-height:1.6;}
#_sh_nminp{width:100%;padding:.85rem 1.2rem;background:rgba(255,255,255,.07);border:1.5px solid rgba(255,255,255,.15);border-radius:50px;color:#fff;font-family:'DM Sans',sans-serif;font-size:.95rem;outline:none;text-align:center;margin-bottom:.9rem;transition:border-color .2s;}
#_sh_nminp::placeholder{color:rgba(255,255,255,.3);}
#_sh_nminp:focus{border-color:#c9a84c;}
#_sh_nmbtn{width:100%;padding:.9rem;background:linear-gradient(135deg,#c9a84c,#e8c97a);color:#0a1628;border:none;border-radius:50px;font-family:'DM Sans',sans-serif;font-size:1rem;font-weight:700;cursor:pointer;transition:all .2s;}
#_sh_nmbtn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(201,168,76,.4);}

#_sh_vc{position:fixed;bottom:1.2rem;left:1.2rem;z-index:900;display:flex;flex-direction:column;align-items:center;gap:.4rem;}
#_sh_vcbtn,#_sh_lbbtn{width:46px;height:46px;border-radius:50%;border:1px solid rgba(255,255,255,.18);color:#fff;font-size:1.15rem;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,.5);transition:background .25s,transform .18s;position:relative;line-height:1;}
#_sh_vcbtn{background:linear-gradient(135deg,#1d3461,#0f3460);}
#_sh_lbbtn{background:linear-gradient(135deg,#0a1628,#1d3461);border-color:rgba(201,168,76,.3);color:#e8c97a;}
#_sh_vcbtn:hover,#_sh_lbbtn:hover{transform:scale(1.1);}
#_sh_vccnt{position:absolute;top:-3px;right:-3px;min-width:15px;height:15px;border-radius:50%;background:#22c55e;color:#fff;font-size:.52rem;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 2px;border:1.5px solid #0a1628;pointer-events:none;}
#_sh_vcpanel{display:none;position:absolute;bottom:52px;left:0;width:200px;background:#111827;border-radius:14px;padding:.9rem;border:1px solid rgba(255,255,255,.1);box-shadow:0 8px 32px rgba(0,0,0,.6);}
._sh_vph{font-size:.6rem;letter-spacing:2px;text-transform:uppercase;color:#c9a84c;font-weight:700;margin-bottom:.5rem;}
#_sh_vclist{}

#_sh_toast{position:fixed;top:70px;left:50%;transform:translateX(-50%);background:rgba(10,22,40,.95);backdrop-filter:blur(10px);color:#fff;padding:.62rem 1.4rem;border-radius:50px;font-size:.82rem;font-weight:500;z-index:9998;opacity:0;transition:opacity .3s;pointer-events:none;border:1px solid rgba(201,168,76,.22);white-space:nowrap;max-width:92vw;}

@media(max-width:480px){
  #_sh_vc{bottom:.75rem;left:.75rem;}
  #_sh_vcbtn,#_sh_lbbtn{width:40px;height:40px;font-size:1rem;}
}`;
    document.head.appendChild(s);
  }

  /* ══════════════════════════════════════════
     HTML
  ══════════════════════════════════════════ */
  function injectHTML() {
    if (document.getElementById('_sh_nm')) return;

    // Name modal
    const nm = document.createElement('div');
    nm.id = '_sh_nm';
    nm.innerHTML = `<div class="_sh_nmc">
      <span class="_sh_nmi">🏰</span>
      <div class="_sh_nmt">Angkatan <em>XVI</em></div>
      <div class="_sh_nms">Masukkan namamu untuk mulai bermain, melihat leaderboard, dan gabung voice chat!</div>
      <input id="_sh_nminp" placeholder="Nama kamu..." maxlength="24" autocomplete="off">
      <button id="_sh_nmbtn">Masuk ✦</button>
    </div>`;
    document.body.appendChild(nm);

    // Voice widget
    const vc = document.createElement('div');
    vc.id = '_sh_vc';
    vc.innerHTML = `
      <div id="_sh_vcpanel">
        <div class="_sh_vph">🎙️ Voice Chat</div>
        <div id="_sh_vclist"></div>
      </div>
      <button id="_sh_vcbtn">🎙️<span id="_sh_vccnt"></span></button>
      <button id="_sh_lbbtn" title="Leaderboard">🏆</button>`;
    document.body.appendChild(vc);

    // Hover to show panel
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
