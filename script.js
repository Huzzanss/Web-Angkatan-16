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

// Firebase Config (Ganti dengan configmu!)
const firebaseConfig = {
  apiKey: "AIzaSyBY-wq2_0z8eUe88IOngPls_LpY055Ndyg",
  authDomain: "chat-angkatan-16.firebaseapp.com",
  projectId: "chat-angkatan-16",
  storageBucket: "chat-angkatan-16.firebasestorage.app",
  messagingSenderId: "47699501502",
  appId: "1:47699501502:web:0d09e69d0b3ff39a7359ef"
};

// Initialize Firebase
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements untuk Chat
const authChat = document.getElementById('auth-chat');
const chatRoom = document.getElementById('chat-room');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const logoutBtn = document.getElementById('logoutBtn');

// Auth State Listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    authChat.style.display = 'none';
    chatRoom.style.display = 'block';
    loadMessages();
  } else {
    authChat.style.display = 'block';
    chatRoom.style.display = 'none';
  }
});

// Login
loginBtn.addEventListener('click', () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  signInWithEmailAndPassword(auth, email, password)
    .catch((error) => alert('Error: ' + error.message));
});

// Register
registerBtn.addEventListener('click', () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  createUserWithEmailAndPassword(auth, email, password)
    .then(() => alert('Registrasi berhasil! Sekarang login.'))
    .catch((error) => alert('Error: ' + error.message));
});

// Logout
logoutBtn.addEventListener('click', () => {
  signOut(auth);
});

// Send Message
sendBtn.addEventListener('click', async () => {
  const message = messageInput.value;
  if (message.trim()) {
    await addDoc(collection(db, 'messages'), {
      text: message,
      timestamp: new Date(),
      user: auth.currentUser.email
    });
    messageInput.value = '';
  }
});

// Load Messages Real-time
function loadMessages() {
  const q = query(collection(db, 'messages'), orderBy('timestamp'));
  onSnapshot(q, (snapshot) => {
    messagesDiv.innerHTML = '';
    snapshot.forEach((doc) => {
      const data = doc.data();
      const msgDiv = document.createElement('div');
      msgDiv.classList.add('message');
      msgDiv.textContent = `${data.user}: ${data.text}`;
      messagesDiv.appendChild(msgDiv);
    });
  });
}

// Kode tambahan untuk initial di student cards (opsional, kalau mau isi otomatis)
document.addEventListener('DOMContentLoaded', () => {
  const studentCards = document.querySelectorAll('.student-card');
  studentCards.forEach(card => {
    const name = card.querySelector('p').textContent;
    const initial = name.charAt(0).toUpperCase();
    card.querySelector('.initial').textContent = initial;
  });
});
