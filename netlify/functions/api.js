// File: netlify/functions/api.js (Versi Final dengan CRUD WP)
const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');

// --- KONFIGURASI ---
// Kredensial ini dibaca dari Environment Variables di Netlify
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const FOLDER_ID = "1x3EmFN0kM7x9Th0ZxsHEWX7hFNU6Vum8"; // ID Folder Google Drive Anda
// --------------------

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
                // Logika untuk ketetapan akan ditambahkan nanti
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
    ] = await Promise.all([
        supabase.from('datawp').select('*'),
        supabase.from('Wilayah').select('*'),
    ]);

    if (wpError) throw new Error(`Error mengambil data WP: ${wpError.message}`);
    if (wilayahError) throw new Error(`Error mengambil data Wilayah: ${wilayahError.message}`);

    return {
        wajibPajak: wajibPajak || [],
        wilayah: wilayah || [],
        // Data lain kita kosongkan untuk saat ini
        masterPajak: [],
        ketetapan: [],
        pembayaran: [],
    };
}

async function handleCreateWp(data) {
    // Logika untuk upload foto (jika diperlukan)
    // const auth = await getAuthClient();
    // const drive = google.drive({ version: 'v3', auth });
    // const urlFotoPemilik = await uploadFile(drive, data.fotoPemilik, `pemilik_${data.npwpd}`);

    const { data: result, error } = await supabase
        .from('datawp')
        .insert([{
            NPWPD: data.npwpd,
            JenisWP: data.jenisWp,
            "Nama Usaha": data.namaUsaha,
            "Nama Pemilik": data.namaPemilik,
            "NIK KTP": data.nikKtp,
            Alamat: data.alamat,
            Telephone: data.telephone,
            Kelurahan: data.kelurahan,
            Kecamatan: data.kecamatan,
            // "Foto Pemilik": urlFotoPemilik,
        }]);

    if (error) throw new Error(`Gagal membuat WP di Supabase: ${error.message}`);
    return { message: `Data WP dengan NPWPD ${data.npwpd} berhasil dibuat.` };
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