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

// Firebase
const firebaseConfig={
  apiKey:"AIzaSyBY-wq2_0z8eUe88IOngPls_LpY055Ndyg",
  authDomain:"chat-angkatan-16.firebaseapp.com",
  projectId:"chat-angkatan-16",
  storageBucket:"chat-angkatan-16.appspot.com",
  messagingSenderId:"47699501502",
  appId:"1:47699501502:web:0d09e69d0b3ff39a7359ef"
};
firebase.initializeApp(firebaseConfig);
const db=firebase.firestore();

// User anonim
let userId=localStorage.getItem('chatUserId')||Math.random().toString(36).substr(2,9);
localStorage.setItem('chatUserId',userId);

// Chat DOM
const messagesDiv=document.getElementById('messages');
const messageInput=document.getElementById('messageInput');
const sendBtn=document.getElementById('sendBtn');
const typingIndicator=document.getElementById('typing-indicator');
let isTyping=false,typingTimeout;

// Send message
sendBtn.addEventListener('click', async ()=>{
  const text=messageInput.value.trim();
  if(!text) return;
  await db.collection('messages').add({
    userId,text,timestamp:firebase.firestore.Timestamp.now()
  });
  messageInput.value='';
  stopTyping();
});

// Typing
messageInput.addEventListener('input',()=>{
  if(!isTyping) startTyping();
  clearTimeout(typingTimeout);
  typingTimeout=setTimeout(stopTyping,2000);
});

function startTyping(){isTyping=true;db.collection('typing').doc(userId).set({isTyping:true});}
function stopTyping(){isTyping=false;db.collection('typing').doc(userId).set({isTyping:false});}

// Load messages realtime
db.collection('messages').orderBy('timestamp').onSnapshot(snapshot=>{
  messagesDiv.innerHTML='';
  snapshot.forEach(doc=>{
    const d=doc.data();
    const div=document.createElement('div');
    div.className='message';
    const time=d.timestamp.toDate().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    const userLabel=d.userId===userId?'Saya':'Anonim';
    div.textContent=`[${time}] ${userLabel}: ${d.text}`;
    messagesDiv.appendChild(div);
  });
  messagesDiv.scrollTop=messagesDiv.scrollHeight;
});

// Typing indicator realtime
db.collection('typing').onSnapshot(snapshot=>{
  let someoneTyping=false;
  snapshot.forEach(doc=>{if(doc.id!==userId&&doc.data().isTyping) someoneTyping=true;});
  typingIndicator.style.display=someoneTyping?'block':'none';
});

// Cleanup
window.addEventListener('beforeunload', stopTyping);
