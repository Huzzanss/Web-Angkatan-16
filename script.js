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
    const formatted = pad(val);
    if (el.textContent !== formatted) {
      el.textContent = formatted;
      el.classList.remove('tick');
      void el.offsetWidth; // reflow
      el.classList.add('tick');
      setTimeout(() => el.classList.remove('tick'), 150);
    }
  }

  function update() {
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      [elDays, elHours, elMins, elSecs].forEach(el => el.textContent = '00');
      elMsg.textContent = '🎓 Selamat! Hari Wisuda telah tiba!';
      elMsg.classList.add('done');
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
    e.preventDefault();
    document.querySelector(anchor.getAttribute('href')).scrollIntoView({
      behavior: 'smooth', block: 'start'
    });
  });
});

// Spektrum elegan A→Z: ruby → coral → amber → emas → zamrud → teal → biru → indigo → plum
// Hue bergeser mulus 0°→300° sepanjang alfabet, saturasi & lightness dijaga tetap mewah
function getInitialGradient(letter) {
  const index = letter.charCodeAt(0) - 65; // A=0, Z=25
  const t = index / 25; // 0.0 → 1.0

  // Hue utama: 0° (ruby) → 300° (plum) — melewati warm & cool spectrum
  const hue1 = Math.round(t * 300);
  const hue2 = Math.round(hue1 + 22); // pair sedikit lebih terang

  // Saturasi & lightness: jewel tone — dalam & kaya
  const s1 = 72, l1 = 38;
  const s2 = 65, l2 = 52;

  return `linear-gradient(135deg, hsl(${hue1},${s1}%,${l1}%), hsl(${hue2},${s2}%,${l2}%))`;
}

function generateInitial(name) {
  return name ? name.charAt(0).toUpperCase() : '';
}

// Script ada di bawah body, langsung run tanpa perlu DOMContentLoaded
document.querySelectorAll('.student-card').forEach(card => {
  const name = card.querySelector('p').textContent.trim();
  const letter = generateInitial(name);
  const el = card.querySelector('.initial');
  el.textContent = letter;
  el.style.background = getInitialGradient(letter);
});

// Toggle navbar mobile
if (window.innerWidth <= 768) {
  const navRight = document.querySelector('.nav-right');
  const toggleBtn = document.createElement('button');
  toggleBtn.innerHTML = '&#9776;';
  toggleBtn.style.cssText = 'background:none;border:none;color:white;font-size:1.5rem;cursor:pointer;line-height:1;';
  document.querySelector('.nav-left').appendChild(toggleBtn);
  toggleBtn.addEventListener('click', () => navRight.classList.toggle('show'));
}

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

// User anonim
let userId = localStorage.getItem('chatUserId') || Math.random().toString(36).substr(2, 9);
localStorage.setItem('chatUserId', userId);

// DOM
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typing-indicator');
let isTyping = false, typingTimeout;

// Send message (click)
sendBtn.addEventListener('click', sendMessage);

// Send message (Enter key)
messageInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;
  db.ref('messages').push({ userId, text, timestamp: Date.now() });
  messageInput.value = '';
  stopTyping();
}

// Typing indicator
messageInput.addEventListener('input', () => {
  if (!isTyping) startTyping();
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(stopTyping, 2000);
});

function startTyping() {
  isTyping = true;
  db.ref('typing/' + userId).set(true);
}

function stopTyping() {
  isTyping = false;
  db.ref('typing/' + userId).set(false);
}

// Render messages realtime
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

// Typing indicator realtime
db.ref('typing').on('value', snapshot => {
  const data = snapshot.val() || {};
  const someoneTyping = Object.keys(data).some(k => k !== userId && data[k]);
  typingIndicator.style.display = someoneTyping ? 'flex' : 'none';
});


/* ══════════════════════════════════════
   CHAT CENSOR
   Edit CUSTOM_BAD_WORDS untuk tambah kata
   sendiri. Semua kata cocok diganti * 
   sebanyak hurufnya (case-insensitive).
══════════════════════════════════════ */
const CUSTOM_BAD_WORDS = [
  // Tambahkan kata kustom di sini, contoh:
  // 'contohkata',
  // 'kataburuk',
];

