// ==========================================================================
// 1. INTEGRASI LAYER METADATA SIARAN & LIBRARY FIREBASE
// ==========================================================================
// Memuat Icecast Player untuk Metadata Lagu
const liveMetadataScript = document.createElement('script');
liveMetadataScript.src = "https://unpkg.com/icecast-metadata-player/dist/icecast-metadata-player.production.min.js";
document.head.appendChild(liveMetadataScript);

// Memuat Firebase Core App & Realtime Database SDK (v9 Compat Mode agar mudah menyatu)
const firebaseAppScript = document.createElement('script');
firebaseAppScript.src = "https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js";
document.head.appendChild(firebaseAppScript);

const firebaseDbScript = document.createElement('script');
firebaseDbScript.src = "https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js";
document.head.appendChild(firebaseDbScript);

// Ambil elemen DOM dari HTML
const playBtn = document.getElementById('play-btn');
const volumeSlider = document.getElementById('volume');
const songTitle = document.getElementById('song-title');
const songArtist = document.getElementById('song-artist');
const radioLogo = document.getElementById('radio-logo');

const DEFAULT_LOGO = "Image/Logo.png"; 
let isPlaying = false;
let playerInstance = null;
let lastMetadataTime = 0;

// Konfigurasi Streaming Zeno FM
const ZENO_STREAM_URL = "https://stream.zeno.fm/n7qpxnyfrbruv"; 
const ZENO_STREAM_ID = "n7qpxnyfrbruv"; 
const ZENO_AUTODJ_API = `https://corsproxy.io/?${encodeURIComponent('https://api.zeno.fm/web-client/v2/epgs/' + ZENO_STREAM_ID)}`;

const audioStream = document.getElementById('radio-player') || document.createElement('audio');
if (!audioStream.id) { audioStream.id = 'radio-player'; document.body.appendChild(audioStream); }
audioStream.src = ZENO_STREAM_URL;

liveMetadataScript.onload = () => {
    try {
        if (typeof IcecastMetadataPlayer !== 'undefined') {
            playerInstance = new IcecastMetadataPlayer(ZENO_STREAM_URL, {
                onMetadata: (metadata) => { if (metadata && metadata.StreamTitle) { lastMetadataTime = Date.now(); parseAndDisplayTracks(metadata.StreamTitle); } },
                audioElement: audioStream
            });
            if (volumeSlider) playerInstance.audioElement.volume = volumeSlider.value;
        }
    } catch (e) { console.error("Library Metadata Player error:", e); }
};

// ==========================================================================
// 2. KONEKSI & KONFIGURASI FIREBASE REALTIME DATABASE
// ==========================================================================
// GANTI DATA DI BAWAH INI DENGAN DATA DARI CONFIG FIREBASE CONSOLE KAMU!
const firebaseConfig = {
    apiKey: "AIzaSyAQCV0HUrHKrLTs3iCkgLWJReBK8omtb0g",
    authDomain: "endless-for-beacon-fm-dedd2.firebaseapp.com",
    databaseURL: "https://endless-for-beacon-fm-dedd2-default-rtdb.asia-southeast1.firebasedatabase.app/", // Sangat penting untuk Realtime Database
    projectId: "endless-for-beacon-fm-dedd2",
    storageBucket: "endless-for-beacon-fm-dedd2.firebasestorage.app",
    messagingSenderId: "430104466152",
    appId: "1:430104466152:web:b0ce468f4233f64f246f5d"
};

let database;

