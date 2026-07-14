// ==========================================================================
// 1. INTEGRASI LAYER METADATA SIARAN & LIBRARY FIREBASE
// ==========================================================================
const liveMetadataScript = document.createElement('script');
liveMetadataScript.src = "https://unpkg.com/icecast-metadata-player/dist/icecast-metadata-player.production.min.js";
document.head.appendChild(liveMetadataScript);

const firebaseAppScript = document.createElement('script');
firebaseAppScript.src = "https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js";
document.head.appendChild(firebaseAppScript);

const firebaseDbScript = document.createElement('script');
firebaseDbScript.src = "https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js";
document.head.appendChild(firebaseDbScript);

const playBtn = document.getElementById('play-btn');
const volumeSlider = document.getElementById('volume');
const songTitle = document.getElementById('song-title');
const songArtist = document.getElementById('song-artist');
const radioLogo = document.getElementById('radio-logo');

// DATABASE KONFIGURASI CABANG STASIUN
const STATIONS = {
    makassar: {
        name: "Endless For Beacon FM",
        slogan: "The Smile Of The Stand Out For The Radio",
        logo: "Image/Logo.png",
        streamUrl: "https://stream.zeno.fm/n7qpxnyfrbruv",
        streamId: "n7qpxnyfrbruv",
        tagline: "🔴 SIARAN LANGSUNG"
    },
    denpasar: {
        name: "Endless For Beacon FM Denpasar",
        slogan: "The Smile Of The Stand Out For Denpasar",
        logo: "Image/Endless For Beacon FM Denpasar.png",
        streamUrl: "https://stream.zeno.fm/kzizu3f1dlatv", 
        streamId: "kzizu3f1dlatv", 
        tagline: "🔴 SIARAN LANGSUNG - DENPASAR"
    },
    surabaya: {
        name: "Endless For Beacon FM Surabaya",
        slogan: "The Smile Of The Stand Out For Surabaya",
        logo: "Image/Endless For Beacon FM Surabaya.png",
        streamUrl: "https://stream.zeno.fm/xbiqizas5qfvv", 
        streamId: "xbiqizas5qfvv", 
        tagline: "🔴 SIARAN LANGSUNG - SURABAYA"
    }
};

let currentStationKey = "makassar";
const DEFAULT_LOGO = "Image/Logo.png"; 
let isPlaying = false;
let playerInstance = null;
let lastMetadataTime = 0;

let ZENO_STREAM_URL = STATIONS.makassar.streamUrl; 
let ZENO_STREAM_ID = STATIONS.makassar.streamId; 
let ZENO_AUTODJ_API = `https://corsproxy.io/?${encodeURIComponent('https://api.zeno.fm/web-client/v2/epgs/' + ZENO_STREAM_ID)}`;

const audioStream = document.getElementById('radio-player') || document.createElement('audio');
if (!audioStream.id) { audioStream.id = 'radio-player'; document.body.appendChild(audioStream); }
audioStream.src = ZENO_STREAM_URL;

// INISIALISASI PLAYER METADATA ICECAST
function initMetadataPlayer() {
    if (playerInstance) {
        try { playerInstance.stop(); } catch(e){}
    }
    try {
        if (typeof IcecastMetadataPlayer !== 'undefined') {
            playerInstance = new IcecastMetadataPlayer(ZENO_STREAM_URL, {
                onMetadata: (metadata) => { 
                    if (metadata && metadata.StreamTitle) { 
                        lastMetadataTime = Date.now(); 
                        parseAndDisplayTracks(metadata.StreamTitle); 
                    } 
                },
                audioElement: audioStream
            });
            if (volumeSlider) playerInstance.audioElement.volume = volumeSlider.value;
            if (isPlaying) playerInstance.play();
        }
    } catch (e) { console.error("Library Metadata Player error:", e); }
}

liveMetadataScript.onload = () => { initMetadataPlayer(); };

