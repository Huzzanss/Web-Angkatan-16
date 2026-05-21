// ─── Countdown Wisuda 13 Mei 2026 ───
(function() {
  const target = new Date('2026-05-13T00:00:00+08:00').getTime();

  const elDays = document.getElementById('cd-days');
  const elHours = document.getElementById('cd-hours');
  const elMins = document.getElementById('cd-minutes');
  const elSecs = document.getElementById('cd-seconds');
  const elMsg = document.getElementById('countdown-msg');

  function pad(n) { return String(n).padStart(2, '0'); }

  function tick(el, val) {
    if (!el) return;
    const formatted = pad(val);
    if (el.textContent !== formatted) {
      el.textContent = formatted;
      el.classList.remove('tick');
      void el.offsetWidth;
      el.classList.add('tick');
      setTimeout(() => el.classList.remove('tick'), 150);
    }
  }

  function update() {
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      [elDays, elHours, elMins, elSecs].forEach(el => { if(el) el.textContent = '00'; });
      if (elMsg) { elMsg.textContent = '🎓 Selamat! Hari Wisuda telah tiba!'; elMsg.classList.add('done'); }
      return;
    }

    const days  = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins  = Math.floor((diff % 3600000)  / 60000);
    const secs  = Math.floor((diff % 60000)    / 1000);

    tick(elDays,  days);
    tick(elHours, hours);
    tick(elMins,  mins);
    tick(elSecs,  secs);
  }

  update();
  setInterval(update, 1000);
})();

// Smooth scroll navbar
document.querySelectorAll('#navbar a').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const href = anchor.getAttribute('href');
    if (!href || !href.startsWith('#')) return;
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
// ─── Countdown Pengumuman Kelulusan 2 Juni 2026 ───
(function() {
  const target2 = new Date('2026-06-02T00:00:00+08:00').getTime();

  const el2Days  = document.getElementById('cd2-days');
  const el2Hours = document.getElementById('cd2-hours');
  const el2Mins  = document.getElementById('cd2-minutes');
  const el2Secs  = document.getElementById('cd2-seconds');
  const el2Msg   = document.getElementById('countdown2-msg');

  function update2() {
    const diff = target2 - Date.now();
    if (diff <= 0) {
      [el2Days,el2Hours,el2Mins,el2Secs].forEach(el => { if(el) el.textContent = '00'; });
      if (el2Msg) { el2Msg.textContent = '🎉 Selamat! Kalian semua LULUS!'; }
      return;
    }
    const days  = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins  = Math.floor((diff % 3600000)  / 60000);
    const secs  = Math.floor((diff % 60000)    / 1000);

    function pad(n) { return String(n).padStart(2,'0'); }
    function tick(el, val) {
      if (!el) return;
      const f = pad(val);
      if (el.textContent !== f) {
        el.textContent = f;
        el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick');
        setTimeout(() => el.classList.remove('tick'), 150);
      }
    }
    tick(el2Days, days); tick(el2Hours, hours); tick(el2Mins, mins); tick(el2Secs, secs);
  }

  update2();
  setInterval(update2, 1000);
})();

// Initial gradient per huruf
function getInitialGradient(letter) {
  const index = letter.charCodeAt(0) - 65;
  const t = index / 25;
  const hue1 = Math.round(t * 300);
  const hue2 = Math.round(hue1 + 22);
  return `linear-gradient(135deg, hsl(${hue1},72%,38%), hsl(${hue2},65%,52%))`;
}

function generateInitial(name) {
  return name ? name.charAt(0).toUpperCase() : '';
}

document.querySelectorAll('.student-card').forEach(card => {
  const name = card.querySelector('p').textContent.trim();
  const letter = generateInitial(name);
  const el = card.querySelector('.initial');
  el.textContent = letter;
  el.style.background = getInitialGradient(letter);
});

// ─── Firebase Config ───
const firebaseConfig = {
  apiKey: "AIzaSyBY-wq2_0z8eUe88IOngPls_LpY055Ndyg",
  authDomain: "chat-angkatan-16.firebaseapp.com",
  databaseURL: "https://chat-angkatan-16-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "chat-angkatan-16",
  storageBucket: "chat-angkatan-16.appspot.com",
  messagingSenderId: "47699501502",
  appId: "1:47699501502:web:0d09e69d0b3ff39a7359ef"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// User ID
let userId = localStorage.getItem('chatUserId') || Math.random().toString(36).substr(2, 9);
localStorage.setItem('chatUserId', userId);

// Chat DOM
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typing-indicator');
let isTyping = false, typingTimeout;

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;
  db.ref('messages').push({ userId, text, timestamp: Date.now() });
  messageInput.value = '';
  stopTyping();
}

messageInput.addEventListener('input', () => {
  if (!isTyping) startTyping();
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(stopTyping, 2000);
});

function startTyping() { isTyping = true; db.ref('typing/' + userId).set(true); }
function stopTyping()  { isTyping = false; db.ref('typing/' + userId).set(false); }

