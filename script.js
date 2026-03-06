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
  // custom
  'puji','arthur','artur','arhtur','fuji','tanto','anwar','edi','edy','ade','yudi','doni','rudy','rudi',
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