// DYNAMIC SWITCH STATION FUNCTION (SISTEM INTI SWAP ALIRAN AUDIO)
window.switchStation = function(stationKey) {
    if (!STATIONS[stationKey]) return;
    currentStationKey = stationKey;
    
    const target = STATIONS[stationKey];
    ZENO_STREAM_URL = target.streamUrl;
    ZENO_STREAM_ID = target.streamId;
    ZENO_AUTODJ_API = `https://corsproxy.io/?${encodeURIComponent('https://api.zeno.fm/web-client/v2/epgs/' + ZENO_STREAM_ID)}`;
    
    // 1. Update Teks di Head & Player
    document.getElementById("header-station-name").innerText = target.name;
    document.getElementById("header-station-slogan").innerText = target.slogan;
    document.getElementById("header-station-logo").src = target.logo;
    document.getElementById("live-indicator").innerText = target.tagline;
    
    // 2. Update Teks di Footer
    document.getElementById("footer-station-name").innerText = target.name;
    document.getElementById("footer-station-logo").src = target.logo;
    
    // 3. Update Status Tombol Pilihan (Pills)
    document.querySelectorAll(".branch-pill").forEach(pill => pill.classList.remove("active"));
    const activePill = document.getElementById(`pill-${stationKey}`);
    if (activePill) activePill.classList.add("active");
    
    // 4. Set Default Judul Lagu Saat Loading Tukar Aliran
    songTitle.innerText = "Menghubungkan...";
    songArtist.innerText = target.name;
    radioLogo.src = target.logo;
    
    // 5. Swap Source Audio & Re-Init Metadata Player
    audioStream.src = ZENO_STREAM_URL;
    initMetadataPlayer();
    
    // Berikan Efek Toast Pemberitahuan Ke User
    showFeedbackToast(`Tuning ke Endless For Beacon FM ${stationKey.toUpperCase()}`);
};

// ==========================================================================
// 2. KONEKSI & KONFIGURASI FIREBASE REALTIME DATABASE
// ==========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyAQCV0HUrHKrLTs3iCkgLWJReBK8omtb0g",
    authDomain: "endless-for-beacon-fm-dedd2.firebaseapp.com",
    databaseURL: "https://endless-for-beacon-fm-dedd2-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "endless-for-beacon-fm-dedd2",
    storageBucket: "endless-for-beacon-fm-dedd2.firebasestorage.app",
    messagingSenderId: "430104466152",
    appId: "1:430104466152:web:b0ce468f4233f64f246f5d"
};

let database;

firebaseDbScript.onload = () => {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    
    database.ref('live_chats').limitToLast(50).on('child_added', (snapshot) => {
        const data = snapshot.val();
        const savedUser = localStorage.getItem("user_logged_in");
        let isMe = false;
        
        if (savedUser) {
            const currentUser = JSON.parse(savedUser);
            if (currentUser.name === data.username) isMe = true;
        }
        
        appendChatMessage(data.username, data.message, data.avatar, isMe);
    });
};

// ==========================================================================
// 3. ENGINE LIVE CHAT (PURE REAL-TIME VIA FIREBASE)
// ==========================================================================
const chatMessagesContainer = document.getElementById("chat-box-messages");
const chatInputField = document.getElementById("chat-input-field");
const sendChatBtn = document.getElementById("send-chat-btn");