db.ref('messages').on('value', snapshot => {
  messagesDiv.innerHTML = '';
  const data = snapshot.val() || {};
  Object.values(data)
    .sort((a, b) => a.timestamp - b.timestamp)
    .forEach(msg => {
      const isMine = msg.userId === userId;
      const time = new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const div = document.createElement('div');
      div.className = `message ${isMine ? 'sent' : 'received'}`;
      div.innerHTML = `
        <div class="msg-sender">${isMine ? 'Saya' : 'Anonim'}</div>
        <div class="msg-text">${escapeHtml(censorText(msg.text))}</div>
        <div class="msg-time">${time}</div>
      `;
      messagesDiv.appendChild(div);
    });
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

db.ref('typing').on('value', snapshot => {
  const data = snapshot.val() || {};
  const someoneTyping = Object.keys(data).some(k => k !== userId && data[k]);
  typingIndicator.style.display = someoneTyping ? 'flex' : 'none';
});

// Chat censor
const CUSTOM_BAD_WORDS = [];
const _BASE_BAD_WORDS = [
  'anjing','anjir','anjrit','anying','asu','babi','bajingan','bangsat','bego',
  'bejat','bencong','biadab','bodoh','brengsek','budek','coli','colmek',
  'dancuk','dancok','edan','goblok','goblog','haram','idiot','jalang','jancok',
  'jancuk','keparat','kimak','kontol','koplak','lonte','mampus','memek','monyet',
  'ngentot','ngewe','pantat','pecundang','pelacur','perek','pukimak','setan',
  'sialan','tai','tahi','tolol','jembut','pepek','puki','titit','butuh',
  'nganye','ngocok','cibai','bokep',
  'ass','asshole','bastard','bitch','cock','crap','cum','cunt','damn','dick',
  'dildo','fag','faggot','fuck','fucker','fucking','goddamn','horny',
  'jackass','jerk','motherfucker','nigga','nigger','penis','piss',
  'porn','prick','pussy','rape','retard','shit','slut','twat','wank','whore',
];
const _ALL_BAD = [...new Set([..._BASE_BAD_WORDS, ...CUSTOM_BAD_WORDS])];
const _CENSOR_REGEX = new RegExp(
  '\\b(' + _ALL_BAD.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b', 'gi'
);
function censorText(text) { return text.replace(_CENSOR_REGEX, match => '*'.repeat(match.length)); }
function escapeHtml(text) {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
window.addEventListener('beforeunload', stopTyping);

/* ══════════════════════════
   GALLERY
══════════════════════════ */
(function() {
  const galleryDb = db.ref('gallery');
  const photoInput     = document.getElementById('photoInput');
  const uploadDrop     = document.getElementById('uploadDrop');
  const uploadProgress = document.getElementById('uploadProgress');
  const progressFill   = document.getElementById('progressFill');
  const progressText   = document.getElementById('progressText');
  const galleryGrid    = document.getElementById('galleryGrid');
  const galleryEmpty   = document.getElementById('galleryEmpty');
  const lightbox       = document.getElementById('lightbox');
  const lightboxImg    = document.getElementById('lightboxImg');
  const lightboxClose  = document.getElementById('lightboxClose');
  const lightboxPrev   = document.getElementById('lightboxPrev');
  const lightboxNext   = document.getElementById('lightboxNext');
  const lightboxCap    = document.getElementById('lightboxCaption');

  let allPhotos = [], currentIdx = 0;

  uploadDrop.addEventListener('dragover', e => { e.preventDefault(); uploadDrop.classList.add('dragover'); });
  uploadDrop.addEventListener('dragleave', () => uploadDrop.classList.remove('dragover'));
  uploadDrop.addEventListener('drop', e => { e.preventDefault(); uploadDrop.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
  uploadDrop.addEventListener('click', () => photoInput.click());
  photoInput.addEventListener('change', () => handleFiles(photoInput.files));

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 900;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  function handleFiles(files) {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!arr.length) return;
    for (const f of arr) {
      if (f.size > 15 * 1024 * 1024) { alert(f.name + ' terlalu besar (maks 15MB).'); return; }
    }
    uploadProgress.style.display = 'block';
    uploadDrop.style.display = 'none';
    progressText.style.color = '';
    let done = 0;
    arr.forEach((file, i) => {
      progressText.textContent = 'Mengompres foto ' + (i + 1) + '/' + arr.length + '...';
      compressImage(file).then(base64 => {
        progressFill.style.width = Math.round(((i + 0.5) / arr.length) * 100) + '%';
        progressText.textContent = 'Menyimpan foto ' + (i + 1) + '/' + arr.length + '...';
        return galleryDb.push({ data: base64, name: file.name, timestamp: Date.now() });
      }).then(() => {
        done++;
        progressFill.style.width = Math.round((done / arr.length) * 100) + '%';
        if (done === arr.length) { progressText.textContent = '✓ Foto berhasil disimpan!'; setTimeout(resetUploadUI, 1200); }
      }).catch(err => {
        progressText.style.color = '#e07a5f';
        progressText.textContent = '✗ Gagal: ' + err.message;
        setTimeout(resetUploadUI, 3000);
      });
    });
  }

  function resetUploadUI() {
    uploadProgress.style.display = 'none';
    uploadDrop.style.display = 'block';
    progressFill.style.width = '0%';
    photoInput.value = '';
  }

  galleryDb.orderByChild('timestamp').on('value', snap => {
    allPhotos = [];
    const data = snap.val() || {};
    Object.values(data).sort((a, b) => b.timestamp - a.timestamp).forEach(p => allPhotos.push(p));
    renderGallery();
  });

  function renderGallery() {
    Array.from(galleryGrid.querySelectorAll('.gallery-item')).forEach(el => el.remove());
    if (allPhotos.length === 0) { galleryEmpty.style.display = 'block'; return; }
    galleryEmpty.style.display = 'none';
    allPhotos.forEach((photo, idx) => {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      const date = new Date(photo.timestamp).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'});
      item.innerHTML = `<img src="${photo.data}" alt="${photo.name || 'Foto'}" loading="lazy"><div class="gallery-item-overlay"><span class="gallery-item-time">${date}</span></div>`;
      item.addEventListener('click', () => openLightbox(idx));
      galleryGrid.appendChild(item);
    });
  }

  function openLightbox(idx) { currentIdx = idx; showPhoto(idx); lightbox.classList.add('open'); document.body.style.overflow = 'hidden'; }
  function showPhoto(idx) {
    const p = allPhotos[idx];
    lightboxImg.src = p.data;
    const date = new Date(p.timestamp).toLocaleDateString('id-ID', {day:'2-digit', month:'long', year:'numeric'});
    lightboxCap.textContent = date + (allPhotos.length > 1 ? '  ·  ' + (idx+1) + ' / ' + allPhotos.length : '');
    lightboxPrev.style.display = idx > 0 ? 'flex' : 'none';
    lightboxNext.style.display = idx < allPhotos.length - 1 ? 'flex' : 'none';
  }
  function closeLightbox() { lightbox.classList.remove('open'); document.body.style.overflow = ''; lightboxImg.src = ''; }

  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
  lightboxPrev.addEventListener('click', e => { e.stopPropagation(); showPhoto(--currentIdx); });
  lightboxNext.addEventListener('click', e => { e.stopPropagation(); showPhoto(++currentIdx); });
  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft'  && currentIdx > 0)                    showPhoto(--currentIdx);
    if (e.key === 'ArrowRight' && currentIdx < allPhotos.length - 1) showPhoto(++currentIdx);
  });
})();

/* ══════════════════════════
   MUSIC PLAYER — YouTube IFrame API + Local hybrid
══════════════════════════ */
(function() {

  /* ── PLAYLIST — campur YouTube + file lokal ── */
  const PLAYLIST = [
    // ── Lagu Perpisahan ──
    { type:'youtube', id:'anMYu17aZT4', title:'Tetap Dalam Jiwa — Isyana Sarasvati' },
    { type:'youtube', id:'wpst_4m_c-E', title:'Sewindu — Tulus' },
    { type:'youtube', id:'QSCc16k3nUQ', title:'Sahabat Sejati — Sheila On 7' },
    { type:'youtube', id:'79liMVNx_To', title:'Melepas Pelukan Ibu — Kunto Aji' },
    { type:'youtube', id:'7U20i3bMX10', title:'Rumah ke Rumah — Hindia' },
    { type:'youtube', id:'LByPEHhaz7A', title:'Kucari Kamu — Payung Teduh' },
    { type:'youtube', id:'yNcGtKAacts', title:'Rehat — Kunto Aji' },
    // ── File Lokal (dari folder ./music/) ──
    { type:'local', file:'Kenangan Manis.mp3',           title:'Kenangan Manis' },
    { type:'local', file:'Kita Ke Sana.mp3',             title:'Kita Ke Sana' },
    { type:'local', file:'Lantas.mp3',                   title:'Lantas' },
    { type:'local', file:'Monokrom.mp3',                 title:'Monokrom' },
    { type:'local', file:'Monolog.mp3',                  title:'Monolog' },
    { type:'local', file:'Ribuan Memori.mp3',            title:'Ribuan Memori' },
    { type:'local', file:'Secukupnya.mp3',               title:'Secukupnya' },
    { type:'local', file:'Terbuang Dalam Waktu.mp3',     title:'Terbuang Dalam Waktu' },
    { type:'local', file:'Tujuh Belas.mp3',              title:'Tujuh Belas' },
    { type:'local', file:'bergema sampai selamanya.mp3', title:'Bergema Sampai Selamanya' },
  ];

  const BASE_PATH = './music/';

  const audio   = document.getElementById('bgAudio');
  const btnPlay = document.getElementById('mpPlay');
  const btnPrev = document.getElementById('mpPrev');
  const btnNext = document.getElementById('mpNext');
  const mpTitle = document.getElementById('mpTitle');
  const mpFill  = document.getElementById('mpFill');
  const mpIcon  = document.querySelector('.mp-icon');

  let currentIdx      = 0;
  let isPlaying       = false;
  let userInteracted  = false;
  let ytPlayer        = null;
  let ytReady         = false;
  let progressTimer   = null;

  /* ── YouTube IFrame API callback ── */
  window.onYouTubeIframeAPIReady = function() {
    ytPlayer = new YT.Player('yt-player', {
      width: '1', height: '1',
      playerVars: { autoplay: 0, controls: 0, rel: 0, modestbranding: 1 },
      events: {
        onReady: () => {
          ytReady = true;
          if (isPlaying && PLAYLIST[currentIdx].type === 'youtube') {
            ytPlayer.loadVideoById(PLAYLIST[currentIdx].id);
            ytPlayer.playVideo();
          }
        },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.ENDED) nextTrack();
          if (e.data === YT.PlayerState.PLAYING) {
            isPlaying = true; updatePlayBtn(true);
            progressTimer && clearInterval(progressTimer);
            progressTimer = setInterval(updateYTProgress, 500);
          }
          if (e.data === YT.PlayerState.PAUSED) {
            isPlaying = false; updatePlayBtn(false);
            clearInterval(progressTimer);
          }
        }
      }
    });
  };

  function updateYTProgress() {
    if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;
    const cur = ytPlayer.getCurrentTime();
    const dur = ytPlayer.getDuration();
    if (dur > 0) mpFill.style.width = (cur / dur * 100) + '%';
  }

  /* ── Load track ── */
  function loadTrack(idx, andPlay) {
    currentIdx = ((idx % PLAYLIST.length) + PLAYLIST.length) % PLAYLIST.length;
    const track = PLAYLIST[currentIdx];
    mpTitle.textContent = track.title;
    mpFill.style.width  = '0%';

    if (track.type === 'youtube') {
      // Stop local audio
      audio.pause(); audio.src = 'about:blank'; audio.load();
      if (ytReady && ytPlayer) {
        if (andPlay) {
          ytPlayer.loadVideoById(track.id);
          ytPlayer.playVideo();
        } else {
          ytPlayer.cueVideoById(track.id);
        }
      }
    } else {
      // Stop YouTube
      if (ytReady && ytPlayer) { ytPlayer.stopVideo(); clearInterval(progressTimer); }
      audio.src = BASE_PATH + track.file;
      if (andPlay) audio.play().catch(() => {});
    }
  }

  /* ── Play / Pause ── */
  function play() {
    const track = PLAYLIST[currentIdx];
    if (track.type === 'youtube') {
      if (ytReady && ytPlayer) {
        if (!ytPlayer.getVideoUrl || !ytPlayer.getVideoUrl().includes(track.id)) {
          ytPlayer.loadVideoById(track.id);
        }
        ytPlayer.playVideo();
      }
    } else {
      audio.play().then(() => {
        isPlaying = true;
        updatePlayBtn(true);
      }).catch(() => {});
    }
  }

  function pause() {
    const track = PLAYLIST[currentIdx];
    if (track.type === 'youtube') {
      if (ytReady && ytPlayer) ytPlayer.pauseVideo();
    } else {
      audio.pause();
      isPlaying = false;
      updatePlayBtn(false);
    }
  }

  function nextTrack() {
    loadTrack(currentIdx + 1, isPlaying);
  }

  function prevTrack() {
    const track = PLAYLIST[currentIdx];
    let curTime = 0;
    if (track.type === 'youtube' && ytReady && ytPlayer) curTime = ytPlayer.getCurrentTime();
    else curTime = audio.currentTime;

    if (curTime > 3) {
      if (track.type === 'youtube' && ytReady && ytPlayer) ytPlayer.seekTo(0);
      else audio.currentTime = 0;
    } else {
      loadTrack(currentIdx - 1, isPlaying);
    }
  }

  function updatePlayBtn(playing) {
    btnPlay.innerHTML = playing ? '&#9646;&#9646;' : '&#9654;';
    if (mpIcon) playing ? mpIcon.classList.add('spinning') : mpIcon.classList.remove('spinning');
  }

  /* ── Local audio events ── */
  audio.addEventListener('play',       () => { isPlaying = true;  updatePlayBtn(true); });
  audio.addEventListener('pause',      () => { isPlaying = false; updatePlayBtn(false); });
  audio.addEventListener('ended',      () => nextTrack());
  audio.addEventListener('timeupdate', () => {
    if (audio.duration) mpFill.style.width = (audio.currentTime / audio.duration * 100) + '%';
  });
  audio.addEventListener('error', () => {
    if (PLAYLIST[currentIdx].type === 'youtube') return; // bukan error lokal, abaikan
    mpTitle.textContent = '! File tidak ditemukan: ' + PLAYLIST[currentIdx].file;
    setTimeout(() => loadTrack(currentIdx + 1, isPlaying), 2000);
  });

  /* ── Controls ── */
  btnPlay.addEventListener('click', () => {
    userInteracted = true;
    isPlaying ? pause() : play();
  });
  btnNext.addEventListener('click', () => { userInteracted = true; nextTrack(); });
  btnPrev.addEventListener('click', () => { userInteracted = true; prevTrack(); });

  /* ── Autoplay on first interaction ── */
  document.addEventListener('click', () => {
    if (!userInteracted) { userInteracted = true; isPlaying = true; play(); }
  }, { once: true });

  /* ── Load first track ── */
  loadTrack(0, false);

})();

