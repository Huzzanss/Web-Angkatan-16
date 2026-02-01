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

// Initialize Firebase (Tanpa Auth)
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const nameInputDiv = document.getElementById('name-input');
const chatRoom = document.getElementById('chat-room');
const userNameInput = document.getElementById('userName');
const enterChatBtn = document.getElementById('enterChatBtn');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const changeNameBtn = document.getElementById('changeNameBtn');

let userName = localStorage.getItem('chatUserName') || '';

console.log('Script loaded. userName from localStorage:', userName); // Debug

// Cek jika nama sudah ada di localStorage, langsung masuk chat
if (userName) {
  console.log('Nama ada di localStorage, masuk chat langsung.'); // Debug
  nameInputDiv.style.display = 'none';
  chatRoom.style.display = 'block';
  loadMessages();
}

// Enter Chat
enterChatBtn.addEventListener('click', () => {
  console.log('Enter Chat button clicked.'); // Debug
  userName = userNameInput.value.trim();
  console.log('userName input:', userName); // Debug
  if (userName) {
    localStorage.setItem('chatUserName', userName);
    nameInputDiv.style.display = 'none';
    chatRoom.style.display = 'block';
    console.log('Chat room displayed. Loading messages...'); // Debug
    loadMessages();
  } else {
    alert('Masukkan nama dulu!');
  }
});

// Change Name
changeNameBtn.addEventListener('click', () => {
  localStorage.removeItem('chatUserName');
  userName = '';
  chatRoom.style.display = 'none';
  nameInputDiv.style.display = 'block';
});

// Send Message
sendBtn.addEventListener('click', async () => {
  const message = messageInput.value.trim();
  if (message && userName) {
    try {
      await addDoc(collection(db, 'messages'), {
        text: message,
        timestamp: new Date(),
        user: userName
      });
      messageInput.value = '';
      console.log('Message sent:', message); // Debug
    } catch (error) {
      console.error('Error sending message:', error); // Debug
      alert('Gagal kirim pesan: ' + error.message);
    }
  } else if (!userName) {
    alert('Masukkan nama dulu!');
  }
});

// Load Messages Real-time
function loadMessages() {
  console.log('Loading messages...'); // Debug
  const q = query(collection(db, 'messages'), orderBy('timestamp'));
  onSnapshot(q, (snapshot) => {
    console.log('Snapshot received, docs count:', snapshot.size); // Debug
    messagesDiv.innerHTML = '';
    snapshot.forEach((doc) => {
      const data = doc.data();
      const msgDiv = document.createElement('div');
      msgDiv.classList.add('message');
      msgDiv.textContent = `${data.user}: ${data.text}`;
      messagesDiv.appendChild(msgDiv);
    });
  }, (error) => {
    console.error('Error loading messages:', error); // Debug
    alert('Gagal load pesan: ' + error.message);
  });
}

// Kode tambahan untuk initial di student cards (opsional)
document.addEventListener('DOMContentLoaded', () => {
  const studentCards = document.querySelectorAll('.student-card');
  studentCards.forEach(card => {
    const name = card.querySelector('p').textContent;
    const initial = name.charAt(0).toUpperCase();
    card.querySelector('.initial').textContent = initial;
  });
});
