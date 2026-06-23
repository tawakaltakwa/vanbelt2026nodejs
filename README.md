# Panduan Migrasi Project (Pindah ke Komputer Lain atau VPS)

Dokumen ini berisi panduan langkah demi langkah untuk memindahkan project **vanbelt2026** dari komputer lokal saat ini ke komputer lain atau ke VPS (Virtual Private Server).

> [!IMPORTANT]
> **JANGAN PERNAH menyalin folder `node_modules`.**
> Folder `node_modules` berukuran besar dan berisi binary database (`sqlite3`) yang dikompilasi khusus untuk sistem operasi dan arsitektur mesin asal. Menyalin folder ini ke OS/mesin yang berbeda akan menyebabkan error.

---

## Prasyarat (Prerequisites)

Sebelum memindahkan, pastikan komputer tujuan atau VPS Anda sudah terpasang:
1. **Node.js** (Rekomendasi versi LTS terbaru).
2. **NPM** (biasanya ter-install otomatis bersama Node.js).
3. **Git** (opsional, jika menggunakan metode Git).

---

## Langkah-Langkah Pemindahan

Anda bisa memilih salah satu dari dua metode di bawah ini untuk memindahkan file-file project Anda:

### Metode A: Menggunakan Git & GitHub (Sangat Direkomendasikan)

1. **Push ke Repositori Git:**
   Jika project sudah dihubungkan ke GitHub/GitLab, pastikan semua perubahan terbaru sudah di-commit dan di-push. Folder `node_modules` otomatis akan diabaikan karena sudah ada di dalam file `.gitignore`.

2. **Clone di Komputer Baru / VPS:**
   Buka terminal di komputer tujuan/VPS, lalu jalankan perintah:
   ```bash
   git clone <URL_REPOSITORI_ANDA>
   cd vanbelt2026
   ```

3. **Salin Database SQLite (Manual):**
   Karena database SQLite (`vanbelt2026.db`) biasanya tidak dimasukkan ke Git untuk mencegah kehilangan data produksi, salin file `vanbelt2026.db` secara manual dari komputer lama ke komputer baru/VPS menggunakan **SCP**, **SFTP**, atau media penyimpanan lainnya, lalu letakkan di direktori utama project.

---

### Metode B: Menggunakan File Archive (ZIP / TAR.GZ)

1. **Kompres File Project:**
   Buat file archive (zip/tar.gz) dari folder project Anda, **tetapi kecualikan folder `node_modules` dan `.git`**.
   Pastikan file dan folder berikut ikut terkompresi:
   - `app.js`
   - `package.json`
   - `package-lock.json`
   - `vanbelt2026.db` (database SQLite berisi data Anda)
   - folder `public/`

2. **Kirim Archive ke Mesin Tujuan:**
   Kirim file zip tersebut ke komputer baru atau VPS (misalnya menggunakan perintah `scp`):
   ```bash
   scp project.zip username@ip_address_vps:/path/tujuan/
   ```

3. **Ekstrak Archive:**
   Ekstrak file tersebut di folder tujuan pada komputer baru/VPS Anda.

---

## Langkah Setelah Pemindahan

Setelah file-file project berada di mesin baru, lakukan langkah penyiapan berikut:

### 1. Install Dependencies
Masuk ke direktori project di terminal komputer baru/VPS, kemudian jalankan:
```bash
npm install
```
Perintah ini akan mendownload semua package yang terdaftar di `package.json` dan mengompilasi ulang module native (seperti `sqlite3`) agar sesuai dengan sistem operasi target.

*Catatan untuk Production di VPS:*
Anda bisa menggunakan perintah di bawah ini agar proses instalasi lebih cepat dan bersih:
```bash
npm ci --only=production
```

### 2. Menjalankan Aplikasi

* **Mode Development (Lokal):**
  Jika ingin menjalankan untuk kebutuhan development:
  ```bash
  node app.js
  ```
  atau jika menggunakan nodemon:
  ```bash
  npx nodemon app.js
  ```

* **Mode Production (VPS):**
  Untuk deployment di VPS, disarankan menggunakan **PM2** agar aplikasi tetap berjalan di latar belakang (background) meskipun koneksi SSH/terminal Anda ditutup.
  
  1. Install PM2 secara global:
     ```bash
     npm install -g pm2
     ```
  2. Jalankan aplikasi dengan nama service tertentu:
     ```bash
     pm2 start app.js --name "vanbelt-app"
     ```
  3. Konfigurasi agar PM2 otomatis berjalan saat VPS restart/reboot:
     ```bash
     pm2 startup
     pm2 save
     ```

---

## Perintah PM2 yang Sering Digunakan
* Melihat daftar aplikasi aktif: `pm2 list`
* Melihat log real-time aplikasi: `pm2 logs vanbelt-app`
* Menghentikan aplikasi: `pm2 stop vanbelt-app`
* Memulai kembali aplikasi: `pm2 restart vanbelt-app`
