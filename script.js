/**
 * BEACON FM - REAL-TIME ENGINE WITH FIREBASE LIVE CHAT & Y2K UI
 */

const ZENO_STREAM_KEY = "x1wrh2y4jj6uv"; 
const RADIO_WA_NUMBER = "6285257448582"; 
const DEFAULT_LOGO = "Image/Logo.png";
const GOOGLE_CLIENT_ID = "969783269309-99n69ig4hfbcpnvkn2dr0k86stbfejs2.apps.googleusercontent.com";
const FACEBOOK_APP_ID = "1778082900045504"; 
const NEWSDATA_API_KEY = "pub_ab11e44304d1451f90ba554b4d677da7"; 

// Konfigurasi Firebase Realtime Database
const firebaseConfig = {
    databaseURL: "https://endless-for-beacon-fm-dedd2-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Inisialisasi Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const chatRef = db.ref("live_chat_messages");

let currentUser = null;
let audioContext, audioAnalyser, audioSource;
let currentProgramName = "";
let lastPlayingTrack = "";
let isPlaying = false;

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
    checkStoredUserSession(); // Cek sesi user pertama kali
    initZenoPublicMetadata();
    initFirebaseRealtimeChat();
    initAudioPlayerAndVisualizer();
    initRealTimeSchedule();
    initRealTimeClocks();
    initMobileNav();
    initEventCountdown();
    initBeaconNewsEngine();
    initFacebookSDK();

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

/* 1. MENGAMBIL METADATA & LISTENERS VIA ZENO API */
function initZenoPublicMetadata() {
    async function fetchMetadata() {
        const primaryApi = `https://api.zeno.fm/v2/stations/${ZENO_STREAM_KEY}`;
        const fallbackApi = `https://stream.zeno.fm/status-json.xsl?mount=${ZENO_STREAM_KEY}`;

        let dataFetched = false;

        try {
            const res = await fetch(primaryApi);
            if (res.ok) {
                const data = await res.json();
                updateRadioUI(data);
                dataFetched = true;
            }
        } catch (e) {
            console.warn("Direct Zeno V2 API blocked, trying proxy...");
        }

        if (!dataFetched) {
            try {
                const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(primaryApi)}`;
                const res = await fetch(proxyUrl);
                if (res.ok) {
                    const proxyData = await res.json();
                    if (proxyData.contents) {
                        const data = JSON.parse(proxyData.contents);
                        updateRadioUI(data);
                        dataFetched = true;
                    }
                }
            } catch (e) {
                console.warn("AllOrigins Proxy for Primary API failed...");
            }
        }

        if (!dataFetched) {
            try {
                const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(fallbackApi)}`;
                const res = await fetch(proxyUrl);
                if (res.ok) {
                    const proxyData = await res.json();
                    if (proxyData.contents) {
                        const data = JSON.parse(proxyData.contents);
                        if (data.icestats && data.icestats.source) {
                            const source = data.icestats.source;
                            processTrackInfo(source.title || "Endless For Beacon FM");
                            if (source.listeners !== undefined) {
                                const listenerEl = document.getElementById('listener-counter');
                                if (listenerEl) listenerEl.textContent = source.listeners;
                            }
                            dataFetched = true;
                        }
                    }
                }
            } catch (e) {
                console.error("All Metadata Endpoints Failed.", e);
            }
        }
    }

    fetchMetadata();
    setInterval(fetchMetadata, 8000);
}

function updateRadioUI(data) {
    if (data.listeners !== undefined) {
        const listenerEl = document.getElementById('listener-counter');
        if (listenerEl) listenerEl.textContent = data.listeners;
    }

    let songString = "";
    if (data.now_playing && data.now_playing.song) {
        songString = data.now_playing.song;
    } else if (data.title) {
        songString = data.title;
    } else if (data.stream_title) {
        songString = data.stream_title;
    }

    if (songString) {
        processTrackInfo(songString);
    }
}

