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

// Helper function untuk query dengan timeout
async function queryWithTimeout(queryPromise, timeoutMs = 8000) {
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
    );
    return Promise.race([queryPromise, timeoutPromise]);
}

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
    console.log('API Handler started for method:', event.httpMethod, 'path:', event.path);

    // Pastikan Content-Type adalah application/json
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json', // Tambahkan ini untuk memastikan response JSON
    };

    if (event.httpMethod === 'OPTIONS') {
        console.log('API Handler: Handling OPTIONS request');
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        console.log('API Request:', {
            method: event.httpMethod,
            path: event.path,
            body: event.body ? JSON.parse(event.body) : null
        });

        let responseData;
        if (event.httpMethod === 'GET') {
            responseData = await handleGet();
        } else if (event.httpMethod === 'POST') {
            if (!event.body) {
                throw new Error('Request body is required for POST requests');
            }
            
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
                case 'createKetetapan':
                    responseData = await handleCreateKetetapan(body);
                    break;
                case 'updateKetetapan':
                    responseData = await handleUpdateKetetapan(body);
                    break;
                case 'deleteKetetapan':
                    responseData = await handleDeleteKetetapan(body);
                    break;
                case 'createPembayaran':
                    responseData = await handleCreatePembayaran(body);
                    break;
                case 'deletePembayaran':
                    responseData = await handleDeletePembayaran(body);
                    break;
                case 'createFiskal':
                    responseData = await handleCreateFiskal(body);
                    break;
                case 'deleteFiskal':
                    responseData = await handleDeleteFiskal(body);
                    break;
                case 'getNextFiskalNumber':
                    responseData = await handleGetNextFiskalNumber();
                    break;
                case 'autoCreateFiskal':
                    responseData = await handleAutoCreateFiskal(body);
                    break;
                case 'createTarget':
                    responseData = await handleCreateTarget(body);
                    break;
                case 'deleteTarget':
                    responseData = await handleDeleteTarget(body);
                    break;
                default:
                    throw new Error(`Aksi '${body.action}' tidak dikenali`);
            }
        } else {
            throw new Error(`Metode HTTP ${event.httpMethod} tidak didukung.`);
        }
        
        const successResponse = { status: 'sukses', ...responseData };
        console.log('API Success Response:', successResponse);

        let body;
        try {
            body = JSON.stringify(successResponse);
            console.log('API Handler: Response serialized successfully, body length:', body.length);

            // Ensure we have a valid body
            if (!body || body.length === 0) {
                console.error('API Handler: Empty body detected, using fallback');
                body = JSON.stringify({
                    status: 'gagal',
                    message: 'Empty response generated',
                    timestamp: new Date().toISOString()
                });
            }
        } catch (stringifyError) {
            console.error('API Error serializing success response:', stringifyError);
            body = JSON.stringify({
                status: 'gagal',
                message: 'Error serializing response data',
                error: stringifyError.message,
                timestamp: new Date().toISOString()
            });
        }

        console.log('API Handler finished successfully');
        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Length': Buffer.byteLength(body, 'utf8').toString()
            },
            body: body,
        };

    } catch (error) {
        console.error('API ERROR:', error);
        console.error('API ERROR Stack:', error.stack);

        const errorResponse = {
            status: 'gagal',
            message: error.message || 'Terjadi error pada server.',
            timestamp: new Date().toISOString(),
            errorType: error.name || 'UnknownError'
        };

        console.log('API Error Response:', errorResponse);

        let body;
        try {
            body = JSON.stringify(errorResponse);
            console.log('API Handler: Error response serialized, body length:', body.length);
        } catch (stringifyError) {
            console.error('API Error serializing error response:', stringifyError);
            body = JSON.stringify({
                status: 'gagal',
                message: 'Internal server error - serialization failed',
                timestamp: new Date().toISOString()
            });
        }

        return {
            statusCode: 500,
            headers: {
                ...headers,
                'Content-Length': Buffer.byteLength(body, 'utf8').toString()
            },
            body: body
        };
    }
};

