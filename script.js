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
        <div class="msg-text">${escapeHtml(msg.text)}</div>
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
