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