/* ══════════════════════════
   FIREBASE REFS
══════════════════════════ */
const madingRef  = firebase.database().ref('mading/posts');
const songReqRef = firebase.database().ref('songReq');
const notifRef   = firebase.database().ref('notif');
const onlineRef  = firebase.database().ref('shared/online');

function myUid()      { return localStorage.getItem('auUid') || localStorage.getItem('mgUid') || ('u' + Math.random().toString(36).substr(2,7)); }
function myNameStr()  { return localStorage.getItem('lbName') || localStorage.getItem('auName') || localStorage.getItem('mgName') || 'Anonim'; }
function esc2(t)      { return String(t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function fmtAgo2(ts)  {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'barusan';
  if (s < 3600) return Math.floor(s/60) + 'm lalu';
  if (s < 86400) return Math.floor(s/3600) + 'j lalu';
  return Math.floor(s/86400) + 'h lalu';
}

/* ── Online Strip ── */
onlineRef.on('value', snap => {
  const data = snap.val() || {};
  const me = myUid();
  const chips = document.getElementById('onlineChips');
  if (!chips) return;
  let html = '';
  Object.entries(data).forEach(([uid, v]) => {
    if (!v) return;
    const name = (v.name || '?').split(' ')[0];
    const isMe = uid === me;
    const mood = v.mood || '';
    const av = v.avatar || '';
    html += `<div class="online-chip" title="${esc2(v.name||'?')}">
      <div class="online-dot-sm"></div>
      <span style="font-size:.85rem">${av}</span>
      ${mood ? `<span class="online-mood">${mood.split(' ')[0]}</span>` : ''}
      <span>${esc2(name)}${isMe ? ' ★' : ''}</span>
    </div>`;
  });
  chips.innerHTML = html || '<span style="font-size:.75rem;color:rgba(255,255,255,.3)">Tidak ada yang online</span>';
});

/* ── Notifikasi ── */
let notifData = {}, unreadCount = 0;
notifRef.orderByChild('ts').limitToLast(20).on('value', snap => {
  notifData = {};
  snap.forEach(s => { notifData[s.key] = s.val(); });
  renderNotifs();
});

function renderNotifs() {
  const list = document.getElementById('notifList');
  if (!list) return;
  const items = Object.values(notifData).reverse();
  if (!items.length) { list.innerHTML = '<div class="notif-empty">Belum ada notifikasi</div>'; return; }
  const readSet = JSON.parse(localStorage.getItem('readNotifs') || '[]');
  unreadCount = items.filter(n => !readSet.includes(n.id)).length;
  const dot = document.getElementById('notifDot');
  if (dot) dot.style.display = unreadCount > 0 ? 'block' : 'none';
  list.innerHTML = items.map(n => {
    const unread = !readSet.includes(n.id);
    // msg may contain HTML (emoji or SVG icons) — render directly
    const cleanMsg = (n.msg||'').replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '').trim();
    return `<div class="notif-item${unread?' unread':''}">${cleanMsg}<div class="notif-time">${fmtAgo2(n.ts||0)}</div></div>`;
  }).join('');
}

function toggleNotifPanel() {
  const p = document.getElementById('notifPanel');
  p.classList.toggle('open');
  if (p.classList.contains('open')) {
    localStorage.setItem('readNotifs', JSON.stringify(Object.keys(notifData)));
    unreadCount = 0;
    const dot = document.getElementById('notifDot');
    if (dot) dot.style.display = 'none';
    renderNotifs();
  }
}
function clearNotifs() { document.getElementById('notifList').innerHTML = '<div class="notif-empty">Belum ada notifikasi</div>'; }
document.addEventListener('click', e => {
  const panel = document.getElementById('notifPanel');
  const bell  = document.getElementById('notifBell');
  if (panel && bell && !panel.contains(e.target) && !bell.contains(e.target)) panel.classList.remove('open');
});

/* ── Mading ── */
let madingType = 'post', pollOptCount = 2, madingPosts = {};

function setMadingType(t) {
  madingType = t;
  document.querySelectorAll('.mading-pill').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-type="${t}"]`).classList.add('active');
  document.getElementById('pollInputs').style.display = t === 'poll' ? 'flex' : 'none';
}

function addPollOpt() {
  pollOptCount++;
  const div = document.createElement('input');
  div.className = 'poll-opt-input'; div.placeholder = `Pilihan ${pollOptCount}...`; div.id = 'pollOpt' + pollOptCount;
  document.getElementById('pollExtraOpts').appendChild(div);
}

function submitMading() {
  const txt = document.getElementById('madingInput').value.trim();
  if (!txt) return;
  const post = { uid: myUid(), name: myNameStr(), avatar: '', type: madingType, text: txt, ts: Date.now(), likes: {}, comments: {} };
  if (madingType === 'poll') {
    const opts = [];
    for (let i = 1; i <= pollOptCount; i++) {
      const v = document.getElementById('pollOpt'+i)?.value.trim();
      if (v) opts.push(v);
    }
    if (opts.length < 2) { alert('Poll butuh minimal 2 pilihan!'); return; }
    post.pollOpts = opts; post.pollVotes = {};
  }
  madingRef.push(post);
  document.getElementById('madingInput').value = '';
  notifRef.push({ msg: `✏️ ${myNameStr()} membuat ${madingType==='pengumuman'?'pengumuman':madingType==='poll'?'poll':'postingan'} baru!`, ts: Date.now(), id: Date.now().toString() });
}

madingRef.orderByChild('ts').limitToLast(30).on('value', snap => {
  madingPosts = {};
  snap.forEach(s => { madingPosts[s.key] = s.val(); });
  renderMading();
});

function renderMading() {
  const feed = document.getElementById('madingFeed');
  if (!feed) return;
  const posts = Object.entries(madingPosts).reverse();
  if (!posts.length) { feed.innerHTML = '<div style="text-align:center;padding:2rem;color:rgba(255,255,255,.3);font-size:.85rem">Belum ada postingan. Jadilah yang pertama!</div>'; return; }
  feed.innerHTML = posts.map(([id, p]) => buildMadingCard(id, p)).join('');
}

function buildMadingCard(id, p) {
  const me = myUid();
  const likeCount = Object.keys(p.likes||{}).length;
  const liked = (p.likes||{})[me];
  const commentCount = Object.keys(p.comments||{}).length;
  const typeTag   = {post:'tag-post',pengumuman:'tag-pengumuman',poll:'tag-poll'}[p.type]||'tag-post';
  const typeLabel = {post:'Post',pengumuman:'📢 Pengumuman',poll:'📊 Poll'}[p.type]||'Post';

  let bodyHtml = `<div class="mc-body">${esc2(p.text)}</div>`;

  if (p.type === 'poll' && p.pollOpts) {
    const totalVotes = Object.values(p.pollVotes||{}).length;
    const myVote = (p.pollVotes||{})[me];
    bodyHtml = `<div class="mc-body" style="margin-bottom:.3rem">${esc2(p.text)}</div><div class="poll-results">`;
    p.pollOpts.forEach((opt, i) => {
      const voteCount = Object.values(p.pollVotes||{}).filter(v => v === i).length;
      const pct = totalVotes > 0 ? Math.round(voteCount / totalVotes * 100) : 0;
      const isVoted = myVote === i;
      bodyHtml += `<div class="poll-opt-result" onclick="votePoll('${id}',${i})">
        <div class="poll-opt-label"><span>${esc2(opt)}</span><span>${pct}% (${voteCount})</span></div>
        <div class="poll-bar-bg"><div class="poll-bar-fill${isVoted?' voted':''}" style="width:${pct}%"></div></div>
      </div>`;
    });
    bodyHtml += `<div style="font-size:.7rem;color:rgba(255,255,255,.3);margin-top:.3rem">${totalVotes} suara</div></div>`;
  }

  const comments = Object.values(p.comments||{}).slice(-3);
  const commHtml = comments.map(c => `<div class="mc-comment"><b>${esc2(c.name)}</b> ${esc2(c.text)}</div>`).join('');

  return `<div class="mading-card type-${p.type}">
    <div class="mc-head">
      <div class="mc-avatar">${esc2(p.avatar||'')}</div>
      <div class="mc-meta"><div class="mc-name">${esc2(p.name||'?')}</div><div class="mc-time">${fmtAgo2(p.ts||0)}</div></div>
      <span class="mc-type-tag ${typeTag}">${typeLabel}</span>
    </div>
    ${bodyHtml}
    <div class="mc-actions">
      <button class="mc-action-btn${liked?' liked':''}" onclick="likeMading('${id}')">❤️ ${likeCount}</button>
      <button class="mc-action-btn" onclick="toggleComments('${id}')">💬 ${commentCount}</button>
      ${p.uid===me ? `<button class="mc-action-btn" onclick="deleteMading('${id}')" style="margin-left:auto;color:rgba(255,100,100,.5)">[del]</button>` : ''}
    </div>
    <div class="mc-comments" id="mc-comm-${id}" style="display:none">
      ${commHtml}
      <div class="mc-comment-input-row">
        <input class="mc-comment-input" id="ci-${id}" placeholder="Tulis komentar...">
        <button class="mc-comment-send" onclick="sendComment('${id}')">➤</button>
      </div>
    </div>
  </div>`;
}

function likeMading(id) {
  const me = myUid();
  const ref = madingRef.child(id+'/likes/'+me);
  ref.once('value', s => { s.val() ? ref.remove() : ref.set(true); });
}
function toggleComments(id) {
  const el = document.getElementById('mc-comm-'+id);
  if (el) { el.style.display = el.style.display === 'none' ? 'flex' : 'none'; el.style.flexDirection = 'column'; }
}
function sendComment(id) {
  const input = document.getElementById('ci-'+id);
  if (!input || !input.value.trim()) return;
  madingRef.child(id+'/comments').push({ name: myNameStr(), text: input.value.trim(), ts: Date.now() });
  input.value = '';
}
function deleteMading(id) { madingRef.child(id).remove(); }
function votePoll(id, optIdx) { madingRef.child(id+'/pollVotes/'+myUid()).set(optIdx); }

/* ── Song Request ── */
let songData = {}, myVotedSongs = JSON.parse(localStorage.getItem('srVotes') || '[]');

songReqRef.orderByChild('votes').limitToLast(20).on('value', snap => {
  songData = {};
  snap.forEach(s => { songData[s.key] = s.val(); });
  renderSongReq();
});

function requestSong() {
  const inp = document.getElementById('srSongInput');
  const song = inp.value.trim();
  if (!song) return;
  songReqRef.push({ song, reqBy: myNameStr(), votes: 1, voters: {[myUid()]: true}, ts: Date.now() });
  inp.value = '';
  notifRef.push({ msg: `🎵 ${myNameStr()} request lagu: ${song}`, ts: Date.now(), id: Date.now().toString() });
}

function voteForSong(id) {
  const me = myUid();
  if (myVotedSongs.includes(id)) {
    songReqRef.child(id+'/voters/'+me).remove();
    songReqRef.child(id+'/votes').transaction(v => (v||1)-1);
    myVotedSongs = myVotedSongs.filter(x => x !== id);
  } else {
    songReqRef.child(id+'/voters/'+me).set(true);
    songReqRef.child(id+'/votes').transaction(v => (v||0)+1);
    myVotedSongs.push(id);
  }
  localStorage.setItem('srVotes', JSON.stringify(myVotedSongs));
  renderSongReq();
}

function renderSongReq() {
  const list = document.getElementById('srList');
  if (!list) return;
  const sorted = Object.entries(songData).sort((a,b) => (b[1].votes||0) - (a[1].votes||0));
  if (!sorted.length) { list.innerHTML = '<div style="text-align:center;padding:1rem;color:rgba(255,255,255,.3);font-size:.82rem">Belum ada request.</div>'; return; }
  list.innerHTML = sorted.map(([id,s], i) => {
    const voted = (s.voters||{})[myUid()] || myVotedSongs.includes(id);
    return `<div class="sr-item">
      <span class="sr-rank">${i+1}</span>
      <div style="flex:1"><div class="sr-song">${esc2(s.song)}</div><div class="sr-req">req. ${esc2(s.reqBy||'?')}</div></div>
      <button class="sr-vote-btn${voted?' voted':''}" onclick="voteForSong('${id}')">▲</button>
      <span class="sr-votes">${s.votes||0}</span>
    </div>`;
  }).join('');
}

/* ── Student Card Bio ── */
(function() {
  const bioRef = firebase.database().ref('studentBios');
  const biosCache = {};

  bioRef.on('value', snap => {
    const data = snap.val() || {};
    Object.entries(data).forEach(([key, val]) => {
      biosCache[key] = val;
      const el = document.getElementById('bio_' + key);
      if (el) renderBio(el, key, val);
    });
  });

  function nameToKey(name) { return name.toLowerCase().replace(/[^a-z0-9]/g, '_'); }
  function myName() { return localStorage.getItem('lbName') || ''; }
  function esc(t) { return String(t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function renderBio(el, key, text) {
    const isMe = nameToKey(myName()) === key;
    if (!text && !isMe) { el.innerHTML = ''; return; }
    if (!text && isMe) {
      el.innerHTML = `<span style="color:rgba(201,168,76,0.5);font-size:.75rem">Klik ✏️ untuk tambah bio</span>
        <span class="sc-bio-edit" onclick="editBio(event,'${key}')">✏️ Tambah</span>`;
      return;
    }
    el.innerHTML = `<span class="sc-bio-text">${esc(text)}</span>`
      + (isMe ? `<span class="sc-bio-edit" onclick="editBio(event,'${key}')">✏️ Edit</span>` : '');
  }

  window.toggleStudentCard = function(card) {
    const wasActive = card.classList.contains('active');
    document.querySelectorAll('.student-card.active').forEach(c => { if (c !== card) c.classList.remove('active'); });
    card.classList.toggle('active', !wasActive);
    if (!wasActive) {
      const name = card.dataset.name || '';
      const key = nameToKey(name);
      const bioEl = card.querySelector('.sc-bio');
      if (bioEl) renderBio(bioEl, key, biosCache[key] || '');
    }
  };

  window.editBio = function(e, key) {
    e.stopPropagation();
    const bioEl = document.getElementById('bio_' + key);
    if (!bioEl) return;
    const current = biosCache[key] || '';
    bioEl.innerHTML = `<div class="sc-bio-input-wrap">
      <input class="sc-bio-input" id="bioinp_${key}" placeholder="Tulis bio kamu..." maxlength="100" value="${esc(current)}">
      <button class="sc-bio-save" onclick="saveBio(event,'${key}')">Simpan</button>
    </div>`;
    const inp = document.getElementById('bioinp_' + key);
    if (inp) { inp.focus(); inp.addEventListener('keydown', e => { if (e.key === 'Enter') saveBio(e, key); }); }
  };

  window.saveBio = function(e, key) {
    e.stopPropagation();
    const inp = document.getElementById('bioinp_' + key);
    if (!inp) return;
    const val = inp.value.trim();
    bioRef.child(key).set(val || null);
    biosCache[key] = val;
    const bioEl = document.getElementById('bio_' + key);
    if (bioEl) renderBio(bioEl, key, val);
  };
})();

// ─── Mobile Nav ───
function toggleMobileNav() {
  const nav    = document.getElementById('mobileNav');
  const burger = document.getElementById('navBurger');
  if (nav) nav.classList.toggle('open');
  if (burger) burger.classList.toggle('open');
}

function closeMobileNav() {
  const nav    = document.getElementById('mobileNav');
  const burger = document.getElementById('navBurger');
  if (nav)    nav.classList.remove('open');
  if (burger) burger.classList.remove('open');
}

document.addEventListener('click', function(e) {
  const nav    = document.getElementById('mobileNav');
  const burger = document.getElementById('navBurger');
  if (nav && nav.classList.contains('open') && !nav.contains(e.target) && burger && !burger.contains(e.target)) {
    closeMobileNav();
  }
});

// ─── Kalender Kegiatan ───
(function() {
  const EVENTS = [
    { month: 4, start: 1,  end: 1,  label: 'Pra Munaqasyah',               type: 'religious', note: '' },
    { month: 4, start: 2,  end: 10, label: 'UK 2',                          type: 'academic',  note: '' },
    { month: 4, start: 10, end: 11, label: 'Pintar 2 Kelas 6',              type: 'academic',  note: '' },
    { month: 4, start: 15, end: 15, label: 'Munaqosah',                     type: 'religious', note: '' },
    { month: 4, start: 22, end: 23, label: 'TKA',                           type: 'academic',  note: 'di Lab Komputer' },
    { month: 4, start: 27, end: 29, label: 'Pengambilan Nilai Praktik',     type: 'academic',  note: '' },
    { month: 4, start: 30, end: 30, label: 'Istighosah / Doa Bersama',      type: 'religious', note: '' },
    { month: 5, start: 4,  end: 8,  label: 'AAJ / Ujian Sekolah Kelas 6',  type: 'academic',  note: '' },
    { month: 5, start: 11, end: 12, label: 'Gladi Wisuda Akbar',            type: 'graduation', note: '' },
    { month: 5, start: 13, end: 13, label: 'Wisuda Akbar',                  type: 'wisuda',    note: '🎓' },
    { month: 5, start: 23, end: 23, label: 'Imtihan Al-Quran',              type: 'religious', note: 'Bagi yang mengikuti Munaqosah' },
    { month: 5, start: 30, end: 30, label: 'Perpisahan',            type: 'wisuda',   note: '🎉' },
    { month: 6, start: 2,  end: 2,  label: 'Pengumuman Kelulusan',  type: 'academic', note: '🎓' },
  ];

  const TYPE_COLOR  = { academic:'#FF6B6B', religious:'#00D4AA', graduation:'#8B7CF6', wisuda:'#F9C74F' };
  const MONTH_NAMES = { 4: 'April', 5: 'Mei', 6: 'Juni' };
  const DAY_ABBR    = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

  function buildDayMap(month) {
    const map = {};
    EVENTS.filter(e => e.month === month).forEach(ev => {
      for (let d = ev.start; d <= ev.end; d++) map[d] = ev;
    });
    return map;
  }

  function renderGrid(containerId, year, month) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const firstDay    = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const dayMap      = buildDayMap(month);
    const today       = new Date();
    const isThisMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;
    const todayNum    = today.getDate();

    let html = `<div class="cal-month-title">${MONTH_NAMES[month]} <span>${year}</span></div>`;
    html += '<div class="cal-grid">';
    DAY_ABBR.forEach(d => { html += `<div class="cal-day-header">${d}</div>`; });
    for (let i = 0; i < firstDay; i++) html += '<div class="cal-day cal-empty"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const ev      = dayMap[d];
      const isToday = isThisMonth && d === todayNum;
      const col     = ev ? TYPE_COLOR[ev.type] : null;
      let cls   = 'cal-day';
      let style = '';
      let title = '';
      if (ev) {
        cls += ' cal-has-event';
        style = `background:${col}1A; border-top:2px solid ${col};`;
        title = `title="${ev.label}"`;
        if (ev.start === d) cls += ' cal-ev-first';
        if (ev.end   === d) cls += ' cal-ev-last';
      }
      if (isToday) { cls += ' cal-today'; style = ev ? `background:${col}2A; border-top:2px solid ${col};` : ''; }
      const numStyle = isToday ? `background:${ev ? col : 'var(--acc)'};color:${ev?'#fff':'#000'};font-weight:700;border-radius:50%;` : '';
      html += `<div class="${cls}" style="${style}" ${title}><span style="${numStyle}">${d}</span></div>`;
    }
    html += '</div>';
    el.innerHTML = html;
  }

  function renderList(containerId, month) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const events = EVENTS.filter(e => e.month === month);
    const today  = new Date(); today.setHours(0,0,0,0);
    let html = '';
    events.forEach(ev => {
      const evEnd   = new Date(2026, ev.month-1, ev.end);   evEnd.setHours(23,59,59);
      const evStart = new Date(2026, ev.month-1, ev.start); evStart.setHours(0,0,0,0);
      const isPast    = evEnd < today;
      const isOngoing = evStart <= today && today <= evEnd;
      const col       = TYPE_COLOR[ev.type];
      const dateStr   = ev.start === ev.end ? `${ev.start}` : `${ev.start}–${ev.end}`;
      let itemCls = 'cal-event-item';
      if (isPast)    itemCls += ' cal-ev-past';
      if (isOngoing) itemCls += ' cal-ev-active';
      html += `<div class="${itemCls}" style="border-left-color:${isOngoing?col:'transparent'}">
        <div class="cal-event-dot" style="background:${col};box-shadow:0 0 6px ${col}66"></div>
        <div class="cal-event-body">
          <div class="cal-event-date" style="color:${col}">${dateStr} ${MONTH_NAMES[ev.month]}</div>
          <div class="cal-event-name">${ev.label}${ev.note?` <span class="cal-event-note">${ev.note}</span>`:''}</div>
        </div>
        ${isPast    ? '<div class="cal-ev-badge cal-ev-done">✓ Selesai</div>' : ''}
        ${isOngoing ? '<div class="cal-ev-badge cal-ev-now">Berlangsung</div>' : ''}
      </div>`;
    });
    el.innerHTML = html || '<div style="color:var(--muted);font-size:.75rem;text-align:center;padding:1rem">Tidak ada kegiatan</div>';
  }

  renderGrid('cal-grid-april', 2026, 4);
  renderGrid('cal-grid-may',   2026, 5);
  renderList('cal-events-april', 4);
  renderList('cal-events-may',   5);
  renderGrid('cal-grid-june',  2026, 6);
  renderList('cal-events-june', 6);
})();