// =================================================================
// FUNGSI-FUNGSI HANDLER
// =================================================================

async function handleGet() {
    console.log('handleGet: Starting data fetch from database');
    console.log('handleGet: Environment check:', {
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
        supabaseUrl: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
        supabaseKey: process.env.SUPABASE_SERVICE_KEY ? 'SET' : 'NOT SET'
    });

    // Check if Supabase is properly configured
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
        console.error('handleGet: Supabase environment variables not configured!');
        return {
            wajibPajak: [],
            wilayah: [],
            masterPajak: [],
            ketetapan: [],
            pembayaran: [],
            fiskal: [],
            targetPajakRetribusi: [],
            error: 'Database configuration missing'
        };
    }

    try {
        console.log('handleGet: Attempting to connect to Supabase...');

        // Test connection first
        const { data: testData, error: testError } = await supabase
            .from('datawp')
            .select('count', { count: 'exact', head: true });

        if (testError) {
            console.error('handleGet: Database connection test failed:', testError);
            throw new Error('Database connection failed: ' + testError.message);
        }

        console.log('handleGet: Database connection successful, count:', testData);

        // Fetch all data from Supabase with individual error handling
        console.log('handleGet: Starting individual data fetches...');

        let wajibPajak = [], wilayah = [], masterPajak = [], ketetapan = [], pembayaran = [], fiskal = [], targetPajakRetribusi = [];

        // Fetch wajibPajak
        try {
            const { data, error } = await queryWithTimeout(supabase.from('datawp').select('*'));
            wajibPajak = data || [];
            if (error) console.warn('handleGet: Error fetching wajibPajak:', error);
        } catch (err) {
            console.warn('handleGet: Exception fetching wajibPajak:', err);
        }

        // Fetch wilayah
        try {
            const { data, error } = await queryWithTimeout(supabase.from('Wilayah').select('*'));
            wilayah = data || [];
            if (error) console.warn('handleGet: Error fetching wilayah:', error);
        } catch (err) {
            console.warn('handleGet: Exception fetching wilayah:', err);
        }

        // Fetch masterPajak
        try {
            const { data, error } = await queryWithTimeout(supabase.from('MasterPajakRetribusi').select('*'));
            masterPajak = data || [];
            if (error) console.warn('handleGet: Error fetching masterPajak:', error);
        } catch (err) {
            console.warn('handleGet: Exception fetching masterPajak:', err);
        }

        // Fetch ketetapan
        try {
            const { data, error } = await queryWithTimeout(supabase.from('KetetapanPajak').select('*'));
            ketetapan = data || [];
            if (error) console.warn('handleGet: Error fetching ketetapan:', error);
        } catch (err) {
            console.warn('handleGet: Exception fetching ketetapan:', err);
        }

        // Fetch pembayaran
        try {
            const { data, error } = await queryWithTimeout(supabase.from('RiwayatPembayaran').select('*'));
            pembayaran = data || [];
            if (error) console.warn('handleGet: Error fetching pembayaran:', error);
        } catch (err) {
            console.warn('handleGet: Exception fetching pembayaran:', err);
        }

        // Fetch fiskal
        try {
            const { data, error } = await queryWithTimeout(supabase.from('Fiskal').select('*'));
            fiskal = data || [];
            if (error) console.warn('handleGet: Error fetching fiskal:', error);
        } catch (err) {
            console.warn('handleGet: Exception fetching fiskal:', err);
        }

        // Fetch target
        try {
            const { data, error } = await queryWithTimeout(supabase.from('TargetPajakRetribusi').select('*'));
            targetPajakRetribusi = data || [];
            if (error) console.warn('handleGet: Error fetching target:', error);
        } catch (err) {
            console.warn('handleGet: Exception fetching target:', err);
        }

        const result = {
            wajibPajak,
            wilayah,
            masterPajak,
            ketetapan,
            pembayaran,
            fiskal,
            targetPajakRetribusi,
        };

        console.log('handleGet: Successfully fetched data from database');
        console.log('handleGet: Data counts:', {
            wajibPajak: result.wajibPajak.length,
            wilayah: result.wilayah.length,
            masterPajak: result.masterPajak.length,
            ketetapan: result.ketetapan.length,
            pembayaran: result.pembayaran.length,
            fiskal: result.fiskal.length,
            targetPajakRetribusi: result.targetPajakRetribusi.length
        });

        return result;

    } catch (error) {
        console.error('handleGet: Critical error fetching data from database:', error);
        console.error('handleGet: Error stack:', error.stack);

        // Return empty data structure as fallback with error info
        return {
            wajibPajak: [],
            wilayah: [],
            masterPajak: [],
            ketetapan: [],
            pembayaran: [],
            fiskal: [],
            targetPajakRetribusi: [],
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
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

// =================================================================
// FUNGSI-FUNGSI HANDLER TAMBAHAN
// =================================================================

async function handleCreateKetetapan(data) {
    const now = new Date();
    const bulanRomawi = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][now.getMonth()];
    const tahun = now.getFullYear();

    // Ambil data master pajak untuk tipe dan nama layanan
    let tipeLayanan = '';
    let namaLayanan = '';
    try {
        const { data: master } = await supabase
            .from('MasterPajakRetribusi')
            .select('Tipe,NamaLayanan')
            .eq('KodeLayanan', data.kodeLayanan)
            .single();
        tipeLayanan = master ? master.Tipe : '';
        namaLayanan = master ? master.NamaLayanan : '';
    } catch (e) {
        tipeLayanan = '';
        namaLayanan = '';
    }

    // Tentukan SKPD/SKRD
    let kodeSurat = '';
    if (tipeLayanan === 'Pajak') {
        kodeSurat = 'SKPD';
    } else if (tipeLayanan === 'Retribusi') {
        kodeSurat = 'SKRD';
    } else if (namaLayanan) {
        kodeSurat = `SKRD-${namaLayanan.replace(/\s+/g, '-')}`;
    } else {
        kodeSurat = 'SKRD';
    }

    // Logika tanggal dan denda
    const tanggalKetetapan = now; // Tanggal ketetapan selalu tanggal saat ini
    let denda = 0;
    if (data.tglTunggakan) {
        const tanggalTunggakan = new Date(data.tglTunggakan);
        const today = new Date();
        let bulanTunggakan = (today.getFullYear() - tanggalTunggakan.getFullYear()) * 12 + (today.getMonth() - tanggalTunggakan.getMonth());
        if (today.getDate() > tanggalTunggakan.getDate()) bulanTunggakan += 1;
        if (bulanTunggakan < 1) bulanTunggakan = 1;
        denda = bulanTunggakan * 0.02 * Number(data.jumlahPokok);
    }
    denda = Math.round(denda);
    const jumlahPokok = Number(data.jumlahPokok);
    const totalTagihan = jumlahPokok + denda;

    // Retry logic untuk mengatasi race condition
    let maxRetries = 5;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
        try {
            // Gunakan count untuk mendapatkan nomor urut yang lebih reliable
            const { count, error: countError } = await supabase
                .from('KetetapanPajak')
                .select('*', { count: 'exact', head: true });
            
            if (countError) throw new Error('Gagal mengambil jumlah ketetapan: ' + countError.message);
            
            // Generate nomor urut berdasarkan total count + 1 + timestamp untuk uniqueness
            const baseSequence = (count || 0) + 1;
            const timestamp = Date.now().toString().slice(-3); // 3 digit terakhir timestamp
            const nomorUrut = `${baseSequence.toString().padStart(4, '0')}${timestamp}`;
            
            // Gabungkan ID_Ketetapan dengan format yang lebih unik
            const ID_Ketetapan = `${nomorUrut}/${kodeSurat}/${bulanRomawi}/${tahun}`;

            // Coba insert data
            const { error } = await supabase
                .from('KetetapanPajak')
                .insert([{
                    ID_Ketetapan,
                    KodeLayanan: data.kodeLayanan,
                    NPWPD: data.npwpd,
                    MasaPajak: data.masaPajak,
                    TanggalKetetapan: tanggalKetetapan,
                    TanggalTunggakan: data.tglTunggakan ? new Date(data.tglTunggakan).toISOString() : null,
                    JumlahPokok: jumlahPokok,
                    Denda: denda,
                    TotalTagihan: totalTagihan,
                    Status: 'Belum Lunas',
                    Catatan: data.catatan || ''
                }]);

            if (!error) {
                // Berhasil, keluar dari loop
                return { message: 'Ketetapan berhasil dibuat!', id_ketetapan: ID_Ketetapan };
            }

            // Jika error adalah duplicate key, coba lagi
            if (error.message && error.message.includes('duplicate key')) {
                retryCount++;
                if (retryCount >= maxRetries) {
                    throw new Error('Gagal membuat ketetapan setelah beberapa percobaan: ' + error.message);
                }
                // Tunggu sebentar sebelum retry (random delay untuk mengurangi collision)
                await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
                continue;
            } else {
                // Error lain, langsung throw
                throw new Error('Gagal membuat ketetapan: ' + error.message);
            }
        } catch (e) {
            if (retryCount >= maxRetries - 1) {
                throw e;
            }
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
        }
    }
    
    throw new Error('Gagal membuat ketetapan setelah beberapa percobaan');
}

