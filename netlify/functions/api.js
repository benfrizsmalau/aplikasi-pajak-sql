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

// Fungsi validasi khusus untuk data inbox (lebih fleksibel)
function validateInboxData(data, isAuto) {
    const required = [
        'namaUsaha', 'namaPemilik', 'nikKtp', 'alamat', 'telephone', 'kelurahan', 'kecamatan'
    ];
    
    // Jika mode auto, tambahkan kodeKecamatan dan kodeKelurahan
    if (isAuto) {
        required.push('kodeKecamatan', 'kodeKelurahan');
    }
    
    for (const key of required) {
        if (!data[key] || typeof data[key] !== 'string' || data[key].trim() === '') {
            throw new Error(`Field '${key}' wajib diisi dan harus berupa string.`);
        }
    }
    
    // Validasi NIK harus 16 digit
    if (data.nikKtp && data.nikKtp.length !== 16) {
        throw new Error('NIK KTP harus 16 digit angka.');
    }
    
    // Validasi telephone minimal 8 digit
    if (data.telephone && data.telephone.length < 8) {
        throw new Error('Nomor telepon harus minimal 8 digit.');
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
                case 'getInboxWajibPajak':
                    responseData = await handleGetInboxWajibPajak(body);
                    break;
                case 'approveWajibPajak':
                    responseData = await handleApproveWajibPajak(body);
                    break;
                case 'rejectWajibPajak':
                    responseData = await handleRejectWajibPajak(body);
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
        console.error('API ERROR:', error); // Logging error ke Netlify log
        console.error('Error stack:', error.stack); // Log stack trace untuk debugging
        
        // Pastikan error message ada
        const errorMessage = error.message || 'Terjadi error pada server.';
        
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ 
                status: 'gagal', 
                message: errorMessage,
                action: event.httpMethod === 'POST' ? JSON.parse(event.body || '{}').action : 'unknown'
            }) 
        };
    }
};

// =================================================================
// FUNGSI-FUNGSI HANDLER
// =================================================================

