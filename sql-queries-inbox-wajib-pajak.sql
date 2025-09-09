-- =================================================================
-- QUERY SQL UNTUK SISTEM INBOX WAJIB PAJAK
-- =================================================================

-- 1. QUERY UNTUK MENGAMBIL DATA PENDING DARI INBOX
-- Query ini digunakan untuk menampilkan data wajib pajak yang masih pending
SELECT 
    id,
    data,
    status,
    created_at,
    catatan
FROM inbox_wajib_pajak 
WHERE status = 'pending'
ORDER BY created_at DESC;

-- 2. QUERY UNTUK MENGAMBIL DATA BERDASARKAN STATUS
-- Query ini digunakan untuk filter data berdasarkan status (pending, approved, rejected)
SELECT 
    id,
    data,
    status,
    created_at,
    catatan
FROM inbox_wajib_pajak 
WHERE status = $1  -- Parameter: 'pending', 'approved', atau 'rejected'
ORDER BY created_at DESC;

-- 3. QUERY UNTUK MENCARI DATA BERDASARKAN NPWPD, NAMA USAHA, ATAU NAMA PEMILIK
-- Query ini digunakan untuk fitur pencarian
SELECT 
    id,
    data,
    status,
    created_at,
    catatan
FROM inbox_wajib_pajak 
WHERE 
    status = 'pending' AND
    (
        data->>'NPWPD' ILIKE '%' || $1 || '%' OR
        data->>'Nama Usaha' ILIKE '%' || $1 || '%' OR
        data->>'Nama Pemilik' ILIKE '%' || $1 || '%' OR
        data->>'NIK KTP' ILIKE '%' || $1 || '%'
    )
ORDER BY created_at DESC;

-- 4. QUERY UNTUK MIGRASI DATA DARI INBOX KE TABEL DATAWP
-- Query ini digunakan saat approve data wajib pajak
-- Langkah 1: Insert data ke tabel datawp
INSERT INTO datawp (
    "NPWPD",
    "JenisWP",
    "Nama Usaha",
    "Nama Pemilik",
    "NIK KTP",
    "Alamat",
    "Telephone",
    "Kelurahan",
    "Kecamatan",
    "Foto Pemilik",
    "Foto Tempat Usaha",
    "Foto KTP"
) VALUES (
    $1,  -- NPWPD dari data JSON (atau hasil generate otomatis)
    $2,  -- JenisWP dari data JSON
    $3,  -- Nama Usaha dari data JSON
    $4,  -- Nama Pemilik dari data JSON
    $5,  -- NIK KTP dari data JSON
    $6,  -- Alamat dari data JSON
    $7,  -- Telephone dari data JSON
    $8,  -- Kelurahan dari data JSON
    $9,  -- Kecamatan dari data JSON
    '',  -- Foto Pemilik (kosong untuk sementara)
    '',  -- Foto Tempat Usaha (kosong untuk sementara)
    ''   -- Foto KTP (kosong untuk sementara)
);

-- Langkah 2: Update status inbox menjadi approved
UPDATE inbox_wajib_pajak 
SET status = 'approved'
WHERE id = $1 AND status = 'pending';

-- 5. QUERY UNTUK REJECT DATA WAJIB PAJAK
-- Query ini digunakan saat reject data wajib pajak
UPDATE inbox_wajib_pajak 
SET 
    status = 'rejected',
    catatan = $2
WHERE id = $1 AND status = 'pending';

-- 6. QUERY UNTUK CEK DUPLIKASI NPWPD
-- Query ini digunakan untuk memastikan NPWPD belum ada di tabel datawp
SELECT COUNT(*) as count
FROM datawp 
WHERE "NPWPD" = $1;

-- 7. QUERY UNTUK MENGAMBIL STATISTIK INBOX
-- Query ini digunakan untuk dashboard/statistik
SELECT 
    status,
    COUNT(*) as total
FROM inbox_wajib_pajak 
GROUP BY status;

