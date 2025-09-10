const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');

// --- KONFIGURASI ---
// Kredensial ini dibaca dari Environment Variables di Netlify
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// Validasi environment variables
if (!supabaseUrl || !supabaseKey) {
    console.error('❌ MISSING ENVIRONMENT VARIABLES:');
    console.error('- SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
    console.error('- SUPABASE_SERVICE_KEY:', supabaseKey ? '✅ Set' : '❌ Missing');
    throw new Error('Required environment variables are missing. Please check Netlify environment settings.');
}

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
    console.log('🚀 API Handler started for method:', event.httpMethod, 'path:', event.path);
    console.log('🌍 Environment check:', {
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
        hasGoogleCreds: !!process.env.GOOGLE_CREDENTIALS,
        nodeEnv: process.env.NODE_ENV || 'development'
    });

    // Pastikan Content-Type adalah application/json
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
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
        console.log('📥 API Request:', {
            method: event.httpMethod,
            path: event.path,
            hasBody: !!event.body,
            bodyLength: event.body ? event.body.length : 0,
            headers: event.headers
        });

        // Validasi environment variables sebelum memproses request
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
            console.error('❌ Environment variables missing during request processing');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    status: 'gagal',
                    message: 'Server configuration error: Missing database credentials',
                    timestamp: new Date().toISOString(),
                    errorType: 'ConfigurationError'
                })
            };
        }

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
        console.log('✅ API Success Response:', {
            status: successResponse.status,
            hasData: !!responseData,
            dataKeys: responseData ? Object.keys(responseData) : []
        });

        const body = JSON.stringify(successResponse);
        const contentLength = Buffer.byteLength(body, 'utf8').toString();

        console.log('📤 API Handler: Body length:', body.length);
        console.log('📤 API Handler: Content-Length:', contentLength);
        console.log('🎉 API Handler finished successfully');

        // Return response with minimal headers
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': contentLength,
                'Access-Control-Allow-Origin': '*'
            },
            body: body,
        };

    } catch (error) {
        console.error('❌ API ERROR:', error.message);
        console.error('❌ API ERROR Stack:', error.stack);
        console.error('❌ API ERROR Details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            details: error.details
        });

        const errorResponse = {
            status: 'gagal',
            message: error.message || 'Terjadi error pada server.',
            timestamp: new Date().toISOString(),
            errorType: error.name || 'UnknownError',
            environment: process.env.NODE_ENV || 'development'
        };

        console.log('📤 API Error Response:', errorResponse);

        const body = JSON.stringify(errorResponse);
        const contentLength = Buffer.byteLength(body, 'utf8').toString();

        console.log('API Handler: Error body length:', body.length);
        console.log('API Handler: Error Content-Length:', contentLength);

        // Return error response with minimal headers
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': contentLength,
                'Access-Control-Allow-Origin': '*'
            },
            body: body,
        };
    }
};

// =================================================================
// FUNGSI-FUNGSI HANDLER
// =================================================================

async function handleGet() {
    console.log('handleGet: Starting data fetch - FIXED VERSION');

    try {
        // Fetch all data from Supabase with timeout protection
        console.log('🔍 DEBUG: handleGet - Starting database queries');
        const [
            { data: wajibPajak, error: wpError },
            { data: wilayah, error: wilayahError },
            { data: masterPajak, error: masterError },
            { data: ketetapan, error: ketetapanError },
            { data: pembayaran, error: pembayaranError },
            { data: fiskal, error: fiskalError },
            { data: targetPajakRetribusi, error: targetError }
        ] = await Promise.all([
            queryWithTimeout(supabase.from('datawp').select('*')),
            queryWithTimeout(supabase.from('Wilayah').select('*')),
            queryWithTimeout(supabase.from('MasterPajakRetribusi').select('*')),
            queryWithTimeout(supabase.from('KetetapanPajak').select('*')),
            queryWithTimeout(supabase.from('RiwayatPembayaran').select('*')),
            queryWithTimeout(supabase.from('Fiskal').select('*')),
            queryWithTimeout(supabase.from('TargetPajakRetribusi').select('*'))
        ]);

        // Log any errors but don't fail completely
        if (wpError) console.warn('handleGet: wajibPajak error:', wpError.message);
        if (wilayahError) {
            console.error('❌ DEBUG: handleGet - Wilayah query failed:', wilayahError.message);
            console.error('🔍 DEBUG: handleGet - Wilayah error details:', wilayahError);
        } else {
            console.log('✅ DEBUG: handleGet - Wilayah query successful, records:', wilayah?.length || 0);
        }
        if (masterError) console.warn('handleGet: masterPajak error:', masterError.message);
        if (ketetapanError) console.warn('handleGet: ketetapan error:', ketetapanError.message);
        if (pembayaranError) console.warn('handleGet: pembayaran error:', pembayaranError.message);
        if (fiskalError) console.warn('handleGet: fiskal error:', fiskalError.message);
        if (targetError) console.warn('handleGet: target error:', targetError.message);

        const data = {
            wajibPajak: wajibPajak || [],
            wilayah: wilayah || [],
            masterPajak: masterPajak || [],
            ketetapan: ketetapan || [],
            pembayaran: pembayaran || [],
            fiskal: fiskal || [],
            targetPajakRetribusi: targetPajakRetribusi || []
        };

        console.log('handleGet: Data fetched successfully');
        console.log('handleGet: Data counts:', {
            wajibPajak: data.wajibPajak.length,
            wilayah: data.wilayah.length,
            masterPajak: data.masterPajak.length,
            ketetapan: data.ketetapan.length,
            pembayaran: data.pembayaran.length,
            fiskal: data.fiskal.length,
            targetPajakRetribusi: data.targetPajakRetribusi.length
        });

        // Specific logging for wilayah data
        console.log('🔍 DEBUG: handleGet - Wilayah data details:');
        console.log('- Wilayah array length:', data.wilayah.length);
        console.log('- Raw wilayah data from query:', wilayah);
        console.log('- Wilayah error details:', wilayahError);
        
        if (data.wilayah.length > 0) {
            console.log('- First 3 wilayah records:', data.wilayah.slice(0, 3));
            console.log('- Unique kecamatan:', [...new Set(data.wilayah.map(item => item.Kecamatan))]);
        } else {
            console.warn('⚠️ DEBUG: handleGet - No wilayah data found in database!');
            console.log('🔍 DEBUG: handleGet - Checking if wilayah query returned null/undefined:', wilayah === null, wilayah === undefined);
        }

        return data;

    } catch (error) {
        console.error('handleGet: Error fetching data:', error);
        
        // Return empty structure as fallback but log the error
        console.log('handleGet: Returning empty data structure due to error');
        return {
            wajibPajak: [],
            wilayah: [],
            masterPajak: [],
            ketetapan: [],
            pembayaran: [],
            fiskal: [],
            targetPajakRetribusi: []
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
