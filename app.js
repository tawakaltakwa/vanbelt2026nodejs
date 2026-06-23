const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = 3001;

app.use(express.json());
app.use(express.static('public'));

// 1. KONEKSI & PEMBUATAN DATABASE
const db = new sqlite3.Database('./vanbelt2026.db', (err) => {
    if (err) console.error(err.message);
    console.log('Terhubung ke database SQLite.');
});

// Fungsi pembantu untuk menyimpan data vanbelt
function insertVanbelt(data, ignore = false, callback) {
    const { jenis, dasar_harga, borongan_status, borongan_batas, borongan_harga } = data;
    const command = ignore ? 'INSERT OR IGNORE' : 'INSERT';
    db.run(
        `${command} INTO vanbelt (jenis, dasar_harga, borongan_status, borongan_batas, borongan_harga) VALUES (?, ?, ?, ?, ?)`,
        [jenis, dasar_harga, borongan_status, borongan_batas, borongan_harga],
        callback
    );
}

// Membuat tabel 'vanbelt' jika belum ada
db.run(`CREATE TABLE IF NOT EXISTS vanbelt (
    jenis TEXT PRIMARY KEY,
    dasar_harga integer,
    borongan_status TEXT,
    borongan_batas integer,
    borongan_harga integer
)`, (err) => {
    if (err) {
        console.error('Gagal membuat tabel:', err.message);
    } else {
        const initData = [
            { jenis: 'FM', dasar_harga: 1150, borongan_status: 'tidakada', borongan_batas: 0, borongan_harga: 0 },
            { jenis: 'A', dasar_harga: 1000, borongan_status: 'ada', borongan_batas: 29, borongan_harga: 35000 },
            { jenis: 'B', dasar_harga: 1320, borongan_status: 'tidakada', borongan_batas: 0, borongan_harga: 0 },
            { jenis: 'C', dasar_harga: 2200, borongan_status: 'tidakada', borongan_batas: 0, borongan_harga: 0 }
        ];

        initData.forEach((data) => {
            insertVanbelt(data, true, (err) => {
                if (err) {
                    console.error(`Gagal memasukkan data init (${data.jenis}):`, err.message);
                } else {
                    console.log(`Data init berhasil diproses (${data.jenis}).`);
                }
            });
        });
    }
});

// 2. ROUTE CRUD

// [CREATE] - Menambah data baru
app.post('/api/vanbelt', (req, respon) => {
    insertVanbelt(req.body, false, function (err) {
        if (err) {
            console.error('Gagal memasukkan data:', err.message);
            return respon.status(500).json({ error: err.message });
        } else {
            console.log('Data berhasil ditambahkan!');
            return respon.json({ message: "Data berhasil ditambahkan!", id: this.lastID });
        }
    });
});

// [READ] - Mengambil semua data
app.get('/api/vanbelt/ambilsemua', (req, respon) => {
    db.all(`SELECT * FROM vanbelt`, [], (err, rows) => {
        if (err) return respon.status(500).json({ error: err.message });
        respon.json(rows);
    });
});

// [READROW] - Mengambil data berdasarkan ID
app.get('/api/vanbelt/ambilsatu/:jenis', (req, respon) => {
    const { jenis } = req.params;
    db.get(`SELECT * FROM vanbelt WHERE jenis = ?`, jenis, (err, row) => {
        if (err) return respon.status(500).json({ error: err.message });
        respon.json(row);
    });
});

// [UPDATE] - Mengubah data berdasarkan ID
app.put('/api/vanbelt/update/:jenis', (req, respon) => {
    const { dasar_harga, borongan_status, borongan_batas, borongan_harga } = req.body;
    const { jenis } = req.params;
    db.run(`UPDATE vanbelt SET dasar_harga = ?, borongan_status = ?, borongan_batas = ?, borongan_harga = ? WHERE jenis = ?`, [dasar_harga, borongan_status, borongan_batas, borongan_harga, jenis], function (err) {
        if (err) return respon.status(500).json({ error: err.message });
        respon.json({ message: `Data ID ${jenis} berhasil diubah.` });
    });
});

// [DELETE] - Menghapus data berdasarkan ID
app.delete('/api/vanbelt/hapus/:jenis', (req, respon) => {
    const { jenis } = req.params;
    db.run(`DELETE FROM vanbelt WHERE jenis = ?`, jenis, function (err) {
        if (err) return respon.status(500).json({ error: err.message });
        respon.json({ message: `Data ${jenis} berhasil dihapus.` });
    });
});

// [SYNC / REPLACE ALL] - Menimpa seluruh data tabel vanbelt dengan data baru dari Android
app.post('/api/vanbelt/sync', (req, respon) => {
    const dataList = req.body;

    if (!Array.isArray(dataList)) {
        return respon.status(400).json({ error: "Data harus berupa JSON Array" });
    }

    db.run("BEGIN TRANSACTION", (err) => {
        if (err) return respon.status(500).json({ error: "Gagal memulai transaksi: " + err.message });

        // 1. Hapus semua data lama di tabel
        db.run("DELETE FROM vanbelt", (err) => {
            if (err) {
                db.run("ROLLBACK");
                return respon.status(500).json({ error: "Gagal mengosongkan tabel: " + err.message });
            }

            let index = 0;
            // 2. Fungsi rekursif untuk menyisipkan data secara sekuensial (aman dari race condition/headers sent)
            function insertNext() {
                if (index >= dataList.length) {
                    // Jika semua data sukses dimasukkan, lakukan commit
                    db.run("COMMIT", (err) => {
                        if (err) {
                            db.run("ROLLBACK");
                            return respon.status(500).json({ error: "Gagal menyimpan transaksi (commit): " + err.message });
                        }
                        return respon.json({ message: "Seluruh data berhasil ditimpa dengan data baru dari Android." });
                    });
                    return;
                }

                const item = dataList[index];
                db.run(
                    "INSERT INTO vanbelt (jenis, dasar_harga, borongan_status, borongan_batas, borongan_harga) VALUES (?, ?, ?, ?, ?)",
                    [item.jenis, item.dasar_harga, item.borongan_status, item.borongan_batas, item.borongan_harga],
                    (err) => {
                        if (err) {
                            db.run("ROLLBACK");
                            return respon.status(500).json({ error: `Gagal menyimpan data pada baris ke-${index + 1}: ` + err.message });
                        }
                        index++;
                        insertNext();
                    }
                );
            }

            // Jalankan proses penyisipan
            insertNext();
        });
    });
});

// Jalankan Server
app.listen(PORT, () => {
    console.log(`Server CRUD berjalan di http://localhost:${PORT}`);
});