function processTrackInfo(rawTitle) {
    const titleEl = document.getElementById('track-title');
    const artistEl = document.getElementById('track-artist');

    if (!rawTitle) return;

    let artistName = "Beacon FM Network";
    let songTitle = rawTitle.trim();

    if (rawTitle.includes(' - ')) {
        const parts = rawTitle.split(' - ');
        artistName = parts[0].trim();
        songTitle = parts.slice(1).join(' - ').trim();
    }

    if (titleEl) titleEl.textContent = songTitle;
    if (artistEl) artistEl.textContent = artistName;

    const fullTrackKey = `${artistName} - ${songTitle}`;
    if (lastPlayingTrack !== fullTrackKey) {
        lastPlayingTrack = fullTrackKey;
        fetchArtworkFromiTunes(artistName, songTitle);
    }
}

/* 2. AUTOMATIC ARTWORK FETCHING VIA ITUNES */
async function fetchArtworkFromiTunes(artist, title) {
    const artworkEl = document.getElementById('track-artwork');
    if (!artworkEl) return;

    if (artist === "Beacon FM Network" || !title || title === "Endless For Beacon FM") {
        artworkEl.src = DEFAULT_LOGO;
        return;
    }

    const searchQuery = `${artist} ${title}`.replace(/[^\w\s]/gi, '');
    const iTunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&media=music&limit=1`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(iTunesUrl)}`;

    try {
        const response = await fetch(proxyUrl);
        if (response.ok) {
            const result = await response.json();
            const data = JSON.parse(result.contents);
            if (data.results && data.results.length > 0) {
                let highResArtwork = data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
                artworkEl.src = highResArtwork;
            } else {
                artworkEl.src = DEFAULT_LOGO;
            }
        } else {
            artworkEl.src = DEFAULT_LOGO;
        }
    } catch (e) {
        artworkEl.src = DEFAULT_LOGO;
    }
}

/* 3. FITUR ENDLESS FOR BEACON NEWS ENGINE (FIXED CATEGORY & CORS) */
function initBeaconNewsEngine() {
    const newsGrid = document.getElementById('news-grid');
    const searchInput = document.getElementById('news-search-input');
    const searchBtn = document.getElementById('news-search-btn');
    const catBtns = document.querySelectorAll('.news-cat-btn');

    if (!newsGrid) return;

    let currentCategory = 'top';
    let currentQuery = '';

    async function fetchNewsData(category = 'top', query = '') {
        showNewsLoading();

        // Menyusun URL dasar API Newsdata.io
        let apiUrl = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API_KEY}&country=id&language=id`;

        if (query) {
            apiUrl += `&q=${encodeURIComponent(query)}`;
        } else if (category) {
            apiUrl += `&category=${category}`;
        }

        let success = false;

        // Attempt 1: Fetch Langsung
        try {
            const res = await fetch(apiUrl);
            if (res.ok) {
                const data = await res.json();
                if (data.status === 'success' && data.results && data.results.length > 0) {
                    renderNewsCards(data.results);
                    success = true;
                }
            }
        } catch (e) {
            console.warn("Direct fetch failed, trying proxy...", e);
        }

        // Attempt 2: Fallback via AllOrigins Proxy jika diblokir Browser/CORS
        if (!success) {
            try {
                const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(apiUrl)}`;
                const res = await fetch(proxyUrl);
                if (res.ok) {
                    const proxyData = await res.json();
                    if (proxyData.contents) {
                        const data = JSON.parse(proxyData.contents);
                        if (data.status === 'success' && data.results && data.results.length > 0) {
                            renderNewsCards(data.results);
                            success = true;
                        } else {
                            showNewsStatus('Tidak ada berita ditemukan untuk kategori/pencarian ini.');
                            return;
                        }
                    }
                }
            } catch (e) {
                console.error("Proxy fetch failed:", e);
            }
        }

        if (!success) {
            showNewsStatus('Gagal memuat berita. Pastikan kuota harian API Key NewsData.io masih tersedia.');
        }
    }

    function showNewsLoading() {
        newsGrid.innerHTML = `<div class="news-status-msg"><i class="fa-solid fa-spinner fa-spin"></i> Memuat berita terbaru...</div>`;
    }

    function showNewsStatus(message) {
        newsGrid.innerHTML = `<div class="news-status-msg">${message}</div>`;
    }

    // Event Listener Tombol Kategori
    catBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetBtn = e.currentTarget;
            
            // Highlight tombol aktif
            catBtns.forEach(b => b.classList.remove('active'));
            targetBtn.classList.add('active');

            // Reset input pencarian saat kategori diklik
            if (searchInput) searchInput.value = '';
            currentQuery = '';

            // Ambil kategori dari atribut data-category
            currentCategory = targetBtn.getAttribute('data-category') || 'top';
            fetchNewsData(currentCategory, '');
        });
    });

    // Event Listener Pencarian
    if (searchBtn && searchInput) {
        const handleSearch = () => {
            const query = searchInput.value.trim();
            if (query !== '') {
                catBtns.forEach(b => b.classList.remove('active'));
                currentQuery = query;
                currentCategory = '';
                fetchNewsData('', currentQuery);
            }
        };

        searchBtn.addEventListener('click', handleSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
    }

    // Load berita pertama kali (Kategori 'top' / Utama)
    fetchNewsData('top', '');
}

