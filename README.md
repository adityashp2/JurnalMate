# 📝 JurnalMate AI - Chrome Extension Auto-Fill Jurnal & Pengingat WhatsApp (Go-WA)

Ekstensi Google Chrome modern (Manifest V3) yang berfungsi untuk:
1. **Membuat jurnal kegiatan otomatis dengan AI Gemini (Gratis)** dari poin-poin kasar harian Anda.
2. **Menyuntikkan (Auto-Fill) teks jurnal langsung ke formulir website** (e-Kinerja, portal magang, logbook kampus, dll.) dengan 1 kali klik atau interactive element picker.
3. **Pengingat WhatsApp otomatis via Go-WA Gateway** terjadwal setiap sore/jam kerja + tombol instan manual untuk mengingatkan: *"Boss, jangan lupa isi jurnal hari ini!"*.

---

## 🚀 Fitur Utama

- 🤖 **Integrasi Google Gemini AI Gratis**:
  - Pilihan model rekomendasi: `gemini-3.5-flash-lite` (stabil, cepat & kuota gratis luas).
  - **🌟 Mode PKL / Magang Lengkap (STAR & Capaian)**: Otomatis menghasilkan logbook PKL lengkap:
    1. **Perencanaan Kegiatan PKL** (Agenda terstruktur rencana kerja pekan ini)
    2. **Capaian Kegiatan** (Target capaian kompetensi utama)
    3. **Sub Capaian Kegiatan** (Rincian modul/indikator tugas teknis)
    4. **Jumlah Jam Kegiatan** (Otomatis default **48 Jam**)
    5. **Situation (Situasi)**
    6. **Task (Tugas)**
    7. **Action (Aksi)**
    8. **Result (Hasil)**
    9. **Komentar (Tantangan, Solusi & Refleksi)**
  - **📝 Mode 1 Kolom**: Untuk pelaporan kantor, kinerja ASN/PPPK, dan catatan harian umum.
- ⚡ **Auto-Fill ke Web Cerdas**:
  - **Multi-Kolom Otomatis**: Sekali klik tombol *"⚡ Isi Logbook ke Web"*, ekstensi otomatis mendeteksi kolom Perencanaan, Capaian, Sub-Capaian, Jumlah Jam (48 jam), Pekan Ke, Situasi, Tugas, Aksi, Hasil, dan Komentar di formulir web, lalu mengisinya secara simultan!
  - **🎯 Mode Pemilih Kolom (Element Picker)**: Klik kolom spesifik mana pun di halaman web untuk menyuntikkan teks yang sedang aktif di editor.
- 📲 **Pengingat WhatsApp (Fonnte / Go-WA)**:
  - Kirim pengingat langsung (*Instant Trigger*) atau pasang alarm harian terjadwal via service worker.
- 📚 **Riwayat Logbook (History)**:
  - Menyimpan otomatis draft logbook lengkap (termasuk struktur 5 kolom STAR) sehingga bisa dipanggil kembali kapan saja.

---

## 🛠️ Panduan Instalasi di Google Chrome

1. Buka browser **Google Chrome**.
2. Masuk ke halaman ekstensi dengan mengetikkan di address bar:
   ```text
   chrome://extensions/
   ```
3. Aktifkan sakelar **"Developer mode"** di pojok kanan atas.
4. Klik tombol **"Load unpacked"** di pojok kiri atas.
5. Pilih folder proyek ini:
   ```text
   d:\extenxion pengingat jurnal
   ```
6. Ekstensi **JurnalMate AI** sekarang sudah aktif dan terpasang di toolbar Chrome Anda!

---

## 🔑 Langkah 1: Pengaturan Gemini API Key & WhatsApp (Halaman Opsi Terpisah)

Pengaturan dipisahkan ke halaman **Opsi Chrome** agar popup ekstensi tetap ringkas, bersih, dan aman:

