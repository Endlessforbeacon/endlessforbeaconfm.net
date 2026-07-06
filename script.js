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

// ================= MANAGEMENT JADWAL KUIS (ONLINE SYSTEM) =================
const QUIZ_SCHEDULE = {
    openTime: new Date("2026-07-06T07:00:00+08:00").getTime(),
    closeTime: new Date("2026-07-06T19:59:59+08:00").getTime()
};

function formatQuizDateText(timestamp) {
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar'
    }).format(new Date(timestamp)) + " WITA";
}

function checkQuizAvailability() {
    const startBtn = document.getElementById("start-quiz-btn");
    const noticeText = document.getElementById("quiz-notice-text");
    const questionTitle = document.getElementById("quiz-question-title");
    
    if (!startBtn || !noticeText) return;
    const currentTime = Date.now();

    if (currentTime < QUIZ_SCHEDULE.openTime) {
        startBtn.setAttribute("disabled", "true");
        questionTitle.innerText = "🔒 Kuis Belum Dibuka";
        noticeText.innerHTML = `Halo! Kuis edisi mingguan saat ini belum dimulai.<br><br>📅 <strong>Akan Dibuka Pada:</strong> ${formatQuizDateText(QUIZ_SCHEDULE.openTime)}`;
    } else if (currentTime > QUIZ_SCHEDULE.closeTime) {
        startBtn.setAttribute("disabled", "true");
        questionTitle.innerText = "🚫 Kuis Sudah Ditutup";
        noticeText.innerHTML = `Mohon maaf! Batas waktu pengerjaan kuis periode ini telah berakhir.<br><br>📅 <strong>Telah Ditutup Pada:</strong> ${formatQuizDateText(QUIZ_SCHEDULE.closeTime)}<br>Nantikan pengumuman pemenang kuis interaktif di Leaderboard!`;
    } else {
        startBtn.removeAttribute("disabled");
        questionTitle.innerText = "Beacon Interactive Quiz";
        noticeText.innerHTML = `Sesi aktif terdeteksi. Bersiaplah menjawab serangkaian pertanyaan seputar musik global dan program Endless For Beacon FM!<br><br>⏳ <strong>Batas Waktu Pengisian:</strong> s/d ${formatQuizDateText(QUIZ_SCHEDULE.closeTime)}`;
    }
}