function appendChatMessage(username, messageText, avatar, isMe = false) {
    if (!chatMessagesContainer) return;
    const messageNode = document.createElement("div");
    messageNode.className = isMe ? "chat-msg-row chat-msg-me" : "chat-msg-row";
    messageNode.innerHTML = `
        <img src="${avatar}" alt="Avatar" class="chat-msg-avatar">
        <div class="chat-msg-content-box">
            <span class="chat-msg-username">${username}</span>
            <p class="chat-msg-text">${messageText}</p>
        </div>
    `;
    chatMessagesContainer.appendChild(messageNode);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

function sendLiveChatMessage() {
    if (!chatInputField || !database) return;
    const text = chatInputField.value.trim();
    if (!text) return;
    
    const savedUser = localStorage.getItem("user_logged_in");
    if (savedUser) {
        const userData = JSON.parse(savedUser);
        database.ref('live_chats').push({
            username: userData.name,
            message: text,
            avatar: userData.avatarUrl,
            timestamp: Date.now()
        });
        chatInputField.value = "";
    }
}

if (sendChatBtn) sendChatBtn.addEventListener("click", sendLiveChatMessage);
chatInputField?.addEventListener("keypress", (e) => { if (e.key === "Enter") sendLiveChatMessage(); });

// ==========================================================================
// 4. PEMISAH TEKS & METADATA TRACK SIARAN
// ==========================================================================
function parseAndDisplayTracks(rawText) {
    if (!songTitle || !songArtist) return;
    if (rawText.includes(" - ")) {
        const parts = rawText.split(" - ");
        const artist = parts[0].trim();
        const title = parts[1].trim();
        songTitle.innerText = title;
        songArtist.innerText = artist;
        getArtworkFromiTunes(artist, title);
    } else {
        songTitle.innerText = rawText;
        songArtist.innerText = STATIONS[currentStationKey].name;
        if (radioLogo) radioLogo.src = STATIONS[currentStationKey].logo;
    }
}

async function getArtworkFromiTunes(artist, title) {
    if (!radioLogo) return;
    try {
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artist + " " + title)}&media=music&limit=1`);
        const data = await response.json();
        if (data.resultCount > 0) {
            radioLogo.src = data.results[0].artworkUrl100.replace("100x100bb.jpg", "400x400bb.jpg");
        } else {
            radioLogo.src = STATIONS[currentStationKey].logo;
        }
    } catch (e) { radioLogo.src = STATIONS[currentStationKey].logo; }
}

// ==========================================================================
// 5. ENGINE KUIS INTERAKTIF DATA STATIS
// ==========================================================================
const quizQuestionsDatabase = [
    { q: "Kapan Endless For Beacon FM resmi mengudara pertama kali?", a: ["12 Juli 2023", "13 Juli 2023", "14 Juli 2023", "15 Juli 2023"], correct: 1 },
    { q: "Apa slogan utama dari Endless For Beacon FM?", a: ["The Voice of Generation", "The Smile Of The Stand Out For The Radio", "Music for Your Soul", "Nonstop Hits Station"], correct: 1 },
    { q: "Program acara sore sinematik di Beacon FM adalah...", a: ["Morning Brew", "Night Shift", "Screen To Sounds", "Throwback Thursday"], correct: 2 }
];

let currentQuestionIndex = 0;
const quizActiveArea = document.getElementById("quiz-active-area");

function renderQuizQuestion() {
    if (!quizActiveArea) return;
    const currentData = quizQuestionsDatabase[currentQuestionIndex];
    quizActiveArea.innerHTML = `
        <p class="quiz-question-text">${currentData.q}</p>
        <div class="quiz-options-container">
            ${currentData.a.map((opt, i) => `<button class="quiz-opt-btn" onclick="checkUserQuizAnswer(${i})">${opt}</button>`).join('')}
        </div>
        <p class="quiz-score-notice">Pertanyaan ke ${currentQuestionIndex + 1} dari ${quizQuestionsDatabase.length}</p>
    `;
}

window.checkUserQuizAnswer = function(selectedOptionIndex) {
    const currentData = quizQuestionsDatabase[currentQuestionIndex];
    const buttons = quizActiveArea.querySelectorAll(".quiz-opt-btn");
    
    buttons.forEach((btn, idx) => {
        btn.disabled = true;
        if (idx === currentData.correct) btn.classList.add("correct-ans");
        if (idx === selectedOptionIndex && selectedOptionIndex !== currentData.correct) btn.classList.add("wrong-ans");
    });
    
    setTimeout(() => {
        currentQuestionIndex = (currentQuestionIndex + 1) % quizQuestionsDatabase.length;
        renderQuizQuestion();
    }, 2500);
};

// ==========================================================================
// 6. BACKUP ENGINE JIKA METADATA UTAMA MATI (AUTO DJ BACKUP)
// ==========================================================================
async function checkAutoDJStatus() {
    if (Date.now() - lastMetadataTime < 15000) return;
    try {
        const res = await fetch(ZENO_AUTODJ_API);
        const data = await res.json();
        if (data && data.length > 0 && data[0].title) {
            const track = data[0];
            if (songTitle && songArtist) {
                songTitle.innerText = track.title;
                songArtist.innerText = track.artist || STATIONS[currentStationKey].name;
                if (track.image && radioLogo) radioLogo.src = track.image;
            }
        }
    } catch (e) { console.log("AutoDJ API fallback check."); }
}
setInterval(checkAutoDJStatus, 15000);

// ==========================================================================
// 7. GOOGLE INITIALIZATION OAUTH & MODAL ENGINE
// ==========================================================================
const loginModal = document.getElementById('login-modal');
const closeLoginBtn = document.getElementById('close-login-btn');
const loginMessage = document.getElementById('login-message');
const navbarAuthSection = document.getElementById('navbar-auth-section');

const quizAuthLock = document.getElementById('quiz-auth-lock');
const quizActiveAreaElement = document.getElementById('quiz-active-area');
const chatAuthLock = document.getElementById('chat-auth-lock');
const chatActiveAreaElement = document.getElementById('chat-active-area');

function initGoogleSignIn() {
    if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: "430104466152-t36mki680g22g8i1q6r6beph3skqptp6.apps.googleusercontent.com",
            callback: handleGoogleLoginResponse
        });
        const googleBtnDiv = document.getElementById("google-login-btn");
        if (googleBtnDiv) {
            google.accounts.id.renderButton(googleBtnDiv, { theme: "dark", size: "large", width: "280" });
        }
    }
}

function handleGoogleLoginResponse(response) {
    try {
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        
        const payload = JSON.parse(jsonPayload);
        const userData = { name: payload.name, avatarUrl: payload.picture, email: payload.email };
        
        localStorage.setItem("user_logged_in", JSON.stringify(userData));
        applyUserAuthenticationState(userData);
        closeLoginModal();
        showFeedbackToast("Selamat Datang! Login Berhasil.");
    } catch (e) {
        if (loginMessage) loginMessage.innerText = "Gagal memproses data login. Coba lagi.";
    }
}

function applyUserAuthenticationState(user) {
    if (navbarAuthSection) {
        navbarAuthSection.innerHTML = `
            <div class="user-profile-nav-container">
                <img src="${user.avatarUrl}" alt="Avatar" class="user-avatar-img">
                <span class="user-name-span">${user.name}</span>
                <button class="logout-action-btn" onclick="executeAppLogout()"><i class="fas fa-sign-out-alt"></i></button>
            </div>
        `;
    }
    if (quizAuthLock) quizAuthLock.style.display = "none";
    if (quizActiveAreaElement) quizActiveAreaElement.style.display = "block";
    if (chatAuthLock) chatAuthLock.style.display = "none";
    if (chatActiveAreaElement) chatActiveAreaElement.style.display = "flex";
    
    renderQuizQuestion();
}

window.executeAppLogout = function() {
    localStorage.removeItem("user_logged_in");
    if (navbarAuthSection) {
        navbarAuthSection.innerHTML = `
            <button id="nav-login-btn" class="login-trigger-btn" onclick="openLoginModal()">
                <i class="fas fa-sign-in-alt"></i> <span>Login</span>
            </button>
        `;
    }
    if (quizAuthLock) quizAuthLock.style.display = "flex";
    if (quizActiveAreaElement) quizActiveAreaElement.style.display = "none";
    if (chatAuthLock) chatAuthLock.style.display = "flex";
    if (chatActiveAreaElement) chatActiveAreaElement.style.display = "none";
    showFeedbackToast("Anda telah keluar dari aplikasi.");
};

function showFeedbackToast(msg) {
    const toast = document.createElement("div");
    toast.style.cssText = `position:fixed; bottom:30px; right:30px; background:#131316; color:#fff; border-left:4px solid #10b981; padding:16px 24px; border-radius:12px; font-size:13px; font-weight:600; box-shadow:0 10px 30px rgba(0,0,0,0.5); z-index:9999;`;
    toast.innerText = msg; document.body.appendChild(toast); setTimeout(() => { toast.remove(); }, 4000);
}

