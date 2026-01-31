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

// Opsional: Jika ingin auto-generate inisial dari nama siswa (jika nama diubah secara dinamis)
function generateInitial(name) {
    return name.charAt(0).toUpperCase();
}

// Contoh: Jika nama siswa diubah, update inisial (opsional, hapus jika tidak perlu)
document.querySelectorAll('.student-card p').forEach(p => {
    const name = p.textContent;
    const initialDiv = p.previousElementSibling;
    initialDiv.textContent = generateInitial(name);
});