function renderNewsCards(articles) {
    const newsGrid = document.getElementById('news-grid');
    if (!newsGrid) return;

    newsGrid.innerHTML = '';

    articles.forEach((article, index) => {
        let publishedDate = 'Terbaru';
        if (article.pubDate) {
            try {
                publishedDate = new Date(article.pubDate).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });
            } catch (e) {}
        }

        const fallbackImage = DEFAULT_LOGO;
        const imageUrl = article.image_url || fallbackImage;
        const sourceName = article.source_id ? String(article.source_id).toUpperCase() : 'BERITA';
        const titleText = article.title || 'Berita Tanpa Judul';
        const articleLink = article.link || '#';
        const descText = article.description ? article.description.substring(0, 130) + '...' : 'Klik tautan judul di atas untuk membaca selengkapnya.';

        const card = document.createElement('article');
        card.className = 'news-card';
        card.innerHTML = `
            <div class="news-img-wrapper">
                <img src="${imageUrl}" alt="Header Berita" onerror="this.onerror=null; this.src='${fallbackImage}';">
                <div class="news-badge">${sourceName}</div>
            </div>
            <div class="news-body">
                <h3><a href="${articleLink}" target="_blank" rel="noopener noreferrer">${escapeHTML(titleText)}</a></h3>
                <p id="news-desc-${index}">${escapeHTML(descText)}</p>
                <div class="news-action-bar">
                    <span class="news-date"><i class="fa-regular fa-clock"></i> ${publishedDate}</span>
                </div>
            </div>
        `;

        newsGrid.appendChild(card);
    });
}

/* 4. SWITCH SFX VIA WEB AUDIO API */
function playSwitchSoundEffect() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.08);
    } catch(e) {
        console.warn("SFX Error:", e);
    }
}

/* 5. AUDIO PLAYER & VISUALIZER */
const audio = document.getElementById('audio-stream');
const btnSwitch = document.getElementById('btn-switch-on');
const volumeSlider = document.getElementById('volume-slider');

function initAudioPlayerAndVisualizer() {
    if (volumeSlider && audio) audio.volume = parseFloat(volumeSlider.value);

    if (btnSwitch && audio) {
        btnSwitch.addEventListener('click', () => {
            playSwitchSoundEffect();

            if (!audioContext) setupAudioVisualizer();
            if (audioContext && audioContext.state === 'suspended') audioContext.resume();

            if (!isPlaying) {
                audio.load();
                audio.play().then(() => {
                    isPlaying = true;
                    document.body.classList.remove('power-off');
                    document.body.classList.add('power-on');
                }).catch(err => console.warn("Stream error:", err));
            } else {
                audio.pause();
                isPlaying = false;
                document.body.classList.remove('power-on');
                document.body.classList.add('power-off');
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
        canvasCtx.fillStyle = isPlaying ? '#00f3ff' : '#ff2a5f'; 
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 2;
    }
}

/* 6. MODAL AUTHENTICATION CONTROL */
function openAuthModal() {
    const modal = document.getElementById('modal-auth');
    if (modal) {
        modal.style.display = 'flex';
        renderGoogleButton();
    }
}

function closeAuthModal() {
    const modal = document.getElementById('modal-auth');
    if (modal) modal.style.display = 'none';
}

function renderGoogleButton() {
    if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse
        });

        const btnContainer = document.getElementById('google-btn-container');
        if (btnContainer) {
            btnContainer.innerHTML = '';
            window.google.accounts.id.renderButton(
                btnContainer,
                { theme: "filled_dark", size: "large", type: "standard", shape: "pill", text: "continue_with" }
            );
        }
    } else {
        setTimeout(renderGoogleButton, 500);
    }
}

