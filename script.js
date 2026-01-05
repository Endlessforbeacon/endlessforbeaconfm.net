/**
 * KONFIGURASI UTAMA
 * Ganti 'KODE_UNIK_ANDA' dengan kode di belakang link streaming Zeno Anda.
 * Contoh: Jika link https://stream.zeno.fm/abc12345, maka STATION_ID = "abc12345"
 */
const STATION_ID = "x1wrh2y4jj6uv"; 

// Mengambil Elemen HTML
const audio = document.getElementById('audioRadio');
const btn = document.getElementById('btnPlay');
const imgArt = document.getElementById('trackArt');
const txtTitle = document.getElementById('judul');
const txtArtist = document.getElementById('penyanyi');
const volSlider = document.getElementById('volumeSlider');
const listRecent = document.getElementById('recentList');

let historySongs = []; // Untuk menyimpan riwayat lagu

// ==========================================
// 1. FUNGSI KONEKSI METADATA (ZENO MEDIA)
// ==========================================
function connectMetadata() {
    const apiURL = `https://api.zeno.fm/mounts/metadata/subscribe/${x1wrh2y4jj6uv}`;
    const eventSource = new EventSource(apiURL);

    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            const rawMetadata = data.stream_info.now_playing;

            if (rawMetadata && rawMetadata !== "") {
                let artistName, songTitle;

                // --- LOGIKA AUTO-SPLIT AMAN ---
                if (rawMetadata.includes(" - ")) {
                    // Jika format standar: "Penyanyi - Judul"
                    const parts = rawMetadata.split(" - ");
                    artistName = parts[0] ? parts[0].trim() : "Unknown Artist";
                    songTitle = parts[1] ? parts[1].trim() : "Unknown Title";
                } else {
                    // Jika format tidak standar (Hanya satu teks)
                    artistName = "Radio Live";
                    songTitle = rawMetadata.trim();
                }

                // Update Teks di Layar
                txtArtist.innerText = artistName;
                txtTitle.innerText = songTitle;

                // Update Playlist jika lagu benar-benar berubah
                if (historySongs.length === 0 || historySongs[0] !== rawMetadata) {
                    updatePlaylist(artistName, songTitle, rawMetadata);
                }

                // Cari Artwork di iTunes
                fetchArtwork(artistName, songTitle);
            }
        } catch (e) {
            console.warn("Sedang menunggu data siaran...");
        }
    };

    eventSource.onerror = () => {
        eventSource.close();
        setTimeout(connectMetadata, 5000); // Reconnect otomatis jika putus
    };
}

// ==========================================
// 2. FUNGSI ARTWORK ITUNES (DENGAN PEMBERSIH)
// ==========================================
async function fetchArtwork(artist, title) {
    // Membersihkan teks dari gangguan agar iTunes lebih akurat
    const cleanArtist = artist.replace(/\(.*\)|\[.*\]|feat\..*|&.*/gi, "").trim();
    const cleanTitle = title.replace(/\(.*\)|\[.*\]|feat\..*|&.*/gi, "").trim();

    try {
        const query = encodeURIComponent(`${cleanArtist} ${cleanTitle}`);
        const response = await fetch(`https://itunes.apple.com/search?term=${query}&limit=1&entity=song`);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            // Berhasil: Ambil gambar 600x600
            const highRes = data.results[0].artworkUrl100.replace('100x100', '600x600');
            imgArt.src = highRes;
        } else {
            // Cadangan: Jika lagu tidak ketemu, cari berdasarkan Artis saja
            const resArtist = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanArtist)}&limit=1&entity=album`);
            const dataArtist = await resArtist.json();
            if (dataArtist.results.length > 0) {
                imgArt.src = dataArtist.results[0].artworkUrl100.replace('100x100', '600x600');
            } else {
                // Default jika semua gagal
                imgArt.src = "https://via.placeholder.com/300?text=RADIO+LIVE";
            }
        }
    } catch (error) {
        imgArt.src = "https://via.placeholder.com/300?text=RADIO+LIVE";
    }
}

// ==========================================
// 3. FUNGSI RECENT SONGS (PLAYLIST)
// ==========================================
function updatePlaylist(artist, title, fullText) {
    historySongs.unshift(fullText);
    if (historySongs.length > 5) historySongs.pop(); // Batasi 5 lagu

    listRecent.innerHTML = ""; // Bersihkan tampilan
    
    // Tampilkan lagu mulai dari index 1 (riwayat lagu sebelumnya)
    if (historySongs.length <= 1) {
        listRecent.innerHTML = '<li class="empty-msg">Menunggu lagu berikutnya...</li>';
        return;
    }

    for (let i = 1; i < historySongs.length; i++) {
        const parts = historySongs[i].split(" - ");
        const li = document.createElement('li');
        li.className = 'recent-item';
        li.innerHTML = `
            <span class="r-title">${parts[1] || historySongs[i]}</span>
            <span class="r-artist">${parts[0] || "Radio"}</span>
        `;
        listRecent.appendChild(li);
    }
}

// ==========================================
// 4. KONTROL AUDIO (PLAY & VOLUME)
// ==========================================
btn.addEventListener('click', () => {
    if (audio.paused) {
        audio.play().catch(e => console.error("Gagal memutar:", e));
        btn.innerHTML = '<i class="fas fa-stop"></i> <span>BERHENTI</span>';
        btn.style.background = "#ff4d4d";
    } else {
        audio.pause();
        audio.load(); // Paksa reload agar streaming tetap LIVE (tidak delay)
        btn.innerHTML = '<i class="fas fa-play"></i> <span>PUTAR RADIO</span>';
        btn.style.background = "#1db954";
    }
});

// Kontrol Volume
volSlider.oninput = (e) => {
    audio.volume = e.target.value;
};

// JALANKAN SAAT HALAMAN DIBUKA
connectMetadata();