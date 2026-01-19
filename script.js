// ==========================================
// SCRIPT DIAGNOSA & PEMUTAR RADIO
// ==========================================

// ID Zeno Anda
const STATION_ID = "x1wrh2y4jj6uv"; 

const audio = document.getElementById('audioRadio');
const btn = document.getElementById('btnPlay');
const imgArt = document.getElementById('trackArt');
const txtTitle = document.getElementById('judul');
const txtArtist = document.getElementById('penyanyi');
const volSlider = document.getElementById('volumeSlider');
const listRecent = document.getElementById('recentList');

// --- FUNGSI LOG KE LAYAR (Supaya Anda Tahu Masalahnya) ---
function logStatus(pesan, warna = "white") {
    console.log("[RADIO LOG]: " + pesan);
    // Jika masih status connecting, tampilkan pesan error/status di judul
    if (txtTitle.innerText === "Menghubungkan..." || 
        txtTitle.innerText.includes("Status:") || 
        pesan.includes("GAGAL")) {
        
        txtTitle.innerText = pesan;
        txtTitle.style.color = warna;
    }
}

// --- 1. KONEKSI DATA (METADATA) ---
function connectMetadata() {
    logStatus("Status: Menghubungi Server Zeno...", "yellow");

    const apiURL = `https://api.zeno.fm/mounts/metadata/subscribe/${x1wrh2y4jj6uv}`;

    if (window.zenoSource) window.zenoSource.close();
    
    window.zenoSource = new EventSource(apiURL);

    // KONEKSI BERHASIL TERSAMBUNG
    window.zenoSource.onopen = () => {
        logStatus("Status: Terhubung! Menunggu Lagu...", "#1db954");
    };

    // MENERIMA DATA
    window.zenoSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log("DATA MENTAH DARI ZENO:", data); // Cek Console (F12)

            // Coba ambil judul dari berbagai kemungkinan field
            let raw = "";
            if (data.stream_info) {
                raw = data.stream_info.title || data.stream_info.now_playing;
            } else if (data.title) {
                raw = data.title;
            }

            if (raw) {
                // KEMBALIKAN WARNA TEKS JADI NORMAL
                txtTitle.style.color = "#1db954"; 
                updateDisplay(raw);
            } else {
                logStatus("Status: Musik Main, Tapi Data Kosong", "orange");
            }
        } catch (e) {
            logStatus("Status: Data Rusak (JSON Error)", "red");
        }
    };

    // KONEKSI ERROR / DIBLOKIR
    window.zenoSource.onerror = (err) => {
        logStatus("Status: KONEKSI DIBLOKIR BROWSER!", "red");
        txtArtist.innerText = "Matikan 'Tracking Prevention' di Browser";
        console.error("EventSource Error:", err);
        
        // Coba sambung ulang dalam 5 detik
        setTimeout(connectMetadata, 5000);
    };
}

// --- 2. TAMPILKAN KE LAYAR ---
function updateDisplay(raw) {
    // Cek apakah data baru atau lagu lama
    if (txtTitle.innerText === raw || (raw.includes(" - ") && txtTitle.innerText === raw.split(" - ")[1])) {
        return; // Jangan refresh gambar kalau lagunya sama
    }

    let artist = "Endless For Beacon FM";
    let title = raw;

    // Pisahkan Artis - Judul
    if (raw.includes(" - ")) {
        const parts = raw.split(" - ");
        artist = parts[0].trim();
        title = parts.slice(1).join(" - ").trim();
    }

    txtArtist.innerText = artist;
    txtTitle.innerText = title;

    // Ambil Gambar
    fetchArtwork(artist, title);
    
    // Masukkan ke History
    addToHistory(artist, title);
}

// --- 3. AMBIL GAMBAR (iTunes) ---
async function fetchArtwork(artist, title) {
    // Jika Live Talkshow (bukan lagu), pakai logo
    if (artist === "Endless For Beacon FM") {
        imgArt.src = "Image/logo.png";
        return;
    }

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

// --- 4. RIWAYAT LAGU ---
function addToHistory(artist, title) {
    const li = document.createElement('li');
    li.className = 'recent-item';
    li.innerHTML = `<span class="r-title">${title}</span><span class="r-artist">${artist}</span>`;
    
    // Masukkan ke paling atas
    listRecent.insertBefore(li, listRecent.firstChild);
    
    // Hapus jika lebih dari 5
    if (listRecent.children.length > 5) listRecent.removeChild(listRecent.lastChild);
    
    // Hapus pesan kosong
    const msg = listRecent.querySelector('.empty-msg');
    if (msg) msg.remove();
}

// --- 5. PLAYER CONTROLLER ---
btn.addEventListener('click', () => {
    if (audio.paused) {
        audio.play();
        btn.innerHTML = '<i class="fas fa-stop"></i> <span>BERHENTI</span>';
        btn.style.background = "#ff4d4d";
    } else {
        audio.pause();
        // Reload source agar buffer bersih saat play lagi
        const src = audio.firstElementChild.src;
        audio.innerHTML = "";
        audio.innerHTML = `<source src="${src}" type="audio/mpeg">`;
        
        btn.innerHTML = '<i class="fas fa-play"></i> <span>PUTAR RADIO</span>';
        btn.style.background = "#1db954";
    }
});

volSlider.oninput = (e) => { audio.volume = e.target.value; };

// Jalankan Script
connectMetadata();