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

// Pembaruan Jam 3 Zona Waktu (Sekarang Render Di Footer)
function updateNavigationClocks() {
    const now = new Date();
    const options = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    
    document.getElementById('nav-clock-wib').innerText = new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'Asia/Jakarta' }).format(now);
    document.getElementById('nav-clock-wita').innerText = new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'Asia/Makassar' }).format(now);
    document.getElementById('nav-clock-wit').innerText = new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'Asia/Jayapura' }).format(now);
}

function initAnniversaryCountdown() {
    const targetDate = new Date("2026-07-06T00:00:00+08:00").getTime();
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

// ================= DATABASE SOAL KUIS INTERAKTIF =================
const QUIZ_DATABASE = [
    { q: "Siapakah band pelantun lagu legendaris 'Hysteria' dan 'Time Is Running Out'?", a: ["Linkin Park", "Muse", "Green Day", "Avenged Sevenfold"], correct: 1 },
    { q: "Program acara sore sinematik di Endless For Beacon FM yang memutarkan soundtrack film bernama...", a: ["Morning Brew", "Thursday Throwback", "Asia Pop 40", "Screen To Sounds"], correct: 3 },
    { q: "Mulai Juli 2026, program chart show Asia Pop 40 resmi disiarkan oleh radio apa?", a: ["Prambors FM", "Gen FM", "Endless For Beacon FM", "Hard Rock FM"], correct: 2 },
    { q: "Pukul berapakah program 'Morning Brew' mengudara di udara menemani Beacon Listeners?", a: ["08:00 WITA", "10:00 WITA", "17:00 WITA", "12:00 WIB"], correct: 0 }
];

let currentQuestionIndex = 0;
let userAccumulatedScore = 0;
let quizTimerTicker = null;
let quizTimeRemaining = 10; // 10 detik per soal

// ================= LOGIKA ENGINE KUIS & LEADERBOARD =================
function renderLeaderboardTable() {
    // Ambil data dari localStorage atau gunakan dummy data default jika kosong
    let records = JSON.parse(localStorage.getItem("beacon_leaderboard_data"));
    if (!records) {
        records = [
            { name: "Maikhael Admin", avatar: "Image/Logo.png", score: 40 },
            { name: "Andi Wijaya", avatar: "", score: 30 },
            { name: "Siti Rahma", avatar: "", score: 10 }
        ];
        localStorage.setItem("beacon_leaderboard_data", JSON.stringify(records));
    }

    // Urutkan berdasarkan skor tertinggi ke terendah
    records.sort((x, y) => y.score - x.score);

    const tbody = document.getElementById("leaderboard-rows-inject");
    tbody.innerHTML = "";

    records.forEach((player, idx) => {
        const rank = idx + 1;
        const avatarSrc = player.avatar ? player.avatar : "Image/Logo.png";
        
        let rankClass = "";
        if (rank === 1) rankClass = "rank-1";
        else if (rank === 2) rankClass = "rank-2";
        else if (rank === 3) rankClass = "rank-3";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="lb-rank-cell ${rankClass}">${rank}</td>
            <td>
                <div class="lb-profile-identity">
                    <img src="${avatarSrc}" alt="Avatar" class="lb-avatar">
                    <span class="lb-name">${player.name}</span>
                </div>
            </td>
            <td class="lb-score-cell">${player.score}</td>
        `;
        tbody.appendChild(tr);
    });
}

function startQuizGameplay() {
    document.getElementById("quiz-start-view").style.display = "none";
    document.getElementById("quiz-gameplay-view").style.display = "flex";
    currentQuestionIndex = 0;
    userAccumulatedScore = 0;
    loadQuizQuestion();
}

function loadQuizQuestion() {
    if (currentQuestionIndex >= QUIZ_DATABASE.length) {
        finishQuizGameplay();
        return;
    }

    clearInterval(quizTimerTicker);
    quizTimeRemaining = 10;
    document.getElementById("quiz-timer-bar").style.width = "100%";

    const currentQuestion = QUIZ_DATABASE[currentQuestionIndex];
    document.getElementById("quiz-question-title").innerText = `${currentQuestionIndex + 1}. ${currentQuestion.q}`;

    const optionButtons = document.querySelectorAll(".quiz-options-list .option-btn");
    optionButtons.forEach((btn, idx) => {
        btn.innerText = currentQuestion.a[idx];
    });

    quizTimerTicker = setInterval(() => {
        quizTimeRemaining--;
        document.getElementById("quiz-timer-bar").style.width = `${(quizTimeRemaining / 10) * 100}%`;
        
        if (quizTimeRemaining <= 0) {
            clearInterval(quizTimerTicker);
            currentQuestionIndex++;
            loadQuizQuestion();
        }
    }, 1000);
}

function checkQuizAnswer(selectedIdx) {
    clearInterval(quizTimerTicker);
    const currentQuestion = QUIZ_DATABASE[currentQuestionIndex];
    
    if (selectedIdx === currentQuestion.correct) {
        userAccumulatedScore += 10; // Dapat 10 poin per jawaban benar
    }

    currentQuestionIndex++;
    loadQuizQuestion();
}

function finishQuizGameplay() {
    clearInterval(quizTimerTicker);
    document.getElementById("quiz-gameplay-view").style.display = "none";
    document.getElementById("quiz-result-view").style.display = "flex";
    document.getElementById("quiz-question-title").innerText = "Kuis Selesai!";
    document.getElementById("final-score-val").innerText = userAccumulatedScore;

    // Simpan skor baru user ke dalam database papan peringkat di browser
    const savedUser = localStorage.getItem("user_logged_in");
    if (savedUser) {
        const userData = JSON.parse(savedUser);
        let records = JSON.parse(localStorage.getItem("beacon_leaderboard_data")) || [];
        
        // Cek apakah user sudah punya skor sebelumnya
        const existingUserIdx = records.findIndex(r => r.name === userData.name);
        if (existingUserIdx !== -1) {
            // Update skor jika skor baru lebih tinggi dari skor lama
            if (userAccumulatedScore > records[existingUserIdx].score) {
                records[existingUserIdx].score = userAccumulatedScore;
            }
        } else {
            // Tambahkan user baru ke papan peringkat
            records.push({
                name: userData.name,
                avatar: userData.avatarUrl,
                score: userAccumulatedScore
            });
        }
        localStorage.setItem("beacon_leaderboard_data", JSON.stringify(records));
        renderLeaderboardTable();
    }
}

function resetQuizGameplay() {
    document.getElementById("quiz-result-view").style.display = "none";
    document.getElementById("quiz-start-view").style.display = "flex";
    document.getElementById("quiz-question-title").innerText = "Beacon Interactive Quiz";
}

// ================= INTEGRASI SISTEM GOOGLE SIGN-IN =================
const loginModal = document.getElementById('login-modal');
const closeLoginBtn = document.getElementById('close-login-btn');
const loginMessage = document.getElementById('login-message');

function initGoogleSignIn() {
    google.accounts.id.initialize({
        client_id: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com", // Ganti dengan Google Client ID aslimu
        callback: handleCredentialResponse
    });

    google.accounts.id.renderButton(
        document.getElementById("google-login-btn"),
        { theme: "outline", size: "large", type: "standard", text: "signin_with", shape: "rectangular" }
    );
}

function handleCredentialResponse(response) {
    const responsePayload = parseJwt(response.credential);
    loginMessage.className = "login-status-msg msg-success";
    loginMessage.innerText = "Login Berhasil! Menyinkronkan...";

    setTimeout(() => {
        closeLoginModal();
        const name = responsePayload.name;
        const avatarUrl = responsePayload.picture;

        displayUserProfile(name, avatarUrl);
        localStorage.setItem("user_logged_in", JSON.stringify({ name, avatarUrl }));
        alert(`Selamat datang kembali di Beacon Network, ${name}!`);
    }, 1200);
}

function displayUserProfile(name, avatarUrl) {
    document.getElementById('user-display-name').innerText = name;
    document.getElementById('user-avatar').src = avatarUrl;
    
    document.getElementById('nav-login-btn').style.display = 'none';
    document.getElementById('user-profile-area').style.display = 'flex';

    // Buka Akses Kuis setelah pengguna sukses login
    document.getElementById("start-quiz-btn").removeAttribute("disabled");
    document.getElementById("quiz-question-title").innerText = "Beacon Interactive Quiz";
    document.getElementById("quiz-notice-text").innerText = "Sesi aktif terdeteksi. Bersiaplah menjawab serangkaian pertanyaan seputar musik global dan program Endless For Beacon FM!";
}

function handleSignOut() {
    localStorage.removeItem("user_logged_in");
    document.getElementById('nav-login-btn').style.display = 'flex';
    document.getElementById('user-profile-area').style.display = 'none';
    
    // Kunci kembali akses kuis karena tidak ada sesi login
    document.getElementById("start-quiz-btn").setAttribute("disabled", "true");
    resetQuizGameplay();
    document.getElementById("quiz-question-title").innerText = "Silahkan Login Terlebih Dahulu";
    document.getElementById("quiz-notice-text").innerText = "Kamu harus masuk menggunakan akun Google untuk dapat mengikuti kuis mingguan dan mencatatkan namamu di papan peringkat teratas.";

    loginMessage.innerText = "";
    alert("Kamu telah keluar dari Beacon Network.");
}

function parseJwt(token) {
    let base64Url = token.split('.')[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    let jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

function openLoginModal() { loginModal.classList.add('show-modal'); }
function closeLoginModal() { loginModal.classList.remove('show-modal'); loginMessage.innerText = ""; }

closeLoginBtn.addEventListener('click', closeLoginModal);
window.addEventListener('click', (e) => { if (e.target === loginModal) closeLoginModal(); });

// ================= LIFE INITIALIZATION DOM LOADED =================
document.addEventListener("DOMContentLoaded", () => {
    updateNavigationClocks();
    setInterval(updateNavigationClocks, 1000);
    initAnniversaryCountdown();
    checkAutoDJStatus();
    initGoogleSignIn();
    renderLeaderboardTable(); // Muat data papan peringkat awal

    const savedUser = localStorage.getItem("user_logged_in");
    if (savedUser) {
        const userData = JSON.parse(savedUser);
        displayUserProfile(userData.name, userData.avatarUrl);
    }
});