// Handler update ketetapan
async function handleUpdateKetetapan(data) {
    // Ambil data lama
    const { data: lama, error: errLama } = await supabase
        .from('KetetapanPajak')
        .select('*')
        .eq('ID_Ketetapan', data.id_ketetapan)
        .single();
    if (errLama || !lama) throw new Error('Data ketetapan tidak ditemukan!');

    // Hitung denda dan total tagihan ulang
    let denda = 0;
    let tanggalKetetapan = lama.TanggalKetetapan ? new Date(lama.TanggalKetetapan) : new Date();
    if (lama.TanggalKetetapan) {
        const today = new Date();
        let bulanTunggakan = (today.getFullYear() - tanggalKetetapan.getFullYear()) * 12 + (today.getMonth() - tanggalKetetapan.getMonth());
        if (today.getDate() > tanggalKetetapan.getDate()) bulanTunggakan += 1;
        if (bulanTunggakan < 1) bulanTunggakan = 1;
        denda = bulanTunggakan * 0.02 * Number(data.jumlahPokok);
    }
    denda = Math.round(denda);
    const jumlahPokok = Number(data.jumlahPokok);
    const totalTagihan = jumlahPokok + denda;

    const { error } = await supabase
        .from('KetetapanPajak')
        .update({
            MasaPajak: data.masaPajak,
            JumlahPokok: jumlahPokok,
            Denda: denda,
            TotalTagihan: totalTagihan
        })
        .eq('ID_Ketetapan', data.id_ketetapan);
    if (error) throw new Error('Gagal update ketetapan: ' + error.message);
    return { message: 'Ketetapan berhasil diperbarui!' };
}