async function handleGet() {
    // Query datawp dan Wilayah tetap seperti biasa
    const [
        { data: wajibPajak, error: wpError },
        { data: wilayah, error: wilayahError }
    ] = await Promise.all([
        supabase.from('datawp').select('*'),
        supabase.from('Wilayah').select('*'),
    ]);

    // Query masterPajak (MasterPajakRetribusi) dengan error handling terpisah
    let masterPajak = [];
    try {
        const { data, error } = await supabase.from('MasterPajakRetribusi').select('*');
        if (!error) masterPajak = data || [];
    } catch (e) {
        masterPajak = [];
    }

    // Query ketetapan pajak
    let ketetapan = [];
    try {
        const { data, error } = await supabase.from('KetetapanPajak').select('*');
        if (!error) ketetapan = data || [];
    } catch (e) {
        ketetapan = [];
    }

    // Query pembayaran (RiwayatPembayaran)
    let pembayaran = [];
    try {
        const { data, error } = await supabase.from('RiwayatPembayaran').select('*');
        if (!error) pembayaran = data || [];
    } catch (e) {
        pembayaran = [];
    }

    // Query fiskal
    let fiskal = [];
    try {
        const { data, error } = await supabase.from('Fiskal').select('*');
        if (!error) fiskal = data || [];
    } catch (e) {
        fiskal = [];
    }

    let targetPajakRetribusi = [];
    try {
        const { data, error } = await supabase.from('TargetPajakRetribusi').select('*');
        if (!error) targetPajakRetribusi = data || [];
    } catch (e) {
        targetPajakRetribusi = [];
    }

    if (wpError) throw new Error(`Error mengambil data WP: ${wpError.message}`);
    if (wilayahError) throw new Error(`Error mengambil data Wilayah: ${wilayahError.message}`);

    return {
        wajibPajak: wajibPajak || [],
        wilayah: wilayah || [],
        masterPajak: masterPajak,
        ketetapan: ketetapan,
        pembayaran: pembayaran,
        fiskal: fiskal,
        targetPajakRetribusi: targetPajakRetribusi, // <-- tambahkan ini
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

// =================================================================
// FUNGSI-FUNGSI HANDLER TAMBAHAN
// =================================================================

async function handleCreateKetetapan(data) {
    // Ambil nomor urut terakhir dari tabel KetetapanPajak
    const { count, error: countError } = await supabase
        .from('KetetapanPajak')
        .select('*', { count: 'exact', head: true });
    if (countError) throw new Error('Gagal mengambil nomor urut ketetapan.');
    const nomorUrut = ((count || 0) + 1).toString().padStart(7, '0');

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

    // Bulan romawi dan tahun
    const now = new Date();
    const bulanRomawi = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][now.getMonth()];
    const tahun = now.getFullYear();

    // Gabungkan ID_Ketetapan
    const ID_Ketetapan = `${nomorUrut}/${kodeSurat}/${bulanRomawi}/${tahun}`;

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
    const { error } = await supabase
        .from('KetetapanPajak')
        .insert([{
            ID_Ketetapan,
            KodeLayanan: data.kodeLayanan,
            NPWPD: data.npwpd,
            MasaPajak: data.masaPajak,
            TanggalKetetapan: tanggalKetetapan,
            TanggalTunggakan: data.tglTunggakan ? new Date(data.tglTunggakan).toISOString() : null, // Simpan tanggal tunggakan jika ada
            JumlahPokok: jumlahPokok,
            Denda: denda,
            TotalTagihan: totalTagihan,
            Status: 'Belum Lunas',
            Catatan: data.catatan || ''
        }]);
    if (error) throw new Error('Gagal membuat ketetapan: ' + error.message);
    return { message: 'Ketetapan berhasil dibuat!' };
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
    const { error } = await supabase
        .from('KetetapanPajak')
        .delete()
        .eq('ID_Ketetapan', data.id_ketetapan);
    if (error) throw new Error('Gagal hapus ketetapan: ' + error.message);
    return { message: 'Ketetapan berhasil dihapus!' };
}

// Handler create pembayaran
async function handleCreatePembayaran(data) {
    // Ambil nomor urut terakhir dari tabel RiwayatPembayaran
    const { count, error: countError } = await supabase
        .from('RiwayatPembayaran')
        .select('*', { count: 'exact', head: true });
    if (countError) throw new Error('Gagal mengambil nomor urut pembayaran.');
    const nomorUrut = ((count || 0) + 1).toString().padStart(7, '0');

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

    // Gabungkan ID_Pembayaran
    const ID_Pembayaran = `${nomorUrut}/${kodeSurat}/${bulanRomawi}/${tahun}`;

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
    if (error) throw new Error('Gagal mencatat pembayaran: ' + error.message);

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

    return { message: 'Pembayaran berhasil dicatat!' };
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
    // Ambil nomor urut terakhir dari tabel Fiskal
    const { count, error: countError } = await supabase
        .from('Fiskal')
        .select('*', { count: 'exact', head: true });
    if (countError) throw new Error('Gagal mengambil nomor urut fiskal.');
    const nomorUrut = ((count || 0) + 1).toString().padStart(6, '0');

    // Bulan romawi dan tahun
    const now = new Date();
    const bulanRomawi = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][now.getMonth()];
    const tahun = now.getFullYear();

    // Gabungkan nomor_fiskal
    const nomor_fiskal = `${nomorUrut}/FKL/BPPKAD/${bulanRomawi}/${tahun}`;

    // Tanggal cetak dan berlaku
    const tanggal_cetak = now.toISOString();
    const tanggal_berlaku = new Date(now.getFullYear()+1, now.getMonth(), now.getDate()).toISOString();

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
    if (error) {
        return { status: 'gagal', message: 'Gagal membuat dokumen fiskal: ' + error.message };
    }
    return { status: 'sukses', ...inserted };
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
        // Ambil nomor urut terakhir dari tabel Fiskal
        const { count, error: countError } = await supabase
            .from('Fiskal')
            .select('*', { count: 'exact', head: true });
        if (countError) throw new Error('Gagal mengambil nomor urut fiskal.');
        const nomorUrut = ((count || 0) + 1).toString().padStart(6, '0');

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
            // Ambil nomor urut terakhir dari tabel Fiskal
            const { count, error: countError } = await supabase
                .from('Fiskal')
                .select('*', { count: 'exact', head: true });
            if (countError) throw new Error('Gagal mengambil nomor urut fiskal.');
            const nomorUrut = ((count || 0) + 1).toString().padStart(6, '0');

            // Bulan romawi dan tahun
            const now = new Date();
            const bulanRomawi = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][now.getMonth()];
            const tahun = now.getFullYear();

            // Gabungkan nomor_fiskal
            const nomor_fiskal = `${nomorUrut}/FKL/BPPKAD/${bulanRomawi}/${tahun}`;

            // Tanggal cetak dan berlaku
            const tanggal_cetak = now.toISOString();
            const tanggal_berlaku = new Date(now.getFullYear()+1, now.getMonth(), now.getDate()).toISOString();

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

            if (error) {
                return { status: 'gagal', message: 'Gagal membuat dokumen fiskal: ' + error.message };
            }

            return { 
                status: 'sukses', 
                message: 'Fiskal berhasil dibuat otomatis',
                fiskal: inserted
            };
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

