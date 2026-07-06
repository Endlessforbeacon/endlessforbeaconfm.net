// ================= INTEGRASI LAYER METADATA SIARAN =================
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

function updateNavigationClocks() {
    const now = new Date();
    const options = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    
    document.getElementById('nav-clock-wib').innerText = new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'Asia/Jakarta' }).format(now);
    document.getElementById('nav-clock-wita').innerText = new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'Asia/Makassar' }).format(now);
    document.getElementById('nav-clock-wit').innerText = new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'Asia/Jayapura' }).format(now);
}

function initAnniversaryCountdown() {
    const targetDate = new Date("2026-07-06T07:00:00+08:00").getTime();
    setInterval(() => {
        const timeLeft = targetDate - new Date().getTime();
        if (timeLeft <= 0) {
            document.querySelector(".anniversary-badge").innerHTML = "🎉 PRESENTING 🎉";
            return;
        }
        document.getElementById("days").textContent = String(Math.floor(timeLeft / 86400000)).padStart(2, '0');
        document.getElementById("hours").textContent = String(Math.floor((timeLeft % 86400000) / 3600000)).padStart(2, '0');
        document.getElementById("minutes").textContent = String(Math.floor((timeLeft % 3600000) / 60000)).padStart(2, '0');
        document.getElementById("seconds").textContent = String(Math.floor((timeLeft % 60000) / 1000)).padStart(2, '0');
    }, 1000);
}

// ================= MANAGEMENT LIVE CHAT ENGINE =================
const chatMessagesContainer = document.getElementById("chat-box-messages");
const chatInputField = document.getElementById("chat-input-field");
const sendChatBtn = document.getElementById("send-chat-btn");

// Simulasi bot penonton otomatis masuk berkala biar chat seru
const simulatedUsers = ["Rian_Makassar", "Fadel_Pro", "Siti_BeaconFans", "Andi_Edge"];
const simulatedTexts = [
    "Keren banget lagunya asli! 🔥",
    "Salam dari Kendari, dengerin terus Screen To Sounds!",
    "Request lagu Muse dong min setelah ini 🙏",
    "Gila vibesnya berasa nonton MTV jaman dulu bgt yaa ✨",
    "Endless For Beacon mantap suaranya jernih poll."
];

function triggerSimulatedChat() {
    if (!chatMessagesContainer) return;
    const randomUser = simulatedUsers[Math.floor(Math.random() * simulatedUsers.length)];
    const randomText = simulatedTexts[Math.floor(Math.random() * simulatedTexts.length)];
    appendChatMessage(randomUser, randomText, "Image/Logo.png", false);
}
setInterval(triggerSimulatedChat, 12000); // Simulasi chat masuk setiap 12 detik

function appendChatMessage(username, messageText, avatar, isMe = false) {
    if (!chatMessagesContainer) return;
    
    const messageNode = document.createElement("div");
    messageNode.className = isMe ? "chat-msg-row chat-msg-me" : "chat-msg-row";
    
    messageNode.innerHTML = `
        <img src="${avatar}" alt="User Avatar" class="chat-msg-avatar">
        <div class="chat-msg-content-box">
            <span class="chat-msg-username">${username}</span>
            <p class="chat-msg-text">${messageText}</p>
        </div>
    `;
    chatMessagesContainer.appendChild(messageNode);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight; // Auto-scroll down
}

function sendLiveChatMessage() {
    const text = chatInputField.value.trim();
    if (!text) return;
    
    const savedUser = localStorage.getItem("user_logged_in");
    if (savedUser) {
        const userData = JSON.parse(savedUser);
        appendChatMessage(userData.name, text, userData.avatarUrl, true);
        chatInputField.value = "";
    }
}

// listener enter key untuk kirim chat
chatInputField?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendLiveChatMessage();
});

function syncInteractiveComponentsState(isLoggedIn, userName = "") {
    if (isLoggedIn) {
        chatInputField.removeAttribute("disabled");
        sendChatBtn.removeAttribute("disabled");
        chatInputField.placeholder = `Ketik pesan sebagai ${userName}...`;
    } else {
        chatInputField.setAttribute("disabled", "true");
        sendChatBtn.setAttribute("disabled", "true");
        chatInputField.placeholder = "Silahkan login untuk ikut live chat...";
    }
}

