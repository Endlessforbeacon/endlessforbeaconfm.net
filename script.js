/**
 * BEACON FM - REAL-TIME ENGINE (NON-FIREBASE VERSION)
 * 1. Zeno.fm API + iTunes Search API (Metadata Judul, Penyanyi & Artwork HD)
 * 2. WhatsApp Integration (Request Direct Studio)
 * 3. Web Audio API (Live Audio Visualizer)
 * 4. Local Live Chat Simulation
 * 5. Automatic Schedule Tracker & 3 Timezones Indonesian Clock
 */

// Key Mount Stream Zeno.fm
const ZENO_STREAM_KEY = "f32w3ebmk8zuv"; 
const ZENO_API_URL = `https://api.zeno.fm/v2/m3u/mounts/${ZENO_STREAM_KEY}/nowplaying`;

// Nomor WhatsApp Studio Radio (Format tanpa + atau spasi)
const RADIO_WA_NUMBER = "6282192775899"; 

// Global States
let currentUser = null;
let audioContext, audioAnalyser, audioSource;
let currentProgramName = "";
let lastTrackKey = "";

document.addEventListener('DOMContentLoaded', () => {
    initZenoMetadataEngine();
    initLocalChat();
    initAudioPlayerAndVisualizer();
    initRealTimeSchedule();
    initRealTimeClocks();
    initRealTimeQuiz();
});

/* ==========================================================================
   1. REAL-TIME METADATA ENGINE (PERBAIKAN CORS & ITUNES COVER ART API)
   ========================================================================== */
function initZenoMetadataEngine() {
    fetchNowPlayingData();
    // Ulangi pengecekan metadata setiap 10 detik
    setInterval(fetchNowPlayingData, 10000);
}

async function fetchNowPlayingData() {
    const titleEl = document.getElementById('track-title');
    const artistEl = document.getElementById('track-artist');

    // Menggunakan Proxy AllOrigins untuk menghindari kendala CORS
    const targetUrl = encodeURIComponent(ZENO_API_URL);
    const proxyUrl = `https://api.allorigins.win/raw?url=${targetUrl}`;

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error("Gagal mengambil data Zeno");
        
        const data = await response.json();
        
        let songTitle = "Beacon FM Stream";
        let artistName = "Beacon FM Network";

        // Parsing data Zeno.fm
        if (data) {
            if (data.title && data.title.trim() !== "") {
                if (data.title.includes(" - ")) {
                    const parts = data.title.split(" - ");
                    artistName = parts[0].trim();
                    songTitle = parts.slice(1).join(" - ").trim();
                } else {
                    songTitle = data.title.trim();
                    artistName = data.artist ? data.artist.trim() : "Beacon FM";
                }
            } else if (data.song) {
                songTitle = data.song;
                artistName = data.artist || "Beacon FM";
            }
        }

        const currentTrackKey = `${artistName}-${songTitle}`;

        // Perbarui tampilan UI jika lagu berganti
        if (currentTrackKey !== lastTrackKey && songTitle !== "Beacon FM Stream") {
            lastTrackKey = currentTrackKey;

            titleEl.textContent = songTitle;
            artistEl.textContent = artistName;

            // Cari Artwork HD via iTunes API
            fetchiTunesArtwork(songTitle, artistName);
        }

    } catch (error) {
        console.warn("Terjadi kendala saat mengambil metadata Zeno:", error);
    }
}