window.openLoginModal = function() { if (loginModal) { loginModal.classList.add('show-modal'); initGoogleSignIn(); } };
window.closeLoginModal = function() { if (loginModal) { loginModal.classList.remove('show-modal'); if (loginMessage) loginMessage.innerText = ""; } };
if (closeLoginBtn) closeLoginBtn.addEventListener('click', closeLoginModal);
window.addEventListener('click', (e) => { if (e.target === loginModal) closeLoginModal(); });

// ==========================================================================
// 8. INITIALIZATION LOADED
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    updateNavigationClocks(); setInterval(updateNavigationClocks, 1000);
    initAnniversaryCountdown(); checkAutoDJStatus(); setTimeout(initGoogleSignIn, 1000); 
    
    const checkLogin = localStorage.getItem("user_logged_in");
    if (checkLogin) { applyUserAuthenticationState(JSON.parse(checkLogin)); }
    
    // ==========================================================================
    // TOMBOL PLAY/PAUSE DENGAN SISTEM FAILSAFE (ANTI-MACET)
    // ==========================================================================
    if (playBtn) {
        playBtn.addEventListener('click', () => {
            // Jalankan interaksi audio wajib untuk membuka blokir autoplay browser
            if (audioStream.src !== ZENO_STREAM_URL) {
                audioStream.src = ZENO_STREAM_URL;
            }

            // 1. Opsi Utama: Menggunakan Icecast Metadata Player jika siap
            if (typeof IcecastMetadataPlayer !== 'undefined' && playerInstance) {
                try {
                    if (isPlaying) {
                        // Catatan: Library Icecast menggunakan method .stop() untuk berhenti
                        playerInstance.stop(); 
                        playBtn.innerText = "▶";
                        isPlaying = false;
                        showFeedbackToast("Radio Dihentikan");
                    } else {
                        playerInstance.play();
                        playBtn.innerText = "⏸";
                        isPlaying = true;
                        showFeedbackToast("Memutar " + STATIONS[currentStationKey].name);
                    }
                } catch (err) {
                    console.warn("Icecast Player bermasalah, beralih ke Fallback HTML5 Audio:", err);
                    toggleStandardHTML5Audio();
                }
            } else {
                // 2. Opsi Cadangan: Langsung gunakan tag Audio HTML5 standar jika library belum siap
                toggleStandardHTML5Audio();
            }
        });
    }

    // Fungsi pembantu jika library utama tidak merespons
    function toggleStandardHTML5Audio() {
        if (isPlaying) {
            audioStream.pause();
            playBtn.innerText = "▶";
            isPlaying = false;
            showFeedbackToast("Radio Dihentikan");
        } else {
            // Memaksa reload stream agar menghindari delay buffer siaran langsung
            audioStream.load(); 
            audioStream.play()
                .then(() => {
                    playBtn.innerText = "⏸";
                    isPlaying = true;
                    showFeedbackToast("Memutar (Mode Cadangan) " + STATIONS[currentStationKey].name);
                })
                .catch(err => {
                    console.error("HTML5 Playback gagal total:", err);
                    alert("Waduh! Browser kamu memblokir pemutar otomatis. Silakan klik tombol Play sekali lagi.");
                });
        }
    }

    // Perbaikan kontrol slider volume
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            const volumeValue = e.target.value;
            // Setel volume ke elemen HTML5 audio standar
            audioStream.volume = volumeValue;
            // Setel volume ke library metadata jika sedang aktif
            if (playerInstance && playerInstance.audioElement) {
                playerInstance.audioElement.volume = volumeValue;
            }
        });
    }
});

