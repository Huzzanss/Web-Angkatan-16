// Smooth scroll untuk navbar links
document.querySelectorAll('#navbar a').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    });
});

// Fungsi untuk generate inisial dari nama siswa
function generateInitial(name) {
    if (name && name.length > 0) {
        return name.charAt(0).toUpperCase();
    }
    return ''; // Jika nama kosong, kosongkan inisial
}

// Auto-generate inisial untuk semua student card saat halaman load
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.student-card').forEach(card => {
        const nameElement = card.querySelector('p');
        const initialElement = card.querySelector('.initial');
        const name = nameElement.textContent.trim();
        initialElement.textContent = generateInitial(name);
    });
});

// Toggle navbar untuk mobile saja (layar <=768px)
if (window.innerWidth <= 768) {
    const navRight = document.querySelector('.nav-right');
    const toggleBtn = document.createElement('button'); // Button hamburger
    toggleBtn.textContent = '☰';
    toggleBtn.style.background = 'none';
    toggleBtn.style.border = 'none';
    toggleBtn.style.color = 'white';
    toggleBtn.style.fontSize = '1.5rem';
    toggleBtn.style.cursor = 'pointer';
    document.querySelector('.nav-left').appendChild(toggleBtn);

    toggleBtn.addEventListener('click', () => {
        navRight.classList.toggle('show');
    });
}

// Firebase Config (Pakai configmu)
const firebaseConfig = {
  apiKey: "AIzaSyBY-wq2_0z8eUe88IOngPls_LpY055Ndyg",
  authDomain: "chat-angkatan-16.firebaseapp.com",
  projectId: "chat-angkatan-16",
  storageBucket: "chat-angkatan-16.firebasestorage.app",
  messagingSenderId: "47699501502",
  appId: "1:47699501502:web:0d09e69d0b3ff39a7359ef"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Generate unique ID untuk user anonim (biar bisa track typing)
let userId = localStorage.getItem('chatUserId');
if (!userId) {
  userId = Math.random().toString(36).substr(2, 9);
  localStorage.setItem('chatUserId', userId);
}

// DOM Elements
const typingIndicator = document.getElementById('typing-indicator');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

let isTyping = false;
let typingTimeout;

// Load Messages Real-time
function loadMessages() {
  db.collection('messages').orderBy('timestamp').onSnapshot((snapshot) => {
    messagesDiv.innerHTML = '';
    snapshot.forEach((doc) => {
      const data = doc.data();
      const msgDiv = document.createElement('div');
      msgDiv.classList.add('message');
      const time = data.timestamp.toDate().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      msgDiv.textContent = `[${time}] ${data.text}`;
      messagesDiv.appendChild(msgDiv);
    });
    // Scroll ke bawah otomatis
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

// Load Typing Indicator
function loadTypingIndicator() {
  db.collection('typing').onSnapshot((snapshot) => {
    let someoneTyping = false;
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.isTyping && doc.id !== userId) {
        someoneTyping = true;
      }
    });
    typingIndicator.style.display = someoneTyping ? 'block' : 'none';
  });
}

// Send Message
sendBtn.addEventListener('click', async () => {
  const message = messageInput.value.trim();
  if (message) {
    try {
      await db.collection('messages').add({
        text: message,
        timestamp: firebase.firestore.Timestamp.fromDate(new Date())
      });
      messageInput.value = '';
      stopTyping(); // Stop typing setelah kirim
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Gagal kirim pesan: ' + error.message);
    }
  }
});

// Handle Typing
messageInput.addEventListener('input', () => {
  if (!isTyping) {
    startTyping();
  }
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(stopTyping, 2000); // Stop typing kalau gak ngetik 2 detik
});

function startTyping() {
  isTyping = true;
  db.collection('typing').doc(userId).set({ isTyping: true });
}

function stopTyping() {
  isTyping = false;
  db.collection('typing').doc(userId).set({ isTyping: false });
}

// Cleanup saat tutup halaman
window.addEventListener('beforeunload', () => {
  stopTyping();
});

// Init
loadMessages();
loadTypingIndicator();

// Kode tambahan untuk initial di student cards (opsional)
document.addEventListener('DOMContentLoaded', () => {
  const studentCards = document.querySelectorAll('.student-card');
  studentCards.forEach(card => {
    const name = card.querySelector('p').textContent;
    const initial = name.charAt(0).toUpperCase();
    card.querySelector('.initial').textContent = initial;
  });
});