// Handler hapus ketetapan
async function handleDeleteKetetapan(data) {
    console.log('DELETE REQUEST:', data); // Debug log

    if (!data.id_ketetapan) {
        throw new Error('ID ketetapan tidak ditemukan dalam request');
    }

    // First, check if the record exists
    const { data: existingRecord, error: findError } = await supabase
        .from('KetetapanPajak')
        .select('*')
        .eq('ID_Ketetapan', data.id_ketetapan)
        .single();

    if (findError && findError.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Error checking record existence:', findError);
        throw new Error('Gagal memeriksa data ketetapan: ' + findError.message);
    }

    if (!existingRecord) {
        console.warn('Record not found for deletion:', data.id_ketetapan);
        return { message: 'Data ketetapan tidak ditemukan atau sudah dihapus' };
    }

    console.log('Found record to delete:', existingRecord);

    // Perform the deletion
    const { error } = await supabase
        .from('KetetapanPajak')
        .delete()
        .eq('ID_Ketetapan', data.id_ketetapan);

    if (error) {
        console.error('Delete error:', error);
        throw new Error('Gagal hapus ketetapan: ' + error.message);
    }

    // Verify deletion
    const { data: verifyDeleted, error: verifyError } = await supabase
        .from('KetetapanPajak')
        .select('*')
        .eq('ID_Ketetapan', data.id_ketetapan)
        .single();

    if (verifyDeleted) {
        console.error('Record still exists after deletion attempt');
        throw new Error('Data gagal dihapus dari database');
    }

    console.log('Successfully deleted ketetapan:', data.id_ketetapan);
    return { message: 'Ketetapan berhasil dihapus!' };
}

