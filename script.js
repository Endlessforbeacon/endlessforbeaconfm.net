/**
 * BEACON FM - REAL-TIME ENGINE (MAKASSAR HQ TIME - WITA)
 */

const ZENO_STREAM_KEY = "x1wrh2y4jj6uv"; 
const RADIO_WA_NUMBER = "6285257448582"; 
const DEFAULT_LOGO = "Image/Logo.png";

let currentUser = null;
let audioContext, audioAnalyser, audioSource;
let currentProgramName = "";
let lastTrackKey = "";

const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const schedules = [
    { 
        startHour: 8, 
        endHour: 12, 
        days: [1, 2, 3, 4, 5],
        title: "Morning Brew", 
        desc: "Sebuah Program Utama Di Pagi Hari Yang Akan Memulai pagi kamu dengan asupan semangat yang tepat! Morning Brew hadir nemenin Beacon Listeners Untuk scrolling linimasa, bersiap ke sekolah, kampus, atau ngejar deadline kantor.", 
        img: "Image/Program/Morning Brew.png" 
    },
    { 
        startHour: 17, 
        endHour: 20, 
        days: [1, 2, 3, 4, 5],
        title: "Screen To Sounds", 
        desc: "Program Acara Di Sore Hari Yang Bisa Ubah momen sore kamu jadi lebih sinematik! Program ini pas banget buat nemenin Beacon Listeners yang baru kelar jam sekolah, pulang ngampus, atau selesai beraktivitas.", 
        img: "Image/Program/Screen To Sounds.png" 
    },
    { 
        startHour: 10, 
        endHour: 19, 
        days: [4],
        title: "Endless For Beacon Throwback", 
        desc: "Ini Dia Program Segmen Andalannya Endless For Beacon FM setiap hari Kamis! Kita bakal muter mesin waktu buat menyajikan lagu-lagu terbaik dari era 90-an Ke Atas, 2000-an, Sampai tahun 2018 ke bawah.", 
        img: "Image/Program/Endless For Beacon Throwback.jpeg" 
    },
    { 
        startHour: 7, 
        endHour: 10, 
        days: [0, 6],
        title: "Asia Pop 40", 
        desc: "Asia Pop 40 (AP40) adalah program chart countdown radio mingguan regional pertama di Asia yang menghitung mundur 40 lagu terpopuler berdasarkan data streaming platform musik.", 
        img: "Image/Program/Asia Pop 40.jpg" 
    }
];

document.addEventListener('DOMContentLoaded', () => {
    initZenoPublicSSE();
    initLocalChat();
    initAudioPlayerAndVisualizer();
    initRealTimeSchedule();
    initRealTimeClocks();
    initMobileNav();

    // Fallback Gambar Artwork Pecah/Error
    const artworkEl = document.getElementById('track-artwork');
    if (artworkEl) {
        artworkEl.addEventListener('error', () => {
            artworkEl.src = DEFAULT_LOGO;
        });
    }
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

/* Navigasi Mobile */
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

/* 1. MENGAMBIL METADATA & LISTENERS VIA PUBLIC SSE (ZENO PUBLIC API - BEBAS ERROR 401) */
function initZenoPublicSSE() {
    // A. SSE Live Metadata (Judul & Penyanyi)
    const metadataSSEUrl = `https://api.zeno.fm/mounts/metadata/subscribe?streamkey=${x1wrh2y4jj6uv}`;
    const metadataSource = new EventSource(metadataSSEUrl);

    metadataSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.streamTitle) {
                processTrackInfo(data.streamTitle);
            }
        } catch (e) {
            console.error("Gagal parsing metadata SSE:", e);
        }
    };

    metadataSource.onerror = (err) => {
        console.warn("Koneksi metadata SSE terputus, mencoba lagi...", err);
    };

    // B. SSE Live Listeners (Jumlah Pendengar)
    const statsSSEUrl = `https://api.zeno.fm/mounts/stats/subscribe?streamkey=${x1wrh2y4jj6uv}`;
    const statsSource = new EventSource(statsSSEUrl);

    statsSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.listeners !== undefined) {
                const listenerEl = document.getElementById('listener-counter');
                if (listenerEl) listenerEl.textContent = data.listeners;
            }
        } catch (e) {
            console.error("Gagal parsing stats SSE:", e);
        }
    };

    statsSource.onerror = (err) => {
        console.warn("Koneksi stats SSE terputus, mencoba lagi...", err);
    };
}

function processTrackInfo(rawTitle) {
    const titleEl = document.getElementById('track-title');
    const artistEl = document.getElementById('track-artist');

    let songTitle = "Endless For Beacon FM";
    let artistName = "Beacon FM Network";

    if (rawTitle && rawTitle.trim() !== "" && rawTitle !== "undefined - undefined") {
        if (rawTitle.includes(" - ")) {
            const parts = rawTitle.split(" - ");
            artistName = parts[0].trim();
            songTitle = parts.slice(1).join(" - ").trim();
        } else {
            songTitle = rawTitle.trim();
        }
    }

    const currentTrackKey = `${artistName} - ${songTitle}`;
    if (currentTrackKey !== lastTrackKey) {
        lastTrackKey = currentTrackKey;
        if (titleEl) titleEl.textContent = songTitle;
        if (artistEl) artistEl.textContent = artistName;
        
        // Cari Artwork Lagu dari iTunes Search API
        fetchiTunesArtworkDirect(songTitle, artistName);
    }
}

