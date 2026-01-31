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

// Opsional: Simpan status absen di localStorage (untuk demo)
document.querySelectorAll('.absen-checkbox').forEach(checkbox => {
    const id = checkbox.id;
    const saved = localStorage.getItem(id);
    if (saved === 'true') {
        checkbox.checked = true;
    }
    checkbox.addEventListener('change', () => {
        localStorage.setItem(id, checkbox.checked);
    });
});