function updateNavigationClocks() {
    const now = new Date();
    const wib = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    const wita = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Makassar" }));
    const wit = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jayapura" }));
    const f = (d) => String(d.getHours()).padStart(2, '0') + ":" + String(d.getMinutes()).padStart(2, '0') + ":" + String(d.getSeconds()).padStart(2, '0');
    if (document.getElementById('clock-wib')) document.getElementById('clock-wib').innerText = f(wib);
    if (document.getElementById('clock-wita')) document.getElementById('clock-wita').innerText = f(wita);
    if (document.getElementById('clock-wit')) document.getElementById('clock-wit').innerText = f(wit);
}

function initAnniversaryCountdown() {
    const targetDate = new Date("July 13, 2026 00:00:00").getTime();
    setInterval(() => {
        const now = new Date().getTime();
        const diff = targetDate - now;
        if (diff <= 0) return;
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        if (document.getElementById('days')) document.getElementById('days').innerText = String(d).padStart(2, '0');
        if (document.getElementById('hours')) document.getElementById('hours').innerText = String(h).padStart(2, '0');
        if (document.getElementById('minutes')) document.getElementById('minutes').innerText = String(m).padStart(2, '0');
        if (document.getElementById('seconds')) document.getElementById('seconds').innerText = String(s).padStart(2, '0');
    }, 1000);
}