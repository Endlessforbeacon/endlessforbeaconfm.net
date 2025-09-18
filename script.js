// Dapatkan elemen-elemen dari HTML
const radioPlayer = document.getElementById('radio-player');
const playPauseBtn = document.getElementById('play-pause-btn');
const statusText = document.getElementById('status-text');
const volumeSlider = document.getElementById('volume-slider');

const songTitleEl = document.getElementById('song-title');
const artistNameEl = document.getElementById('artist-name');

// ⚠️ URL Status Anda belum diganti
const STREAM_STATUS_URL = 'https://api.zeno.fm/api/v2/stations/endless-for-beacon-fm-nasional/status';

// Fungsi untuk mengambil dan memperbarui metadata
const updateNowPlaying = async () => {
    try {
        const response = await fetch(STREAM_STATUS_URL);
        const data = await response.json();
        
        let songTitle = "Informasi Tidak Tersedia";
        let artistName = "Tidak Diketahui";

        // Logic untuk Icecast (versi awal)
        if (data.icestats && data.icestats.source) {
            const source = data.icestats.source;
            if (source.artist && source.title) {
                artistName = source.artist;
                songTitle = source.title;
            } else if (source.title) {
                const parts = source.title.split(' - ');
                if (parts.length === 2) {
                    artistName = parts[0];
                    songTitle = parts[1];
                } else {
                    songTitle = source.title;
                }
            }
        }
        
        songTitleEl.textContent = songTitle;
        artistNameEl.textContent = artistName;
        
    } catch (error) {
        console.error("Gagal mengambil metadata:", error);
        songTitleEl.textContent = "Gagal Memuat Informasi";
        artistNameEl.textContent = "Coba Lagi Nanti";
    }
};

// Kontrol Putar/Jeda
playPauseBtn.addEventListener('click', () => {
    if (radioPlayer.paused) {
        radioPlayer.play();
        playPauseBtn.textContent = 'Jeda';
    } else {
        radioPlayer.pause();
        playPauseBtn.textContent = 'Putar';
    }
});

// Kontrol Volume
radioPlayer.volume = volumeSlider.value;
volumeSlider.addEventListener('input', () => {
    radioPlayer.volume = volumeSlider.value;
});

// Update status pemutaran
radioPlayer.addEventListener('play', () => {
    statusText.textContent = 'Memutar';
});

radioPlayer.addEventListener('pause', () => {
    statusText.textContent = 'Dijeda';
});

radioPlayer.addEventListener('waiting', () => {
    statusText.textContent = 'Memuat...';
});

radioPlayer.addEventListener('error', () => {
    statusText.textContent = 'Tidak Terhubung';
});

// Panggil fungsi saat halaman dimuat
updateNowPlaying();

// Perbarui setiap 10 detik
setInterval(updateNowPlaying, 10000);