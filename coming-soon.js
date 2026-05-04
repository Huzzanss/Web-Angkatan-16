/* coming-soon.js — Auto inject Coming Soon overlay on all game pages */
(function(){
  const GAMES = {
    'among-us':    { title:'Among <span>Us</span>',     icon:'🚀', desc:'Temukan impostornya! Selesaikan tugas & jangan dibunuh. Segera hadir dengan tampilan baru.' },
    'billiard':    { title:'Billiard <span>8-Ball</span>',icon:'🎱', desc:'Game billiard 8-ball seru melawan AI atau teman. Sedang dalam pengerjaan.' },
    'catur':       { title:'Catur <span>Chess</span>',   icon:'♟️', desc:'Main catur lawan AI atau teman secara realtime. Segera hadir!' },
    'gambar-bareng':{ title:'Gambar <span>Bareng</span>',icon:'🎨', desc:'Satu orang gambar, yang lain tebak! Mirip Skribbl.io. Coming soon.' },
    'minigolf':    { title:'Mini <span>Golf 3D</span>',  icon:'⛳', desc:'Game golf 3D multiplayer! Masukkan bola dengan pukulan sesedikit mungkin.' },
    'sambung-kata':{ title:'Sambung <span>Kata</span>',  icon:'💬', desc:'Sambung kata dari huruf terakhir — siapa mentok duluan kalah! Segera hadir.' },
    'spy':         { title:'Who Is <span>The Spy?</span>',icon:'🕵️', desc:'Semua dapat kata mirip, satu dapat kata berbeda. Temukan mata-matanya!' },
    'uno':         { title:'UNO <span>Cards</span>',     icon:'🃏', desc:'Game kartu klasik! Habiskan kartumu duluan. Jangan lupa teriak UNO!' },
    'werewolf':    { title:'Were<span>wolf</span>',      icon:'🐺', desc:'Temukan serigala tersembunyi sebelum desa hancur! 8 peran unik.' },
    'leaderboard': null, /* keep leaderboard working */
  };

  /* Detect current page */
  const path  = window.location.pathname.split('/').pop().replace('.html','');
  const game  = GAMES[path];

  /* Not a game page, or leaderboard — skip */
  if(game === undefined || game === null) return;

  function inject(){
    /* Google Fonts — load if not already */
    if(!document.querySelector('link[href*="Playfair"]')){
      const lk = document.createElement('link');
      lk.rel = 'stylesheet';
      lk.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,900;1,700;1,900&family=Lora:ital,wght@0,400;1,400&family=IBM+Plex+Mono:wght@400;700&display=swap';
      document.head.appendChild(lk);
    }

    /* Inject CSS */
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'coming-soon.css';
    document.head.appendChild(cssLink);

    /* Build overlay HTML */
    const overlay = document.createElement('div');
    overlay.className = 'cs-overlay';
    overlay.innerHTML = `
      <div class="cs-frame">
        <span class="cs-corner tl">◆</span>
        <span class="cs-corner tr">◆</span>
        <span class="cs-corner bl">◆</span>
        <span class="cs-corner br">◆</span>

        <span class="cs-rule">── ✦ ──</span>

        <span class="cs-icon">${game.icon}</span>
        <span class="cs-label">Coming Soon</span>
        <h1 class="cs-title">${game.title}</h1>
        <p class="cs-desc">${game.desc}</p>

        <a href="index.html#games-section" class="cs-back">
          ← Kembali ke Games
        </a>

        <div class="cs-dots">
          <div class="cs-dot"></div>
          <div class="cs-dot"></div>
          <div class="cs-dot"></div>
        </div>

        <span class="cs-rule-bot">── Angkatan XVI ──</span>
      </div>
    `;

    /* Replace entire body content, keep overlay on top */
    document.body.innerHTML = '';
    document.body.appendChild(overlay);
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.body.style.background = '#080B05';
    document.title = game.title.replace(/<[^>]+>/g,'') + ' — Coming Soon';
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
