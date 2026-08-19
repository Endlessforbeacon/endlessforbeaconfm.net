/**
 * BEACON FM - REAL-TIME ENGINE (MAKASSAR HQ TIME - WITA)
 */

const ZENO_STREAM_KEY = "n7qpxnyfrbruv"; 
const ZENO_STATUS_URL = `https://stream.zeno.fm/status/n7qpxnyfrbruv`;
const RADIO_WA_NUMBER = "6282192775899"; 

let currentUser = null;
let audioContext, audioAnalyser, audioSource;
let currentProgramName = "";
let lastTrackKey = "";

// Array Nama Hari Indonesia
const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/**
 * DATABASE JADWAL ACARA DENGAN PENAMBAHAN HARI TAYANG (days)
 * 0 = Minggu, 1 = Senin, 2 = Selasa, 3 = Rabu, 4 = Kamis, 5 = Jumat, 6 = Sabtu
 */
const schedules = [
    { 
        startHour: 8, 
        endHour: 12, 
        days: [1, 2, 3, 4, 5], // Senin - Jumat
        title: "Morning Brew", 
        desc: "Sebuah Program Utama Di Pagi Hari Yang Akan Memulai pagi kamu dengan asupan semangat yang tepat! Morning Brew hadir nemenin Beacon Listeners Untuk scrolling linimasa, bersiap ke sekolah, kampus, atau ngejar deadline kantor. Disini kita muterin playlist penuh energi, bahas tren pop culture yang lagi viral, info game terbaru, hingga obrolan kocak seputar keseharian. Booster paling pas buat mengubah pagi yang mager jadi penuh ambisi!", 
        img: "Image/Program/Morning Brew.png" 
    },
    { 
        startHour: 17, 
        endHour: 20, 
        days: [1, 2, 3, 4, 5], // Senin - Jumat
        title: "Screen To Sounds", 
        desc: "Program Acara Di Sore Hari Yang Bisa Ubah momen sore kamu jadi lebih sinematik! Program ini pas banget buat nemenin Beacon Listeners yang baru kelar jam sekolah, pulang ngampus, atau selesai beraktivitas. Kita bakal menjelajahi dunia sinema lewat soundtrack film Box Office legendaris, lagu hits dari series yang lagi trending, hingga musik tema game open-world favoritmu. Teman terbaik di kala nongkrong sore atau di tengah kemacetan kota.", 
        img: "Image/Program/Screen To Sounds.png" 
    },
    { 
        startHour: 10, 
        endHour: 19, 
        days: [4], // Setiap Kamis
        title: "Endless For Beacon Throwback", 
        desc: "Ini Dia Program Segmen Andalannya Endless For Beacon FM setiap hari Kamis! Kita bakal muter mesin waktu buat menyajikan lagu-lagu terbaik dari era 90-an Ke Atas, 2000-an, Sampai tahun 2018 ke bawah. Siap-siap Deh Beacon Listeners Bernostalgia total bareng vibe jaman MTV Indonesia, masa kejayaan warnet dan rental PS, sampai memori manis masa sekolah yang penuh cerita. Penuh energi dan sing-along seharian!", 
        img: "Image/Program/Endless For Beacon Throwback.jpeg" 
    },
    { 
        startHour: 7, 
        endHour: 10, 
        days: [0, 6], // Sabtu & Minggu
        title: "Asia Pop 40", 
        desc: "Asia Pop 40 (AP40) adalah program chart countdown radio mingguan regional pertama di Asia yang menghitung mundur 40 lagu terpopuler berdasarkan data streaming platform musik seperti Spotify, Apple Music, TikTok, dan YouTube. Disiarkan melalui stasiun radio mitra di seluruh kawasan Asia-Pasifik, program sindikasi ini menyajikan deretan lagu hits internasional dan lokal Asia, wawancara eksklusif artis global, serta ulasan lagu-lagu rilisan terbaru.", 
        img: "Image/Program/Asia Pop 40.jpg" 
    }
];

document.addEventListener('DOMContentLoaded', () => {
    initZenoStatusEngine();
    initLocalChat();
    initAudioPlayerAndVisualizer();
    initRealTimeSchedule();
    initRealTimeClocks();
    initMobileNav();
});

/* Helper Waktu Makassar (WITA - UTC+8) */
function getMakassarDate() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * 8));
}

function formatDaysText(daysArray) {
    if (daysArray.length === 7) return "Setiap Hari";
    if (JSON.stringify(daysArray) === JSON.stringify([1,2,3,4,5])) return "Senin - Jumat";
    if (JSON.stringify(daysArray) === JSON.stringify([0,6])) return "Sabtu & Minggu";
    return daysArray.map(d => dayNames[d]).join(', ');
}

/* Navigasi Mobile 3 Garis */
function initMobileNav() {
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const navMenu = document.getElementById('nav-menu');

    if (toggleBtn && navMenu) {
        toggleBtn.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });

        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => navMenu.classList.remove('active'));
        });
    }
}