const _BASE_BAD_WORDS = [
  // Indonesian
  'anjing','anjir','anjrit','anying','asu','babi','bajingan','bangsat','bego',
  'bejat','bencong','biadab','bodoh','brengsek','budek','coli','colmek',
  'dancuk','dancok','edan','goblok','goblog','haram','idiot','jalang','jancok',
  'jancuk','keparat','kimak','kontol','koplak','lonte','mampus','memek','monyet',
  'ngentot','ngewe','pantat','pecundang','pelacur','perek','pukimak','setan',
  'sialan','tai','tahi','tolol','jembut','pepek','puki','titit','butuh',
  'nganye','ngocok','cibai','bokep',
  // English
  'ass','asshole','bastard','bitch','cock','crap','cum','cunt','damn','dick',
  'dildo','fag','faggot','fuck','fucker','fucking','goddamn','horny',
  'jackass','jerk','motherfucker','nigga','nigger','penis','piss',
  'porn','prick','pussy','rape','retard','shit','slut','twat','wank','whore',
];

// Gabungkan base + custom, buat regex sekali saja
const _ALL_BAD = [...new Set([..._BASE_BAD_WORDS, ...CUSTOM_BAD_WORDS])];
const _CENSOR_REGEX = new RegExp(
  '\\b(' + _ALL_BAD.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b',
  'gi'
);

