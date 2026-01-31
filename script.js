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

// Opsional: Preview foto saat upload (untuk siswa atau wali)
document.querySelectorAll('.photo-upload').forEach(input => {
    input.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                // Cari img terdekat di card yang sama
                const img = input.previousElementSibling.querySelector('img');
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
});
