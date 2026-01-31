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

// Opsional: Jika nama siswa diubah secara dinamis (misal via input), update inisial otomatis
// Contoh: Jika ada input untuk edit nama, panggil generateInitial lagi
