// GANTI DENGAN KODE STREAM ANDA (Contoh link: https://stream.zeno.fm/abcdefg -> kodenya abcdefg)
const STATION_ID = "x1wrh2y4jj6uv"; 

const audio = document.getElementById('audioRadio');
const btn = document.getElementById('btnPlay');
const imgArt = document.getElementById('trackArt');
const txtTitle = document.getElementById('judul');
const txtArtist = document.getElementById('penyanyi');
const volSlider = document.getElementById('volumeSlider');
const listRecent = document.getElementById('recentList');

let historySongs = [];

// 1. KONEKSI METADATA (ZENO)
function connectMetadata() {
    const apiURL = `https://api.zeno.fm/mounts/metadata/subscribe/${x1wrh2y4jj6uv}`;
    const eventSource = new EventSource(apiURL);

    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            const nowPlaying = data.stream_info.now_playing;

            if (nowPlaying && nowPlaying !== "") {
                const parts = nowPlaying.split(" - ");
                const artist = parts[0] ? parts[0].trim() : "Radio Live";
                const title = parts[1] ? parts[1].trim() : "Streaming";

                txtArtist.innerText = artist;
                txtTitle.innerText = title;

                // Update Playlist jika lagu berubah
                if (historySongs.length === 0 || historySongs[0] !== nowPlaying) {
                    updatePlaylist(nowPlaying);
                }

                // Cari Artwork
                fetchArtwork(artist, title);
            }
        } catch (e) {
            console.log("Menunggu data...");
        }
    };

    eventSource.onerror = () => {
        eventSource.close();
        setTimeout(connectMetadata, 5000);
    };
}

// 2. CARI ARTWORK (ITUNES DENGAN PEMBERSIH TEKS)
async function fetchArtwork(artist, title) {
    // Bersihkan teks dari karakter pengganggu
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
            // Jika gagal, cari berdasarkan artis saja
            const resArt = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanArtist)}&limit=1&entity=album`);
            const jsonArt = await resArt.json();
            if (jsonArt.results && jsonArt.results.length > 0) {
                imgArt.src = jsonArt.results[0].artworkUrl100.replace('100x100', '600x600');
            } else {
                imgArt.src = "Image/Cuplikan layar 2026-01-01 184625.png";
            }
        }
    } catch (e) {
        imgArt.src = "Image/Cuplikan layar 2026-01-01 184625.png";
    }
}

// 3. PLAYLIST RIWAYAT
function updatePlaylist(fullText) {
    historySongs.unshift(fullText);
    if (historySongs.length > 5) historySongs.pop();
    renderPlaylist();
}

function renderPlaylist() {
    listRecent.innerHTML = "";
    if (historySongs.length <= 1) {
        listRecent.innerHTML = '<li class="empty-msg">Menunggu lagu berikutnya...</li>';
        return;
    }

    for (let i = 1; i < historySongs.length; i++) {
        const parts = historySongs[i].split(" - ");
        const li = document.createElement('li');
        li.className = 'recent-item';
        li.innerHTML = `
            <span class="r-title">${parts[1] || "Live Broadcast"}</span>
            <span class="r-artist">${parts[0] || "Radio"}</span>
        `;
        listRecent.appendChild(li);
    }
}

// 4. CONTROL (PLAY & VOLUME)
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

// START
connectMetadata();