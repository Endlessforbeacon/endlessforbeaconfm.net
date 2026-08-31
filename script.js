/**
 * BEACON FM - REAL-TIME ENGINE (MAKASSAR HQ TIME - WITA)
 */

const ZENO_STREAM_KEY = "x1wrh2y4jj6uv"; 
const RADIO_WA_NUMBER = "6285257448582"; 
const DEFAULT_LOGO = "Image/Logo.png";

const NEWSDATA_API_KEY = "pub_ab11e44304d1451f90ba554b4d677da7"; 

// URL Publikasi Google Sheets CSV
const GOOGLE_SHEETS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSMx6DIwB0BTp6J1NTvsVlmnmbt4phRMPArJS2wLXxaM6BilX0K-zNZ61GsNQDkqvrlOJTZkXHmBZVh/pub?gid=0&single=true&output=csv";

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
    initZenoPublicMetadata();
    initLocalChat();
    initAudioPlayerAndVisualizer();
    initRealTimeSchedule();
    initRealTimeClocks();
    initMobileNav();
    initEventCountdown();
    initBeaconNewsEngine();
    initAsiaPop40Engine();

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

/* 3. FITUR ASIA POP 40 AUTOMATIC CHART ENGINE */
function initAsiaPop40Engine() {
    const chartListContainer = document.getElementById('ap40-list');
    if (!chartListContainer) return;

    async function fetchAsiaPop40FromGoogleSheets() {
        chartListContainer.innerHTML = `<div class="news-status-msg"><i class="fa-solid fa-spinner fa-spin"></i> Memuat Chart Asia Pop 40...</div>`;

        try {
            const response = await fetch(GOOGLE_SHEETS_CSV_URL);
            if (!response.ok) throw new Error("Gagal mengambil data spreadsheet");
            
            const csvText = await response.text();
            const lines = csvText.split('\n').map(row => row.trim()).filter(row => row.length > 0);
            
            let parsedList = [];
            const startIndex = (lines.length > 0 && (lines[0].toLowerCase().includes('rank') || lines[0].toLowerCase().includes('posisi'))) ? 1 : 0;
            const totalLines = lines.length;

            for (let i = startIndex; i < totalLines; i++) {
                const cols = lines[i].split(',').map(col => col.replace(/^"|"$/g, '').trim());
                
                if (cols.length >= 2) {
                    let rawRank = cols[0] || '';
                    let titleVal = cols[1] || '';
                    let artistVal = cols[2] || '';

                    if (!artistVal && titleVal.includes('-')) {
                        const parts = titleVal.split('-');
                        artistVal = parts[0].trim();
                        titleVal = parts.slice(1).join('-').trim();
                    }

                    if (titleVal) {
                        parsedList.push({
                            rank: rawRank,
                            title: titleVal,
                            artist: artistVal
                        });
                    }
                }
            }

            if (parsedList.length > 0) {
                renderChartList(parsedList);
            } else {
                chartListContainer.innerHTML = `<div class="news-status-msg">Tidak ada data chart.</div>`;
            }
        } catch (error) {
            console.warn("Gagal memuat chart Google Sheets:", error);
            chartListContainer.innerHTML = `<div class="news-status-msg">Gagal memuat data chart.</div>`;
        }
    }

    function renderChartList(items) {
        chartListContainer.innerHTML = '';
        
        const totalItems = items.length;
        for (let j = 0; j < totalItems; j++) {
            const item = items[j];
            const row = document.createElement('div');
            row.className = 'ap40-item';

            let rankDisplay = item.rank;
            let isSpecialTrack = false;

            if (!isNaN(item.rank) && item.rank !== '') {
                rankDisplay = String(item.rank).padStart(2, '0');
            } else {
                isSpecialTrack = true;
            }

            row.innerHTML = `
                <div class="ap40-rank ${isSpecialTrack ? 'special-badge' : ''}">${rankDisplay}</div>
                <div class="ap40-info">
                    <div class="ap40-title">${item.title}</div>
                    <div class="ap40-artist">${item.artist || '-'}</div>
                </div>
            `;
            chartListContainer.appendChild(row);
        }
    }

    fetchAsiaPop40FromGoogleSheets();
}