// Pencarian Artwork via iTunes Search API dengan CORS Proxy Fallback
async function fetchiTunesArtwork(title, artist) {
    const artworkEl = document.getElementById('track-artwork');
    const defaultArtwork = 'Image/Logo.png'; // Menyesuaikan logo default di HTML
    
    const query = encodeURIComponent(`${artist} ${title}`);
    const rawItunesUrl = `https://itunes.apple.com/search?term=${query}&media=music&limit=1`;
    const proxyItunesUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rawItunesUrl)}`;

    try {
        const res = await fetch(proxyItunesUrl);
        const data = await res.json();

        if (data.results && data.results.length > 0) {
            // Mengubah ukuran thumbnail menjadi High Definition (600x600 px)
            let artworkUrl = data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
            artworkEl.src = artworkUrl;

            pushToRecentPlaylistLocal({
                title: title,
                artist: artist,
                artwork: artworkUrl
            });
        } else {
            artworkEl.src = defaultArtwork;
            pushToRecentPlaylistLocal({
                title: title,
                artist: artist,
                artwork: defaultArtwork
            });
        }
    } catch (err) {
        console.error("Gagal mengambil artwork iTunes:", err);
        artworkEl.src = defaultArtwork;
    }
}

/* ==========================================================================
   2. LIVE CHAT ENGINE (SIMULASI LOKAL TANPA FIREBASE)
   ========================================================================== */
function initLocalChat() {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatBox = document.getElementById('chat-box');

    // Pesan Awal
    chatBox.innerHTML = `
        <div class="chat-msg">
            <span class="user" style="color:#50b5ff; font-weight:700;">System:</span> 
            <span>Selamat datang di Live Chat Beacon FM! Silakan login untuk mengirim pesan.</span>
        </div>
    `;

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!currentUser) {
            alert("Silakan masuk dengan akun Google terlebih dahulu.");
            return;
        }

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
    
    const imgHtml = avatarUrl 
        ? `<img src="${avatarUrl}" alt="${sender}" style="width:20px; height:20px; border-radius:50%; vertical-align:middle; margin-right:5px;">` 
        : '<i class="fa-solid fa-user" style="margin-right:5px; font-size:0.8rem; color:var(--text-secondary)"></i>';

    msgDiv.innerHTML = `${timeStr}${imgHtml}<span class="user" style="color:#50b5ff; font-weight:700;">${sender}:</span> <span>${text}</span>`;
    
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

/* ==========================================================================
   3. AUDIO PLAYER & VISUALIZER (Web Audio API)
   ========================================================================== */
const audio = document.getElementById('audio-stream');
const btnPlayPause = document.getElementById('btn-play-pause');
const playIcon = document.getElementById('play-icon');
const volumeSlider = document.getElementById('volume-slider');
const volumeIcon = document.getElementById('volume-icon');
const canvas = document.getElementById('visualizer');
const canvasCtx = canvas.getContext('2d');

function initAudioPlayerAndVisualizer() {
    let isPlaying = false;
    let lastVolume = 0.8;

    // 1. Izinkan Akses Cross-Origin untuk Stream Zeno
    audio.crossOrigin = "anonymous";

    // 2. Set Volume Awal Audio Sesuai Nilai Slider
    if (volumeSlider) {
        audio.volume = parseFloat(volumeSlider.value);
    }

    // 3. Kontrol Play / Pause
    btnPlayPause.addEventListener('click', () => {
        // Inisialisasi AudioContext pada klik pertama pengguna
        if (!audioContext) {
            setupAudioVisualizer();
        }

        // Pastikan AudioContext Aktif (Mencegah Audio Suspended)
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }

        if (!isPlaying) {
            // Reload stream agar mendapatkan buffer paling realtime saat tombol play ditekan
            audio.load(); 
            audio.play().then(() => {
                isPlaying = true;
                playIcon.className = 'fa-solid fa-pause';
            }).catch(err => {
                console.error("Gagal memutar audio:", err);
                alert("Gagal memutar audio. Pastikan koneksi internet stabil atau coba muat ulang halaman.");
            });
        } else {
            audio.pause();
            isPlaying = false;
            playIcon.className = 'fa-solid fa-play';
        }
    });

    // 4. Kontrol Volume Slider
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            audio.volume = val;
            updateVolumeIcon(val);
        });
    }

    // 5. Fitur Klik Ikon Volume (Mute / Unmute)
    if (volumeIcon) {
        volumeIcon.style.cursor = 'pointer';
        volumeIcon.addEventListener('click', () => {
            if (audio.volume > 0) {
                lastVolume = audio.volume;
                audio.volume = 0;
                volumeSlider.value = 0;
                updateVolumeIcon(0);
            } else {
                audio.volume = lastVolume > 0 ? lastVolume : 0.8;
                volumeSlider.value = audio.volume;
                updateVolumeIcon(audio.volume);
            }
        });
    }
}

// Update Ikon Volume Dinamis
function updateVolumeIcon(val) {
    if (!volumeIcon) return;
    if (val === 0) {
        volumeIcon.className = 'fa-solid fa-volume-xmark';
    } else if (val < 0.5) {
        volumeIcon.className = 'fa-solid fa-volume-low';
    } else {
        volumeIcon.className = 'fa-solid fa-volume-high';
    }
}

function setupAudioVisualizer() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioAnalyser = audioContext.createAnalyser();
        audioAnalyser.fftSize = 64;

        // Hubungkan Audio Element ke Analyser dan Destination (Speaker)
        audioSource = audioContext.createMediaElementSource(audio);
        audioSource.connect(audioAnalyser);
        audioAnalyser.connect(audioContext.destination);

        renderVisualizer();
    } catch (e) {
        console.warn("Visualizer tidak dapat berjalan karena batasan CORS browser, namun audio tetap akan diputar normal:", e);
    }
}

function renderVisualizer() {
    requestAnimationFrame(renderVisualizer);
    if (!audioAnalyser) return;

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

/* ==========================================================================
   4. REQUEST LAGU VIA WHATSAPP ENGINE
   ========================================================================== */
function openRequestModal(programName) {
    currentProgramName = programName;
    document.getElementById('target-program-name').textContent = `Program: ${programName}`;
    document.getElementById('modal-request').style.display = 'flex';
    
    if (currentUser && currentUser.name) {
        document.getElementById('req-sender').value = currentUser.name;
    }
}

function closeRequestModal() {
    document.getElementById('modal-request').style.display = 'none';
}

document.getElementById('form-request').addEventListener('submit', (e) => {
    e.preventDefault();

    const sender = document.getElementById('req-sender').value.trim();
    const song = document.getElementById('req-song').value.trim();
    const msg = document.getElementById('req-message').value.trim();

    // Format Pesan WhatsApp
    let textMessage = `*REQUEST LAGU - BEACON FM*\n`;
    textMessage += `-----------------------------------\n`;
    textMessage += `📻 *Program:* ${currentProgramName}\n`;
    textMessage += `👤 *Dari:* ${sender}\n`;
    textMessage += `🎵 *Lagu:* ${song}\n`;
    if (msg) {
        textMessage += `💬 *Pesan:* _"${msg}"_\n`;
    }
    textMessage += `-----------------------------------\n`;
    textMessage += `_Dikirim via Website Beacon FM_`;

    const encodedMessage = encodeURIComponent(textMessage);
    const waUrl = `https://wa.me/${RADIO_WA_NUMBER}?text=${encodedMessage}`;

    window.open(waUrl, '_blank');

    closeRequestModal();
    document.getElementById('req-song').value = '';
    document.getElementById('req-message').value = '';
});

