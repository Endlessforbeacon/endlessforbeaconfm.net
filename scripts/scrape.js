const fs = require('fs');
const https = require('https');

// URL Situs Resmi Asia Pop 40 (atau API endpoint jika tersedia)
const TARGET_URL = 'https://asiapop40.com/';

function fetchData() {
    https.get(TARGET_URL, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
            parseAndSave(data);
        });
    }).on('error', (err) => {
        console.error('Gagal mengambil data dari situs resmi Asia Pop 40:', err);
    });
}

function parseAndSave(htmlContent) {
    const tracks = [];
    
    // Regex sederhanakan ekstraksi judul & artis dari HTML asiapop40.com
    // (Disesuaikan dengan struktur tag DOM situs resmi)
    const entryRegex = /<div class="chart-entry">[\s\S]*?<span class="rank">(\d+)<\/span>[\s\S]*?<h3 class="title">(.*?)<\/h3>[\s\S]*?<p class="artist">(.*?)<\/p>/g;
    
    let match;
    while ((match = entryRegex.exec(htmlContent)) !== null) {
        tracks.push({
            rank: parseInt(match[1]),
            title: match[2].trim(),
            artist: match[3].trim(),
            cover: "https://via.placeholder.com/60", // Placeholder cover
            preview: ""
        });
    }

    // Buat struktur JSON
    const chartData = {
        lastUpdated: new Date().toISOString().split('T')[0],
        chartTitle: "Asia Pop 40 Official Chart",
        totalTracks: tracks.length,
        tracks: tracks
    };

    // Simpan ke file ChartAsiaPop40.json di root folder
    fs.writeFileSync('./ChartAsiaPop40.json', JSON.stringify(chartData, null, 2));
    console.log('File ChartAsiaPop40.json berhasil diperbarui!');
}

fetchData();