// Handler create pembayaran
async function handleCreatePembayaran(data) {
    // Ambil ID_Ketetapan untuk menentukan SSPD/SSRD
    let kodeSurat = 'SSPD';
    if (data.id_ketetapan && typeof data.id_ketetapan === 'string') {
        if (data.id_ketetapan.includes('SKRD')) {
            kodeSurat = 'SSRD';
        } else if (data.id_ketetapan.includes('SKPD')) {
            kodeSurat = 'SSPD';
        }
    }

    // Bulan romawi dan tahun
    const now = new Date();
    const bulanRomawi = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][now.getMonth()];
    const tahun = now.getFullYear();

    // Retry logic untuk mengatasi race condition
    let maxRetries = 5;
    let retryCount = 0;
    let ID_Pembayaran = '';
    
    while (retryCount < maxRetries) {
        try {
            // Ambil nomor urut dengan count + timestamp untuk uniqueness
            const { count, error: countError } = await supabase
                .from('RiwayatPembayaran')
                .select('*', { count: 'exact', head: true });
            if (countError) throw new Error('Gagal mengambil nomor urut pembayaran: ' + countError.message);
            
            const baseSequence = (count || 0) + 1;
            const timestamp = Date.now().toString().slice(-3); // 3 digit terakhir timestamp
            const nomorUrut = `${baseSequence.toString().padStart(4, '0')}${timestamp}`;
            
            // Gabungkan ID_Pembayaran
            ID_Pembayaran = `${nomorUrut}/${kodeSurat}/${bulanRomawi}/${tahun}`;

            const { error } = await supabase
                .from('RiwayatPembayaran')
                .insert([{
                    ID_Pembayaran,
                    ID_Ketetapan: data.id_ketetapan,
                    NPWPD: data.npwpd,
                    TanggalBayar: data.tanggalBayar,
                    JumlahBayar: Number(data.jumlahBayar),
                    MetodeBayar: data.metodeBayar,
                    WaktuInput: data.waktuInput,
                    Operator: data.operator,
                    StatusPembayaran: data.statusPembayaran
                }]);

            if (!error) {
                // Berhasil, keluar dari loop
                break;
            }

            // Jika error adalah duplicate key, coba lagi
            if (error.message && error.message.includes('duplicate key')) {
                retryCount++;
                if (retryCount >= maxRetries) {
                    throw new Error('Gagal mencatat pembayaran setelah beberapa percobaan: ' + error.message);
                }
                await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
                continue;
            } else {
                throw new Error('Gagal mencatat pembayaran: ' + error.message);
            }
        } catch (e) {
            if (retryCount >= maxRetries - 1) {
                throw e;
            }
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
        }
    }

    if (retryCount >= maxRetries) {
        throw new Error('Gagal mencatat pembayaran setelah beberapa percobaan');
    }

    // Hitung total pembayaran untuk ketetapan ini
    const { data: pembayaranList, error: pembayaranError } = await supabase
        .from('RiwayatPembayaran')
        .select('JumlahBayar')
        .eq('ID_Ketetapan', data.id_ketetapan);
    if (pembayaranError) throw new Error('Gagal mengambil riwayat pembayaran: ' + pembayaranError.message);
    const totalBayar = (pembayaranList || []).reduce((sum, p) => sum + Number(p.JumlahBayar), 0);

    // Ambil total tagihan dari KetetapanPajak
    const { data: ketetapan, error: ketetapanError } = await supabase
        .from('KetetapanPajak')
        .select('TotalTagihan')
        .eq('ID_Ketetapan', data.id_ketetapan)
        .single();
    if (ketetapanError) throw new Error('Gagal mengambil data ketetapan: ' + ketetapanError.message);

    // Update status ketetapan sesuai total pembayaran
    let statusBaru = 'Belum Lunas';
    if (totalBayar >= Number(ketetapan.TotalTagihan)) {
        statusBaru = 'Lunas';
    }
    const { error: updateError } = await supabase
        .from('KetetapanPajak')
        .update({ Status: statusBaru })
        .eq('ID_Ketetapan', data.id_ketetapan);
    if (updateError) throw new Error('Gagal update status ketetapan: ' + updateError.message);

    return { message: 'Pembayaran berhasil dicatat!', id_pembayaran: ID_Pembayaran };
}

