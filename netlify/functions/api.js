// File: netlify/functions/api.js
const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');

// --- Inisialisasi Klien ---
// Kredensial ini dibaca dari Environment Variables di Netlify
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Fungsi untuk otentikasi dengan Google (hanya untuk Drive)
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
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers };
    }

    try {
        let responseData;
        if (event.httpMethod === 'GET') {
            responseData = await handleGet();
        } else if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            // Logika untuk POST akan kita tambahkan setelah GET ini berhasil
            responseData = { status: 'sukses', message: 'POST request diterima', data: body };
        } else {
            throw new Error(`Metode HTTP ${event.httpMethod} tidak didukung.`);
        }
        return { statusCode: 200, headers, body: JSON.stringify(responseData) };

    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ status: 'gagal', message: error.message }) };
    }
};

// =================================================================
// FUNGSI-FUNGSI HANDLER
// =================================================================

async function handleGet() {
    // Mengambil semua data dari setiap tabel di Supabase secara paralel
    const [
        { data: wajibPajak, error: wpError },
        { data: wilayah, error: wilayahError },
        { data: masterPajak, error: masterPajakError },
        { data: ketetapan, error: ketetapanError },
        { data: pembayaran, error: pembayaranError }
    ] = await Promise.all([
        supabase.from('datawp').select('*'),
        supabase.from('Wilayah').select('*'),
        supabase.from('MasterPajakRetribusi').select('*'),
        supabase.from('KetetapanPajak').select('*'),
        supabase.from('RiwayatPembayaran').select('*')
    ]);

    // Jika ada error saat mengambil salah satu data, lemparkan error
    if (wpError) throw new Error(`Error mengambil data WP: ${wpError.message}`);
    if (wilayahError) throw new Error(`Error mengambil data Wilayah: ${wilayahError.message}`);
    if (masterPajakError) throw new Error(`Error mengambil data Master: ${masterPajakError.message}`);
    if (ketetapanError) throw new Error(`Error mengambil data Ketetapan: ${ketetapanError.message}`);
    if (pembayaranError) throw new Error(`Error mengambil data Pembayaran: ${pembayaranError.message}`);

    return {
        wajibPajak: wajibPajak || [],
        wilayah: wilayah || [],
        masterPajak: masterPajak || [],
        ketetapan: ketetapan || [],
        pembayaran: pembayaran || [],
    };
}