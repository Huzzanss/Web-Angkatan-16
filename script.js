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

// Initialize Firebase dan db global
let db = null;
try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  console.log('Firebase initialized successfully.');
} catch (error) {
  console.error('Firebase init error:', error);
  alert('Firebase gak bisa load. Cek koneksi atau config.');
}

// Generate unique ID untuk user anonim (biar bisa track typing)
let userId = localStorage.getItem('chatUserId');
if (!userId) {
  userId = Math.random().toString(36).substr(2, 9);
  localStorage.setItem('chatUserId', userId);
}
console.log('User ID:', userId);

// DOM Elements
const typingIndicator = document.getElementById('typing-indicator');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
console.log('DOM elements:', { typingIndicator, messagesDiv, messageInput, sendBtn });

let isTyping = false;
let typingTimeout;

// Load Messages Real-time
function loadMessages() {
  if (!db) {
    console.log('db not ready, skipping loadMessages');
    return;
  }
  console.log('Loading messages...');
  db.collection('messages').orderBy('timestamp').onSnapshot((snapshot) => {
    console.log('Messages loaded, count:', snapshot.size);
    messagesDiv.innerHTML = '';
    snapshot.forEach((doc) => {
      const data = doc.data();
      const msgDiv = document.createElement('div');
      msgDiv.classList.add('message');
      const time = data.timestamp.toDate().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      msgDiv.textContent = `[${time}] ${data.text}`;
      messagesDiv.appendChild(msgDiv);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }, (error) => {
    console.error('Error loading messages:', error);
    alert('Gagal load pesan: ' + error.message);
  });
}

// Load Typing Indicator
function loadTypingIndicator() {
  if (!db) {
    console.log('db not ready, skipping loadTypingIndicator');
    return;
  }
  console.log('Loading typing indicator...');
  db.collection('typing').onSnapshot((snapshot) => {
    let someoneTyping = false;
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.isTyping && doc.id !== userId) {
        someoneTyping = true;
      }
    });
    typingIndicator.style.display = someoneTyping ? 'block' : 'none';
  }, (error) => {
    console.error('Error loading typing:', error);
  });
}

// Send Message
sendBtn.addEventListener('click', async (event) => {
  console.log('Send button clicked!');
  event.preventDefault();
  const message = messageInput.value.trim();
  console.log('Message:', message);
  if (message && db) {
    try {
      await db.collection('messages').add({
        text: message,
        timestamp: firebase.firestore.Timestamp.fromDate(new Date())
      });
      messageInput.value = '';
      stopTyping();
      console.log('Message sent.');
    } catch (error) {
      console.error('Error sending:', error);
      alert('Gagal kirim: ' + error.message);
    }
  } else {
    console.log('Message empty or db not ready.');
  }
});

// Handle Typing
messageInput.addEventListener('input', () => {
  console.log('Typing...');
  if (!isTyping && db) {
    startTyping();
  }
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(stopTyping, 2000);
});

function startTyping() {
  if (!db) return;
  isTyping = true;
  db.collection('typing').doc(userId).set({ isTyping: true });
}

function stopTyping() {
  if (!db) return;
  isTyping = false;
  db.collection('typing').doc(userId).set({ isTyping: false });
}

// Cleanup
window.addEventListener('beforeunload', () => {
  stopTyping();
});

// Init setelah DOM ready
document.addEventListener('DOMContentLoaded', () => {
  loadMessages();
  loadTypingIndicator();

  // Kode tambahan untuk initial di student cards (opsional)
  const studentCards = document.querySelectorAll('.student-card');
  studentCards.forEach(card => {
    const name = card.querySelector('p').textContent;
    const initial = name.charAt(0).toUpperCase();
    card.querySelector('.initial').textContent = initial;
  });
});
