/* layout-retro.js — Sidebar controller */
(function(){
  function init(){
    const navbar = document.getElementById('navbar');
    if(!navbar) return;

    /* ── Inject open button ── */
    const openBtn = document.createElement('button');
    openBtn.id = 'sb-open';
    openBtn.setAttribute('aria-label','Buka menu');
    openBtn.innerHTML = '<span></span><span></span><span></span>';
    document.body.appendChild(openBtn);

    /* ── Inject overlay ── */
    const overlay = document.createElement('div');
    overlay.id = 'sb-overlay';
    document.body.appendChild(overlay);

    /* ── Inject close button inside navbar ── */
    const closeBtn = document.createElement('button');
    closeBtn.id = 'sb-close';
    closeBtn.setAttribute('aria-label','Tutup menu');
    closeBtn.textContent = '✕';
    navbar.appendChild(closeBtn);

    /* ── Convert nav-right links to show properly ── */
    const navRight = navbar.querySelector('.nav-right');
    if(navRight){
      /* Move notif bell into nav-right as a link-style item */
      const bell = document.getElementById('notifBell');
      if(bell && !navRight.contains(bell)){
        navRight.appendChild(bell);
      }
    }

    function openSidebar(){
      navbar.classList.add('open');
      overlay.classList.add('open');
      openBtn.style.display = 'none';
      document.body.style.overflow = 'hidden';
    }
    function closeSidebar(){
      navbar.classList.remove('open');
      overlay.classList.remove('open');
      openBtn.style.display = '';
      document.body.style.overflow = '';
    }

    openBtn.addEventListener('click', openSidebar);
    closeBtn.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);

    /* Close on nav link click (mobile) */
    navbar.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        if(window.innerWidth <= 900) closeSidebar();
      });
    });

    /* Keyboard: Escape closes */
    document.addEventListener('keydown', e => {
      if(e.key === 'Escape') closeSidebar();
    });

    /* Touch swipe left to close */
    let touchStartX = 0;
    navbar.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, {passive:true});
    navbar.addEventListener('touchmove', e => {
      if(e.touches[0].clientX - touchStartX < -60) closeSidebar();
    }, {passive:true});

    /* ── Add vintage ornament labels to nav links ── */
    const navLinks = navbar.querySelectorAll('.nav-right a');
    const labels = {
      'wisuda':'Wisuda','gallery':'Galeri','chat':'Ruang Chat',
      'games':'Arena Games','mading':'Mading','jadwal':'Jadwal',
      'home':'Beranda','leaderboard':'Peringkat',
      'kahayan':'Kahayan','kapuas':'Kapuas','mahakam':'Mahakam'
    };

    /* ── Active link highlight ── */
    const path = window.location.pathname.split('/').pop() || 'index.html';
    const hash = window.location.hash;
    navLinks.forEach(a => {
      const href = a.getAttribute('href') || '';
      if(
        (path && href.includes(path) && path !== 'index.html') ||
        (hash && href === hash) ||
        (path === 'index.html' && href === 'index.html')
      ){
        a.style.color = 'var(--sb-acc)';
        a.style.borderLeftColor = 'var(--sb-acc)';
        a.style.background = 'rgba(148,172,68,.07)';
      }
    });

    /* ── Game page: remove body padding adjustment ── */
    /* On game pages (not index.html), the screens are fixed/fullscreen
       so we don't need sidebar push — but we keep sidebar overlay */
    const isGamePage = ['among-us','billiard','catur','gambar-bareng',
      'minigolf','sambung-kata','spy','uno','werewolf','leaderboard']
      .some(g => path.includes(g));

    if(isGamePage){
      document.body.style.paddingLeft = '0';
      /* Show sidebar as overlay-only on game pages */
      if(window.innerWidth > 900){
        /* Desktop game pages: sidebar is collapsed by default, icon trigger */
        navbar.style.transform = 'translateX(-100%)';
        openBtn.style.display = 'flex';
      }
    }

    /* ── Resize handler ── */
    window.addEventListener('resize', () => {
      if(window.innerWidth > 900 && !isGamePage){
        navbar.classList.remove('open');
        overlay.classList.remove('open');
        openBtn.style.display = 'none';
        document.body.style.overflow = '';
      } else if(window.innerWidth <= 900){
        if(!navbar.classList.contains('open')){
          openBtn.style.display = 'flex';
        }
      }
    });

    /* ── Intercept old toggleMobileNav calls ── */
    window.toggleMobileNav = openSidebar;
    window.closeMobileNav = closeSidebar;
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