// Handler hapus pembayaran
async function handleDeletePembayaran(data) {
    const { error } = await supabase
        .from('RiwayatPembayaran')
        .delete()
        .eq('ID_Pembayaran', data.id_pembayaran);
    if (error) throw new Error('Gagal hapus pembayaran: ' + error.message);
    return { message: 'Pembayaran berhasil dihapus!' };
}

// Handler create fiskal
async function handleCreateFiskal(data) {
    // Bulan romawi dan tahun
    const now = new Date();
    const bulanRomawi = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][now.getMonth()];
    const tahun = now.getFullYear();

    // Tanggal cetak dan berlaku
    const tanggal_cetak = now.toISOString();
    const tanggal_berlaku = new Date(now.getFullYear()+1, now.getMonth(), now.getDate()).toISOString();

    // Retry logic untuk mengatasi race condition
    let maxRetries = 5;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
        try {
            // Ambil nomor urut dengan count + timestamp untuk uniqueness
            const { count, error: countError } = await supabase
                .from('Fiskal')
                .select('*', { count: 'exact', head: true });
            if (countError) throw new Error('Gagal mengambil nomor urut fiskal: ' + countError.message);
            
            const baseSequence = (count || 0) + 1;
            const timestamp = Date.now().toString().slice(-3); // 3 digit terakhir timestamp
            const nomorUrut = `${baseSequence.toString().padStart(3, '0')}${timestamp}`;
            
            // Gabungkan nomor_fiskal
            const nomor_fiskal = `${nomorUrut}/FKL/BPPKAD/${bulanRomawi}/${tahun}`;

            // Insert data ke tabel Fiskal
            const { error, data: inserted } = await supabase
                .from('Fiskal')
                .insert([{
                    nomor_fiskal,
                    NPWPD: data.npwpd,
                    "Nama Pemilik": data.nama_pemilik,
                    "Nama Usaha": data.nama_usaha,
                    Alamat: data.alamat,
                    tanggal_cetak,
                    tanggal_berlaku,
                    operator: data.operator,
                    keterangan: data.keterangan || ''
                }])
                .select('*')
                .single();

            if (!error) {
                return { status: 'sukses', ...inserted };
            }

            // Jika error adalah duplicate key, coba lagi
            if (error.message && error.message.includes('duplicate key')) {
                retryCount++;
                if (retryCount >= maxRetries) {
                    return { status: 'gagal', message: 'Gagal membuat dokumen fiskal setelah beberapa percobaan: ' + error.message };
                }
                await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
                continue;
            } else {
                return { status: 'gagal', message: 'Gagal membuat dokumen fiskal: ' + error.message };
            }
        } catch (e) {
            if (retryCount >= maxRetries - 1) {
                return { status: 'gagal', message: 'Gagal membuat dokumen fiskal: ' + e.message };
            }
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
        }
    }
    
    return { status: 'gagal', message: 'Gagal membuat dokumen fiskal setelah beberapa percobaan' };
}