// =================================================================
// FUNGSI HANDLER INBOX WAJIB PAJAK
// =================================================================

// Handler untuk mengambil data inbox wajib pajak dengan status pending
async function handleGetInboxWajibPajak(data) {
    try {
        const { status = 'pending' } = data;
        
        const { data: inboxData, error } = await supabase
            .from('inbox_wajib_pajak')
            .select('*')
            .eq('status', status)
            .order('created_at', { ascending: false });
        
        if (error) throw new Error('Gagal mengambil data inbox: ' + error.message);
        
        return { 
            inboxWajibPajak: inboxData || [],
            total: inboxData ? inboxData.length : 0
        };
    } catch (error) {
        throw new Error('Gagal mengambil data inbox wajib pajak: ' + error.message);
    }
}

// Handler untuk approve data wajib pajak dari inbox
async function handleApproveWajibPajak(data) {
    try {
        const { id } = data;
        if (!id) throw new Error('ID inbox wajib pajak harus diisi!');
        
        // Ambil data dari inbox
        const { data: inboxItem, error: fetchError } = await supabase
            .from('inbox_wajib_pajak')
            .select('*')
            .eq('id', id)
            .eq('status', 'pending')
            .single();
        
        if (fetchError || !inboxItem) {
            throw new Error('Data inbox tidak ditemukan atau sudah diproses!');
        }
        
        let wpData = inboxItem.data;
        let generatedNpwpd = false;
        
        // Pastikan wpData adalah object
        if (!wpData || typeof wpData !== 'object') {
            throw new Error('Data wajib pajak tidak valid!');
        }
        
        // Jika NPWPD kosong, generate otomatis
        if (!wpData.NPWPD || wpData.NPWPD.trim() === "") {
            // Validasi field wajib untuk mode auto
            try {
                validateInboxData({
                    namaUsaha: wpData['Nama Usaha'] || wpData.namaUsaha || '',
                    namaPemilik: wpData['Nama Pemilik'] || wpData.namaPemilik || '',
                    nikKtp: wpData['NIK KTP'] || wpData.nikKtp || '',
                    alamat: wpData.Alamat || wpData.alamat || '',
                    telephone: wpData.Telephone || wpData.telephone || '',
                    kelurahan: wpData.Kelurahan || wpData.kelurahan || '',
                    kecamatan: wpData.Kecamatan || wpData.kecamatan || '',
                    kodeKecamatan: wpData.kodeKecamatan || '001',
                    kodeKelurahan: wpData.kodeKelurahan || '001'
                }, true);
            } catch (validationError) {
                throw new Error('Validasi data gagal: ' + validationError.message);
            }
            
            // Ambil jumlah data WP untuk menentukan urutan berikutnya
            const { count, error: countError } = await supabase
                .from('datawp')
                .select('*', { count: 'exact', head: true });
            if (countError) throw new Error('Gagal menghitung data WP: ' + countError.message);
            
            const nextSequence = ((count || 0) + 1).toString().padStart(6, '0');
            const jenisWp = wpData.JenisWP || wpData.jenisWp || 'BARU';
            const kodeKecamatan = wpData.kodeKecamatan || '001';
            const kodeKelurahan = wpData.kodeKelurahan || '001';
            
            wpData.NPWPD = `P.${jenisWp}.${nextSequence}.${kodeKecamatan}.${kodeKelurahan}`;
            generatedNpwpd = true;
        } else {
            // Validasi field wajib untuk mode manual
            try {
                validateInboxData({
                    namaUsaha: wpData['Nama Usaha'] || wpData.namaUsaha || '',
                    namaPemilik: wpData['Nama Pemilik'] || wpData.namaPemilik || '',
                    nikKtp: wpData['NIK KTP'] || wpData.nikKtp || '',
                    alamat: wpData.Alamat || wpData.alamat || '',
                    telephone: wpData.Telephone || wpData.telephone || '',
                    kelurahan: wpData.Kelurahan || wpData.kelurahan || '',
                    kecamatan: wpData.Kecamatan || wpData.kecamatan || '',
                    npwpd: wpData.NPWPD
                }, false);
            } catch (validationError) {
                throw new Error('Validasi data gagal: ' + validationError.message);
            }
        }
        
        // Cek apakah NPWPD sudah ada di tabel datawp
        const { data: existingWp, error: checkError } = await supabase
            .from('datawp')
            .select('NPWPD')
            .eq('NPWPD', wpData.NPWPD);
        if (checkError) throw new Error('Gagal mengecek NPWPD: ' + checkError.message);
        if (existingWp && existingWp.length > 0) {
            throw new Error(`NPWPD ${wpData.NPWPD} sudah terdaftar di sistem!`);
        }
        
        // Insert data ke tabel datawp
        const insertData = {
            NPWPD: wpData.NPWPD,
            JenisWP: wpData.JenisWP || wpData.jenisWp || 'BARU',
            "Nama Usaha": wpData['Nama Usaha'] || wpData.namaUsaha || '',
            "Nama Pemilik": wpData['Nama Pemilik'] || wpData.namaPemilik || '',
            "NIK KTP": wpData['NIK KTP'] || wpData.nikKtp || '',
            Alamat: wpData.Alamat || wpData.alamat || '',
            Telephone: wpData.Telephone || wpData.telephone || '',
            Kelurahan: wpData.Kelurahan || wpData.kelurahan || '',
            Kecamatan: wpData.Kecamatan || wpData.kecamatan || '',
            "Foto Pemilik": "",
            "Foto Tempat Usaha": "",
            "Foto KTP": "",
        };
        
        const { error: insertError } = await supabase
            .from('datawp')
            .insert([insertData]);
        if (insertError) throw new Error('Gagal menyimpan data wajib pajak: ' + insertError.message);
        
        // Update status inbox menjadi approved
        const { error: updateError } = await supabase
            .from('inbox_wajib_pajak')
            .update({ status: 'approved' })
            .eq('id', id);
        if (updateError) throw new Error('Gagal update status inbox: ' + updateError.message);
        
        return { 
            message: `Data wajib pajak ${wpData.NPWPD} berhasil diapprove dan disimpan!${generatedNpwpd ? ' (NPWPD dibuat otomatis)' : ''}`,
            npwpd: wpData.NPWPD,
            generatedNpwpd
        };
        
    } catch (error) {
        console.error('Error in handleApproveWajibPajak:', error);
        throw new Error('Gagal approve wajib pajak: ' + error.message);
    }
}

// Handler untuk reject data wajib pajak dari inbox
async function handleRejectWajibPajak(data) {
    try {
        const { id, alasan } = data;
        if (!id) throw new Error('ID inbox wajib pajak harus diisi!');
        
        // Update status inbox menjadi rejected
        const { error } = await supabase
            .from('inbox_wajib_pajak')
            .update({ 
                status: 'rejected',
                catatan: alasan || 'Ditolak oleh operator'
            })
            .eq('id', id)
            .eq('status', 'pending');
        
        if (error) throw new Error('Gagal update status inbox: ' + error.message);
        
        return { 
            message: 'Data wajib pajak berhasil ditolak!'
        };
        
    } catch (error) {
        throw new Error('Gagal reject wajib pajak: ' + error.message);
    }
}