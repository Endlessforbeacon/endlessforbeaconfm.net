// STATION_ID Anda sudah benar
const STATION_ID = "x1wrh2y4jj6uv"; 

const audio = document.getElementById('audioRadio');
const btn = document.getElementById('btnPlay');
const imgArt = document.getElementById('trackArt');
const txtTitle = document.getElementById('judul');
const txtArtist = document.getElementById('penyanyi');
const volSlider = document.getElementById('volumeSlider');
const listRecent = document.getElementById('recentList');

let historySongs = [];

// ==========================================
// 1. FUNGSI METADATA (VERSI REVISI TOTAL)
// ==========================================
function connectMetadata() {
    // Menambahkan parameter cache-buster agar data selalu segar
    const apiURL = `https://api.zeno.fm/mounts/metadata/subscribe/${x1wrh2y4jj6uv}?_=${Date.now()}`;
    
    // Menutup koneksi lama jika ada
    if (window.zenoSource) {
        window.zenoSource.close();
    }

    window.zenoSource = new EventSource(apiURL);

    window.zenoSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            // Mengambil field yang tepat dari struktur JSON Zeno
            const rawMetadata = data.stream_info.now_playing || data.stream_info.title;

            if (rawMetadata) {
                processMetadata(rawMetadata);
            }
        } catch (e) {
            console.error("JSON Parsing Error", e);
        }
    };

    window.zenoSource.onerror = (err) => {
        console.warn("Koneksi Metadata Terputus, Mencoba lagi...");
        window.zenoSource.close();
        setTimeout(connectMetadata, 5000); 
    };
}

function processMetadata(raw) {
    let artist, title;

    // Logika Auto-Split Aman
    if (raw.includes(" - ")) {
        const parts = raw.split(" - ");
        artist = parts[0].trim();
        title = parts.slice(1).join(" - ").trim();
    } else {
        artist = "Radio Live";
        title = raw.trim();
    }

    // Update Tampilan
    txtArtist.innerText = artist;
    txtTitle.innerText = title;

    // Update Playlist & Artwork
    if (historySongs.length === 0 || historySongs[0] !== raw) {
        updatePlaylist(artist, title, raw);
        fetchArtwork(artist, title);
    }
}

// ==========================================
// 2. FUNGSI ARTWORK (ITUNES)
// ==========================================
async function fetchArtwork(artist, title) {
    const cleanArtist = artist.replace(/\(.*\)|\[.*\]|feat\..*|&.*/gi, "").trim();
    const cleanTitle = title.replace(/\(.*\)|\[.*\]|feat\..*|&.*/gi, "").trim();

    try {
        const query = encodeURIComponent(`${cleanArtist} ${cleanTitle}`);
        const res = await fetch(`https://itunes.apple.com/search?term=${query}&limit=1&entity=song`);
        const json = await res.json();

        if (json.results && json.results.length > 0) {
            const img = json.results[0].artworkUrl100.replace('100x100', '600x600');
            imgArt.src = img;
        } else {
            imgArt.src = "https://via.placeholder.com/300?text=RADIO+LIVE";
        }
    } catch (e) {
        imgArt.src = "https://via.placeholder.com/300?text=RADIO+LIVE";
    }
}

// ==========================================
// 3. FUNGSI PLAYLIST
// ==========================================
function updatePlaylist(artist, title, full) {
    historySongs.unshift(full);
    if (historySongs.length > 5) historySongs.pop();

    listRecent.innerHTML = "";
    if (historySongs.length <= 1) {
        listRecent.innerHTML = '<li class="empty-msg">Menunggu lagu berikutnya...</li>';
        return;
    }

    for (let i = 1; i < historySongs.length; i++) {
        const p = historySongs[i].split(" - ");
        const li = document.createElement('li');
        li.className = 'recent-item';
        li.innerHTML = `<span class="r-title">${p[1] || historySongs[i]}</span><span class="r-artist">${p[0] || "Radio"}</span>`;
        listRecent.appendChild(li);
    }
}

// ==========================================
// 4. KONTROL AUDIO
// ==========================================
btn.addEventListener('click', () => {
    if (audio.paused) {
        audio.play();
        btn.innerHTML = '<i class="fas fa-stop"></i> <span>BERHENTI</span>';
        btn.style.background = "#ff4d4d";
    } else {
        audio.pause();
        audio.load();
        btn.innerHTML = '<i class="fas fa-play"></i> <span>PUTAR RADIO</span>';
        btn.style.background = "#1db954";
    }
});

volSlider.oninput = (e) => { audio.volume = e.target.value; };

// Jalankan
connectMetadata();