/* 1. STATUS STREAM ZENO & METADATA LAGU */
function initZenoStatusEngine() {
    fetchZenoStatusData();
    setInterval(fetchZenoStatusData, 10000); // Fetch data tiap 10 detik
}

async function fetchZenoStatusData() {
    const titleEl = document.getElementById('track-title');
    const artistEl = document.getElementById('track-artist');
    const listenerEl = document.getElementById('listener-counter');
    
    // Proxy AllOrigins untuk menghindari kendala CORS saat membaca endpoint status
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent('https://stream.zeno.fm/status/n7qpxnyfrbruv')}`;

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error("Gagal mengambil data dari Zeno Status");
        
        const data = await response.json();
        
        // 1. Ekstrak Jumlah Pendengar (Mendukung properti 'listeners' atau 'current_listeners')
        const activeListeners = data.listeners !== undefined ? data.listeners : (data.current_listeners !== undefined ? data.current_listeners : 0);
        if (listenerEl) {
            listenerEl.textContent = activeListeners;
        }

        // 2. Ekstrak Metadata Judul Lagu & Penyanyi (Mendukung 'stream_title', 'title', atau 'song')
        const rawTitle = data.stream_title || data.title || data.song || "";

        let songTitle = "Beacon FM Stream";
        let artistName = "Beacon FM Network";

        if (rawTitle && rawTitle.trim() !== "") {
            if (rawTitle.includes(" - ")) {
                const parts = rawTitle.split(" - ");
                artistName = parts[0].trim();
                songTitle = parts.slice(1).join(" - ").trim();
            } else {
                songTitle = rawTitle.trim();
            }
        }

        // Jika lagu berubah, perbarui DOM & panggil iTunes API untuk mengambil Artwork
        const currentTrackKey = `${artistName}-${songTitle}`;
        if (currentTrackKey !== lastTrackKey && songTitle !== "Beacon FM Stream") {
            lastTrackKey = currentTrackKey;
            titleEl.textContent = songTitle;
            artistEl.textContent = artistName;
            
            // Panggil fungsi pencarian Artwork
            fetchiTunesArtwork(songTitle, artistName);
        }
    } catch (error) {
        console.warn("Kendala mengambil Zeno Status API:", error);
    }
}

/* Pencarian Artwork Album via iTunes API */
async function fetchiTunesArtwork(title, artist) {
    const artworkEl = document.getElementById('track-artwork');
    const defaultArtwork = 'Image/Logo.png';
    const rawItunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(artist + ' ' + title)}&media=music&limit=1`;

    try {
        const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(rawItunesUrl)}`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            // Mengubah resolusi gambar kover menjadi 600x600 px agar jernih
            artworkEl.src = data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
        } else {
            artworkEl.src = defaultArtwork;
        }
    } catch (err) {
        artworkEl.src = defaultArtwork;
    }
}

/* 2. CHAT LOCAL */
function initLocalChat() {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatBox = document.getElementById('chat-box');

    chatBox.innerHTML = `
        <div class="chat-msg">
            <span class="user" style="color:#ff2a5f; font-weight:700;">System:</span> 
            <span>Selamat datang di Live Chat Beacon FM Makassar! Login Google untuk mengobrol.</span>
        </div>`;

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentUser) return alert("Login Google terlebih dahulu.");
        
        const msgText = chatInput.value.trim();
        if (!msgText) return;

        appendChatMessageUI(currentUser.name, msgText, currentUser.picture, new Date().getTime());
        chatInput.value = '';
    });
}

function appendChatMessageUI(sender, text, avatarUrl, timestamp) {
    const chatBox = document.getElementById('chat-box');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg';

    const date = new Date(timestamp);
    const timeStr = `<small style="color:var(--text-secondary); float:right; font-size:0.7rem;">${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}</small>`;
    const imgHtml = avatarUrl ? `<img src="${avatarUrl}" style="width:20px; height:20px; border-radius:50%; vertical-align:middle; margin-right:5px;">` : '';

    msgDiv.innerHTML = `${timeStr}${imgHtml}<span class="user" style="color:#ff2a5f; font-weight:700;">${sender}:</span> <span>${text}</span>`;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

/* 3. AUDIO PLAYER & VISUALIZER */
const audio = document.getElementById('audio-stream');
const btnPlayPause = document.getElementById('btn-play-pause');
const playIcon = document.getElementById('play-icon');
const volumeSlider = document.getElementById('volume-slider');

function initAudioPlayerAndVisualizer() {
    let isPlaying = false;
    audio.crossOrigin = "anonymous";

    if (volumeSlider) audio.volume = parseFloat(volumeSlider.value);

    btnPlayPause.addEventListener('click', () => {
        if (!audioContext) setupAudioVisualizer();
        if (audioContext && audioContext.state === 'suspended') audioContext.resume();

        if (!isPlaying) {
            audio.load();
            audio.play().then(() => {
                isPlaying = true;
                playIcon.className = 'fa-solid fa-pause';
            });
        } else {
            audio.pause();
            isPlaying = false;
            playIcon.className = 'fa-solid fa-play';
        }
    });

    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => audio.volume = parseFloat(e.target.value));
    }
}

function setupAudioVisualizer() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioAnalyser = audioContext.createAnalyser();
        audioAnalyser.fftSize = 64;

        audioSource = audioContext.createMediaElementSource(audio);
        audioSource.connect(audioAnalyser);
        audioAnalyser.connect(audioContext.destination);

        renderVisualizer();
    } catch (e) {
        console.warn("Visualizer Error:", e);
    }
}

function renderVisualizer() {
    requestAnimationFrame(renderVisualizer);
    if (!audioAnalyser) return;

    const canvas = document.getElementById('visualizer');
    const canvasCtx = canvas.getContext('2d');
    const bufferLength = audioAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    audioAnalyser.getByteFrequencyData(dataArray);
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        canvasCtx.fillStyle = '#ff2a5f'; 
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 2;
    }
}

/* 4. JADWAL ACARA REAL-TIME */
function initRealTimeSchedule() {
    function updateScheduleUI() {
        const makassarTime = getMakassarDate();
        const currentHour = makassarTime.getHours();
        const currentDay = makassarTime.getDay();

        const container = document.getElementById('schedule-container');
        container.innerHTML = '';

        schedules.forEach(prog => {
            const isToday = prog.days.includes(currentDay);
            const isTime = currentHour >= prog.startHour && currentHour < prog.endHour;
            const isNow = isToday && isTime;

            const daysFormatted = formatDaysText(prog.days);

            const card = document.createElement('div');
            card.className = `program-card ${isNow ? 'active-program' : ''}`;
            
            card.innerHTML = `
                ${isNow ? '<span class="active-tag"><i class="fa-solid fa-circle" style="font-size:0.5rem;"></i> ON AIR NOW</span>' : ''}
                <img src="${prog.img}" alt="${prog.title}" class="program-logo">
                <div class="program-info">
                    <span class="program-time">
                        <i class="fa-regular fa-clock"></i> ${String(prog.startHour).padStart(2,'0')}:00 - ${String(prog.endHour).padStart(2,'0')}:00 WITA 
                        <span class="program-days">(${daysFormatted})</span>
                    </span>
                    <h3 class="program-title">${prog.title}</h3>
                    <p class="program-desc">${prog.desc}</p>
                    <button class="btn-request" onclick="openRequestModal('${prog.title}')">
                        <i class="fa-brands fa-whatsapp"></i> Request WA
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    updateScheduleUI();
    setInterval(updateScheduleUI, 10000);
}