function parseJwt(token) {
    try {
        var base64Url = token.split('.')[1];
        var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Gagal parse JWT Token:", e);
        return null;
    }
}

function handleCredentialResponse(response) {
    const payload = parseJwt(response.credential);
    if (!payload) return;

    currentUser = { 
        uid: payload.sub, 
        name: payload.name, 
        picture: payload.picture,
        provider: 'google'
    };

    localStorage.setItem('beacon_user', JSON.stringify(currentUser));
    updateUserSessionUI();
    closeAuthModal();
}

function initFacebookSDK() {
    window.fbAsyncInit = function() {
        FB.init({
            appId      : FACEBOOK_APP_ID,
            cookie     : true,
            xfbml      : true,
            version    : 'v18.0'
        });
    };
}

function loginFacebook() {
    if (typeof FB === 'undefined') {
        alert("SDK Facebook belum siap. Silakan coba beberapa saat lagi.");
        return;
    }

    FB.login(function(response) {
        if (response.authResponse) {
            FB.api('/me', { fields: 'name, picture.width(100).height(100)' }, function(profile) {
                currentUser = {
                    uid: profile.id,
                    name: profile.name,
                    picture: profile.picture ? profile.picture.data.url : DEFAULT_LOGO,
                    provider: 'facebook'
                };

                localStorage.setItem('beacon_user', JSON.stringify(currentUser));
                updateUserSessionUI();
                closeAuthModal();
            });
        }
    }, { scope: 'public_profile' });
}

function checkStoredUserSession() {
    const storedUser = localStorage.getItem('beacon_user');
    if (storedUser) {
        try {
            currentUser = JSON.parse(storedUser);
            updateUserSessionUI();
        } catch (e) {
            localStorage.removeItem('beacon_user');
            currentUser = null;
            updateUserSessionUI();
        }
    } else {
        currentUser = null;
        updateUserSessionUI();
    }
}

function updateUserSessionUI() {
    const authBtn = document.getElementById('btn-open-auth');
    const profileBar = document.getElementById('user-profile');
    const avatarEl = document.getElementById('user-avatar');
    const nameEl = document.getElementById('user-name');
    const inputEl = document.getElementById('chat-input');
    const submitEl = document.getElementById('chat-submit');

    if (currentUser && currentUser.uid) {
        if (authBtn) authBtn.style.display = 'none';
        if (avatarEl) avatarEl.src = currentUser.picture || DEFAULT_LOGO;
        if (nameEl) nameEl.textContent = currentUser.name;
        if (profileBar) profileBar.style.display = 'flex';
        if (inputEl) {
            inputEl.disabled = false;
            inputEl.placeholder = "Tulis pesan Y2K di sini...";
        }
        if (submitEl) submitEl.disabled = false;
    } else {
        if (profileBar) profileBar.style.display = 'none';
        if (authBtn) authBtn.style.display = 'flex';
        if (inputEl) {
            inputEl.disabled = true;
            inputEl.placeholder = "Gunakan akun Google/FB untuk chat...";
        }
        if (submitEl) submitEl.disabled = true;
    }
}

function logoutUser() {
    if (currentUser && currentUser.provider === 'facebook' && typeof FB !== 'undefined') {
        try { FB.logout(); } catch(e){}
    }
    currentUser = null;
    localStorage.removeItem('beacon_user');
    updateUserSessionUI();
}

