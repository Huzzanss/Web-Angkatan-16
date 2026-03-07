/* ============================================================
   shared.js — Angkatan XVI
   Voice Chat (WebRTC) + Leaderboard Tracking + Name Prompt
   Include di semua halaman: <script src="shared.js"></script>
============================================================ */
(function () {
  'use strict';

  const FB = {
    apiKey: 'AIzaSyBY-wq2_0z8eUe88IOngPls_LpY055Ndyg',
    authDomain: 'chat-angkatan-16.firebaseapp.com',
    databaseURL: 'https://chat-angkatan-16-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'chat-angkatan-16',
    storageBucket: 'chat-angkatan-16.appspot.com',
    messagingSenderId: '47699501502',
    appId: '1:47699501502:web:0d09e69d0b3ff39a7359ef'
  };

  const STUN = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };

  /* ── Init Firebase (shared instance) ── */
  let sdb;
  function initFB() {
    if (sdb) return;
    try {
      if (!firebase.apps.filter(a => a.name === 'shared').length) {
        firebase.initializeApp(FB, 'shared');
      }
      sdb = firebase.app('shared').database();
    } catch (e) {
      setTimeout(initFB, 300);
    }
  }

  /* ── Identity ── */
  let myId   = localStorage.getItem('lbUid')   || Math.random().toString(36).substr(2, 9);
  let myName = localStorage.getItem('lbName')  || '';
  localStorage.setItem('lbUid', myId);

  /* ── Expose globals ── */
  window.LB_addPoints = addPoints;
  window.LB_addWin    = addWin;
  window.LB_myId      = () => myId;
  window.LB_myName    = () => myName;

  /* ── Wait for DOM ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  function boot() {
    injectStyles();
    injectHTML();
    initFB();

    if (!myName) {
      showNameModal();
    } else {
      afterName();
    }
  }

  /* ── Name Modal ── */
  function showNameModal() {
    const m = document.getElementById('_sh_nameModal');
    if (m) m.style.display = 'flex';
    const inp = document.getElementById('_sh_nameInp');
    if (inp) {
      inp.focus();
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') confirmName(); });
    }
    document.getElementById('_sh_nameBtn').addEventListener('click', confirmName);
  }

  function confirmName() {
    const val = (document.getElementById('_sh_nameInp').value || '').trim();
    if (!val) { document.getElementById('_sh_nameInp').focus(); return; }
    myName = val;
    localStorage.setItem('lbName', myName);
    // Propagate to all game name keys so games pick it up
    ['lbName', 'wwName', 'unoName', 'spyName', 'gbPlayerName', 'wwPlayerName'].forEach(k => localStorage.setItem(k, myName));
    document.getElementById('_sh_nameModal').style.display = 'none';
    afterName();
  }

  function afterName() {
    startOnlineTracking();
    buildVoiceWidget();
  }

  /* ── Online Tracking ── */
  let sessionStart = Date.now();
  function startOnlineTracking() {
    if (!sdb) { setTimeout(startOnlineTracking, 500); return; }
    const ref = sdb.ref('shared/online/' + myId);
    ref.set({ name: myName, since: Date.now() });
    ref.onDisconnect().remove();

    // On unload, save session duration
    window.addEventListener('beforeunload', () => {
      const ms = Date.now() - sessionStart;
      updateOnlineTime(ms);
      ref.remove();
    });

    // Periodic heartbeat every 30s (also saves time)
    setInterval(() => {
      ref.update({ name: myName, since: sessionStart, beat: Date.now() });
    }, 30000);
  }

  function updateOnlineTime(ms) {
    if (!sdb || ms < 5000) return;
    sdb.ref('shared/lb/' + myId).transaction(cur => {
      if (!cur) return { name: myName, points: 0, onlineMs: ms, wins: 0, games: 0, lastSeen: Date.now() };
      return { ...cur, name: myName, onlineMs: (cur.onlineMs || 0) + ms, lastSeen: Date.now() };
    });
  }

  /* ── Score Tracking ── */
  function addPoints(name, uid, pts) {
    if (!sdb || !pts) return;
    const n = name || myName; const u = uid || myId;
    sdb.ref('shared/lb/' + u).transaction(cur => {
      if (!cur) return { name: n, points: pts, onlineMs: 0, wins: 0, games: 1, lastSeen: Date.now() };
      return { ...cur, name: n, points: (cur.points || 0) + pts, games: (cur.games || 0) + 1, lastSeen: Date.now() };
    });
  }

  function addWin(name, uid) {
    if (!sdb) return;
    const n = name || myName; const u = uid || myId;
    sdb.ref('shared/lb/' + u).transaction(cur => {
      if (!cur) return { name: n, points: 0, onlineMs: 0, wins: 1, games: 1, lastSeen: Date.now() };
      return { ...cur, name: n, wins: (cur.wins || 0) + 1, lastSeen: Date.now() };
    });
  }

  /* ═══════════════════════════════════════════
     VOICE CHAT — WebRTC Mesh
  ═══════════════════════════════════════════ */
  const peers = {};       // uid → RTCPeerConnection
  const streams = {};     // uid → MediaStream
  let localStream = null;
  let inCall = false;

  function buildVoiceWidget() {
    const widget = document.getElementById('_sh_voice');
    if (!widget) return;
    document.getElementById('_sh_voiceBtn').addEventListener('click', toggleVoice);
    document.getElementById('_sh_lbBtn').addEventListener('click', () => window.open('leaderboard.html', '_blank'));
    listenVoiceRoom();
  }

  async function toggleVoice() {
    if (inCall) {
      leaveVoice();
    } else {
      await joinVoice();
    }
  }

  async function joinVoice() {
    if (!sdb) { showToast('Koneksi belum siap...'); return; }
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (e) {
      showToast('❌ Tidak bisa akses mikrofon. Cek izin browser!');
      return;
    }
    inCall = true;
    updateVoiceBtn();
    showToast('🎙️ Kamu bergabung ke voice chat!');

    const myPeerRef = sdb.ref('shared/voice/peers/' + myId);
    myPeerRef.set({ name: myName, joined: Date.now() });
    myPeerRef.onDisconnect().remove();

    // Listen for incoming signals
    sdb.ref('shared/voice/sig/' + myId).on('child_added', snap => {
      handleSignal(snap.key, snap.val());
      snap.ref.remove();
    });
  }

  function leaveVoice() {
    inCall = false;
    Object.keys(peers).forEach(uid => closePeer(uid));
    if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
    if (sdb) {
      sdb.ref('shared/voice/peers/' + myId).remove();
      sdb.ref('shared/voice/sig/' + myId).remove();
    }
    updateVoiceBtn();
    updateVoiceList({});
    showToast('🔇 Kamu keluar dari voice chat');
  }

  function listenVoiceRoom() {
    if (!sdb) { setTimeout(listenVoiceRoom, 500); return; }
    sdb.ref('shared/voice/peers').on('value', snap => {
      const peers_data = snap.val() || {};
      updateVoiceList(peers_data);

      if (!inCall) return;

      // Connect to new peers
      Object.keys(peers_data).forEach(uid => {
        if (uid !== myId && !peers[uid]) {
          createPeerConnection(uid, true); // we initiate offer
        }
      });

      // Disconnect from removed peers
      Object.keys(peers).forEach(uid => {
        if (!peers_data[uid]) closePeer(uid);
      });
    });
  }

  function createPeerConnection(uid, isInitiator) {
    if (peers[uid]) return;
    const pc = new RTCPeerConnection(STUN);
    peers[uid] = pc;

    // Add local stream
    if (localStream) {
      localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
    }

    // Handle remote audio
    pc.ontrack = e => {
      streams[uid] = e.streams[0];
      playRemoteAudio(uid, e.streams[0]);
    };

    // ICE candidates
    pc.onicecandidate = e => {
      if (e.candidate && sdb) {
        sdb.ref('shared/voice/sig/' + uid).push({
          from: myId, type: 'ice', candidate: JSON.stringify(e.candidate)
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        closePeer(uid);
      }
    };

    if (isInitiator) {
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        if (sdb) sdb.ref('shared/voice/sig/' + uid).push({ from: myId, type: 'offer', sdp: offer.sdp });
      });
    }

    return pc;
  }

  async function handleSignal(fromUid, data) {
    if (!data || !inCall) return;
    const { type, sdp, candidate, from } = data;
    const uid = from || fromUid;
    if (!uid || uid === myId) return;

    if (type === 'offer') {
      const pc = createPeerConnection(uid, false);
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (sdb) sdb.ref('shared/voice/sig/' + uid).push({ from: myId, type: 'answer', sdp: answer.sdp });
    } else if (type === 'answer') {
      if (peers[uid]) {
        await peers[uid].setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp })).catch(() => {});
      }
    } else if (type === 'ice') {
      if (peers[uid] && candidate) {
        try { await peers[uid].addIceCandidate(new RTCIceCandidate(JSON.parse(candidate))); } catch (e) {}
      }
    }
  }

  function closePeer(uid) {
    if (peers[uid]) { try { peers[uid].close(); } catch (e) {} delete peers[uid]; }
    const el = document.getElementById('_sh_audio_' + uid);
    if (el) el.remove();
    delete streams[uid];
  }

  function playRemoteAudio(uid, stream) {
    let el = document.getElementById('_sh_audio_' + uid);
    if (!el) {
      el = document.createElement('audio');
      el.id = '_sh_audio_' + uid;
      el.autoplay = true;
      document.body.appendChild(el);
    }
    el.srcObject = stream;
  }

  function updateVoiceBtn() {
    const btn = document.getElementById('_sh_voiceBtn');
    if (!btn) return;
    if (inCall) {
      btn.innerHTML = '🔴';
      btn.title = 'Keluar dari voice chat';
      btn.style.background = 'linear-gradient(135deg,#dc2626,#b91c1c)';
    } else {
      btn.innerHTML = '🎙️';
      btn.title = 'Masuk voice chat';
      btn.style.background = 'linear-gradient(135deg,#1d3461,#0f3460)';
    }
  }

  function updateVoiceList(peersData) {
    const list = document.getElementById('_sh_voiceList');
    if (!list) return;
    const entries = Object.entries(peersData);
    list.innerHTML = entries.length === 0
      ? '<div style="color:rgba(255,255,255,.3);font-size:.72rem;text-align:center;padding:.3rem">Belum ada yang di voice</div>'
      : entries.map(([uid, p]) =>
        `<div style="display:flex;align-items:center;gap:.4rem;padding:.25rem 0;">
          <div style="width:8px;height:8px;border-radius:50%;background:#22c55e;flex-shrink:0;${uid===myId?'box-shadow:0 0 6px #22c55e;':''}"></div>
          <span style="font-size:.75rem;font-weight:600;color:${uid===myId?'#e8c97a':'#fff'}">${esc(p.name||'?')}${uid===myId?' (kamu)':''}</span>
        </div>`).join('');
    // Show/hide panel
    const panel = document.getElementById('_sh_voicePanel');
    if (panel) panel.style.display = entries.length > 0 || inCall ? 'block' : 'none';
    document.getElementById('_sh_voiceCount').textContent = entries.length || '';
  }

  /* ── Toast ── */
  function showToast(msg) {
    let t = document.getElementById('_sh_toast');
    if (!t) return;
    t.textContent = msg; t.style.opacity = '1';
    clearTimeout(window._shtt);
    window._shtt = setTimeout(() => { t.style.opacity = '0'; }, 2800);
  }

  /* ── Escape HTML ── */
  function esc(t) { return String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ════════════════════════════════════════
     INJECT STYLES
  ════════════════════════════════════════ */
  function injectStyles() {
    if (document.getElementById('_sh_styles')) return;
    const s = document.createElement('style');
    s.id = '_sh_styles';
    s.textContent = `
      #_sh_nameModal{position:fixed;inset:0;background:rgba(0,0,0,.85);backdrop-filter:blur(12px);z-index:9999;display:none;align-items:center;justify-content:center;padding:1rem;font-family:'DM Sans',sans-serif;}
      #_sh_nameModal .nm-card{background:#111827;border-radius:24px;padding:2.5rem 2rem;max-width:400px;width:100%;text-align:center;border:1px solid rgba(255,255,255,.12);}
      #_sh_nameModal .nm-icon{font-size:3.5rem;margin-bottom:.8rem;}
      #_sh_nameModal .nm-title{font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:700;color:#fff;margin-bottom:.3rem;}
      #_sh_nameModal .nm-title em{color:#e8c97a;font-style:italic;}
      #_sh_nameModal .nm-sub{font-size:.84rem;color:rgba(255,255,255,.4);margin-bottom:1.5rem;line-height:1.6;}
      #_sh_nameInp{width:100%;padding:.85rem 1.2rem;background:rgba(255,255,255,.07);border:1.5px solid rgba(255,255,255,.15);border-radius:50px;color:#fff;font-family:'DM Sans',sans-serif;font-size:.95rem;outline:none;text-align:center;margin-bottom:.9rem;transition:border-color .2s;}
      #_sh_nameInp::placeholder{color:rgba(255,255,255,.3);}
      #_sh_nameInp:focus{border-color:#c9a84c;}
      #_sh_nameBtn{width:100%;padding:.9rem;background:linear-gradient(135deg,#c9a84c,#e8c97a);color:#0a1628;border:none;border-radius:50px;font-family:'DM Sans',sans-serif;font-size:1rem;font-weight:700;cursor:pointer;transition:all .2s;}
      #_sh_nameBtn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(201,168,76,.4);}

      #_sh_voice{position:fixed;bottom:1.2rem;left:1.2rem;z-index:900;font-family:'DM Sans',sans-serif;}
      #_sh_voiceBtn{width:46px;height:46px;border-radius:50%;border:1px solid rgba(255,255,255,.18);color:#fff;font-size:1.2rem;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,.5);transition:all .2s;background:linear-gradient(135deg,#1d3461,#0f3460);position:relative;}
      #_sh_voiceBtn:hover{transform:scale(1.08);}
      #_sh_voiceCount{position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;border-radius:50%;background:#22c55e;color:#fff;font-size:.55rem;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 3px;line-height:1;border:1.5px solid #0a1628;}
      #_sh_lbBtn{width:46px;height:46px;border-radius:50%;border:1px solid rgba(201,168,76,.3);color:#e8c97a;font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,.5);transition:all .2s;background:linear-gradient(135deg,#0a1628,#1d3461);margin-top:.5rem;}
      #_sh_lbBtn:hover{transform:scale(1.08);border-color:#e8c97a;}
      #_sh_voicePanel{display:none;position:absolute;bottom:50px;left:0;width:200px;background:#111827;border-radius:14px;padding:.9rem;border:1px solid rgba(255,255,255,.1);box-shadow:0 8px 32px rgba(0,0,0,.6);}
      #_sh_vpHead{font-size:.62rem;letter-spacing:2px;text-transform:uppercase;color:#c9a84c;font-weight:600;margin-bottom:.55rem;}
      #_sh_voiceList{display:flex;flex-direction:column;}

      #_sh_toast{position:fixed;top:70px;left:50%;transform:translateX(-50%);background:rgba(10,22,40,.95);backdrop-filter:blur(10px);color:#fff;padding:.62rem 1.4rem;border-radius:50px;font-size:.82rem;font-weight:500;z-index:9998;opacity:0;transition:opacity .3s;pointer-events:none;border:1px solid rgba(201,168,76,.22);white-space:nowrap;max-width:90vw;}

      @media(max-width:480px){
        #_sh_voice{bottom:.75rem;left:.75rem;}
        #_sh_voiceBtn,#_sh_lbBtn{width:40px;height:40px;font-size:1rem;}
      }
    `;
    document.head.appendChild(s);
  }

  /* ════════════════════════════════════════
     INJECT HTML
  ════════════════════════════════════════ */
  function injectHTML() {
    if (document.getElementById('_sh_nameModal')) return;

    // Name modal
    const nm = document.createElement('div');
    nm.id = '_sh_nameModal';
    nm.innerHTML = `<div class="nm-card">
      <div class="nm-icon">🏰</div>
      <div class="nm-title">Angkatan <em>XVI</em></div>
      <div class="nm-sub">Masukkan namamu untuk bermain, chat, dan bergabung ke voice chat bersama teman-teman!</div>
      <input id="_sh_nameInp" placeholder="Nama kamu..." maxlength="24" autocomplete="off">
      <button id="_sh_nameBtn">Masuk ✦</button>
    </div>`;
    document.body.appendChild(nm);

    // Voice widget
    const vc = document.createElement('div');
    vc.id = '_sh_voice';
    vc.innerHTML = `
      <div id="_sh_voicePanel">
        <div id="_sh_vpHead">🎙️ Voice Chat</div>
        <div id="_sh_voiceList"></div>
      </div>
      <button id="_sh_voiceBtn" title="Voice Chat">🎙️<span id="_sh_voiceCount"></span></button>
      <button id="_sh_lbBtn" title="Leaderboard">🏆</button>`;
    document.body.appendChild(vc);

    // Toggle panel on hover/click of voice area
    const btn = document.getElementById('_sh_voiceBtn');
    btn.addEventListener('mouseenter', () => {
      const panel = document.getElementById('_sh_voicePanel');
      if (panel) panel.style.display = 'block';
    });
    vc.addEventListener('mouseleave', () => {
      if (!inCall) {
        const panel = document.getElementById('_sh_voicePanel');
        if (panel) panel.style.display = 'none';
      }
    });

    // Toast
    const t = document.createElement('div');
    t.id = '_sh_toast';
    document.body.appendChild(t);
  }

})();