/* ==========================================================================
   5. JADWAL ACARA
   ========================================================================== */
const schedules = [
    { startHour: 6, endHour: 10, title: "Morning Hits & Booster", desc: "Awali hari dengan energi positif.", img: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=200&q=80" },
    { startHour: 10, endHour: 16, title: "Daytime Eco Beat", desc: "Hits terpopuler menemani aktivitas siang.", img: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&q=80" },
    { startHour: 16, endHour: 20, title: "Sore Santai & Request", desc: "Teman perjalanan pulang terfavorit.", img: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&q=80" },
    { startHour: 20, endHour: 24, title: "Night Acoustic & Chill", desc: "Alunan akustik syahdu menjelang malam.", img: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80" }
];

function initRealTimeSchedule() {
    function updateScheduleUI() {
        const currentHour = new Date().getHours();
        const container = document.getElementById('schedule-container');
        container.innerHTML = '';

        schedules.forEach(prog => {
            const isNow = currentHour >= prog.startHour && currentHour < prog.endHour;
            const card = document.createElement('div');
            card.className = `program-card ${isNow ? 'active-program' : ''}`;
            
            card.innerHTML = `
                ${isNow ? '<span class="active-tag">ON AIR NOW</span>' : ''}
                <img src="${prog.img}" alt="${prog.title}" class="program-logo">
                <div class="program-info">
                    <span class="program-time"><i class="fa-regular fa-clock"></i> ${String(prog.startHour).padStart(2,'0')}:00 - ${String(prog.endHour).padStart(2,'0')}:00 WIB</span>
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
    setInterval(updateScheduleUI, 60000);
}

/* ==========================================================================
   6. JAM REAL-TIME 3 ZONA WAKTU INDONESIA
   ========================================================================== */
function initRealTimeClocks() {
    function updateClocks() {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);

        const wib = new Date(utc + (3600000 * 7));
        const wita = new Date(utc + (3600000 * 8));
        const wit = new Date(utc + (3600000 * 9));

        const formatTime = (d) => d.toTimeString().split(' ')[0];

        document.getElementById('clock-wib').textContent = formatTime(wib);
        document.getElementById('clock-wita').textContent = formatTime(wita);
        document.getElementById('clock-wit').textContent = formatTime(wit);
    }

    updateClocks();
    setInterval(updateClocks, 1000);
}

/* ==========================================================================
   7. KUIS INTERAKTIF
   ========================================================================== */
function initRealTimeQuiz() {
    let timeLeft = 15;
    const timerBadge = document.getElementById('quiz-timer-badge');

    const quizData = {
        question: "Grup musik mana yang menyanyikan lagu 'Time Is Running Out'?",
        options: ["Muse", "Linkin Park", "Coldplay", "Green Day"],
        answer: 0
    };

    document.getElementById('quiz-question').textContent = quizData.question;
    const optsEl = document.getElementById('quiz-options');
    optsEl.innerHTML = '';

    quizData.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-btn';
        btn.textContent = `${idx + 1}. ${opt}`;
        btn.onclick = () => submitAnswer(idx === quizData.answer);
        optsEl.appendChild(btn);
    });

    const countdown = setInterval(() => {
        timeLeft--;
        timerBadge.textContent = `00:${String(timeLeft).padStart(2, '0')}`;
        if (timeLeft <= 0) {
            clearInterval(countdown);
            timerBadge.textContent = "HABIS";
            disableQuiz();
        }
    }, 1000);

    function submitAnswer(isCorrect) {
        clearInterval(countdown);
        timerBadge.textContent = "SELESAI";
        const resEl = document.getElementById('quiz-result');
        if (isCorrect) {
            resEl.textContent = "Jawaban Tepat!";
            resEl.style.color = "var(--status-green)";
        } else {
            resEl.textContent = "Salah!";
            resEl.style.color = "var(--accent-color)";
        }
        disableQuiz();
    }

    function disableQuiz() {
        document.querySelectorAll('.quiz-btn').forEach(btn => btn.disabled = true);
    }
}

/* ==========================================================================
   8. GOOGLE SIGN-IN HANDLER
   ========================================================================== */
function parseJwt(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

function handleCredentialResponse(response) {
    const responsePayload = parseJwt(response.credential);
    
    currentUser = {
        uid: responsePayload.sub,
        name: responsePayload.name,
        picture: responsePayload.picture,
        email: responsePayload.email
    };

    document.querySelector('.g_id_signin').style.display = 'none';
    const profileBar = document.getElementById('user-profile');
    document.getElementById('user-avatar').src = currentUser.picture;
    document.getElementById('user-name').textContent = currentUser.name;
    profileBar.style.display = 'flex';

    document.getElementById('chat-input').disabled = false;
    document.getElementById('chat-input').placeholder = "Tulis pesan...";
    document.getElementById('chat-submit').disabled = false;

    document.getElementById('req-sender').value = currentUser.name;
}

function logoutGoogle() {
    currentUser = null;
    document.getElementById('user-profile').style.display = 'none';
    document.querySelector('.g_id_signin').style.display = 'block';
    
    document.getElementById('chat-input').disabled = true;
    document.getElementById('chat-input').placeholder = "Masuk dengan Google untuk chat...";
    document.getElementById('chat-submit').disabled = true;

    document.getElementById('req-sender').value = '';
}