-- 8. QUERY UNTUK MENGAMBIL DATA INBOX DENGAN DETAIL
-- Query ini digunakan untuk menampilkan detail data
SELECT 
    i.id,
    i.data,
    i.status,
    i.created_at,
    i.catatan,
    -- Cek apakah NPWPD sudah ada di datawp
    CASE 
        WHEN d."NPWPD" IS NOT NULL THEN true 
        ELSE false 
    END as sudah_terdaftar
FROM inbox_wajib_pajak i
LEFT JOIN datawp d ON i.data->>'NPWPD' = d."NPWPD"
WHERE i.id = $1;

-- 9. QUERY UNTUK GENERATE NPWPD OTOMATIS
-- Query ini digunakan untuk membuat NPWPD baru saat approve data tanpa NPWPD
-- Ambil jumlah data WP untuk menentukan urutan berikutnya
SELECT COUNT(*) as total_count
FROM datawp;

-- 10. QUERY UNTUK VALIDASI DATA WAJIB PAJAK (UPDATE)
-- Query ini digunakan untuk validasi data wajib pajak sebelum approve
-- TIDAK LAGI MENOLAK DATA TANPA NPWPD
SELECT 
    CASE 
        WHEN data->>'Nama Usaha' IS NULL OR data->>'Nama Usaha' = '' THEN 'Nama Usaha wajib diisi'
        WHEN data->>'Nama Pemilik' IS NULL OR data->>'Nama Pemilik' = '' THEN 'Nama Pemilik wajib diisi'
        WHEN data->>'NIK KTP' IS NULL OR data->>'NIK KTP' = '' THEN 'NIK KTP wajib diisi'
        WHEN data->>'Alamat' IS NULL OR data->>'Alamat' = '' THEN 'Alamat wajib diisi'
        WHEN data->>'Telephone' IS NULL OR data->>'Telephone' = '' THEN 'Telephone wajib diisi'
        WHEN data->>'Kelurahan' IS NULL OR data->>'Kelurahan' = '' THEN 'Kelurahan wajib diisi'
        WHEN data->>'Kecamatan' IS NULL OR data->>'Kecamatan' = '' THEN 'Kecamatan wajib diisi'
        ELSE 'OK'
    END as validation_result
FROM inbox_wajib_pajak 
WHERE id = $1;

-- =================================================================
-- CONTOH PENGGUNAAN DALAM APLIKASI
-- =================================================================

-- Contoh 1: Mengambil semua data pending
-- Di JavaScript: await createData('getInboxWajibPajak', { status: 'pending' })

-- Contoh 2: Approve data wajib pajak (dengan generate NPWPD otomatis jika kosong)
-- Di JavaScript: await createData('approveWajibPajak', { id: 123 })

-- Contoh 3: Reject data wajib pajak
-- Di JavaScript: await createData('rejectWajibPajak', { id: 123, alasan: 'Data tidak lengkap' })

-- =================================================================
-- STRUKTUR TABEL INBOX_WAJIB_PAJAK
-- =================================================================

-- Tabel ini sudah dibuat dengan struktur:
/*
CREATE TABLE inbox_wajib_pajak (
    id SERIAL PRIMARY KEY,
    data JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    catatan TEXT
);

-- Index untuk optimasi query
CREATE INDEX idx_inbox_wajib_pajak_status ON inbox_wajib_pajak(status);
CREATE INDEX idx_inbox_wajib_pajak_created_at ON inbox_wajib_pajak(created_at);
CREATE INDEX idx_inbox_wajib_pajak_data_npwpd ON inbox_wajib_pajak USING GIN ((data->>'NPWPD'));
*/

-- =================================================================
-- CATATAN PERUBAHAN SISTEM
-- =================================================================

-- PERUBAHAN PENTING:
-- 1. Data WP dari aplikasi eksternal TIDAK LAGI DITOLAK jika tidak memiliki NPWPD
-- 2. NPWPD akan OTOMATIS DIGENERATE saat proses approve jika kosong
-- 3. Format NPWPD: P.{JenisWP}.{Urutan}.{KodeKecamatan}.{KodeKelurahan}
-- 4. Validasi tetap dilakukan untuk field wajib lainnya (Nama Usaha, Nama Pemilik, dll)
-- 5. Duplikasi NPWPD tetap dicek sebelum insert ke datawp 