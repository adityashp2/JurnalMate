// mock_gowa_server.js - Server Simulasi Lokal untuk Menguji Go-WA Gateway
// Jalankan dengan: node mock_gowa_server.js

const http = require('http');

const PORT = process.env.PORT || 8000;

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, apikey');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    const timestamp = new Date().toLocaleTimeString('id-ID');
    console.log(`\n======================================================`);
    console.log(`[${timestamp}] 📩 Permintaan Diterima: ${req.method} ${req.url}`);

    if (body) {
      try {
        const parsed = JSON.parse(body);
        console.log(`📱 Nomor Tujuan: ${parsed.phone || parsed.number || '(tidak ada nomor)'}`);
        console.log(`💬 Isi Pesan WhatsApp:\n------------------------------------------------------\n${parsed.message || parsed.text || body}\n------------------------------------------------------`);
      } catch (e) {
        console.log(`📦 Payload Mentah: ${body}`);
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: true,
      code: 200,
      message: 'Pesan berhasil diterima oleh simulasi Go-WA Gateway',
      receivedAt: new Date().toISOString()
    }));
    console.log(`✅ Respon 200 OK dikirim ke ekstensi Chrome.`);
    console.log(`======================================================\n`);
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 [MOCK GO-WA SERVER] Berjalan di http://localhost:${PORT}`);
  console.log(`📡 Endpoint siap menerima pesan:`);
  console.log(`   - POST http://localhost:${PORT}/send/message`);
  console.log(`   - POST http://localhost:${PORT}/send-text`);
  console.log(`💡 Ekstensi Chrome dapat langsung dites tanpa perlu setup WhatsApp asli!\n`);
});
