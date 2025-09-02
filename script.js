// Dapatkan elemen pemutar audio dan elemen status dari HTML
const radioPlayer = document.getElementById('radio-player');
const statusText = document.getElementById('status-text');

// Event listener saat radio mulai memutar
radioPlayer.addEventListener('play', () => {
    statusText.textContent = 'Memutar';
});

// Event listener saat radio dijeda
radioPlayer.addEventListener('pause', () => {
    statusText.textContent = 'Dijeda';
});

// Event listener saat radio sedang buffering (memuat)
radioPlayer.addEventListener('waiting', () => {
    statusText.textContent = 'Memuat...';
});

// Event listener saat radio siap diputar
radioPlayer.addEventListener('canplay', () => {
    // Ini akan memastikan status diatur dengan benar saat radio siap
    if (!radioPlayer.paused) {
        statusText.textContent = 'Memutar';
    } else {
        statusText.textContent = 'Siap Diputar';
    }
});

// Event listener jika terjadi kesalahan
radioPlayer.addEventListener('error', () => {
    statusText.textContent = 'Tidak Terhubung';
});