// Inisialisasi Firebase setelah library eksternalnya selesai dimuat browser
firebaseDbScript.onload = () => {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    
    // Dengarkan database secara Real-Time. Jika ada data baru masuk di Firebase, langsung tampilkan ke chat-box!
    database.ref('live_chats').limitToLast(50).on('child_added', (snapshot) => {
        const data = snapshot.val();
        const savedUser = localStorage.getItem("user_logged_in");
        let isMe = false;
        
        if (savedUser) {
            const currentUser = JSON.parse(savedUser);
            // Cek apakah pengirim adalah akun kita sendiri
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

// Fungsi utama: Mengirim pesan langsung ke Cloud Firebase
function sendLiveChatMessage() {
    if (!chatInputField || !database) return;
    const text = chatInputField.value.trim();
    if (!text) return;
    
    const savedUser = localStorage.getItem("user_logged_in");
    if (savedUser) {
        const userData = JSON.parse(savedUser);
        
        // PUSH DATA KE FIREBASE (Ini yang bikin sinkron ke semua HP/Laptop)
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
        const artist = parts[0].trim(); const title = parts[1].trim();
        songTitle.innerText = title; songArtist.innerText = artist;
        getArtworkFromiTunes(artist, title);
    } else {
        songTitle.innerText = rawText; songArtist.innerText = "Endless For Beacon FM";
        if (radioLogo) radioLogo.src = DEFAULT_LOGO;
    }
}

async function getArtworkFromiTunes(artist, title) {
    if (!radioLogo) return;
    try {
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artist + " " + title)}&media=music&limit=1`);
        const data = await response.json();
        if (data.resultCount > 0) radioLogo.src = data.results[0].artworkUrl100.replace("100x100bb.jpg", "400x400bb.jpg");
        else radioLogo.src = DEFAULT_LOGO;
    } catch (err) { radioLogo.src = DEFAULT_LOGO; }
}

async function checkAutoDJStatus() {
    if (Date.now() - lastMetadataTime < 20000) return; 
    try {
        const response = await fetch(ZENO_AUTODJ_API);
        const data = await response.json();
        if (data?.v2?.epgs?.length > 0) { const autoDJText = data.v2.epgs[0].title; if (autoDJText) parseAndDisplayTracks(autoDJText); }
    } catch (err) { console.log("AutoDJ sync deferred..."); }
}
setInterval(checkAutoDJStatus, 15000);

// ==========================================================================
// 5. KONTROL AUDIO PLAYER
// ==========================================================================
function togglePlayback() {
    if (!isPlaying) {
        audioStream.load(); 
        if (playerInstance && typeof playerInstance.play === 'function') playerInstance.play();
        else audioStream.play();
        isPlaying = true; if (playBtn) playBtn.innerText = "⏸";
    } else {
        if (playerInstance && typeof playerInstance.stop === 'function') playerInstance.stop();
        else audioStream.pause();
        isPlaying = false; if (playBtn) playBtn.innerText = "▶";
    }
}
if (playBtn) playBtn.addEventListener('click', togglePlayback);
if (volumeSlider) {
    volumeSlider.addEventListener('input', () => {
        if (playerInstance?.audioElement) playerInstance.audioElement.volume = volumeSlider.value;
        else audioStream.volume = volumeSlider.value;
    });
}

// ==========================================================================
// 6. JAM NAVIGATION & COUNTDOWN BADGE
// ==========================================================================
function updateNavigationClocks() {
    const now = new Date(); const options = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    const clockWib = document.getElementById('nav-clock-wib'); const clockWita = document.getElementById('nav-clock-wita'); const clockWit = document.getElementById('nav-clock-wit');
    if (clockWib) clockWib.innerText = new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'Asia/Jakarta' }).format(now);
    if (clockWita) clockWita.innerText = new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'Asia/Makassar' }).format(now);
    if (clockWit) clockWit.innerText = new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'Asia/Jayapura' }).format(now);
}

function initAnniversaryCountdown() {
    const targetDate = new Date("2026-07-06T07:00:00+08:00").getTime();
    setInterval(() => {
        const timeLeft = targetDate - new Date().getTime(); const badge = document.querySelector(".anniversary-badge");
        if (timeLeft <= 0) { if (badge) badge.innerHTML = "🎉 PRESENTING 🎉"; return; }
        const d = document.getElementById("days"); const h = document.getElementById("hours"); const m = document.getElementById("minutes"); const s = document.getElementById("seconds");
        if (d) d.textContent = String(Math.floor(timeLeft / 86400000)).padStart(2, '0');
        if (h) h.textContent = String(Math.floor((timeLeft % 86400000) / 3600000)).padStart(2, '0');
        if (m) m.textContent = String(Math.floor((timeLeft % 3600000) / 60000)).padStart(2, '0');
        if (s) s.textContent = String(Math.floor((timeLeft % 60000) / 1000)).padStart(2, '0');
    }, 1000);
}

// ==========================================================================
// 7. GOOGLE AUTHENTICATION & INTERACTIVE STATE
// ==========================================================================
function syncInteractiveComponentsState(isLoggedIn, userName = "") {
    if (!chatInputField || !sendChatBtn) return;
    if (isLoggedIn) { chatInputField.removeAttribute("disabled"); sendChatBtn.removeAttribute("disabled"); chatInputField.placeholder = `Ketik pesan sebagai ${userName}...`; }
    else { chatInputField.setAttribute("disabled", "true"); sendChatBtn.setAttribute("disabled", "true"); chatInputField.placeholder = "Silahkan login untuk ikut live chat..."; }
}

const loginModal = document.getElementById('login-modal');
const closeLoginBtn = document.getElementById('close-login-btn');
const loginMessage = document.getElementById('login-message');

function initGoogleSignIn() {
    if (typeof google === 'undefined' || !document.getElementById("google-login-btn")) return;
    google.accounts.id.initialize({ client_id: "969783269309-99n69ig4hfbcpnvkn2dr0k86stbfejs2.apps.googleusercontent.com", callback: handleCredentialResponse, auto_select: false });
    google.accounts.id.renderButton(document.getElementById("google-login-btn"), { theme: "outline", size: "large", type: "standard", text: "signin_with", shape: "rectangular", width: "100%" });
}

function handleCredentialResponse(response) {
    const btnContainer = document.getElementById("google-login-btn");
    if (btnContainer) btnContainer.innerHTML = `<div style="color:#fff; font-size:13px;">Verifikasi...</div>`;
    if (loginMessage) { loginMessage.className = "login-status-msg msg-success"; loginMessage.innerText = "Menghubungkan..."; }
    setTimeout(() => {
        const responsePayload = parseJwt(response.credential); const name = responsePayload.name; const avatarUrl = responsePayload.picture;
        localStorage.setItem("user_logged_in", JSON.stringify({ name, avatarUrl }));
        displayUserProfile(name, avatarUrl); closeLoginModal(); showToastNotification(`Selamat datang, ${name}! 🎉`);
    }, 1300);
}

function displayUserProfile(name, avatarUrl) {
    const authSection = document.getElementById("navbar-auth-section");
    if (authSection) {
        authSection.innerHTML = `
            <div class="user-profile-nav-container">
                <img src="${avatarUrl}" alt="Avatar" class="user-avatar-img">
                <span class="user-name-span">${name}</span>
                <button class="logout-action-btn" onclick="handleSignOut()"><i class="fas fa-sign-out-alt"></i></button>
            </div>
        `;
    }
    syncInteractiveComponentsState(true, name);
}

function handleSignOut() {
    localStorage.removeItem("user_logged_in");
    const authSection = document.getElementById("navbar-auth-section");
    if (authSection) authSection.innerHTML = `<button id="nav-login-btn" class="login-trigger-btn" onclick="openLoginModal()"><i class="fas fa-sign-in-alt"></i> <span>Login</span></button>`;
    syncInteractiveComponentsState(false); showToastNotification("Kamu telah keluar.");
}

function parseJwt(token) {
    let base64Url = token.split('.')[1]; let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    let jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join(''));
    return JSON.parse(jsonPayload);
}

function showToastNotification(msg) {
    const toast = document.createElement("div");
    toast.style.cssText = `position:fixed; bottom:30px; right:30px; background:#131316; color:#fff; border-left:4px solid #10b981; padding:16px 24px; border-radius:12px; font-size:13px; font-weight:600; box-shadow:0 10px 30px rgba(0,0,0,0.5); z-index:9999;`;
    toast.innerText = msg; document.body.appendChild(toast); setTimeout(() => { toast.remove(); }, 4000);
}

function openLoginModal() { if (loginModal) { loginModal.classList.add('show-modal'); initGoogleSignIn(); } }
function closeLoginModal() { if (loginModal) { loginModal.classList.remove('show-modal'); if (loginMessage) loginMessage.innerText = ""; } }
if (closeLoginBtn) closeLoginBtn.addEventListener('click', closeLoginModal);
window.addEventListener('click', (e) => { if (e.target === loginModal) closeLoginModal(); });

// ==========================================================================
// 8. INITIALIZATION LOADED
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    updateNavigationClocks(); setInterval(updateNavigationClocks, 1000);
    initAnniversaryCountdown(); checkAutoDJStatus(); setTimeout(initGoogleSignIn, 1000); 
    const savedUser = localStorage.getItem("user_logged_in");
    if (savedUser) { const userData = JSON.parse(savedUser); displayUserProfile(userData.name, userData.avatarUrl); }
    else { syncInteractiveComponentsState(false); }
});