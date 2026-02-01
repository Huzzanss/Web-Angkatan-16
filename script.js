// Smooth scroll navbar
document.querySelectorAll('#navbar a').forEach(anchor => {
  anchor.addEventListener('click', e => {
    e.preventDefault();
    document.querySelector(anchor.getAttribute('href')).scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  });
});

// Generate inisial dari nama siswa
function generateInitial(name) {
  return name ? name.charAt(0).toUpperCase() : '';
}
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.student-card').forEach(card => {
    const name = card.querySelector('p').textContent.trim();
    card.querySelector('.initial').textContent = generateInitial(name);
  });
});

// Toggle navbar mobile
if (window.innerWidth <= 768) {
  const navRight = document.querySelector('.nav-right');
  const toggleBtn = document.createElement('button');
  toggleBtn.textContent = '☰';
  toggleBtn.style.cssText = 'background:none;border:none;color:white;font-size:1.5rem;cursor:pointer;';
  document.querySelector('.nav-left').appendChild(toggleBtn);
  toggleBtn.addEventListener('click', () => navRight.classList.toggle('show'));
}

// Firebase config untuk Realtime Database
const firebaseConfig = {
  apiKey: "AIzaSyBY-wq2_0z8eUe88IOngPls_LpY055Ndyg",
  authDomain: "chat-angkatan-16.firebaseapp.com",
  databaseURL: "https://chat-angkatan-16-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "chat-angkatan-16",
  storageBucket: "chat-angkatan-16.appspot.com",
  messagingSenderId: "47699501502",
  appId: "1:47699501502:web:0d09e69d0b3ff39a7359ef"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database(); // pake Realtime DB

// User anonim
let userId = localStorage.getItem('chatUserId') || Math.random().toString(36).substr(2, 9);
localStorage.setItem('chatUserId', userId);

// Chat DOM
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typing-indicator');
let isTyping = false, typingTimeout;

// Send message
sendBtn.addEventListener('click', () => {
  const text = messageInput.value.trim();
  if (!text) return;

  const msg = {
    userId,
    text,
    timestamp: Date.now()
  };
  db.ref('messages').push(msg);
  messageInput.value = '';
  stopTyping();
});

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

// Real-time messages
db.ref('messages').on('value', snapshot => {
  messagesDiv.innerHTML = '';
  const data = snapshot.val() || {};
  Object.values(data).sort((a,b) => a.timestamp - b.timestamp).forEach(msg => {
    const div = document.createElement('div');
    div.className = 'message';
    const time = new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    const userLabel = msg.userId === userId ? 'Saya' : 'Anonim';
    div.textContent = `[${time}] ${userLabel}: ${msg.text}`;
    messagesDiv.appendChild(div);
  });
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// Real-time typing indicator
db.ref('typing').on('value', snapshot => {
  const data = snapshot.val() || {};
  let someoneTyping = false;
  for (const key in data) {
    if (key !== userId && data[key]) someoneTyping = true;
  }
  typingIndicator.style.display = someoneTyping ? 'block' : 'none';
});

// Cleanup on unload
window.addEventListener('beforeunload', stopTyping);