// Handler hapus fiskal
async function handleDeleteFiskal(data) {
    // Hapus berdasarkan id_fiskal jika ada, jika tidak pakai NPWPD
    let filter = {};
    if (data.id_fiskal) {
        filter = { id_fiskal: data.id_fiskal };
    } else if (data.npwpd) {
        filter = { NPWPD: data.npwpd };
    } else {
        throw new Error('ID fiskal atau NPWPD wajib diisi untuk hapus data fiskal!');
    }
    const { error } = await supabase
        .from('Fiskal')
        .delete()
        .match(filter);
    if (error) throw new Error('Gagal hapus data fiskal: ' + error.message);
    return { message: 'Data fiskal berhasil dihapus!' };
}

// Handler untuk mendapatkan nomor fiskal berikutnya
async function handleGetNextFiskalNumber() {
    try {
        // Ambil nomor urut dengan count + timestamp untuk uniqueness
        const { count, error: countError } = await supabase
            .from('Fiskal')
            .select('*', { count: 'exact', head: true });
        if (countError) throw new Error('Gagal mengambil nomor urut fiskal: ' + countError.message);
        
        const baseSequence = (count || 0) + 1;
        const timestamp = Date.now().toString().slice(-3); // 3 digit terakhir timestamp
        const nomorUrut = `${baseSequence.toString().padStart(3, '0')}${timestamp}`;

        // Bulan romawi dan tahun
        const now = new Date();
        const bulanRomawi = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][now.getMonth()];
        const tahun = now.getFullYear();

        // Gabungkan nomor_fiskal
        const nomor_fiskal = `${nomorUrut}/FKL/BPPKAD/${bulanRomawi}/${tahun}`;

        return {
            nomor_fiskal,
            nomor_urut: nomorUrut,
            bulan_romawi: bulanRomawi,
            tahun: tahun
        };
    } catch (error) {
        throw new Error('Gagal mendapatkan nomor fiskal: ' + error.message);
    }
}