// ================= DATABASE SOAL KUIS + FITUR POIN SPESIFIK =================
const QUIZ_DATABASE = {
    multipleChoice: [
    { id: "mg-1", level: "Easy", maxPoints: 5, question: "Apa nama stasiun radio yang sedang merayakan ulang tahunnya yang ke-3?", options: ["A. Beacon Modern Radio", "B. Endless For Beacon FM", "C. Flikk Radio", "D. Nusantara Feed Station"], answer: "B" },
    { id: "mg-2", level: "Easy", maxPoints: 5, question: "Ulang tahun yang keberapa yang dirayakan oleh Endless For Beacon FM pada tahun 2026 ini?", options: ["A. Ke-1", "B. Ke-2", "C. Ke-3", "D. Ke-5"], answer: "C" },
    { id: "mg-3", level: "Easy", maxPoints: 5, question: "Apa tema utama yang diusung dalam perayaan HUT ke-3 Endless For Beacon FM?", options: ["A. Back to the Y2K Vibes", "B. Let's Tuning In To The Future", "C. Endless Music, Endless Horizon", "D. Digitalization of Radio"], answer: "B" },
    { id: "mg-4", level: "Easy", maxPoints: 5, question: "Di kota manakah stasiun flagship (pusat) dari Endless For Beacon FM berada?", options: ["A. Jakarta", "B. Medan", "C. Makassar", "D. Surabaya"], answer: "C" },
    { id: "mg-5", level: "Easy", maxPoints: 5, question: "Berdasarkan tema 'Let's Tuning In To The Future', fokus utama dari perayaan ini adalah memandang ke arah...", options: ["A. Masa lalu (Sejarah)", "B. Masa kini (Evaluasi)", "C. Masa depan (Inovasi & Teknologi)", "D. Masa kejayaan media cetak"], answer: "C" },
    { id: "mg-6", level: "Easy", maxPoints: 5, question: "Pada bulan apa perayaan HUT 3rd Anniversary Endless For Beacon FM ini diselenggarakan?", options: ["A. Januari", "B. April", "C. Juli", "D. Desember"], answer: "C" },
    { id: "mg-7", level: "Easy", maxPoints: 5, question: "Media utama yang digunakan pendengar untuk menikmati keseruan rangkaian acara HUT ke-3 ini adalah melalui...", options: ["A. Gelombang radio FM dan platform streaming digital", "B. Layar bioskop seluruh Indonesia", "C. Media cetak koran nasional", "D. Saluran TV kabel berlangganan"], answer: "A" },
    { id: "mg-8", level: "Medium", maxPoints: 10, question: "Kata 'Tuning In' dalam tema 'Let's Tuning In To The Future' secara harfiah dalam dunia radio berarti...", options: ["A. Mematikan siaran", "B. Menyelaraskan/mencari frekuensi", "C. Mengubah nama stasiun", "D. Merekam suara"], answer: "B" },
    { id: "mg-9", level: "Medium", maxPoints: 10, question: "Selain siaran lokal di kota flagship-nya, Endless For Beacon FM juga menjangkau pendengar di berbagai wilayah melalui sistem...", options: ["A. Siaran Monolog", "B. National Feed (Umpan Nasional)", "C. Gelombang Pendek (Shortwave)", "D. Radio Komunitas Terbatas"], answer: "B" },
    { id: "mg-10", level: "Medium", maxPoints: 10, question: "Dengan mengusung tema masa depan, Endless For Beacon FM ingin membuktikan bahwa media radio tetap...", options: ["A. Kuno dan tidak berubah", "B. Relevan, adaptif, dan terus berinovasi", "C. Bergantung penuh pada pemutar pita kaset manual", "D. Hanya bisa didengarkan lewat perangkat analog jadul"], answer: "B" },
    { id: "mg-11", level: "Medium", maxPoints: 10, question: "Salah satu bentuk adaptasi masa depan yang dilakukan radio modern saat ini adalah menyebarluaskan siaran analog melalui...", options: ["A. Piringan hitam komersial", "B. Audio internet streaming digital", "C. Layanan pesan singkat SMS pembaca", "D. Panggilan telepon interaktif kabel"], answer: "B" },
    { id: "mg-12", level: "Medium", maxPoints: 10, question: "Konsep visual yang paling cocok untuk mendukung tema 'Let’s Tuning In To The Future' pada materi promosi atau grafis HUT ke-3 adalah...", options: ["A. Kerajinan tradisional dan anyaman", "B. Elemen futuristik, neon digital, dan estetika modern/cyber", "C. Gaya klasik era 1920-an (Hitam Putih)", "D. Corak batik megamendung"], answer: "B" },
    { id: "mg-13", level: "Medium", maxPoints: 10, question: "Program spesial yang paling mencerminkan kata 'The Future' dalam HUT kali ini adalah program yang membahas tentang...", options: ["A. Kilas balik lagu-lagu era 60-an", "B. Perkembangan teknologi, AI, tren masa depan, dan musik modern", "C. Sejarah berdirinya pemancar radio pertama di dunia", "D. Tutorial merawat perangkat radio kuno"], answer: "B" },
    { id: "mg-14", level: "Hard", maxPoints: 15, question: "Apa esensi filosofis dari penggabungan kata 'Endless' (Tanpa Batas) dengan tema 'Let's Tuning In To The Future'?", options: ["A. Keinginan untuk bersiaran tanpa jeda iklan sama sekali", "B. Komitmen stasiun untuk terus mengudara melintasi batas waktu menuju masa depan yang tak terbatas", "C. Batasan jangkauan radio yang hanya berpusat di satu titik kota saja", "D. Harapan agar perangkat pemancar tidak pernah mati selamanya"], answer: "B" },
    { id: "mg-15", level: "Hard", maxPoints: 15, question: "Dari sisi manajemen program (programming), tantangan terbesar dalam merealisasikan tema 'Let's Tuning In To The Future' pada jaringan nasional (national feed) adalah...", options: ["A. Memilih lagu lokal saja tanpa lagu internasional", "B. Menyinkronkan visi siaran masa depan agar relevan bagi audiens regional maupun nasional", "C. Mengurangi durasi siaran menjadi hanya 1 jam per hari", "D. Menghilangkan fungsi penyiar secara total dari studio"], answer: "B" },
    { id: "mg-16", level: "Hard", maxPoints: 15, question: "Dalam merancang ekosistem penyiaran masa depan yang selaras dengan tema HUT, integrasi teknologi apa yang paling relevan untuk menunjang performa studio siaran?", options: ["A. Penggunaan piringan hitam otomatis", "B. Otomasi sistem siaran modern (automation software) terintegrasi dengan distribusi digital", "C. Menggunakan interaksi lewat surat pos kilat", "D. Membatasi siaran hanya melalui jalur pemancar AM gelombang pendek"], answer: "B" },
    { id: "mg-17", level: "Hard", maxPoints: 15, question: "Konsep siaran masa depan yang dicerminkan dalam tema kali ini menuntut stasiun radio untuk memperluas jangkauan (reach) melalui strategi...", options: ["A. Mengurangi jumlah stasiun jaringan", "B. Pendekatan multi-platform (On-Air, Digital Streaming, dan Social Media)", "C. Berhenti menggunakan koneksi internet", "D. Menjual pemancar radio ke pihak lain"], answer: "B" },
    { id: "mg-18", level: "Hard", maxPoints: 15, question: "Jika dikaitkan dengan strategi branding yang visioner, elemen apa yang dibawa ke dalam DNA perayaan HUT ke-3 Endless For Beacon FM?", options: ["A. Nuansa yang santai, lambat, dan melankolis", "B. Nuansa yang dinamis, modern, berenergi tinggi, dan penuh terobosan baru", "C. Konsep pedesaan yang sepi dan tradisional", "D. Gaya penyiaran formal kaku ala radio berita zaman dulu"], answer: "B" },
    { id: "mg-19", level: "Hard", maxPoints: 15, question: "Struktur playlist lagu khusus yang mencerminkan 'Tuning In To The Future' dalam perayaan ini sebaiknya disusun dengan cara...", options: ["A. Memutar lagu yang sama berulang-ulang selama 24 jam", "B. Mengombinasikan hits masa kini dengan lagu-lagu berenergi tinggi yang visioner dan modern", "C. Hanya memutar instrumen musik klasik tanpa vokal", "D. Menghilangkan musik dan hanya menyisakan suara statis (noise)"], answer: "B" },
    { id: "mg-20", level: "Hard", maxPoints: 15, question: "Apa target jangka panjang yang ingin dicapai Endless For Beacon FM lewat momentum 3rd Anniversary bertema masa depan ini?", options: ["A. Menutup stasiun setelah acara selesai", "B. Menjadi trendsetter media penyiaran modern yang menjembatani radio konvensional ke era digital masa depan", "C. Fokus menjadi stasiun radio khusus pemutaran lagu lama saja", "D. Memindahkan seluruh studio fisik ke luar negeri"], answer: "B" }
  ],
  fillInTheBlank: [] // Data isian singkat diabaikan dalam gameplay tipe pilihan ganda
};