- Dapatkan kunci API Gemini gratis di [Google AI Studio](https://aistudio.google.com/app/apikey) lalu masukkan pada menu Pengaturan (model default: **`gemini-3.5-flash-lite`**).
- Untuk membuka halaman Pengaturan:
  - **Cara 1**: Klik ikon roda gigi ⚙️ di pojok kanan atas popup ekstensi.
  - **Cara 2**: Klik kanan ikon ekstensi **JurnalMate** di toolbar Chrome -> pilih **Options** (Opsi).

---

## 📲 Langkah 2: Konfigurasi WhatsApp (Fonnte / Go-WA)

Ekstensi ini mendukung penuh **Fonnte** (`api.fonnte.com`) sebagai provider WhatsApp utama:

1. **Ambil Token Fonnte**:
   - Buka dashboard [fonnte.com](https://fonnte.com), pastikan status device terhubung (*Connected*), dan salin **Token** device.
2. **Atur di Halaman Pengaturan (Options)**:
   - Buka halaman Pengaturan (klik ikon ⚙️ di popup atau klik kanan ekstensi -> *Options*).
   - **Provider WhatsApp**: Pilih `Fonnte (api.fonnte.com)`.
   - **Nomor WhatsApp Penerima**: Masukkan nomor WhatsApp Anda (misal `081234567890`).
   - **Token Fonnte**: Tempelkan token perangkat dari Fonnte.
   - **Jadwal Pengingat**: Aktifkan sakelar alarm dan atur jam (misal `16:30`).
   - Klik **"💾 Simpan Semua Pengaturan"**.
3. **Uji Kirim Pengingat**:
   - Di popup ekstensi pada tab **Pengingat WA**, klik tombol **"Kirim Pengingat WA Sekarang"**.
   - Pesan pengingat: *"Boss, jangan lupa isi jurnal kegiatan hari ini!"* akan langsung masuk ke WhatsApp Anda!

---

## 🧪 Langkah 3: Menguji Auto-Fill Multi-Kolom STAR ke Web

1. Buka file simulasi yang telah kami sediakan di Chrome:
   - Buka file: `file:///d:/extenxion pengingat jurnal/test_journal_page.html` (tersedia form persis seperti portal PKL boss).
2. Klik ikon ekstensi **JurnalMate AI**.
3. Pastikan format dipilih **"PKL / Magang (STAR 5 Kolom)"**:
   - Masukkan nomor pekan (misal `9`).
   - Tulis poin kasar kegiatan pekan ini, misal:
     ```text
     - Optimasi database dan kelola arsip data
     - Selesaikan tugas administrasi operasional
     - Koordinasi dengan pembimbing dan evaluasi teknis
     ```
   - Klik tombol **"✨ Generate 5 Kolom STAR dengan AI"**.
4. AI Gemini akan langsung mengisi 5 bagian: **Situasi, Tugas, Aksi, Hasil, dan Komentar**.
   - Anda bisa mengklik tab pill `[Situasi]`, `[Tugas]`, `[Aksi]`, `[Hasil]`, `[Komentar]`, atau `[Semua]` untuk mengeditnya.
5. Klik tombol **"⚡ Isi 5 Kolom ke Web"**:
   - Seketika seluruh kolom (Situasi, Tugas, Aksi, Hasil, Komentar, dan Pekan Ke) di halaman web akan **langsung terisi otomatis** dan menyala hijau!

---

## 📂 Struktur File

```
d:\extenxion pengingat jurnal\
├── manifest.json            # Konfigurasi Chrome Extension Manifest V3
├── popup.html               # Tampilan antarmuka dashboard ekstensi
├── popup.css                # Styling modern dark aesthetic & responsive tabs
├── popup.js                 # Logika controller (Gemini API, Go-WA, storage, auto-fill)
├── background.js            # Service worker untuk alarm pengingat harian & notifikasi
├── content.js               # In-page script untuk auto-detect & element picker di web
├── content.css              # Styling animasi outline & banner pemilih kolom di web
├── icons/                   # Ikon ekstensi PNG (16x16, 32x32, 48x48, 128x128)
├── generate_icons.js        # Generator aset ikon PNG
├── test_journal_page.html   # Halaman simulasi untuk pengujian auto-fill
├── mock_gowa_server.js      # Server mock lokal Go-WA untuk testing instan
└── README.md                # Panduan lengkap penggunaan
```

---

<p align="center">
  <b>JurnalMate AI</b> • Created with ❤️ by <b>Techfdit</b>
</p>