function censorText(text) {
  return text.replace(_CENSOR_REGEX, match => '*'.repeat(match.length));
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Cleanup on unload
window.addEventListener('beforeunload', stopTyping);

/* ══════════════════════════════════════
   GALLERY ANGKATAN XVI
   Simpan base64 ke Realtime DB (gratis)
   — auto-compress sebelum simpan
══════════════════════════════════════ */
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

  let allPhotos = [];
  let currentIdx = 0;

  // ── Drag & Drop ──
  uploadDrop.addEventListener('dragover', e => { e.preventDefault(); uploadDrop.classList.add('dragover'); });
  uploadDrop.addEventListener('dragleave', () => uploadDrop.classList.remove('dragover'));
  uploadDrop.addEventListener('drop', e => { e.preventDefault(); uploadDrop.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
  uploadDrop.addEventListener('click', () => photoInput.click());
  photoInput.addEventListener('change', () => handleFiles(photoInput.files));

  // ── Kompres gambar ke base64 (max 900px, 82% quality) ──
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
          else       { w = Math.round(w * MAX / h); h = MAX; }
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

  // ── Upload Handler ──
  function handleFiles(files) {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!arr.length) return;

    // Cek ukuran asli (sebelum kompres) maks 15MB
    for (const f of arr) {
      if (f.size > 15 * 1024 * 1024) {
        alert(f.name + ' terlalu besar (maks 15MB).');
        return;
      }
    }

    uploadProgress.style.display = 'block';
    uploadDrop.style.display = 'none';
    progressText.style.color = '';

    let done = 0;

    arr.forEach((file, i) => {
      progressText.textContent = 'Mengompres foto ' + (i + 1) + '/' + arr.length + '...';
      compressImage(file)
        .then(base64 => {
          progressFill.style.width = Math.round(((i + 0.5) / arr.length) * 100) + '%';
          progressText.textContent = 'Menyimpan foto ' + (i + 1) + '/' + arr.length + '...';
          return galleryDb.push({
            data: base64,
            name: file.name,
            timestamp: Date.now()
          });
        })
        .then(() => {
          done++;
          progressFill.style.width = Math.round((done / arr.length) * 100) + '%';
          if (done === arr.length) {
            progressText.textContent = '✓ Foto berhasil disimpan!';
            setTimeout(resetUploadUI, 1200);
          }
        })
        .catch(err => {
          console.error(err);
          progressText.style.color = '#e07a5f';
          progressText.textContent = '⛔ Gagal: ' + err.message;
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

  // ── Load Gallery (realtime) ──
  galleryDb.orderByChild('timestamp').on('value', snap => {
    allPhotos = [];
    const data = snap.val() || {};
    Object.values(data)
      .sort((a, b) => b.timestamp - a.timestamp)
      .forEach(p => allPhotos.push(p));
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
      item.innerHTML = `
        <img src="${photo.data}" alt="${photo.name || 'Foto'}" loading="lazy">
        <div class="gallery-item-overlay">
          <span class="gallery-item-time">${date}</span>
        </div>
      `;
      item.addEventListener('click', () => openLightbox(idx));
      galleryGrid.appendChild(item);
    });
  }

  // ── Lightbox ──
  function openLightbox(idx) {
    currentIdx = idx;
    showPhoto(currentIdx);
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function showPhoto(idx) {
    const p = allPhotos[idx];
    lightboxImg.src = p.data;
    const date = new Date(p.timestamp).toLocaleDateString('id-ID', {day:'2-digit', month:'long', year:'numeric'});
    lightboxCap.textContent = date + (allPhotos.length > 1 ? '  ·  ' + (idx+1) + ' / ' + allPhotos.length : '');
    lightboxPrev.style.display = idx > 0 ? 'flex' : 'none';
    lightboxNext.style.display = idx < allPhotos.length - 1 ? 'flex' : 'none';
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    lightboxImg.src = '';
  }

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

/* ══════════════════════════════════════
   BACKSOUND PLAYER
   Ganti nama file di array PLAYLIST
   sesuai file di folder ./music/ di GitHub
══════════════════════════════════════ */
(function() {
  // ─── PLAYLIST — ganti sesuai nama file di ./music/ ───
  const PLAYLIST = [
    { file: 'lagu1.mp3',  title: 'Lagu 1' },
    { file: 'lagu2.mp3',  title: 'Lagu 2' },
    { file: 'lagu3.mp3',  title: 'Lagu 3' },
  ];

  const BASE_PATH = './music/'; // folder musik di repo

  const audio    = document.getElementById('bgAudio');
  const player   = document.getElementById('musicPlayer');
  const btnPlay  = document.getElementById('mpPlay');
  const btnPrev  = document.getElementById('mpPrev');
  const btnNext  = document.getElementById('mpNext');
  const mpTitle  = document.getElementById('mpTitle');
  const mpFill   = document.getElementById('mpFill');
  const mpIcon   = document.querySelector('.mp-icon');

  let currentIdx = 0;
  let isPlaying  = false;
  let userInteracted = false;

  function loadTrack(idx) {
    currentIdx = ((idx % PLAYLIST.length) + PLAYLIST.length) % PLAYLIST.length;
    const track = PLAYLIST[currentIdx];
    audio.src = BASE_PATH + track.file;
    mpTitle.textContent = track.title;
    mpFill.style.width = '0%';
    if (isPlaying) audio.play().catch(() => {});
  }

  function play() {
    audio.play().then(() => {
      isPlaying = true;
      btnPlay.innerHTML = '&#9646;&#9646;'; // pause icon
      mpIcon.classList.add('spinning');
      player.classList.add('active');
    }).catch(err => {
      console.warn('Autoplay blocked:', err);
    });
  }

  function pause() {
    audio.pause();
    isPlaying = false;
    btnPlay.innerHTML = '&#9654;'; // play icon
    mpIcon.classList.remove('spinning');
  }

  // Play/Pause toggle
  btnPlay.addEventListener('click', () => {
    userInteracted = true;
    isPlaying ? pause() : play();
  });

  // Next
  btnNext.addEventListener('click', () => {
    loadTrack(currentIdx + 1);
    if (isPlaying) play();
  });

  // Prev
  btnPrev.addEventListener('click', () => {
    // Kalau sudah > 3 detik, restart lagu; kalau tidak, prev
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
    } else {
      loadTrack(currentIdx - 1);
      if (isPlaying) play();
    }
  });

  // Auto next saat lagu habis
  audio.addEventListener('ended', () => {
    loadTrack(currentIdx + 1);
    play(); // auto play lagu berikutnya
  });

  // Update progress bar
  audio.addEventListener('timeupdate', () => {
    if (audio.duration) {
      mpFill.style.width = (audio.currentTime / audio.duration * 100) + '%';
    }
  });

  // Error handling (file tidak ketemu)
  audio.addEventListener('error', () => {
    console.warn('File tidak ditemukan:', PLAYLIST[currentIdx].file);
    mpTitle.textContent = '⚠ File tidak ditemukan: ' + PLAYLIST[currentIdx].file;
    // Coba lagu berikutnya setelah 2 detik
    setTimeout(() => loadTrack(currentIdx + 1), 2000);
  });

  // Muat lagu pertama
  loadTrack(0);

  // Autoplay setelah interaksi pertama di halaman
  document.addEventListener('click', () => {
    if (!userInteracted) {
      userInteracted = true;
      play();
    }
  }, { once: true });
})();


/* ─── New Features: Mading, Song Request, Notif, Game Tags, Online ─── */

/* ══════════════════════════
   SHARED FIREBASE REF (already init'd in script.js)
══════════════════════════ */
const madingRef  = firebase.database().ref('mading/posts');
const songReqRef = firebase.database().ref('songReq');
const notifRef   = firebase.database().ref('notif');
const onlineRef  = firebase.database().ref('shared/online');
const moodRef    = firebase.database().ref('shared/mood');
const gamePlayRef= firebase.database().ref('shared/gamePlays');

function myUid(){return localStorage.getItem('auUid')||localStorage.getItem('mgUid')||('u'+Math.random().toString(36).substr(2,7));}
function myNameStr(){return localStorage.getItem('lbName')||localStorage.getItem('auName')||localStorage.getItem('mgName')||'Anonim';}
function myAvatarStr(){return localStorage.getItem('profileAvatar')||'👤';}
function esc2(t){return String(t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function fmtAgo2(ts){const s=Math.floor((Date.now()-ts)/1000);if(s<60)return 'barusan';if(s<3600)return Math.floor(s/60)+'m lalu';if(s<86400)return Math.floor(s/3600)+'j lalu';return Math.floor(s/86400)+'h lalu';}

/* ═══ ONLINE STRIP ═══ */
onlineRef.on('value',snap=>{
  const data=snap.val()||{};
  const me=myUid();
  const chips=document.getElementById('onlineChips');
  if(!chips) return;
  let html='';
  let count=0;
  Object.entries(data).forEach(([uid,v])=>{
    if(!v) return;
    count++;
    const mood=v.mood||'';
    const name=(v.name||'?').split(' ')[0];
    const isMe=uid===me;
    const av=v.avatar||'👤';
    html+=`<div class="online-chip" onclick="window.location='profil.html'" title="${esc2(v.name||'?')}">
      <div class="online-dot-sm"></div>
      <span style="font-size:.85rem">${av}</span>
      ${mood?`<span class="online-mood" style="font-size:.75rem">${mood.split(' ')[0]}</span>`:''}
      <span>${esc2(name)}${isMe?' ★':''}</span>
    </div>`;
  });
  chips.innerHTML=html||'<span style="font-size:.75rem;color:rgba(255,255,255,.3)">Tidak ada yang online</span>';
});

/* ═══ NOTIFICATIONS ═══ */
let notifData={};
let unreadCount=0;
notifRef.orderByChild('ts').limitToLast(20).on('value',snap=>{
  notifData={};
  snap.forEach(s=>{notifData[s.key]=s.val();});
  renderNotifs();
});

function renderNotifs(){
  const list=document.getElementById('notifList');
  if(!list) return;
  const items=Object.values(notifData).reverse();
  if(!items.length){list.innerHTML='<div class="notif-empty">Belum ada notifikasi</div>';return;}
  const readSet=JSON.parse(localStorage.getItem('readNotifs')||'[]');
  unreadCount=items.filter(n=>!readSet.includes(n.id)).length;
  const dot=document.getElementById('notifDot');
  if(dot) dot.style.display=unreadCount>0?'block':'none';
  list.innerHTML=items.map(n=>{
    const unread=!readSet.includes(n.id);
    return `<div class="notif-item${unread?' unread':''}">
      ${esc2(n.msg||'')}
      <div class="notif-time">${fmtAgo2(n.ts||0)}</div>
    </div>`;
  }).join('');
}

function toggleNotifPanel(){
  const p=document.getElementById('notifPanel');
  p.classList.toggle('open');
  if(p.classList.contains('open')){
    // Mark all read
    const ids=Object.keys(notifData);
    localStorage.setItem('readNotifs',JSON.stringify(ids));
    unreadCount=0;
    const dot=document.getElementById('notifDot');
    if(dot) dot.style.display='none';
    renderNotifs();
  }
}
function clearNotifs(){document.getElementById('notifList').innerHTML='<div class="notif-empty">Belum ada notifikasi</div>';}
document.addEventListener('click',e=>{
  const panel=document.getElementById('notifPanel');
  const bell=document.getElementById('notifBell');
  if(panel&&bell&&!panel.contains(e.target)&&!bell.contains(e.target)){
    panel.classList.remove('open');
  }
});

/* ═══ MADING ═══ */
let madingType='post';
let pollOptCount=2;
let madingPosts={};

function setMadingType(t){
  madingType=t;
  document.querySelectorAll('.mading-pill').forEach(p=>p.classList.remove('active'));
  document.querySelector(`[data-type="${t}"]`).classList.add('active');
  document.getElementById('pollInputs').style.display=t==='poll'?'flex':'none';
}

function addPollOpt(){
  pollOptCount++;
  const div=document.createElement('input');
  div.className='poll-opt-input'; div.placeholder=`Pilihan ${pollOptCount}...`;
  div.id='pollOpt'+pollOptCount;
  document.getElementById('pollExtraOpts').appendChild(div);
}

function submitMading(){
  const txt=document.getElementById('madingInput').value.trim();
  if(!txt) return;
  const post={
    uid:myUid(), name:myNameStr(), avatar:myAvatarStr(),
    type:madingType, text:txt, ts:Date.now(), likes:{}, comments:{}
  };
  if(madingType==='poll'){
    const opts=[];
    for(let i=1;i<=pollOptCount;i++){
      const v=document.getElementById('pollOpt'+i)?.value.trim();
      if(v) opts.push(v);
    }
    if(opts.length<2){alert('Poll butuh minimal 2 pilihan!');return;}
    post.pollOpts=opts; post.pollVotes={};
  }
  madingRef.push(post);
  document.getElementById('madingInput').value='';
  // Send notification
  notifRef.push({msg:`📝 ${myNameStr()} membuat ${madingType==='pengumuman'?'pengumuman':madingType==='poll'?'poll':'postingan'} baru!`,ts:Date.now(),id:Date.now().toString()});
}

madingRef.orderByChild('ts').limitToLast(30).on('value',snap=>{
  madingPosts={};
  snap.forEach(s=>{madingPosts[s.key]=s.val();});
  renderMading();
});

function renderMading(){
  const feed=document.getElementById('madingFeed');
  if(!feed) return;
  const posts=Object.entries(madingPosts).reverse();
  if(!posts.length){
    feed.innerHTML='<div style="text-align:center;padding:2rem;color:rgba(255,255,255,.3);font-size:.85rem">Belum ada postingan. Jadilah yang pertama! ✨</div>';
    return;
  }
  feed.innerHTML=posts.map(([id,p])=>buildMadingCard(id,p)).join('');
}

function buildMadingCard(id,p){
  const me=myUid();
  const likeCount=Object.keys(p.likes||{}).length;
  const liked=(p.likes||{})[me];
  const commentCount=Object.keys(p.comments||{}).length;
  const typeTag={post:'tag-post',pengumuman:'tag-pengumuman',poll:'tag-poll'}[p.type]||'tag-post';
  const typeLabel={post:'Post',pengumuman:'📢 Pengumuman',poll:'📊 Poll'}[p.type]||'Post';

  let bodyHtml=`<div class="mc-body">${esc2(p.text)}</div>`;

  if(p.type==='poll'&&p.pollOpts){
    const totalVotes=Object.values(p.pollVotes||{}).length;
    const myVote=(p.pollVotes||{})[me];
    bodyHtml+=`<div class="mc-body" style="margin-bottom:.3rem">${esc2(p.text)}</div><div class="poll-results">`;
    p.pollOpts.forEach((opt,i)=>{
      const voteCount=Object.values(p.pollVotes||{}).filter(v=>v===i).length;
      const pct=totalVotes>0?Math.round(voteCount/totalVotes*100):0;
      const isVoted=myVote===i;
      bodyHtml+=`<div class="poll-opt-result" onclick="votePoll('${id}',${i})">
        <div class="poll-opt-label"><span>${esc2(opt)}</span><span>${pct}% (${voteCount})</span></div>
        <div class="poll-bar-bg"><div class="poll-bar-fill${isVoted?' voted':''}" style="width:${pct}%"></div></div>
      </div>`;
    });
    bodyHtml+=`<div style="font-size:.7rem;color:rgba(255,255,255,.3);margin-top:.3rem">${totalVotes} suara</div></div>`;
  }

  const comments=Object.values(p.comments||{}).slice(-3);
  const commHtml=comments.map(c=>`<div class="mc-comment"><b>${esc2(c.name)}</b> ${esc2(c.text)}</div>`).join('');

  return `<div class="mading-card type-${p.type}">
    <div class="mc-head">
      <div class="mc-avatar">${p.avatar||'👤'}</div>
      <div class="mc-meta">
        <div class="mc-name">${esc2(p.name||'?')}</div>
        <div class="mc-time">${fmtAgo2(p.ts||0)}</div>
      </div>
      <span class="mc-type-tag ${typeTag}">${typeLabel}</span>
    </div>
    ${bodyHtml}
    <div class="mc-actions">
      <button class="mc-action-btn${liked?' liked':''}" onclick="likeMading('${id}')">❤️ ${likeCount}</button>
      <button class="mc-action-btn" onclick="toggleComments('${id}')">💬 ${commentCount}</button>
      ${p.uid===me?`<button class="mc-action-btn" onclick="deleteMading('${id}')" style="margin-left:auto;color:rgba(255,100,100,.5)">🗑</button>`:''}
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

function likeMading(id){
  const me=myUid();
  const ref=madingRef.child(id+'/likes/'+me);
  ref.once('value',s=>{s.val()?ref.remove():ref.set(true);});
}
function toggleComments(id){
  const el=document.getElementById('mc-comm-'+id);
  if(el) el.style.display=el.style.display==='none'?'flex':'none';
  if(el) el.style.flexDirection='column';
}
function sendComment(id){
  const input=document.getElementById('ci-'+id);
  if(!input||!input.value.trim()) return;
  madingRef.child(id+'/comments').push({name:myNameStr(),text:input.value.trim(),ts:Date.now()});
  input.value='';
}
function deleteMading(id){madingRef.child(id).remove();}
function votePoll(id,optIdx){
  const me=myUid();
  madingRef.child(id+'/pollVotes/'+me).set(optIdx);
}

/* ═══ SONG REQUEST ═══ */
let songData={};
let myVotedSongs=JSON.parse(localStorage.getItem('srVotes')||'[]');

songReqRef.orderByChild('votes').limitToLast(20).on('value',snap=>{
  songData={};
  snap.forEach(s=>{songData[s.key]=s.val();});
  renderSongReq();
});

function requestSong(){
  const inp=document.getElementById('srSongInput');
  const song=inp.value.trim();
  if(!song) return;
  songReqRef.push({song,reqBy:myNameStr(),votes:1,voters:{[myUid()]:true},ts:Date.now()});
  inp.value='';
  notifRef.push({msg:`🎵 ${myNameStr()} request lagu: ${song}`,ts:Date.now(),id:Date.now().toString()});
}

function voteForSong(id){
  const me=myUid();
  if(myVotedSongs.includes(id)){
    songReqRef.child(id+'/voters/'+me).remove();
    songReqRef.child(id+'/votes').transaction(v=>(v||1)-1);
    myVotedSongs=myVotedSongs.filter(x=>x!==id);
  } else {
    songReqRef.child(id+'/voters/'+me).set(true);
    songReqRef.child(id+'/votes').transaction(v=>(v||0)+1);
    myVotedSongs.push(id);
  }
  localStorage.setItem('srVotes',JSON.stringify(myVotedSongs));
  renderSongReq();
}

function renderSongReq(){
  const list=document.getElementById('srList');
  if(!list) return;
  const sorted=Object.entries(songData).sort((a,b)=>(b[1].votes||0)-(a[1].votes||0));
  if(!sorted.length){
    list.innerHTML='<div style="text-align:center;padding:1rem;color:rgba(255,255,255,.3);font-size:.82rem">Belum ada request. Mulai request lagu!</div>';
    return;
  }
  list.innerHTML=sorted.map(([id,s],i)=>{
    const voted=(s.voters||{})[myUid()]||myVotedSongs.includes(id);
    return `<div class="sr-item">
      <span class="sr-rank">${i+1}</span>
      <div style="flex:1"><div class="sr-song">${esc2(s.song)}</div><div class="sr-req">req. ${esc2(s.reqBy||'?')}</div></div>
      <button class="sr-vote-btn${voted?' voted':''}" onclick="voteForSong('${id}')">▲</button>
      <span class="sr-votes">${s.votes||0}</span>
    </div>`;
  }).join('');
}

/* ═══ GAME PLAY TRACKING + TAGS ═══ */
gamePlayRef.on('value',snap=>{
  const data=snap.val()||{};
  const games=Object.entries(data).sort((a,b)=>b[1]-a[1]);
  // Most played = Recommended
  if(games.length>0){
    const topId=games[0][0].replace(/_/g,'-');
    const topEl=document.getElementById('tag-'+topId);
    if(topEl) topEl.innerHTML='<span class="game-tag game-tag-rec">⭐ RECOMMENDED</span>';
    // Second most = Hot
    if(games.length>1){
      const secId=games[1][0].replace(/_/g,'-');
      const secEl=document.getElementById('tag-'+secId);
      if(secEl&&!secEl.innerHTML.includes('NEW')) secEl.innerHTML='<span class="game-tag game-tag-hot">🔥 HOT</span>';
    }
  }
});

// Track when leaving to a game (clicks on game cards)
document.querySelectorAll('.game-card[data-game]').forEach(card=>{
  card.addEventListener('click',()=>{
    const game=card.dataset.game.replace(/-/g,'_');
    gamePlayRef.child(game).transaction(v=>(v||0)+1);
  });
});

/* ═══ PROFILE AVATAR UPDATE ═══ */
const navProfil=document.getElementById('navProfil');
if(navProfil){
  const av=localStorage.getItem('profileAvatar');
  if(av) navProfil.textContent=av+' Profil';
}
const madAv=document.getElementById('madingAvatarSm');
if(madAv) madAv.textContent=localStorage.getItem('profileAvatar')||'👤';

// Update nav profil link with avatar
const navP=document.getElementById('navProfil');
if(navP){
  const av=localStorage.getItem('profileAvatar')||'';
  const nm=localStorage.getItem('lbName')||'Profil';
  navP.textContent=(av?av+' ':'')+nm;
}

/* ─── Student Card Bio ─── */
(function() {
  const bioRef = firebase.database().ref('studentBios');
  const biosCache = {};

  // Load all bios from Firebase once
  bioRef.on('value', snap => {
    const data = snap.val() || {};
    Object.entries(data).forEach(([key, val]) => {
      biosCache[key] = val;
      const el = document.getElementById('bio_' + key);
      if (el) renderBio(el, key, val);
    });
  });

  function nameToKey(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  function myName() {
    return localStorage.getItem('lbName') || '';
  }

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

  function esc(t) {
    return String(t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  window.toggleStudentCard = function(card) {
    const wasActive = card.classList.contains('active');
    // Close all others
    document.querySelectorAll('.student-card.active').forEach(c => {
      if (c !== card) c.classList.remove('active');
    });
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
    if (inp) {
      inp.focus();
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') saveBio(e, key); });
    }
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