// Handler untuk auto-create fiskal saat kondisi terpenuhi
async function handleAutoCreateFiskal(data) {
    try {
        const { npwpd } = data;
        
        // Ambil data pembayaran, ketetapan, dan master pajak
        const [
            { data: pembayaran },
            { data: ketetapan },
            { data: masterPajak },
            { data: wajibPajak }
        ] = await Promise.all([
            supabase.from('RiwayatPembayaran').select('*').eq('NPWPD', npwpd),
            supabase.from('KetetapanPajak').select('*'),
            supabase.from('MasterPajakRetribusi').select('*'),
            supabase.from('datawp').select('*').eq('NPWPD', npwpd).single()
        ]);

        // Cek apakah sudah ada fiskal untuk NPWPD ini
        const { data: existingFiskal } = await supabase
            .from('Fiskal')
            .select('*')
            .eq('NPWPD', npwpd);

        if (existingFiskal && existingFiskal.length > 0) {
            return { 
                status: 'sukses', 
                message: 'Fiskal sudah ada untuk NPWPD ini',
                fiskal: existingFiskal[0]
            };
        }

        // Cek pembayaran lunas Pajak Reklame dan Retribusi Persampahan
        let lunasReklame = false;
        let lunasSampah = false;

        pembayaran.forEach(bayar => {
            const ket = ketetapan.find(k => k.ID_Ketetapan === bayar.ID_Ketetapan);
            if (!ket) return;
            
            const m = masterPajak.find(m => m.KodeLayanan === ket.KodeLayanan);
            if (!m) return;
            
            if (m.NamaLayanan && m.NamaLayanan.toLowerCase().includes('reklame') && bayar.StatusPembayaran === 'Sukses') {
                lunasReklame = true;
            }
            if (m.NamaLayanan && m.NamaLayanan.toLowerCase().includes('sampah') && bayar.StatusPembayaran === 'Sukses') {
                lunasSampah = true;
            }
        });

        // Jika kedua syarat terpenuhi, buat fiskal
        if (lunasReklame && lunasSampah) {
            // Bulan romawi dan tahun
            const now = new Date();
            const bulanRomawi = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][now.getMonth()];
            const tahun = now.getFullYear();

            // Tanggal cetak dan berlaku
            const tanggal_cetak = now.toISOString();
            const tanggal_berlaku = new Date(now.getFullYear()+1, now.getMonth(), now.getDate()).toISOString();

            // Retry logic untuk mengatasi race condition
            let maxRetries = 5;
            let retryCount = 0;
            
            while (retryCount < maxRetries) {
                try {
                    // Ambil nomor urut dengan count + timestamp untuk uniqueness
                    const { count, error: countError } = await supabase
                        .from('Fiskal')
                        .select('*', { count: 'exact', head: true });
                    if (countError) throw new Error('Gagal mengambil nomor urut fiskal: ' + countError.message);
                    
                    const baseSequence = (count || 0) + 1;
                    const timestamp = Date.now().toString().slice(-3); // 3 digit terakhir timestamp
                    const nomorUrut = `${baseSequence.toString().padStart(3, '0')}${timestamp}`;
                    
                    // Gabungkan nomor_fiskal
                    const nomor_fiskal = `${nomorUrut}/FKL/BPPKAD/${bulanRomawi}/${tahun}`;

                    // Insert data ke tabel Fiskal
                    const { error, data: inserted } = await supabase
                        .from('Fiskal')
                        .insert([{
                            nomor_fiskal,
                            NPWPD: npwpd,
                            "Nama Pemilik": wajibPajak?.['Nama Pemilik'] || '',
                            "Nama Usaha": wajibPajak?.['Nama Usaha'] || '',
                            Alamat: wajibPajak?.Alamat || '',
                            tanggal_cetak,
                            tanggal_berlaku,
                            operator: 'Sistem',
                            keterangan: 'Auto-generated saat syarat terpenuhi'
                        }])
                        .select('*')
                        .single();

                    if (!error) {
                        return {
                            status: 'sukses',
                            message: 'Fiskal berhasil dibuat otomatis',
                            fiskal: inserted
                        };
                    }

                    // Jika error adalah duplicate key, coba lagi
                    if (error.message && error.message.includes('duplicate key')) {
                        retryCount++;
                        if (retryCount >= maxRetries) {
                            return { status: 'gagal', message: 'Gagal membuat dokumen fiskal setelah beberapa percobaan: ' + error.message };
                        }
                        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
                        continue;
                    } else {
                        return { status: 'gagal', message: 'Gagal membuat dokumen fiskal: ' + error.message };
                    }
                } catch (e) {
                    if (retryCount >= maxRetries - 1) {
                        return { status: 'gagal', message: 'Gagal membuat dokumen fiskal: ' + e.message };
                    }
                    retryCount++;
                    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
                }
            }
            
            return { status: 'gagal', message: 'Gagal membuat dokumen fiskal setelah beberapa percobaan' };
        } else {
            return { 
                status: 'gagal', 
                message: 'NPWPD belum memenuhi syarat (belum lunas reklame dan sampah)',
                requirements: { lunasReklame, lunasSampah }
            };
        }

    } catch (error) {
        throw new Error('Gagal auto-create fiskal: ' + error.message);
    }
}

async function handleCreateTarget(data) {
    const { KodeLayanan, Tahun, Target, NamaLayanan } = data;
    if (!KodeLayanan || !Tahun || Target === undefined || Target === null) throw new Error('Data tidak lengkap!');
    const { error } = await supabase
        .from('TargetPajakRetribusi')
        .upsert([{ KodeLayanan, Tahun, Target, NamaLayanan }]);
    if (error) throw new Error('Gagal menyimpan target: ' + error.message);
    return { message: 'Target berhasil disimpan!' };
}

async function handleDeleteTarget(data) {
    const { KodeLayanan, Tahun } = data;
    if (!KodeLayanan || !Tahun) throw new Error('Data tidak lengkap!');
    const { error } = await supabase
        .from('TargetPajakRetribusi')
        .delete()
        .eq('KodeLayanan', KodeLayanan)
        .eq('Tahun', Tahun);
    if (error) throw new Error('Gagal menghapus target: ' + error.message);
    return { message: 'Target berhasil dihapus!' };
}
