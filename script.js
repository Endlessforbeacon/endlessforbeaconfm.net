// Dapatkan elemen dari HTML
const songTitleEl = document.getElementById('song-title');
const artistNameEl = document.getElementById('artist-name');
const statusText = document.getElementById('status-text');

// ⚠️ URL Status Zeno.FM Anda sudah benar, tidak perlu diubah lagi
const STREAM_STATUS_URL = 'https://api.zeno.fm/api/v2/stations/endless-for-beacon-fm-nasional/status';

// Variabel untuk melacak status sebelumnya
let lastKnownTitle = null;
let lastKnownArtist = null;

// Fungsi untuk mengambil dan memperbarui metadata
const updateNowPlaying = async () => {
    try {
        const response = await fetch(STREAM_STATUS_URL);
        
        // Periksa jika respons tidak berhasil
        if (!response.ok) {
            throw new Error(`Error ${response.status}: Gagal terhubung ke Zeno.FM.`);
        }
        
        const data = await response.json();
        
        const nowPlaying = data.title;
        let currentSongTitle = "Informasi Tidak Tersedia";
        let currentArtistName = "Tidak Diketahui";

        // Periksa apakah data 'title' ada dan tidak kosong
        if (nowPlaying && nowPlaying.trim() !== '') {
            const parts = nowPlaying.split(' - ').map(part => part.trim());
            if (parts.length === 2) {
                currentArtistName = parts[0];
                currentSongTitle = parts[1];
            } else {
                currentSongTitle = nowPlaying;
                currentArtistName = ""; // Tidak ada artis yang terpisah
            }
        } else {
            // Jika 'title' kosong atau tidak ada
            currentSongTitle = "Informasi Tidak Tersedia";
            currentArtistName = "";
        }
        
        // Perbarui tampilan hanya jika ada perubahan
        if (currentSongTitle !== lastKnownTitle || currentArtistName !== lastKnownArtist) {
            songTitleEl.textContent = currentSongTitle;
            artistNameEl.textContent = currentArtistName;
            lastKnownTitle = currentSongTitle;
            lastKnownArtist = currentArtistName;
        }

        statusText.textContent = "Memutar";
        
    } catch (error) {
        console.error("Kesalahan pengambilan metadata:", error);
        songTitleEl.textContent = "Gagal Memuat Informasi";
        artistNameEl.textContent = "Coba Lagi Nanti";
        statusText.textContent = "Tidak Terhubung";
    }
};

// Panggil fungsi saat halaman dimuat
updateNowPlaying();

// Perbarui setiap 10 detik
setInterval(updateNowPlaying, 10000);