/* 5. REQUEST WA MODAL */
function openRequestModal(programName) {
    currentProgramName = programName;
    document.getElementById('target-program-name').textContent = `Program: ${programName}`;
    document.getElementById('modal-request').style.display = 'flex';
    if (currentUser && currentUser.name) document.getElementById('req-sender').value = currentUser.name;
}

function closeRequestModal() {
    document.getElementById('modal-request').style.display = 'none';
}

document.getElementById('form-request').addEventListener('submit', (e) => {
    e.preventDefault();
    const sender = document.getElementById('req-sender').value.trim();
    const song = document.getElementById('req-song').value.trim();
    const msg = document.getElementById('req-message').value.trim();

    let textMessage = `*REQUEST LAGU - BEACON FM MAKASSAR*\n-----------------------------------\n🎵 *Program:* ${currentProgramName}\n👤 *Dari:* ${sender}\n🎶 *Lagu:* ${song}\n` + (msg ? `💬 *Pesan:* _"${msg}"_\n` : '') + `-----------------------------------`;

    window.open(`https://wa.me/${RADIO_WA_NUMBER}?text=${encodeURIComponent(textMessage)}`, '_blank');
    closeRequestModal();
});

/* 6. JAM WIB, WITA, WIT */
function initRealTimeClocks() {
    function updateClocks() {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);

        const formatTime = (d) => d.toTimeString().split(' ')[0];
        document.getElementById('clock-wib').textContent = formatTime(new Date(utc + (3600000 * 7)));
        document.getElementById('clock-wita').textContent = formatTime(new Date(utc + (3600000 * 8)));
        document.getElementById('clock-wit').textContent = formatTime(new Date(utc + (3600000 * 9)));
    }
    updateClocks();
    setInterval(updateClocks, 1000);
}

/* 7. GOOGLE AUTH */
function parseJwt(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
}

function handleCredentialResponse(response) {
    const payload = parseJwt(response.credential);
    currentUser = { uid: payload.sub, name: payload.name, picture: payload.picture };

    document.querySelector('.g_id_signin').style.display = 'none';
    const profileBar = document.getElementById('user-profile');
    document.getElementById('user-avatar').src = currentUser.picture;
    document.getElementById('user-name').textContent = currentUser.name;
    profileBar.style.display = 'flex';

    document.getElementById('chat-input').disabled = false;
    document.getElementById('chat-submit').disabled = false;
}

function logoutGoogle() {
    currentUser = null;
    document.getElementById('user-profile').style.display = 'none';
    document.querySelector('.g_id_signin').style.display = 'block';
    document.getElementById('chat-input').disabled = true;
    document.getElementById('chat-submit').disabled = true;
}