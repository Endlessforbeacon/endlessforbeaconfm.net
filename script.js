const STATION_ID = "x1wrh2y4jj6uv"; 
const audio = document.getElementById('audioRadio');
const btn = document.getElementById('btnPlay');
const imgArt = document.getElementById('trackArt');
const txtTitle = document.getElementById('judul');
const txtArtist = document.getElementById('penyanyi');

let currentSong = "";

function connectMetadata() {
    // Menambahkan 'crossorigin' secara teknis di EventSource
    const apiURL = `https://api.zeno.fm/mounts/metadata/subscribe/${STATION_ID}`;
    
    if (window.zenoSource) window.zenoSource.close();
    
    // Membuka koneksi dengan mode aman
    window.zenoSource = new EventSource(apiURL);

    window.zenoSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            const raw = data.stream_info?.title || data.stream_info?.now_playing || data.title;
            
            if (raw && raw !== currentSong) {
                currentSong = raw;
                updateDisplay(raw);
            }
        } catch (e) { 
            console.log("Menerima data, sedang memproses..."); 
        }
    };

    window.zenoSource.onerror = () => {
        console.warn("Koneksi diblokir atau terputus. Mencoba kembali...");
        setTimeout(connectMetadata, 5000);
    };
}

function updateDisplay(raw) {
    let artist = "Endless For Beacon FM";
    let title = raw;

    if (raw.includes(" - ")) {
        const parts = raw.split(" - ");
        artist = parts[0].trim();
        title = parts.slice(1).join(" - ").trim();
    }

    txtArtist.innerText = artist;
    txtTitle.innerText = title;
    fetchArtwork(artist, title);
}

async function fetchArtwork(artist, title) {
    // Jika diblokir, gunakan logo default agar tidak error merah
    const query = encodeURIComponent(`${artist} ${title}`);
    try {
        const res = await fetch(`https://itunes.apple.com/search?term=${query}&limit=1&entity=song`);
        const json = await res.json();
        if (json.results.length > 0) {
            imgArt.src = json.results[0].artworkUrl100.replace('100x100', '600x600');
        } else {
            imgArt.src = "Image/logo.png";
        }
    } catch (e) { 
        imgArt.src = "Image/logo.png"; 
    }
}

btn.addEventListener('click', () => {
    if (audio.paused) {
        audio.play();
        btn.innerHTML = '<i class="fas fa-stop"></i> <span>BERHENTI</span>';
    } else {
        audio.pause();
        btn.innerHTML = '<i class="fas fa-play"></i> <span>PUTAR RADIO</span>';
    }
});

connectMetadata();