/* 7. LIVE CHAT ENGINE REAL-TIME VIA FIREBASE DATABASE */
function initFirebaseRealtimeChat() {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatBox = document.getElementById('chat-box');

    if (!chatBox || !chatForm) return;

    // Bersihkan chat box sebelum memuat data
    chatBox.innerHTML = '';

    // Mendengarkan data pesan baru dari Firebase Realtime Database
    chatRef.limitToLast(50).on("child_added", (snapshot) => {
        const msg = snapshot.val();
        if (msg) {
            appendY2KChatMessageUI(msg.uid, msg.sender, msg.text, msg.avatar, msg.timestamp);
        }
    }, (error) => {
        console.error("Firebase Chat Read Error:", error);
    });

    // Form Submit ke Firebase
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentUser) return alert("Silakan login terlebih dahulu.");
        
        const msgText = chatInput.value.trim();
        if (!msgText) return;

        // Push data ke server Firebase
        chatRef.push({
            uid: currentUser.uid,
            sender: currentUser.name,
            avatar: currentUser.picture || DEFAULT_LOGO,
            text: msgText,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            chatInput.value = '';
        }).catch((err) => {
            console.error("Gagal mengirim pesan ke Firebase:", err);
            alert("Gagal mengirim pesan. Pastikan Firebase Rules sudah diatur ke '.read': true, '.write': true");
        });
    });
}

function appendY2KChatMessageUI(senderUid, senderName, text, avatarUrl, timestamp) {
    const chatBox = document.getElementById('chat-box');
    if (!chatBox) return;

    const isMine = currentUser && currentUser.uid === senderUid;
    const msgDiv = document.createElement('div');
    msgDiv.className = `y2k-msg-item ${isMine ? 'my-msg' : ''}`;

    const date = timestamp ? new Date(timestamp) : new Date();
    const timeStr = `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
    const avatarSrc = avatarUrl || DEFAULT_LOGO;

    msgDiv.innerHTML = `
        <img src="${avatarSrc}" class="y2k-avatar" alt="${senderName}">
        <div class="y2k-bubble">
            <div class="y2k-msg-header">
                <span class="y2k-username">${senderName}</span>
                <span class="y2k-timestamp">${timeStr}</span>
            </div>
            <div class="y2k-msg-body">${escapeHTML(text)}</div>
        </div>
    `;

    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

/* JADWAL ACARA REAL-TIME */
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

/* EVENT COUNTDOWN */
function updateEventCountdown() {
    const targetDate = new Date("December 14, 2026 00:00:00").getTime();
    const now = new Date().getTime();
    const difference = targetDate - now;

    const daysEl = document.getElementById('event-days');
    const hoursEl = document.getElementById('event-hours');
    const minutesEl = document.getElementById('event-minutes');
    const secondsEl = document.getElementById('event-seconds');

    if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
        if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
        if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
        if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
    } else {
        if (daysEl) daysEl.textContent = '00';
        if (hoursEl) hoursEl.textContent = '00';
        if (minutesEl) minutesEl.textContent = '00';
        if (secondsEl) secondsEl.textContent = '00';
    }
}

setInterval(updateEventCountdown, 1000);
updateEventCountdown();

/* REQUEST WA MODAL */
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

        let textMessage = `*REQUEST LAGU - BEACON FM MAKASSAR*\n-----------------------------------\n *Program:* ${currentProgramName}\n *Dari:* ${sender}\n *Lagu:* ${song}\n` + (msg ? ` *Pesan:* _"${msg}"_\n` : '') + `-----------------------------------`;

        window.open(`https://wa.me/${RADIO_WA_NUMBER}?text=${encodeURIComponent(textMessage)}`, '_blank');
        closeRequestModal();
    });
}

function updateIndonesiaClocks() {
    const now = new Date();

    const optionsWIB = { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    const optionsWITA = { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    const optionsWIT = { timeZone: 'Asia/Jayapura', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

    const wibEl = document.getElementById('time-wib');
    const witaEl = document.getElementById('time-wita');
    const witEl = document.getElementById('time-wit');

    if (wibEl) wibEl.textContent = new Intl.DateTimeFormat('id-ID', optionsWIB).format(now).replace(/\./g, ':');
    if (witaEl) witaEl.textContent = new Intl.DateTimeFormat('id-ID', optionsWITA).format(now).replace(/\./g, ':');
    if (witEl) witEl.textContent = new Intl.DateTimeFormat('id-ID', optionsWIT).format(now).replace(/\./g, ':');
}

setInterval(updateIndonesiaClocks, 1000);
updateIndonesiaClocks();