/* 4. FITUR ENDLESS FOR BEACON NEWS ENGINE */
function initBeaconNewsEngine() {
    const newsGrid = document.getElementById('news-grid');
    const searchInput = document.getElementById('news-search-input');
    const searchBtn = document.getElementById('news-search-btn');
    const catBtns = document.querySelectorAll('.news-cat-btn');

    if (!newsGrid) return;

    async function fetchNewsData(category = 'top', query = '') {
        showNewsLoading();

        let url = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API_KEY}&country=id&language=id`;
        
        if (query) {
            url += `&q=${encodeURIComponent(query)}`;
        } else if (category) {
            url += `&category=${category}`;
        }

        try {
            const res = await fetch(url);
            const data = await res.json();

            if (data.status === 'success' && data.results && data.results.length > 0) {
                renderNewsCards(data.results);
            } else {
                showNewsStatus('Tidak ada berita ditemukan.');
            }
        } catch (error) {
            console.error('NewsData Fetch Error:', error);
            showNewsStatus('Gagal memuat berita dari internet. Pastikan API Key NewsData.io valid.');
        }
    }

    function renderNewsCards(articles) {
        newsGrid.innerHTML = '';

        articles.forEach(article => {
            const publishedDate = article.pubDate ? new Date(article.pubDate).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }) : 'Terbaru';

            const fallbackImage = DEFAULT_LOGO;
            const imageUrl = article.image_url || fallbackImage;
            const sourceName = article.source_id ? article.source_id.toUpperCase() : 'BERITA';

            const card = document.createElement('article');
            card.className = 'news-card';
            card.innerHTML = `
                <div class="news-img-wrapper">
                    <img src="${imageUrl}" alt="Header Berita" onerror="this.src='${fallbackImage}'">
                    <div class="news-badge">${sourceName}</div>
                </div>
                <div class="news-body">
                    <h3><a href="${article.link}" target="_blank" rel="noopener noreferrer">${article.title}</a></h3>
                    <p>${article.description ? article.description.substring(0, 120) + '...' : 'Klik tautan judul di atas untuk membaca berita selengkapnya.'}</p>
                    <span class="news-date"><i class="fa-regular fa-clock"></i> ${publishedDate}</span>
                </div>
            `;

            newsGrid.appendChild(card);
        });
    }

    function showNewsLoading() {
        newsGrid.innerHTML = `<div class="news-status-msg"><i class="fa-solid fa-spinner fa-spin"></i> Memuat berita terbaru dari internet...</div>`;
    }

    function showNewsStatus(message) {
        newsGrid.innerHTML = `<div class="news-status-msg">${message}</div>`;
    }

    catBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            catBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            const category = e.target.getAttribute('data-category');
            if (searchInput) searchInput.value = '';
            fetchNewsData(category, '');
        });
    });

    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query !== '') {
                catBtns.forEach(b => b.classList.remove('active'));
                fetchNewsData('', query);
            }
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchBtn.click();
        });
    }

    fetchNewsData('top', '');
}

/* 5. SWITCH SFX VIA WEB AUDIO API */
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

/* 6. AUDIO PLAYER & SWITCH ON THE ULTIMATE WAVE */
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

/* 7. MODAL AUTHENTICATION CONTROL */
function openAuthModal() {
    const modal = document.getElementById('modal-auth');
    if (modal) modal.style.display = 'flex';
}

function closeAuthModal() {
    const modal = document.getElementById('modal-auth');
    if (modal) modal.style.display = 'none';
}

/* CHAT LOCAL */
function initLocalChat() {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatBox = document.getElementById('chat-box');

    if (!chatBox || !chatForm) return;

    chatBox.innerHTML = `
        <div class="chat-msg">
            <span class="user" style="color:#ff2a5f; font-weight:700;">System:</span> 
            <span>Selamat datang di Live Chat Beacon FM Makassar! Masuk untuk mulai berinteraksi.</span>
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
function initEventCountdown() {
    const targetDate = new Date('2026-12-14T05:00:00+08:00').getTime();

    const daysEl = document.getElementById('cd-days');
    const hoursEl = document.getElementById('cd-hours');
    const minutesEl = document.getElementById('cd-minutes');
    const secondsEl = document.getElementById('cd-seconds');
    const containerEl = document.getElementById('event-countdown');

    if (!daysEl || !hoursEl || !minutesEl || !secondsEl || !containerEl) return;

    function updateCountdown() {
        const now = new Date().getTime();
        const timeDiff = targetDate - now;

        if (timeDiff <= 0) {
            containerEl.innerHTML = `<div class="event-started-msg"><i class="fa-solid fa-circle-play"></i> Event Sedang Berlangsung / Telah Dimulai!</div>`;
            return;
        }

        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        daysEl.textContent = String(days).padStart(2, '0');
        hoursEl.textContent = String(hours).padStart(2, '0');
        minutesEl.textContent = String(minutes).padStart(2, '0');
        secondsEl.textContent = String(seconds).padStart(2, '0');
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
}

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

/* JAM INDONESIA */
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

/* GOOGLE AUTH HANDLER */
function parseJwt(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
}

function handleCredentialResponse(response) {
    const payload = parseJwt(response.credential);
    currentUser = { uid: payload.sub, name: payload.name, picture: payload.picture };

    closeAuthModal();

    const authBtn = document.getElementById('btn-open-auth');
    if (authBtn) authBtn.style.display = 'none';

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
    const authBtn = document.getElementById('btn-open-auth');

    if (profileBar) profileBar.style.display = 'none';
    if (authBtn) authBtn.style.display = 'flex';

    const inputEl = document.getElementById('chat-input');
    const submitEl = document.getElementById('chat-submit');
    if (inputEl) inputEl.disabled = true;
    if (submitEl) submitEl.disabled = true;
}