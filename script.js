// ================= SUNTIK LIBRARY PEMBACA METADATA STREAMING (MODE LIVE) =================
const liveMetadataScript = document.createElement('script');
liveMetadataScript.src = "https://unpkg.com/icecast-metadata-player/dist/icecast-metadata-player.production.min.js";
document.head.appendChild(liveMetadataScript);

// Deklarasi Elemen DOM Player
const playBtn = document.getElementById('play-btn');
const volumeSlider = document.getElementById('volume');
const songTitle = document.getElementById('song-title');
const songArtist = document.getElementById('song-artist');
const radioLogo = document.getElementById('radio-logo');

const DEFAULT_LOGO = "Image/Logo.png"; 
let isPlaying = false;
let playerInstance = null;
let lastMetadataTime = 0;

// === PENGATURAN KONEKSI STREAMING RADIO ===
const ZENO_STREAM_URL = "https://stream.zeno.fm/n7qpxnyfrbruv"; 
const ZENO_STREAM_ID = "n7qpxnyfrbruv"; 

// API Khusus pembongkar data AutoDJ ZenoFM melalui Proxy Corsproxy.io
const ZENO_AUTODJ_API = `https://corsproxy.io/?${encodeURIComponent('https://api.zeno.fm/web-client/v2/epgs/' + ZENO_STREAM_ID)}`;

// Setup Audio Core HTML5
const audioStream = document.getElementById('radio-player');
audioStream.src = ZENO_STREAM_URL;

// Inisialisasi Hybrid Player saat Library icecast siap
liveMetadataScript.onload = () => {
    playerInstance = new IcecastMetadataPlayer(ZENO_STREAM_URL, {
        onMetadata: (metadata) => {
            if (metadata && metadata.StreamTitle) {
                lastMetadataTime = Date.now(); 
                parseAndDisplayTracks(metadata.StreamTitle);
            }
        },
        audioElement: audioStream
    });
    playerInstance.audioElement.volume = volumeSlider.value;
};

// Fungsi Pemilah Teks Penyanyi - Judul Lagu
function parseAndDisplayTracks(rawText) {
    if (rawText.includes(" - ")) {
        const parts = rawText.split(" - ");
        const artist = parts[0].trim();
        const title = parts[1].trim();

        songTitle.innerText = title;
        songArtist.innerText = artist;
        getArtworkFromiTunes(artist, title);
    } else {
        songTitle.innerText = rawText;
        songArtist.innerText = "Endless For Beacon FM";
        radioLogo.src = DEFAULT_LOGO;
    }
}

// Fungsi Tarik Data AutoDJ (Sebagai Sistem Backup Otomatis)
async function checkAutoDJStatus() {
    if (Date.now() - lastMetadataTime < 20000) return;

    try {
        const response = await fetch(ZENO_AUTODJ_API);
        if (!response.ok) throw new Error();
        const data = await response.json();
        
        if (data && data.v2 && data.v2.epgs && data.v2.epgs.length > 0) {
            const autoDJText = data.v2.epgs[0].title;
            if (autoDJText) {
                parseAndDisplayTracks(autoDJText);
            }
        }
    } catch (err) {
        console.log("Sinkronisasi database AutoDJ tertunda, mencoba kembali...");
    }
}

// Atur penyegaran pengecekan AutoDJ setiap 15 detik sekali
setInterval(checkAutoDJStatus, 15000);

// Fungsi Pencari Gambar Sampul Musik Resmi dari iTunes API Apple
async function getArtworkFromiTunes(artist, title) {
    try {
        const query = encodeURIComponent(`${artist} ${title}`);
        const url = `https://itunes.apple.com/search?term=${query}&media=music&limit=1`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.resultCount > 0) {
            let imgUrl = data.results[0].artworkUrl100;
            imgUrl = imgUrl.replace("100x100bb.jpg", "400x400bb.jpg");
            radioLogo.src = imgUrl;
        } else {
            radioLogo.src = DEFAULT_LOGO;
        }
    } catch (err) {
        radioLogo.src = DEFAULT_LOGO;
    }
}

