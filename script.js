// ================= SUNTIK LIBRARY ICECAST METADATA LAYER =================
const liveMetadataScript = document.createElement('script');
liveMetadataScript.src = "https://unpkg.com/icecast-metadata-player/dist/icecast-metadata-player.production.min.js";
document.head.appendChild(liveMetadataScript);

const playBtn = document.getElementById('play-btn');
const volumeSlider = document.getElementById('volume');
const songTitle = document.getElementById('song-title');
const songArtist = document.getElementById('song-artist');
const radioLogo = document.getElementById('radio-logo');

const DEFAULT_LOGO = "Image/Logo.png"; 
let isPlaying = false;
let playerInstance = null;
let lastMetadataTime = 0;

const ZENO_STREAM_URL = "https://stream.zeno.fm/n7qpxnyfrbruv"; 
const ZENO_STREAM_ID = "n7qpxnyfrbruv"; 
const ZENO_AUTODJ_API = `https://corsproxy.io/?${encodeURIComponent('https://api.zeno.fm/web-client/v2/epgs/' + ZENO_STREAM_ID)}`;

const audioStream = document.getElementById('radio-player');
audioStream.src = ZENO_STREAM_URL;

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

async function checkAutoDJStatus() {
    if (Date.now() - lastMetadataTime < 20000) return;
    try {
        const response = await fetch(ZENO_AUTODJ_API);
        const data = await response.json();
        if (data?.v2?.epgs?.length > 0) {
            const autoDJText = data.v2.epgs[0].title;
            if (autoDJText) parseAndDisplayTracks(autoDJText);
        }
    } catch (err) {
        console.log("Sinkronisasi tertunda...");
    }
}
setInterval(checkAutoDJStatus, 15000);

async function getArtworkFromiTunes(artist, title) {
    try {
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artist + " " + title)}&media=music&limit=1`);
        const data = await response.json();
        if (data.resultCount > 0) {
            radioLogo.src = data.results[0].artworkUrl100.replace("100x100bb.jpg", "400x400bb.jpg");
        } else {
            radioLogo.src = DEFAULT_LOGO;
        }
    } catch {
        radioLogo.src = DEFAULT_LOGO;
    }
}

function togglePlayback() {
    if (!playerInstance) {
        if (audioStream.paused) {
            audioStream.load();
            audioStream.play().then(() => { isPlaying = true; playBtn.innerText = "⏸"; });
        } else {
            audioStream.pause(); isPlaying = false; playBtn.innerText = "▶";
        }
        return;
    }
    if (!isPlaying) {
        audioStream.load();
        playerInstance.play();
        isPlaying = true; playBtn.innerText = "⏸";
    } else {
        playerInstance.stop(); isPlaying = false; playBtn.innerText = "▶";
    }
}

playBtn.addEventListener('click', togglePlayback);
volumeSlider.addEventListener('input', () => {
    if (playerInstance?.audioElement) playerInstance.audioElement.volume = volumeSlider.value;
    else audioStream.volume = volumeSlider.value;
});

// ================= DIGI-CLOCK NAVIGASI 3 ZONA WAKTU INDONESIA =================
function updateNavigationClocks() {
    const now = new Date();
    const options = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    
    document.getElementById('nav-clock-wib').innerText = new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'Asia/Jakarta' }).format(now);
    document.getElementById('nav-clock-wita').innerText = new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'Asia/Makassar' }).format(now);
    document.getElementById('nav-clock-wit').innerText = new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'Asia/Jayapura' }).format(now);
}

// ================= COUNTDOWN TIMER 3RD ANNIVERSARY (6 JULI 2026) =================
function initAnniversaryCountdown() {
    const targetDate = new Date("2026-07-06T00:00:00+08:00").getTime();
    setInterval(() => {
        const timeLeft = targetDate - new Date().getTime();
        if (timeLeft <= 0) {
            document.querySelector(".anniversary-badge").innerHTML = "🎉 PRESENTING 🎉";
            document.querySelector(".anniversary-slogan").innerHTML = "HAPPY 3RD ANNIVERSARY ENDLESS FOR BEACON FM!";
            document.querySelector(".countdown-display").innerHTML = "WELCOME TO THE STAND OUT TRIO ERA";
            return;
        }
        document.getElementById("days").textContent = String(Math.floor(timeLeft / 86400000)).padStart(2, '0');
        document.getElementById("hours").textContent = String(Math.floor((timeLeft % 86400000) / 3600000)).padStart(2, '0');
        document.getElementById("minutes").textContent = String(Math.floor((timeLeft % 3600000) / 60000)).padStart(2, '0');
        document.getElementById("seconds").textContent = String(Math.floor((timeLeft % 60000) / 1000)).padStart(2, '0');
    }, 1000);
}

document.addEventListener("DOMContentLoaded", () => {
    new Swiper('.schedule-swiper', {
        loop: true,
        autoplay: { delay: 4500, disableOnInteraction: false },
        pagination: { el: '.swiper-pagination', clickable: true },
        navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
    });
    updateNavigationClocks();
    setInterval(updateNavigationClocks, 1000);
    initAnniversaryCountdown();
    checkAutoDJStatus();
});