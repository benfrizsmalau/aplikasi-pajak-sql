const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');

// --- KONFIGURASI ---
// Kredensial ini dibaca dari Environment Variables di Netlify
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const FOLDER_ID = "1x3EmFN0kM7x9Th0ZxsHEWX7hFNU6Vum8"; // ID Folder Google Drive Anda
// --------------------

// Konstanta mapping nama field Supabase untuk datawp
const DATAWP_FIELDS = [
    'NPWPD',
    'JenisWP',
    'Nama Usaha',
    'Nama Pemilik',
    'NIK KTP',
    'Alamat',
    'Telephone',
    'Kelurahan',
    'Kecamatan',
    'Foto Pemilik',
    'Foto Tempat Usaha',
    'Foto KTP',
];

// Fungsi validasi data wajib
function validateDatawpInput(data, isAuto) {
    const required = [
        'jenisWp', 'namaUsaha', 'namaPemilik', 'nikKtp', 'alamat', 'telephone', 'kelurahan', 'kecamatan',
        ...(isAuto ? ['kodeKecamatan', 'kodeKelurahan'] : ['npwpd'])
    ];
    for (const key of required) {
        if (!data[key] || typeof data[key] !== 'string' || data[key].trim() === '') {
            throw new Error(`Field '${key}' wajib diisi dan harus berupa string.`);
        }
    }
}

// Fungsi otentikasi untuk Google Drive
async function getAuthClient() {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    return new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive'] }).getClient();
}

// Handler utama Netlify Function
exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers };

    try {
        let responseData;
        if (event.httpMethod === 'GET') {
            responseData = await handleGet();
        } else if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            switch (body.action) {
                case 'createWp':
                    responseData = await handleCreateWp(body);
                    break;
                case 'updateWp':
                    responseData = await handleUpdateWp(body);
                    break;
                case 'deleteWp':
                    responseData = await handleDeleteWp(body);
                    break;
                // Tambahkan case untuk ketetapan dan lainnya di sini
                default:
                    throw new Error(`Aksi '${body.action}' tidak dikenali`);
            }
        } else {
            throw new Error(`Metode HTTP ${event.httpMethod} tidak didukung.`);
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ status: 'sukses', ...responseData }),
        };

    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ status: 'gagal', message: error.message }) };
    }
};

// =================================================================
// FUNGSI-FUNGSI HANDLER
// =================================================================

async function handleGet() {
    const [
        { data: wajibPajak, error: wpError },
        { data: wilayah, error: wilayahError },
        // Tambahkan pengambilan data lain jika perlu
    ] = await Promise.all([
        supabase.from('datawp').select('*'),
        supabase.from('Wilayah').select('*'),
    ]);

    if (wpError) throw new Error(`Error mengambil data WP: ${wpError.message}`);
    if (wilayahError) throw new Error(`Error mengambil data Wilayah: ${wilayahError.message}`);

    return {
        wajibPajak: wajibPajak || [],
        wilayah: wilayah || [],
        masterPajak: [], // Kosongkan jika belum ada tabelnya
        ketetapan: [],
        pembayaran: [],
    };
}

// FUNGSI INI TELAH DIPERBAIKI
async function handleCreateWp(data) {
    let newNpwpd;
    // Validasi data masuk
    validateDatawpInput(data, data.generate_mode === true);

    // Logika untuk membuat NPWPD baru
    if (data.generate_mode === true) {
        // Ambil jumlah data WP untuk menentukan urutan berikutnya
        const { count, error: countError } = await supabase
            .from('datawp')
            .select('*', { count: 'exact', head: true });
        if (countError) throw new Error('Gagal menghitung data WP.');
        const nextSequence = ((count || 0) + 1).toString().padStart(6, '0');
        newNpwpd = `P.${data.jenisWp}.${nextSequence}.${data.kodeKecamatan}.${data.kodeKelurahan}`;
    } else {
        newNpwpd = data.npwpd;
        // Cek duplikasi untuk mode manual
        const { data: existingWp, error: findError } = await supabase
            .from('datawp')
            .select('NPWPD')
            .eq('NPWPD', newNpwpd);
        if (findError) throw new Error('Gagal mengecek NPWPD.');
        if (existingWp && existingWp.length > 0) throw new Error(`NPWPD ${newNpwpd} sudah terdaftar.`);
    }

    // Untuk saat ini, kita lewati upload foto
    const urlFotoPemilik = "";
    const urlFotoUsaha = "";
    const urlFotoKtp = "";

    // Mapping data ke field Supabase
    const insertData = {
        NPWPD: newNpwpd,
        JenisWP: data.jenisWp,
        "Nama Usaha": data.namaUsaha,
        "Nama Pemilik": data.namaPemilik,
        "NIK KTP": data.nikKtp,
        Alamat: data.alamat,
        Telephone: data.telephone,
        Kelurahan: data.kelurahan,
        Kecamatan: data.kecamatan,
        "Foto Pemilik": urlFotoPemilik,
        "Foto Tempat Usaha": urlFotoUsaha,
        "Foto KTP": urlFotoKtp,
    };

    // Insert data baru ke Supabase
    const { error } = await supabase
        .from('datawp')
        .insert([insertData]);
    if (error) throw new Error('Gagal membuat WP di Supabase.');
    return { message: `Data WP dengan NPWPD ${newNpwpd} berhasil dibuat.` };
}


async function handleUpdateWp(data) {
    const { data: result, error } = await supabase
        .from('datawp')
        .update({
            "Nama Usaha": data.namaUsaha,
            "Nama Pemilik": data.namaPemilik,
            "NIK KTP": data.nikKtp,
            Alamat: data.alamat,
            Telephone: data.telephone,
            Kelurahan: data.kelurahan,
            Kecamatan: data.kecamatan,
        })
        .eq('NPWPD', data.npwpd);

    if (error) throw new Error(`Gagal update WP di Supabase: ${error.message}`);
    return { message: "Data WP berhasil diperbarui" };
}


async function handleDeleteWp(data) {
    const { data: result, error } = await supabase
        .from('datawp')
        .delete()
        .eq('NPWPD', data.npwpd);

    if (error) throw new Error(`Gagal hapus WP di Supabase: ${error.message}`);
    return { message: "Data WP berhasil dihapus" };
}