// Pengendali Alur Play / Pause Player Kapsul
function togglePlayback() {
    if (!playerInstance) {
        if (audioStream.paused) {
            audioStream.load();
            audioStream.play()
                .then(() => {
                    isPlaying = true;
                    playBtn.innerText = "⏸";
                })
                .catch(err => console.log("Gagal memutar audio fallback:", err));
        } else {
            audioStream.pause();
            isPlaying = false;
            playBtn.innerText = "▶";
        }
        return;
    }

    if (!isPlaying) {
        try {
            audioStream.load(); 
            playerInstance.play();
            isPlaying = true;
            playBtn.innerText = "⏸";
            setTimeout(checkAutoDJStatus, 1000);
        } catch (error) {
            console.log("Gagal memutar engine utama, memicu jalur pintas...", error);
            audioStream.play();
            isPlaying = true;
            playBtn.innerText = "⏸";
        }
    } else {
        try {
            playerInstance.stop();
        } catch(e) {
            audioStream.pause();
        }
        isPlaying = false;
        playBtn.innerText = "▶";
    }
}

playBtn.addEventListener('click', togglePlayback);
volumeSlider.addEventListener('input', () => {
    if (playerInstance && playerInstance.audioElement) {
        playerInstance.audioElement.volume = volumeSlider.value;
    } else {
        audioStream.volume = volumeSlider.value;
    }
});

// ================= LOGIKA JAM DIGITAL 3 ZONA WAKTU INDONESIA DI NAVIGASI =================
function updateNavigationClocks() {
    const now = new Date();

    const clockOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };

    // 1. Waktu Indonesia Barat (WIB) -> Asia/Jakarta
    clockOptions.timeZone = 'Asia/Jakarta';
    document.getElementById('nav-clock-wib').innerText = new Intl.DateTimeFormat('en-US', clockOptions).format(now);

    // 2. Waktu Indonesia Tengah (WITA) -> Asia/Makassar
    clockOptions.timeZone = 'Asia/Makassar';
    document.getElementById('nav-clock-wita').innerText = new Intl.DateTimeFormat('en-US', clockOptions).format(now);

    // 3. Waktu Indonesia Timur (WIT) -> Asia/Jayapura
    clockOptions.timeZone = 'Asia/Jayapura';
    document.getElementById('nav-clock-wit').innerText = new Intl.DateTimeFormat('en-US', clockOptions).format(now);
}

// ================= LOGIKA SYSTEM COUNTDOWN ELEMENT 3RD ANNIVERSARY =================
function initAnniversaryCountdown() {
    // Target waktu perayaan: 6 Juli 2026 pukul 07:00:00 WITA (Makassar)
    const targetDate = new Date("2026-07-06T00:00:00+08:00").getTime();

    const runCountdown = setInterval(function() {
        const currentTime = new Date().getTime();
        const timeLeft = targetDate - currentTime;

        // Jika waktu sudah tercapai
        if (timeLeft <= 0) {
            clearInterval(runCountdown);
            document.querySelector(".anniversary-badge").innerHTML = "🎉 PRESENTING 🎉";
            document.querySelector(".anniversary-slogan").innerHTML = "HAPPY 3RD ANNIVERSARY ENDLESS FOR BEACON FM!";
            document.querySelector(".countdown-display").innerHTML = "<div style='font-size: 16px; font-weight: bold; color: #10b981; letter-spacing: 1.5px;'>WELCOME TO THE STAND OUT TRIO ERA</div>";
            return;
        }

        // Kalkulasi waktu Hari, Jam, Menit, Detik
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        // Render nilai ke DOM elemen HTML
        document.getElementById("days").textContent = String(days).padStart(2, '0');
        document.getElementById("hours").textContent = String(hours).padStart(2, '0');
        document.getElementById("minutes").textContent = String(minutes).padStart(2, '0');
        document.getElementById("seconds").textContent = String(seconds).padStart(2, '0');

    }, 1000);
}

// ================= INITIALISASI ENGINE SWIPER CAROUSEL JADWAL =================
document.addEventListener("DOMContentLoaded", () => {
    const swiper = new Swiper('.schedule-swiper', {
        loop: true,               
        grabCursor: true,         
        
        autoplay: {
            delay: 4500,          
            disableOnInteraction: false, 
        },

        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },

        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
    });
    
    // Jalankan sistem jam navigasi langsung, lalu refresh setiap 1 detik
    updateNavigationClocks();
    setInterval(updateNavigationClocks, 1000);

    // Jalankan countdown anniversary
    initAnniversaryCountdown();

    checkAutoDJStatus();
});