let currentQuestionIndex = 0;
let userAccumulatedScore = 0;
let quizTimerTicker = null;
let quizTimeRemaining = 10; 
let isAnsweringBlocked = false;

// Simulated Online Network Database
let globalOnlineUsers = [
    { name: "Rian Makassar", avatar: "", score: 85 },
    { name: "Fadel_Pro", avatar: "", score: 70 },
    { name: "Siti_BeaconFans", avatar: "", score: 55 },
    { name: "Andi_Edge", avatar: "", score: 40 }
];

// ================= LOGIKA ONLINE ENGINE KUIS & LEADERBOARD =================
function renderLeaderboardTable() {
    let localRecords = JSON.parse(localStorage.getItem("beacon_leaderboard_data")) || [];
    let mergedLeaderboard = [...localRecords];
    globalOnlineUsers.forEach(onlineUser => {
        if (!mergedLeaderboard.some(user => user.name === onlineUser.name)) {
            mergedLeaderboard.push(onlineUser);
        }
    });

    mergedLeaderboard.sort((x, y) => y.score - x.score);

    const tbody = document.getElementById("leaderboard-rows-inject");
    tbody.innerHTML = "";

    mergedLeaderboard.forEach((player, idx) => {
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
                    <span class="lb-name">${player.name} ${player.isCurrentUser ? '<small style="color:#10b981;">(Anda)</small>' : ''}</span>
                </div>
            </td>
            <td class="lb-score-cell">${player.score} Poin</td>
        `;
        tbody.appendChild(tr);
    });

    return mergedLeaderboard;
}

function startQuizGameplay() {
    document.getElementById("quiz-start-view").style.display = "none";
    document.getElementById("quiz-gameplay-view").style.display = "flex";
    document.getElementById("question-points-badge").style.display = "inline-block";
    currentQuestionIndex = 0;
    userAccumulatedScore = 0;
    loadQuizQuestion();
}

function loadQuizQuestion() {
    const questionsList = QUIZ_DATABASE.multipleChoice;

    if (currentQuestionIndex >= questionsList.length) {
        finishQuizGameplay();
        return;
    }

    isAnsweringBlocked = false;
    clearInterval(quizTimerTicker);
    quizTimeRemaining = 10;
    document.getElementById("quiz-timer-bar").style.width = "100%";
    document.getElementById("quiz-feedback").className = "feedback-container";
    document.getElementById("quiz-feedback").innerText = "";

    const currentQuestion = questionsList[currentQuestionIndex];
    document.getElementById("quiz-question-title").innerText = `${currentQuestionIndex + 1}. ${currentQuestion.question}`;
    document.getElementById("question-points-badge").innerText = `Maks Poin: ${currentQuestion.maxPoints}`;

    const optionButtons = document.querySelectorAll(".quiz-options-list .option-btn");
    optionButtons.forEach((btn, idx) => {
        btn.innerText = currentQuestion.options[idx];
        btn.className = "option-btn"; 
    });

    quizTimerTicker = setInterval(() => {
        quizTimeRemaining--;
        document.getElementById("quiz-timer-bar").style.width = `${(quizTimeRemaining / 10) * 100}%`;
        
        if (quizTimeRemaining <= 0) {
            clearInterval(quizTimerTicker);
            showAnswerFeedback(false, 0); 
        }
    }, 1000);
}

function checkQuizAnswer(selectedIdx) {
    if (isAnsweringBlocked) return;
    isAnsweringBlocked = true;
    clearInterval(quizTimerTicker);

    const currentQuestion = QUIZ_DATABASE.multipleChoice[currentQuestionIndex];
    const optionButtons = document.querySelectorAll(".quiz-options-list .option-btn");
    
    const indexToLetter = ["A", "B", "C", "D"];
    const selectedLetter = indexToLetter[selectedIdx];
    
    let isCorrect = (selectedLetter === currentQuestion.answer);
    let pointsEarned = 0;

    if (isCorrect) {
        pointsEarned = Math.round((quizTimeRemaining / 10) * currentQuestion.maxPoints);
        if (pointsEarned < 5) pointsEarned = 5; 
        userAccumulatedScore += pointsEarned;
        optionButtons[selectedIdx].classList.add("correct-choice");
    } else {
        optionButtons[selectedIdx].classList.add("wrong-choice");
        const correctOptionIdx = indexToLetter.indexOf(currentQuestion.answer);
        if (correctOptionIdx !== -1) {
            optionButtons[correctOptionIdx].classList.add("correct-choice");
        }
    }

    showAnswerFeedback(isCorrect, pointsEarned);
}

function showAnswerFeedback(isCorrect, points) {
    const feedbackEl = document.getElementById("quiz-feedback");
    if (isCorrect) {
        feedbackEl.className = "feedback-container feedback-correct";
        feedbackEl.innerText = `🟢 Benar! Berhasil mendapatkan +${points} Poin.`;
    } else {
        feedbackEl.className = "feedback-container feedback-wrong";
        feedbackEl.innerText = `🔴 Salah! Anda mendapatkan 0 Poin dari soal ini.`;
    }

    setTimeout(() => {
        currentQuestionIndex++;
        loadQuizQuestion();
    }, 2000); 
}

function finishQuizGameplay() {
    clearInterval(quizTimerTicker);
    document.getElementById("quiz-gameplay-view").style.display = "none";
    document.getElementById("question-points-badge").style.display = "none";
    document.getElementById("quiz-result-view").style.display = "flex";
    document.getElementById("quiz-question-title").innerText = "Kuis Selesai!";
    document.getElementById("final-score-val").innerText = userAccumulatedScore;

    const savedUser = localStorage.getItem("user_logged_in");
    if (savedUser) {
        const userData = JSON.parse(savedUser);
        let localRecords = JSON.parse(localStorage.getItem("beacon_leaderboard_data")) || [];
        
        const existingUserIdx = localRecords.findIndex(r => r.name === userData.name);
        if (existingUserIdx !== -1) {
            if (userAccumulatedScore > localRecords[existingUserIdx].score) {
                localRecords[existingUserIdx].score = userAccumulatedScore;
            }
        } else {
            localRecords.push({ name: userData.name, avatar: userData.avatarUrl, score: userAccumulatedScore, isCurrentUser: true });
        }
        localStorage.setItem("beacon_leaderboard_data", JSON.stringify(localRecords));
        
        const finalLeaderboard = renderLeaderboardTable();
        const userRankIndex = finalLeaderboard.findIndex(player => player.name === userData.name);
        const currentGlobalTime = Date.now();

        if (currentGlobalTime > QUIZ_SCHEDULE.closeTime && userRankIndex !== -1 && userRankIndex < 3) {
            document.getElementById("reward-claim-panel").style.display = "block";
            document.getElementById("quiz-result-desc").innerText = `Luar biasa! Anda mengakhiri turnamen kuis ini di peringkat ke-${userRankIndex + 1} global.`;
        } else if (currentGlobalTime <= QUIZ_SCHEDULE.closeTime && userRankIndex !== -1 && userRankIndex < 3) {
            document.getElementById("quiz-result-desc").innerHTML = `🔥 Skor Anda saat ini mengamankan posisi <strong>Top 3 Besar</strong>! Tombol klaim hadiah E-Wallet akan otomatis aktif di panel ini setelah kuis resmi ditutup pada pukul 19:59 WITA.`;
        }
    }
}

function submitRewardClaim() {
    const ewalletType = document.getElementById("ewallet-type").value;
    const ewalletNum = document.getElementById("ewallet-number").value;

    if (!ewalletNum) {
        alert("Mohon masukkan nomor handphone E-Wallet valid Anda!");
        return;
    }

    alert(`✅ Data Klaim Berhasil Dikirim!\nHadiah saldo tunai akan diproses otomatis ke Akun ${ewalletType} (${ewalletNum}) dalam maksimal 1x24 jam kerja.`);
    document.getElementById("reward-claim-panel").style.display = "none";
}

function resetQuizGameplay() {
    document.getElementById("quiz-result-view").style.display = "none";
    document.getElementById("reward-claim-panel").style.display = "none";
    document.getElementById("quiz-start-view").style.display = "flex";
    
    const savedUser = localStorage.getItem("user_logged_in");
    if (savedUser) {
        checkQuizAvailability();
    } else {
        document.getElementById("quiz-question-title").innerText = "Silahkan Login Terlebih Dahulu";
        document.getElementById("quiz-notice-text").innerText = "Kamu harus masuk menggunakan akun Google untuk dapat mengikuti kuis mingguan dan mencatatkan namamu di papan peringkat teratas.";
    }
}

// ================= INTEGRASI UPGRADE SYSTEM GOOGLE SIGN-IN =================
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
    checkQuizAvailability();
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
    
    const startBtn = document.getElementById("start-quiz-btn");
    if (startBtn) startBtn.setAttribute("disabled", "true");
    
    resetQuizGameplay();
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

closeLoginBtn.addEventListener('click', closeLoginModal);
window.addEventListener('click', (e) => { if (e.target === loginModal) closeLoginModal(); });

// ================= LIFE INITIALIZATION DOM LOADED =================
document.addEventListener("DOMContentLoaded", () => {
    updateNavigationClocks();
    setInterval(updateNavigationClocks, 1000);
    initAnniversaryCountdown();
    checkAutoDJStatus();
    initGoogleSignIn();
    renderLeaderboardTable(); 

    const savedUser = localStorage.getItem("user_logged_in");
    if (savedUser) {
        const userData = JSON.parse(savedUser);
        displayUserProfile(userData.name, userData.avatarUrl);
    }
});