/* Fetch Artwork Lagu dari iTunes Search API */
async function fetchiTunesArtworkDirect(title, artist) {
    const artworkEl = document.getElementById('track-artwork');
    if (!artworkEl) return;

    if (artist === "Beacon FM Network" || title === "Endless For Beacon FM") {
        artworkEl.src = DEFAULT_LOGO;
        return;
    }

    try {
        const query = encodeURIComponent(`${artist} ${title}`);
        const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=song&limit=1`);
        
        if (res.ok) {
            const data = await res.json();
            if (data.results && data.results.length > 0) {
                // Ambil gambar cover HD 600x600 px
                const highResArtwork = data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
                artworkEl.src = highResArtwork;
                return;
            }
        }
    } catch (e) {
        console.warn("Artwork iTunes tidak ditemukan.");
    }

    artworkEl.src = DEFAULT_LOGO;
}

/* 2. CHAT LOCAL */
function initLocalChat() {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatBox = document.getElementById('chat-box');

    if (!chatBox || !chatForm) return;

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
    if (!chatBox) return;

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

    if (volumeSlider && audio) audio.volume = parseFloat(volumeSlider.value);

    if (btnPlayPause && audio) {
        btnPlayPause.addEventListener('click', () => {
            if (!audioContext) setupAudioVisualizer();
            if (audioContext && audioContext.state === 'suspended') audioContext.resume();

            if (!isPlaying) {
                audio.load();
                audio.play().then(() => {
                    isPlaying = true;
                    if (playIcon) playIcon.className = 'fa-solid fa-pause';
                }).catch(err => console.warn("Autoplay / Stream error:", err));
            } else {
                audio.pause();
                isPlaying = false;
                if (playIcon) playIcon.className = 'fa-solid fa-play';
            }
        });
    }

    if (volumeSlider && audio) {
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
        console.warn("Visualizer WebAudio Notice:", e);
    }
}

function renderVisualizer() {
    requestAnimationFrame(renderVisualizer);
    if (!audioAnalyser) return;

    const canvas = document.getElementById('visualizer');
    if (!canvas) return;
    
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
        if (!container) return;
        
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
    const targetEl = document.getElementById('target-program-name');
    const modalEl = document.getElementById('modal-request');
    const senderEl = document.getElementById('req-sender');

    if (targetEl) targetEl.textContent = `Program: ${programName}`;
    if (modalEl) modalEl.style.display = 'flex';
    if (currentUser && currentUser.name && senderEl) senderEl.value = currentUser.name;
}

function closeRequestModal() {
    const modalEl = document.getElementById('modal-request');
    if (modalEl) modalEl.style.display = 'none';
}

const formReq = document.getElementById('form-request');
if (formReq) {
    formReq.addEventListener('submit', (e) => {
        e.preventDefault();
        const sender = document.getElementById('req-sender').value.trim();
        const song = document.getElementById('req-song').value.trim();
        const msg = document.getElementById('req-message').value.trim();

        let textMessage = `*REQUEST LAGU - BEACON FM MAKASSAR*\n-----------------------------------\n📻 *Program:* ${currentProgramName}\n👤 *Dari:* ${sender}\n🎵 *Lagu:* ${song}\n` + (msg ? `💬 *Pesan:* _"${msg}"_\n` : '') + `-----------------------------------`;

        window.open(`https://wa.me/${RADIO_WA_NUMBER}?text=${encodeURIComponent(textMessage)}`, '_blank');
        closeRequestModal();
    });
}

/* 6. JAM WIB, WITA, WIT */
function initRealTimeClocks() {
    function updateClocks() {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);

        const formatTime = (d) => d.toTimeString().split(' ')[0];
        
        const wibEl = document.getElementById('clock-wib');
        const witaEl = document.getElementById('clock-wita');
        const witEl = document.getElementById('clock-wit');

        if (wibEl) wibEl.textContent = formatTime(new Date(utc + (3600000 * 7)));
        if (witaEl) witaEl.textContent = formatTime(new Date(utc + (3600000 * 8)));
        if (witEl) witEl.textContent = formatTime(new Date(utc + (3600000 * 9)));
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

    const gBtn = document.querySelector('.g_id_signin');
    if (gBtn) gBtn.style.display = 'none';

    const profileBar = document.getElementById('user-profile');
    const avatarEl = document.getElementById('user-avatar');
    const nameEl = document.getElementById('user-name');

    if (avatarEl) avatarEl.src = currentUser.picture;
    if (nameEl) nameEl.textContent = currentUser.name;
    if (profileBar) profileBar.style.display = 'flex';

    const inputEl = document.getElementById('chat-input');
    const submitEl = document.getElementById('chat-submit');
    if (inputEl) inputEl.disabled = false;
    if (submitEl) submitEl.disabled = false;
}

function logoutGoogle() {
    currentUser = null;
    const profileBar = document.getElementById('user-profile');
    const gBtn = document.querySelector('.g_id_signin');

    if (profileBar) profileBar.style.display = 'none';
    if (gBtn) gBtn.style.display = 'block';

    const inputEl = document.getElementById('chat-input');
    const submitEl = document.getElementById('chat-submit');
    if (inputEl) inputEl.disabled = true;
    if (submitEl) submitEl.disabled = true;
}