// ================= INTEGRASI LAYER GOOGLE SIGN-IN =================
const loginModal = document.getElementById('login-modal');
const closeLoginBtn = document.getElementById('close-login-btn');
const loginMessage = document.getElementById('login-message');

function initGoogleSignIn() {
    google.accounts.id.initialize({
        client_id: "969783269309-99n69ig4hfbcpnvkn2dr0k86stbfejs2.apps.googleusercontent.com", 
        callback: handleCredentialResponse,
        auto_select: false
    });

    google.accounts.id.renderButton(
        document.getElementById("google-login-btn"),
        { theme: "outline", size: "large", type: "standard", text: "signin_with", shape: "rectangular", width: "100%" }
    );
}

function handleCredentialResponse(response) {
    const btnContainer = document.getElementById("google-login-btn");
    if (btnContainer) {
        btnContainer.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; color: #ffffff; font-size: 13px; padding: 8px;">
                <span class="loading-spinner"></span> Memverifikasi Akun...
            </div>
        `;
    }
    loginMessage.className = "login-status-msg msg-success";
    loginMessage.innerText = "Menghubungkan ke Google Server...";

    setTimeout(() => {
        const responsePayload = parseJwt(response.credential);
        const name = responsePayload.name;
        const avatarUrl = responsePayload.picture;

        localStorage.setItem("user_logged_in", JSON.stringify({ name, avatarUrl }));
        displayUserProfile(name, avatarUrl);
        closeLoginModal();
        showToastNotification(`Selamat datang kembali di Beacon Network, ${name}! 🎉`);
    }, 1300);
}

function displayUserProfile(name, avatarUrl) {
    const authSection = document.getElementById("navbar-auth-section");
    if (authSection) {
        authSection.innerHTML = `
            <div class="user-profile-nav-container">
                <img src="${avatarUrl}" alt="Avatar" class="user-avatar-img">
                <span class="user-name-span">${name}</span>
                <button class="logout-action-btn" onclick="handleSignOut()">
                    <i class="fas fa-sign-out-alt"></i> <span>Logout</span>
                </button>
            </div>
        `;
    }
    syncInteractiveComponentsState(true, name);
}

function handleSignOut() {
    localStorage.removeItem("user_logged_in");
    
    const authSection = document.getElementById("navbar-auth-section");
    if (authSection) {
        authSection.innerHTML = `
            <button id="nav-login-btn" class="login-trigger-btn" onclick="openLoginModal()">
                <i class="fas fa-sign-in-alt"></i> <span>Login</span>
            </button>
        `;
    }
    
    syncInteractiveComponentsState(false);
    showToastNotification("Kamu telah keluar dari Endless For Beacon FM.");
}

function parseJwt(token) {
    let base64Url = token.split('.')[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    let jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

function showToastNotification(msg) {
    const toast = document.createElement("div");
    toast.style.cssText = `
        position: fixed; bottom: 30px; right: 30px;
        background: #131316; color: #ffffff; border-left: 4px solid #10b981;
        padding: 16px 24px; border-radius: 12px; font-size: 13px; font-weight: 600;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5); z-index: 9999;
        animation: toastSlideIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;
    toast.innerText = msg;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.transition = "all 0.3s ease-in";
        toast.style.opacity = "0";
        toast.style.transform = "translateY(10px)";
        setTimeout(() => toast.remove(), 300);
    }, 4500);
}

function openLoginModal() { 
    loginModal.classList.add('show-modal'); 
    initGoogleSignIn();
}
function closeLoginModal() { 
    loginModal.classList.remove('show-modal'); 
    loginMessage.innerText = ""; 
}

closeLoginBtn?.addEventListener('click', closeLoginModal);
window.addEventListener('click', (e) => { if (e.target === loginModal) closeLoginModal(); });

// ================= LIFE INITIALIZATION DOM LOADED =================
document.addEventListener("DOMContentLoaded", () => {
    updateNavigationClocks();
    setInterval(updateNavigationClocks, 1000);
    initAnniversaryCountdown();
    checkAutoDJStatus();
    initGoogleSignIn();

    const savedUser = localStorage.getItem("user_logged_in");
    if (savedUser) {
        const userData = JSON.parse(savedUser);
        displayUserProfile(userData.name, userData.avatarUrl);
    } else {
        syncInteractiveComponentsState(false);
    }
});