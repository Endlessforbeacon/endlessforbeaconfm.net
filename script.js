// Konfigurasi ID Stasiun
const STATION_ID = "x1wrh2y4jj6uv"; 

const audio = document.getElementById('audioRadio');
const btn = document.getElementById('btnPlay');
const imgArt = document.getElementById('trackArt');
const txtTitle = document.getElementById('judul');
const txtArtist = document.getElementById('penyanyi');
const volSlider = document.getElementById('volumeSlider');
const listRecent = document.getElementById('recentList');

let historySongs = [];
let currentMetadata = "";

// ==========================================
// 1. KONEKSI METADATA (ZENO SSE)
// ==========================================
function connectMetadata() {
    // Gunakan endpoint metadata Zeno
    const apiURL = `https://api.zeno.fm/mounts/metadata/subscribe/${STATION_ID}`;
    
    if (window.zenoSource) {
        window.zenoSource.close();
    }

    window.zenoSource = new EventSource(apiURL);

    window.zenoSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            // Zeno mengirim data dalam stream_info.title atau stream_info.now_playing
            const rawMetadata = data.stream_info.title || data.stream_info.now_playing;

            if (rawMetadata && rawMetadata !== currentMetadata) {
                currentMetadata = rawMetadata;
                processMetadata(rawMetadata);
            }
        } catch (e) {
            console.error("Gagal memproses JSON:", e);
        }
    };

    window.zenoSource.onerror = () => {
        console.warn("Koneksi metadata terputus, mencoba menyambung kembali...");
        window.zenoSource.close();
        setTimeout(connectMetadata, 5000); 
    };
}

// ==========================================
// 2. PROSES TEKS (ARTIS - JUDUL)
// ==========================================
function processMetadata(raw) {
    let artist = "Endless For Beacon FM";
    let title = raw;

    // Pisahkan jika ada tanda " - "
    if (raw.includes(" - ")) {
        const parts = raw.split(" - ");
        artist = parts[0].trim();
        title = parts.slice(1).join(" - ").trim();
    }

    // Update Teks di UI
    txtArtist.innerText = artist;
    txtTitle.innerText = title;

    // Update Playlist Riwayat
    updatePlaylist(artist, title, raw);
    
    // Cari Gambar Album
    fetchArtwork(artist, title);
}

// ==========================================
// 3. CARI GAMBAR (ITUNES API)
// ==========================================
async function fetchArtwork(artist, title) {
    // Bersihkan teks dari karakter yang mengganggu pencarian
    const cleanArtist = artist.replace(/\(.*\)|\[.*\]|feat\..*|&.*/gi, "").trim();
    const cleanTitle = title.replace(/\(.*\)|\[.*\]|feat\..*|&.*/gi, "").trim();

    try {
        const query = encodeURIComponent(`${cleanArtist} ${cleanTitle}`);
        const res = await fetch(`https://itunes.apple.com/search?term=${query}&limit=1&entity=song`);
        const json = await res.json();

        if (json.results && json.results.length > 0) {
            // Ambil gambar kualitas tinggi (600x600)
            const img = json.results[0].artworkUrl100.replace('100x100', '600x600');
            imgArt.src = img;
        } else {
            // Gambar default jika tidak ditemukan
            imgArt.src = "https://via.placeholder.com/600x600?text=RADIO+LIVE";
        }
    } catch (e) {
        imgArt.src = "https://via.placeholder.com/600x600?text=RADIO+LIVE";
    }
}

// ==========================================
// 4. RIWAYAT LAGU (PLAYLIST)
// ==========================================
function updatePlaylist(artist, title, full) {
    // Tambah ke riwayat jika belum ada
    if (historySongs[0] !== full) {
        historySongs.unshift(full);
        if (historySongs.length > 6) historySongs.pop();
    }

    listRecent.innerHTML = "";
    
    // Tampilkan lagu ke-2 dst (lagu sebelumnya)
    if (historySongs.length <= 1) {
        listRecent.innerHTML = '<li class="empty-msg">Menunggu lagu berikutnya...</li>';
        return;
    }

    for (let i = 1; i < historySongs.length; i++) {
        const p = historySongs[i].split(" - ");
        const li = document.createElement('li');
        li.className = 'recent-item';
        li.innerHTML = `
            <span class="r-title">${p[1] || historySongs[i]}</span>
            <span class="r-artist">${p[0] || "Endless Radio"}</span>
        `;
        listRecent.appendChild(li);
    }
}

// ==========================================
// 5. KONTROL TOMBOL & VOLUME
// ==========================================
btn.addEventListener('click', () => {
    if (audio.paused) {
        audio.play().catch(e => console.error("Gagal memutar:", e));
        btn.innerHTML = '<i class="fas fa-stop"></i> <span>BERHENTI</span>';
        btn.style.background = "#ff4d4d";
    } else {
        audio.pause();
        audio.load(); // Reset buffer agar saat play lagi tidak delay
        btn.innerHTML = '<i class="fas fa-play"></i> <span>PUTAR RADIO</span>';
        btn.style.background = "#1db954";
    }
});

volSlider.oninput = (e) => { 
    audio.volume = e.target.value; 
};

// Jalankan sistem saat halaman siap
connectMetadata();