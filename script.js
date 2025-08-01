// --- KONFIGURASI ---
// Alamat backend di Netlify. Ini sudah final dan tidak perlu diubah.
const apiUrl = '/.netlify/functions/api';
// --------------------

// Variabel global untuk menyimpan data
let dataWajibPajakGlobal = [];
let dataWilayahGlobal = [];
let dataMasterPajakGlobal = [];
let dataKetetapanGlobal = [];
let kelurahanChoices = null;

// Router utama yang berjalan setelah halaman HTML selesai dimuat
document.addEventListener('DOMContentLoaded', () => {
    const pageId = document.body.id;
    switch (pageId) {
        case 'page-dashboard': initDashboardPage(); break;
        case 'page-tambah-wp': initTambahWpPage(); break;
        case 'page-lihat-wp': initLihatWpPage(); break;
        case 'page-tambah-ketetapan': initKetetapanPage(); break;
        case 'page-detail-wp': initDetailPage(); break;
    }
});


// =================================================================
// Inisialisasi Halaman
// =================================================================

async function initDashboardPage() {
    try {
        // Gunakan loadDashboardData() yang lengkap dengan fitur target
        await loadDashboardData();
    } catch (error) {
        document.getElementById('totalWp').textContent = 'Error';
        console.error("Error di Dasbor:", error);
    }
}

async function initTambahWpPage() {
    const form = document.getElementById('pajakForm');
    const kelurahanSelect = document.getElementById('kelurahan');
    const kecamatanSelect = document.getElementById('kecamatan');
    const generateCheckbox = document.getElementById('generateNpwpd');
    const npwpdInput = document.getElementById('npwpd');
    const jenisWpGroup = document.getElementById('jenisWpGroup');

    try {
        const data = await fetchAllData();
        dataWilayahGlobal = data.wilayah || [];
        // Isi dropdown kecamatan unik
        const kecamatanUnik = [...new Set(dataWilayahGlobal.map(item => item.Kecamatan))];
        kecamatanSelect.innerHTML = '<option value="">-- Pilih Kecamatan --</option>';
        kecamatanUnik.forEach(kec => {
            const option = document.createElement('option');
            option.value = kec;
            option.textContent = kec;
            kecamatanSelect.appendChild(option);
        });
        // Reset kelurahan
        kelurahanSelect.innerHTML = '<option value="">-- Pilih Kelurahan --</option>';
        // Saat kecamatan dipilih, isi kelurahan sesuai kecamatan
        kecamatanSelect.addEventListener('change', function() {
            kelurahanSelect.innerHTML = '<option value="">-- Pilih Kelurahan --</option>';
            if (!this.value) return;
            const kelurahanFiltered = dataWilayahGlobal.filter(item => item.Kecamatan === this.value);
            kelurahanFiltered.forEach(item => {
                const option = document.createElement('option');
                option.value = item.Kelurahan;
                option.textContent = item.Kelurahan;
                option.dataset.kodekel = item.KodeKelurahan;
                option.dataset.kodekec = item.KodeKecamatan;
                kelurahanSelect.appendChild(option);
            });
        });
    } catch (error) {
        kecamatanSelect.innerHTML = '<option value="">Gagal memuat data</option>';
        kelurahanSelect.innerHTML = '<option value="">Gagal memuat data</option>';
    }

    generateCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            npwpdInput.readOnly = true;
            npwpdInput.style.backgroundColor = '#e9ecef';
            npwpdInput.value = '(Akan dibuat otomatis)';
            npwpdInput.required = false;
            jenisWpGroup.style.display = 'block';
        } else {
            npwpdInput.readOnly = false;
            npwpdInput.style.backgroundColor = 'white';
            npwpdInput.value = '';
            npwpdInput.required = true;
            npwpdInput.placeholder = 'Ketik NPWPD manual...';
            jenisWpGroup.style.display = 'none';
        }
    });

    kelurahanSelect.addEventListener('change', (e) => {
        const wilayahCocok = dataWilayahGlobal.find(w => w.Kelurahan === e.target.value);
        kecamatanSelect.value = wilayahCocok ? wilayahCocok.Kecamatan : '';
    });
    
    form.addEventListener('submit', handleWpFormSubmit);
}

async function initLihatWpPage() {
    try {
        const data = await fetchAllData();
        dataWajibPajakGlobal = data.wajibPajak || [];
        dataWilayahGlobal = data.wilayah || [];
        populateWpDataTable(dataWajibPajakGlobal);
        setupWpEditModal();
        
        document.getElementById('searchInput').addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredData = dataWajibPajakGlobal.filter(item => 
                String(item.NPWPD).toLowerCase().includes(searchTerm) ||
                String(item['Nama Usaha']).toLowerCase().includes(searchTerm)
            );
            populateWpDataTable(filteredData);
        });
    } catch (error) {
        document.querySelector("#dataTable tbody").innerHTML = `<tr><td colspan="12">Gagal memuat data: ${error.message}</td></tr>`;
    }
}

async function initKetetapanPage() {
    const form = document.getElementById('ketetapanForm');
    const layananSelect = document.getElementById('ketetapanLayanan');
    const npwpdInput = document.getElementById('ketetapanNpwpd');

    const params = new URLSearchParams(window.location.search);
    const npwpdFromUrl = params.get('npwpd');
    if (npwpdFromUrl) {
        npwpdInput.value = npwpdFromUrl;
        npwpdInput.readOnly = true;
        npwpdInput.style.backgroundColor = '#e9ecef';
    }
    
    try {
        const data = await fetchAllData();
        const masterPajakData = data.masterPajak || [];
        layananSelect.innerHTML = '<option value="">-- Pilih Layanan --</option>';
        masterPajakData.forEach(item => {
            const option = document.createElement('option');
            option.value = item.KodeLayanan;
            option.textContent = `${item.NamaLayanan} (${item.Tipe})`;
            layananSelect.appendChild(option);
        });
    } catch (error) {
        layananSelect.innerHTML = '<option value="">Gagal memuat data</option>';
    }
    form.addEventListener('submit', handleKetetapanFormSubmit);
}

async function initDetailPage() {
    const detailContent = document.getElementById('detailContent');
    const fotoContent = document.getElementById('fotoContent');
    const aksiContent = document.getElementById('detailAksi');

    try {
        const params = new URLSearchParams(window.location.search);
        const npwpd = params.get('npwpd');
        if (!npwpd) throw new Error("NPWPD tidak ditemukan di URL.");

        const data = await fetchAllData();
        dataWajibPajakGlobal = data.wajibPajak || [];
        dataKetetapanGlobal = data.ketetapan || [];
        dataWilayahGlobal = data.wilayah || [];
        const item = dataWajibPajakGlobal.find(wp => wp.NPWPD == npwpd);
        if (!item) throw new Error(`Data untuk NPWPD ${npwpd} tidak ditemukan.`);

        aksiContent.innerHTML = `<a href="tambah-ketetapan.html?npwpd=${npwpd}" class="btn-primary" style="display: inline-flex; align-items: center; gap: 8px; text-decoration: none; padding: 12px 24px; background: #1976d2; color: white; border-radius: 8px; font-weight: 500; transition: background 0.3s;"><span>📋</span>Buat Ketetapan Baru</a>`;
        displayDetailData(item);
        displayPhotos(item);
        
        // Load riwayat ketetapan
        const riwayatKetetapan = dataKetetapanGlobal.filter(k => k.NPWPD == npwpd);
        displayKetetapanHistory(riwayatKetetapan, data.masterPajak || []);
        
        // Load riwayat pembayaran
        const riwayatPembayaran = (data.pembayaran || []).filter(p => p.NPWPD == npwpd);
        displayPembayaranHistory(riwayatPembayaran);
        
        // Load status fiskal
        displayFiskalStatus(npwpd, data);
        
        setupKetetapanEditModal();
    } catch (error) {
        detailContent.innerHTML = `<p style="color: red;">${error.message}</p>`;
    }
}


// =================================================================
// Fungsi-fungsi Aksi (CRUD Handlers)
// =================================================================

async function handleWpFormSubmit(event) {
    event.preventDefault();
    const submitButton = document.getElementById('submitButton');
    const statusDiv = document.getElementById('status');
    submitButton.disabled = true; submitButton.textContent = 'Mengirim...'; statusDiv.style.display = 'none';
    
    const generateMode = document.getElementById('generateNpwpd').checked;
    const kelurahanSelect = document.getElementById('kelurahan');
    const kecamatanSelect = document.getElementById('kecamatan');
    const selectedKelurahanOption = kelurahanSelect.options[kelurahanSelect.selectedIndex];

    // --- VALIDASI INPUT ---
    const namaUsaha = document.getElementById('namaUsaha').value.trim();
    const namaPemilik = document.getElementById('namaPemilik').value.trim();
    const nikKtp = document.getElementById('nikKtp').value.trim();
    const alamat = document.getElementById('alamat').value.trim();
    const telephone = document.getElementById('telephone').value.trim();
    const kelurahan = kelurahanSelect.value;
    const kecamatan = kecamatanSelect.value;
    const npwpd = document.getElementById('npwpd').value.trim();
    const jenisWp = document.getElementById('jenisWp').value;

    if (!namaUsaha || !namaPemilik || !nikKtp || !alamat || !telephone || !kelurahan || !kecamatan) {
        showStatus('Semua field wajib diisi!', false);
        submitButton.disabled = false; submitButton.textContent = 'Kirim Data';
        return;
    }
    if (!/^\d{16}$/.test(nikKtp)) {
        showStatus('NIK harus 16 digit angka!', false);
        submitButton.disabled = false; submitButton.textContent = 'Kirim Data';
        return;
    }
    if (!/^\d{8,}$/.test(telephone)) {
        showStatus('Nomor telepon harus minimal 8 digit angka!', false);
        submitButton.disabled = false; submitButton.textContent = 'Kirim Data';
        return;
    }
    if (generateMode) {
        if (!selectedKelurahanOption || !selectedKelurahanOption.dataset.kodekel || !selectedKelurahanOption.dataset.kodekec) {
            showStatus('Pilih kelurahan dan kecamatan yang valid!', false);
            submitButton.disabled = false; submitButton.textContent = 'Kirim Data';
            return;
        }
        if (!jenisWp) {
            showStatus('Jenis WP wajib dipilih!', false);
            submitButton.disabled = false; submitButton.textContent = 'Kirim Data';
            return;
        }
    } else {
        if (!npwpd) {
            showStatus('NPWPD wajib diisi untuk mode manual!', false);
            submitButton.disabled = false; submitButton.textContent = 'Kirim Data';
            return;
        }
    }
    // --- END VALIDASI ---

    try {
        const [fotoPemilik, fotoTempatUsaha, fotoKtp] = await Promise.all([
            fileToBase64(document.getElementById('fotoPemilik').files[0]),
            fileToBase64(document.getElementById('fotoTempatUsaha').files[0]),
            fileToBase64(document.getElementById('fotoKtp').files[0])
        ]);

        let dataToSend = {
            action: 'createWp',
            generate_mode: generateMode,
            namaUsaha, namaPemilik, nikKtp, alamat, telephone, kelurahan, kecamatan, fotoPemilik, fotoTempatUsaha, fotoKtp
        };

        if (generateMode) {
            dataToSend.jenisWp = jenisWp;
            dataToSend.kodeKelurahan = selectedKelurahanOption.dataset.kodekel;
            dataToSend.kodeKecamatan = selectedKelurahanOption.dataset.kodekec;
        } else {
            dataToSend.npwpd = npwpd;
            dataToSend.jenisWp = "Lama";
        }
        
        const result = await postData(dataToSend);
        showStatus(result.message || 'Data WP berhasil dibuat!', true);
        event.target.reset(); 
        document.getElementById('kecamatan').value = '';
        document.getElementById('generateNpwpd').checked = false;
        document.getElementById('npwpd').readOnly = false;
        document.getElementById('npwpd').style.backgroundColor = 'white';
        document.getElementById('npwpd').value = '';
        document.getElementById('jenisWpGroup').style.display = 'none';

    } catch (error) {
        showStatus('Gagal mengirim data: ' + error.message, false);
    } finally {
        submitButton.disabled = false; submitButton.textContent = 'Kirim Data';
    }
}

async function handleDeleteWpClick(npwpd) {
    if (!confirm(`Anda yakin ingin menghapus data WP dengan NPWPD: ${npwpd}?`)) return;
    try {
        const result = await postData({ action: 'deleteWp', npwpd: npwpd });
        alert(result.message || 'Data berhasil dihapus.');
        initLihatWpPage();
    } catch (error) {
        alert('Gagal menghapus data: ' + error.message);
    }
}

function handleEditWpClick(npwpd) {
    const dataToEdit = dataWajibPajakGlobal.find(item => item.NPWPD == npwpd);
    if (!dataToEdit) { alert('Data tidak ditemukan!'); return; }
    document.getElementById('editNpwd').value = dataToEdit.NPWPD;
    document.getElementById('editNamaUsaha').value = dataToEdit['Nama Usaha'];
    document.getElementById('editNamaPemilik').value = dataToEdit['Nama Pemilik'];
    document.getElementById('editNikKtp').value = dataToEdit['NIK KTP'];
    document.getElementById('editAlamat').value = dataToEdit.Alamat;
    document.getElementById('editTelephone').value = dataToEdit.Telephone;
    const kelurahanEditSelect = document.getElementById('editKelurahan');
    kelurahanEditSelect.innerHTML = '';
    dataWilayahGlobal.forEach(item => {
        const option = document.createElement('option');
        option.value = item.Kelurahan; option.textContent = item.Kelurahan;
        kelurahanEditSelect.appendChild(option);
    });
    kelurahanEditSelect.value = dataToEdit.Kelurahan;
    document.getElementById('editKecamatan').value = dataToEdit.Kecamatan;
    document.getElementById('editModal').style.display = 'block';
}

async function handleUpdateWpFormSubmit(event) {
    event.preventDefault();
    const updateButton = document.getElementById('updateButton');
    updateButton.disabled = true; updateButton.textContent = 'Menyimpan...';
    const updatedData = {
        action: 'updateWp', npwpd: document.getElementById('editNpwd').value,
        namaUsaha: document.getElementById('editNamaUsaha').value, namaPemilik: document.getElementById('editNamaPemilik').value,
        nikKtp: document.getElementById('editNikKtp').value, alamat: document.getElementById('editAlamat').value,
        telephone: document.getElementById('editTelephone').value, kelurahan: document.getElementById('editKelurahan').value,
        kecamatan: document.getElementById('editKecamatan').value
    };
    try {
        const result = await postData(updatedData);
        alert(result.message || 'Data berhasil diperbarui!');
        document.getElementById('editModal').style.display = 'none';
        initLihatWpPage();
    } catch (error) {
        alert('Gagal memperbarui data: ' + error.message);
    } finally {
        updateButton.disabled = false; updateButton.textContent = 'Simpan Perubahan';
    }
}

async function handleKetetapanFormSubmit(event) {
    event.preventDefault();
    const submitButton = document.getElementById('submitKetetapanButton');
    const statusDiv = document.getElementById('status');
    submitButton.disabled = true; submitButton.textContent = 'Membuat Ketetapan...'; statusDiv.style.display = 'none';
    try {
        const dataToSend = {
            action: 'createKetetapan', npwpd: document.getElementById('ketetapanNpwpd').value,
            kodeLayanan: document.getElementById('ketetapanLayanan').value, masaPajak: document.getElementById('ketetapanMasaPajak').value,
            jumlahPokok: document.getElementById('ketetapanJumlahPokok').value, tglTunggakan: document.getElementById('tglTunggakan').value,
            catatan: document.getElementById('catatan').value
        };
        const result = await postData(dataToSend);
        showStatus(result.message || 'Ketetapan berhasil dibuat!', true, 'status');
        event.target.reset();
        const npwpdFromUrl = new URLSearchParams(window.location.search).get('npwpd');
        if (npwpdFromUrl) document.getElementById('ketetapanNpwpd').value = npwpdFromUrl;
    } catch (error) {
        showStatus('Gagal membuat ketetapan: ' + error.message, false, 'status');
    } finally {
        submitButton.disabled = false; submitButton.textContent = 'Buat Ketetapan';
    }
}

async function handleDeleteKetetapanClick(idKetetapan) {
    if (!confirm(`Anda yakin ingin menghapus ketetapan dengan ID: ${idKetetapan}?`)) return;
    try {
        const result = await postData({ action: 'deleteKetetapan', id_ketetapan: idKetetapan });
        alert(result.message || 'Ketetapan berhasil dihapus.');
        location.reload();
    } catch (error) {
        alert('Gagal menghapus ketetapan: ' + error.message);
    }
}

function handleEditKetetapanClick(idKetetapan) {
    const dataToEdit = dataKetetapanGlobal.find(item => 
        String(item.ID_Ketetapan).trim() === String(idKetetapan).trim()
    );
    if (!dataToEdit) { 
        console.warn('Data ketetapan tidak ditemukan! ID:', idKetetapan, 'List:', dataKetetapanGlobal.map(d=>d.ID_Ketetapan));
        alert('Data ketetapan tidak ditemukan!'); 
        return; 
    }
    document.getElementById('editKetetapanId').value = dataToEdit.ID_Ketetapan;
    document.getElementById('editKetetapanMasaPajak').value = dataToEdit.MasaPajak;
    document.getElementById('editKetetapanJumlahPokok').value = dataToEdit.JumlahPokok;
    document.getElementById('editKetetapanCatatan').value = dataToEdit.Catatan;
    document.getElementById('editKetetapanModal').style.display = 'block';
}

async function handleUpdateKetetapanSubmit(event) {
    event.preventDefault();
    const updateButton = document.getElementById('updateKetetapanButton');
    updateButton.disabled = true; updateButton.textContent = 'Menyimpan...';
    try {
        const updatedData = {
            action: 'updateKetetapan', id_ketetapan: document.getElementById('editKetetapanId').value,
            masaPajak: document.getElementById('editKetetapanMasaPajak').value,
            jumlahPokok: document.getElementById('editKetetapanJumlahPokok').value,
            catatan: document.getElementById('editKetetapanCatatan').value
        };
        const result = await postData(updatedData);
        alert(result.message || 'Ketetapan berhasil diperbarui!');
        document.getElementById('editKetetapanModal').style.display = 'none';
        await loadKetetapanData(); // refresh data setelah edit
    } catch (error) {
        alert('Gagal memperbarui data: ' + error.message);
    } finally {
        updateButton.disabled = false; updateButton.textContent = 'Simpan Perubahan';
    }
}


// =================================================================
// Fungsi-fungsi Pembantu (Helpers)
// =================================================================

function showStatus(message, isSuccess, elementId = 'status') {
    const statusDiv = document.getElementById(elementId);
    if (!statusDiv) return;
    statusDiv.textContent = message;
    statusDiv.className = isSuccess ? 'status-sukses' : 'status-gagal';
    statusDiv.style.display = 'block';
}

async function postData(data) {
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.status === 'gagal' || !response.ok) {
            throw new Error(result.message || `HTTP error! status: ${response.status}`);
        }
        return result;
    } catch (error) {
        console.error('Post error:', error);
        throw error;
    }
}

function setupWpEditModal() {
    const modal = document.getElementById('editModal');
    if (!modal) return;
    const closeBtn = modal.querySelector('.close-button');
    const editForm = document.getElementById('editForm');
    closeBtn.onclick = () => { modal.style.display = 'none'; };
    window.addEventListener('click', (event) => { if (event.target == modal) modal.style.display = 'none'; });
    editForm.addEventListener('submit', handleUpdateWpFormSubmit);
}

function setupKetetapanEditModal() {
    const modal = document.getElementById('editKetetapanModal');
    if (!modal) return;
    const closeBtn = modal.querySelector('#closeKetetapanModal');
    const editForm = document.getElementById('editKetetapanForm');
    closeBtn.onclick = () => { modal.style.display = 'none'; };
    window.addEventListener('click', (event) => { if (event.target == modal) modal.style.display = 'none'; });
    editForm.addEventListener('submit', handleUpdateKetetapanSubmit);
}

async function fetchAllData() {
    try {
    const response = await fetch(apiUrl);

        // Periksa apakah respons adalah fallback HTML dari Service Worker
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
            console.warn('Menerima respons HTML dari Service Worker (fallback offline).');
            throw new Error('Tidak ada koneksi internet dan tidak ada data tersimpan secara offline.');
        }

        // Jika bukan fallback HTML, lanjutkan seperti biasa (mengharapkan JSON)
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gagal mengambil data dari server. Status: ${response.status}. Pesan: ${errorText}`);
    }
    const result = await response.json();
    if (result.status === 'gagal') throw new Error(result.message);

    return result;

    } catch (error) {
        console.warn('Error mengambil data dari network, mencoba dari IndexedDB:', error);
        throw new Error('Tidak ada koneksi internet dan tidak ada data tersimpan secara offline.');
    }
}

function populateWpDataTable(wajibPajakData) {
    const tableHead = document.querySelector("#dataTable thead");
    const tableBody = document.querySelector("#dataTable tbody");
    if (!tableHead || !tableBody) return;
    tableHead.innerHTML = ''; tableBody.innerHTML = '';
    if (wajibPajakData.length > 0) {
        // Mapping header: key Google Sheet -> label user-friendly
        const headerMap = {
            'NPWPD': 'NPWPD',
            'JenisWP': 'Jenis WP',
            'Nama Usaha': 'Nama Usaha',
            'Nama Pemilik': 'Nama Pemilik',
            'NIK KTP': 'NIK',
            'Alamat': 'Alamat Usaha',
            'Telephone': 'No. Telepon',
            'Kelurahan': 'Kelurahan',
            'Kecamatan': 'Kecamatan',
            'Foto Pemilik': 'Foto Pemilik',
            'Foto Tempat Usaha': 'Foto Tempat Usaha',
            'Foto KTP': 'Foto KTP'
        };
        const headers = Object.keys(wajibPajakData[0]);
        const headerRow = document.createElement('tr');
        headers.forEach(h => { headerRow.innerHTML += `<th>${headerMap[h] || h}</th>`; });
        headerRow.innerHTML += `<th>Aksi</th>`;
        tableHead.appendChild(headerRow);
        wajibPajakData.forEach(rowData => {
            const row = document.createElement('tr');
            headers.forEach(header => {
                const cell = document.createElement('td');
                let cellData = rowData[header];
                if (header === 'NPWPD') {
                    cell.innerHTML = `<a href="detail.html?npwpd=${cellData}">${cellData}</a>`;
                } else if (typeof cellData === 'string' && cellData.startsWith('http')) {
                    cell.innerHTML = `<a href="${cellData}" target="_blank">Lihat Foto</a>`;
                } else {
                    cell.textContent = cellData || '';
                }
                row.appendChild(cell);
            });
            const npwpd = rowData['NPWPD'];
            const aksiCell = document.createElement('td');
            aksiCell.innerHTML = `<button class="btn-aksi btn-edit" onclick="handleEditWpClick('${npwpd}')">Edit</button> <button class="btn-aksi btn-hapus" onclick="handleDeleteWpClick('${npwpd}')">Hapus</button>`;
            row.appendChild(aksiCell);
            tableBody.appendChild(row);
        });
    } else {
        tableBody.innerHTML = `<tr><td colspan="12">Tidak ada data ditemukan.</td></tr>`;
    }
}

function displayDetailData(item) {
    // Foto pemilik di kiri atas (seperti KTP)
    const fotoSlot = document.getElementById('detailFotoKtpSlot');
    const dataSlot = document.getElementById('detailDataKtpSlot');
    if (fotoSlot && dataSlot) {
        fotoSlot.innerHTML = '';
        dataSlot.innerHTML = '';
        if (item['Foto Pemilik']) {
            fotoSlot.innerHTML = `<img src="${item['Foto Pemilik']}" alt="Foto Pemilik"><p>Foto Pemilik</p>`;
        } else {
            fotoSlot.innerHTML = `<div style='width:120px;height:150px;background:#e3e8ee;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#888;'>Tidak ada foto</div><p>Foto Pemilik</p>`;
        }
        dataSlot.innerHTML = `<dl class="detail-grid">
            <dt>NPWPD</dt><dd>${item.NPWPD||'-'}</dd>
            <dt>Nama Usaha</dt><dd>${item['Nama Usaha']||'-'}</dd>
            <dt>Nama Pemilik</dt><dd>${item['Nama Pemilik']||'-'}</dd>
            <dt>NIK</dt><dd>${item['NIK KTP']||'-'}</dd>
            <dt>Alamat Usaha</dt><dd>${item.Alamat||'-'}</dd>
            <dt>No. Telepon</dt><dd>${item.Telephone||'-'}</dd>
            <dt>Kelurahan</dt><dd>${item.Kelurahan||'-'}</dd>
            <dt>Kecamatan</dt><dd>${item.Kecamatan||'-'}</dd>
        </dl>`;
    }
}

function displayPhotos(item) {
    const fotoContent = document.getElementById('fotoContent');
    fotoContent.innerHTML = '';
    const fotoData = [{ label: 'Foto Pemilik', url: item['Foto Pemilik'] }, { label: 'Foto Tempat Usaha', url: item['Foto Tempat Usaha'] }, { label: 'Foto KTP', url: item['Foto KTP'] }];
    fotoData.forEach(foto => { if (foto.url) fotoContent.innerHTML += `<div class="foto-card"><img src="${foto.url}" alt="${foto.label}"><p>${foto.label}</p></div>`; });
}

function displayKetetapanHistory(riwayatData) {
    const tableHead = document.querySelector("#ketetapanTable thead");
    const tableBody = document.querySelector("#ketetapanTable tbody");
    if (!tableHead || !tableBody) return;
    tableHead.innerHTML = ''; tableBody.innerHTML = '';
    if (riwayatData.length > 0) {
        const headers = Object.keys(riwayatData[0]);
        const headerRow = document.createElement('tr');
        headers.forEach(h => { headerRow.innerHTML += `<th>${h}</th>`; });
        headerRow.innerHTML += `<th>Aksi</th>`;
        tableHead.appendChild(headerRow);
        riwayatData.forEach(rowData => {
            const row = document.createElement('tr');
            headers.forEach(header => {
                const cell = document.createElement('td');
                let cellData = rowData[header];
                if (header === 'TanggalKetetapan' && cellData) {
                    cellData = new Date(cellData).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                }
                if (['JumlahPokok', 'Denda', 'TotalTagihan'].includes(header)) {
                    cellData = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(cellData);
                }
                cell.textContent = cellData || '';
                row.appendChild(cell);
            });
            const idKetetapan = rowData['ID_Ketetapan'];
            const aksiCell = document.createElement('td');
            aksiCell.innerHTML = `
                <a href="cetak-skpd.html?id=${idKetetapan}" target="_blank" class="btn-aksi" style="background-color: #0d6efd; text-decoration: none; display: inline-block; margin-right: 5px;">Cetak</a>
                <button class="btn-aksi btn-edit" onclick="handleEditKetetapanClick('${idKetetapan}')">Edit</button> <button class="btn-aksi btn-hapus" onclick="handleDeleteKetetapanClick('${idKetetapan}')">Hapus</button>
            `;
            row.appendChild(aksiCell);
            tableBody.appendChild(row);
        });
    } else {
        tableBody.innerHTML = `<tr><td colspan="11">Belum ada riwayat ketetapan.</td></tr>`;
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) { resolve(""); return; }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Fungsi untuk menampilkan riwayat ketetapan dengan nama layanan yang benar
function displayKetetapanHistory(riwayatData, masterPajakData) {
    const tbody = document.querySelector('#ketetapanTable tbody');
    if (!tbody) return;
    
    if (riwayatData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 20px; color: #666;">Belum ada riwayat ketetapan.</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    riwayatData.forEach((item, index) => {
        // Cari nama layanan dari master pajak
        const masterPajak = masterPajakData.find(mp => mp.KodeLayanan === item.KodeLayanan);
        const namaLayanan = masterPajak ? masterPajak.NamaLayanan : item.KodeLayanan || '-';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.ID_Ketetapan || '-'}</td>
            <td>${item.MasaPajak || '-'}</td>
            <td>${namaLayanan}</td>
            <td>${formatRupiah(item.JumlahPokok)}</td>
            <td>${formatRupiah(item.Denda)}</td>
            <td>${formatRupiah(item.TotalTagihan)}</td>
            <td>${item.Status || 'Aktif'}</td>
            <td>${item.TanggalKetetapan ? new Date(item.TanggalKetetapan).toLocaleDateString('id-ID') : '-'}</td>
            <td>
                <button onclick="handleEditKetetapanClick('${item.ID_Ketetapan}')" style="background: #1976d2; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Edit</button>
                <button onclick="handleDeleteKetetapanClick('${item.ID_Ketetapan}')" style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; margin-left: 4px;">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Fungsi untuk menampilkan riwayat pembayaran
function displayPembayaranHistory(riwayatData) {
    const tbody = document.querySelector('#pembayaranTable tbody');
    if (!tbody) return;
    
    if (riwayatData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px; color: #666;">Belum ada riwayat pembayaran.</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    riwayatData.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.ID_Pembayaran || '-'}</td>
            <td>${item.ID_Ketetapan || '-'}</td>
            <td>${item.TanggalBayar ? new Date(item.TanggalBayar).toLocaleDateString('id-ID') : '-'}</td>
            <td>${formatRupiah(item.JumlahBayar)}</td>
            <td>${item.MetodeBayar || '-'}</td>
            <td>${item.Operator || '-'}</td>
            <td><span style="color: ${item.StatusPembayaran === 'Sukses' ? 'green' : 'red'}; font-weight: bold;">${item.StatusPembayaran || '-'}</span></td>
            <td>
                <button onclick="printBuktiBayar('${item.ID_Pembayaran}')" style="background: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Print</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Fungsi untuk menampilkan status fiskal
function displayFiskalStatus(npwpd, data) {
    const pembayaran = data.pembayaran || [];
    const ketetapan = data.ketetapan || [];
    const masterPajak = data.masterPajak || [];
    
    // Kelompokkan pembayaran per NPWPD
    const pembayaranWP = pembayaran.filter(p => p.NPWPD === npwpd);
    
    let lunasReklame = false;
    let lunasSampah = false;
    
    pembayaranWP.forEach(bayar => {
        const ket = ketetapan.find(k => k.ID_Ketetapan === bayar.ID_Ketetapan);
        if (!ket) return;
        
        const master = masterPajak.find(m => m.KodeLayanan === ket.KodeLayanan);
        if (!master) return;
        
        if (master.NamaLayanan && master.NamaLayanan.toLowerCase().includes('reklame') && bayar.StatusPembayaran === 'Sukses') {
            lunasReklame = true;
        }
        if (master.NamaLayanan && master.NamaLayanan.toLowerCase().includes('sampah') && bayar.StatusPembayaran === 'Sukses') {
            lunasSampah = true;
        }
    });
    
    // Update status
    document.getElementById('statusReklame').innerHTML = lunasReklame ? 
        '<span style="color: green; font-weight: bold;">✅ Lunas</span>' : 
        '<span style="color: red; font-weight: bold;">❌ Belum Lunas</span>';
    
    document.getElementById('statusSampah').innerHTML = lunasSampah ? 
        '<span style="color: green; font-weight: bold;">✅ Lunas</span>' : 
        '<span style="color: red; font-weight: bold;">❌ Belum Lunas</span>';
    
    const statusFiskal = lunasReklame && lunasSampah;
    document.getElementById('statusFiskalOverall').innerHTML = statusFiskal ? 
        '<span style="color: green; font-weight: bold;">✅ Memenuhi Syarat</span>' : 
        '<span style="color: red; font-weight: bold;">❌ Belum Memenuhi Syarat</span>';
    
    // Hitung jatuh tempo fiskal (1 tahun dari pembayaran terakhir)
    if (statusFiskal && pembayaranWP.length > 0) {
        const pembayaranSukses = pembayaranWP.filter(p => p.StatusPembayaran === 'Sukses');
        if (pembayaranSukses.length > 0) {
            const pembayaranTerakhir = pembayaranSukses.sort((a, b) => new Date(b.TanggalBayar) - new Date(a.TanggalBayar))[0];
            const tanggalBayar = new Date(pembayaranTerakhir.TanggalBayar);
            const jatuhTempo = new Date(tanggalBayar.getFullYear() + 1, tanggalBayar.getMonth(), tanggalBayar.getDate());
            document.getElementById('jatuhTempoFiskal').textContent = jatuhTempo.toLocaleDateString('id-ID');
        } else {
            document.getElementById('jatuhTempoFiskal').textContent = '-';
        }
    } else {
        document.getElementById('jatuhTempoFiskal').textContent = '-';
    }
}

// Fungsi helper untuk format rupiah
function formatRupiah(angka) {
    if (!angka) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: 'IDR', 
        minimumFractionDigits: 0 
    }).format(angka);
}

// Fungsi standar untuk tabel yang bisa digunakan di seluruh aplikasi
function createStandardTable(tableId, data, config) {
    const tableHead = document.querySelector(`#${tableId} thead`);
    const tableBody = document.querySelector(`#${tableId} tbody`);
    
    if (!tableHead || !tableBody) return;
    
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';
    
    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="${config.columns.length + (config.showCheckbox ? 1 : 0) + (config.actions ? 1 : 0)}" style="text-align: center; padding: 40px; color: #666;">${config.emptyMessage || 'Tidak ada data ditemukan.'}</td></tr>`;
        return;
    }
    
    // Buat header
    const headerRow = document.createElement('tr');
    // Kolom checkbox jika diaktifkan
    if (config.showCheckbox) {
        const thCheck = document.createElement('th');
        thCheck.innerHTML = '<input type="checkbox" id="checkAllKetetapan">';
        headerRow.appendChild(thCheck);
    }
    config.columns.forEach(column => {
        const th = document.createElement('th');
        th.textContent = column.label;
        headerRow.appendChild(th);
    });
    // Kolom aksi jika ada
    if (config.actions) {
        const actionTh = document.createElement('th');
        actionTh.textContent = 'Aksi';
        headerRow.appendChild(actionTh);
    }
    tableHead.appendChild(headerRow);
    
    // Buat baris data
    data.forEach((rowData, index) => {
        const row = document.createElement('tr');
        // Terapkan class baris jika ada config.rowClass
        if (config.rowClass) {
            const rowClass = config.rowClass(rowData);
            if (rowClass) row.classList.add(rowClass);
        }
        // Kolom checkbox jika diaktifkan
        if (config.showCheckbox) {
            const tdCheck = document.createElement('td');
            const checkboxValue = rowData[config.idKey || 'ID_Ketetapan']; // Gunakan idKey jika ada, default ke ID_Ketetapan
            tdCheck.innerHTML = `<input type="checkbox" class="rowCheckKetetapan" value="${checkboxValue}">`;
            row.appendChild(tdCheck);
        }
        config.columns.forEach(column => {
            const cell = document.createElement('td');
            let cellData = rowData[column.key];
            // Format data berdasarkan tipe
            if (column.type === 'rupiah') {
                cellData = formatRupiah(cellData);
            } else if (column.type === 'date') {
                cellData = cellData ? new Date(cellData).toLocaleDateString('id-ID') : '-';
            } else if (column.type === 'link') {
                cellData = `<a href="${column.linkUrl}${rowData[column.linkKey]}" style="color: #1976d2; text-decoration: none;">${cellData}</a>`;
            } else if (column.type === 'status') {
                const statusColor = column.statusColors[cellData] || '#666';
                cellData = `<span style="color: ${statusColor}; font-weight: bold;">${cellData}</span>`;
            } else if (column.type === 'photo') {
                cellData = cellData && cellData.startsWith('http') ? 
                    `<a href="${cellData}" target="_blank">Lihat Foto</a>` : 
                    (cellData || '');
            }
            if (column.type === 'link' || column.type === 'status' || column.type === 'photo') {
                cell.innerHTML = cellData;
            } else {
                cell.textContent = cellData || '';
            }
            row.appendChild(cell);
        });
        // Kolom aksi jika ada
        if (config.actions) {
            const actionCell = document.createElement('td');
            let actionButtons = '';
            config.actions.forEach(action => {
                const buttonClass = action.class || 'btn-aksi';
                const buttonStyle = action.style || '';
                const icon = action.icon || '';
                if (action.type === 'print') {
                    actionButtons += `<button onclick="${action.onClick}('${rowData[action.key]}')" class="${buttonClass}" style="background: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; margin-right: 4px;">${icon} Print</button>`;
                } else if (action.type === 'edit') {
                    actionButtons += `<button onclick="${action.onClick}('${rowData[action.key]}')" class="${buttonClass} btn-edit" style="margin-right: 4px;">${icon} Edit</button>`;
                } else if (action.type === 'delete') {
                    actionButtons += `<button onclick="${action.onClick}('${rowData[action.key]}')" class="${buttonClass} btn-hapus">${icon} Hapus</button>`;
                } else if (action.type === 'custom') {
                    actionButtons += `<button onclick="${action.onClick}('${rowData[action.key]}')" class="${buttonClass}" style="${buttonStyle}">${icon} ${action.label}</button>`;
                }
            });
            actionCell.innerHTML = actionButtons;
            row.appendChild(actionCell);
        }
        tableBody.appendChild(row);
    });
}

// Fungsi untuk membuat search dan filter standar
function setupStandardSearchFilter(searchInputId, filterSelects, data, displayFunction) {
    const searchInput = document.getElementById(searchInputId);
    
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            performStandardSearch(data, displayFunction);
        });
    }
    
    filterSelects.forEach(filterConfig => {
        const filterSelect = document.getElementById(filterConfig.id);
        if (filterSelect) {
            filterSelect.addEventListener('change', () => {
                performStandardSearch(data, displayFunction);
            });
        }
    });
}

function performStandardSearch(data, displayFunction) {
    const searchInput = document.querySelector('input[id*="search"]');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    let filteredData = data;
    
    if (searchTerm) {
        filteredData = data.filter(item => {
            return Object.values(item).some(value => 
                value && value.toString().toLowerCase().includes(searchTerm)
            );
        });
    }
    
    displayFunction(filteredData);
}

// Tambahkan/ubah fungsi loadKetetapanData agar selalu update dataKetetapanGlobal
async function loadKetetapanData() {
    try {
        const data = await fetchAllData();
        dataKetetapanGlobal = data.ketetapan || [];
        wajibPajakDataGlobal = data.wajibPajak || [];
        masterPajakDataGlobal = data.masterPajak || [];
        pembayaranDataGlobal = data.pembayaran || [];
        // Render tabel ketetapan
        displayKetetapanHistory(dataKetetapanGlobal, masterPajakDataGlobal);
    } catch (error) {
        document.querySelector('#ketetapanTable tbody').innerHTML = 
            '<tr><td colspan="12" style="text-align: center; padding: 40px; color: #666;">Gagal memuat data.</td></tr>';
    }
}
// Pastikan loadKetetapanData dipanggil setelah edit/hapus/tambah
async function handleUpdateKetetapanSubmit(event) {
    event.preventDefault();
    const updateButton = document.getElementById('updateKetetapanButton');
    updateButton.disabled = true; updateButton.textContent = 'Menyimpan...';
    try {
        const updatedData = {
            action: 'updateKetetapan', id_ketetapan: document.getElementById('editKetetapanId').value,
            masaPajak: document.getElementById('editKetetapanMasaPajak').value,
            jumlahPokok: document.getElementById('editKetetapanJumlahPokok').value,
            catatan: document.getElementById('editKetetapanCatatan').value
        };
        const result = await postData(updatedData);
        alert(result.message || 'Ketetapan berhasil diperbarui!');
        document.getElementById('editKetetapanModal').style.display = 'none';
        await loadKetetapanData(); // refresh data setelah edit
    } catch (error) {
        alert('Gagal memperbarui data: ' + error.message);
    } finally {
        updateButton.disabled = false; updateButton.textContent = 'Simpan Perubahan';
    }
}
async function handleDeleteKetetapanClick(idKetetapan) {
    if (!confirm(`Anda yakin ingin menghapus ketetapan dengan ID: ${idKetetapan}?`)) return;
    try {
        const result = await postData({ action: 'deleteKetetapan', id_ketetapan: idKetetapan });
        alert(result.message || 'Ketetapan berhasil dihapus.');
        await loadKetetapanData(); // refresh data setelah hapus
    } catch (error) {
        alert('Gagal menghapus ketetapan: ' + error.message);
    }
}

async function loadDashboardData() {
    try {
        const response = await fetch('/.netlify/functions/api');
        const data = await response.json();
        
        // Update statistik
        const wajibPajak = data.wajibPajak || [];
        const ketetapan = data.ketetapan || [];
        const pembayaran = data.pembayaran || [];
        const targetList = data.targetPajakRetribusi || [];
        const tahunBerjalan = new Date().getFullYear();
        
        // Hitung total target tahun berjalan
        const totalTargetTahun = targetList.filter(t => t.Tahun == tahunBerjalan).reduce((sum, t) => sum + (parseFloat(t.Target) || 0), 0);
        
        // Hitung statistik lama
        document.getElementById('totalWp').textContent = wajibPajak.length;
        document.getElementById('totalKetetapan').textContent = ketetapan.length;
        document.getElementById('totalPembayaran').textContent = pembayaran.length;
        
        // Hitung SKPD/SKRD (ketetapan yang sudah lunas)
        const ketetapanLunas = ketetapan.filter(k => {
            const pembayaranKetetapan = pembayaran.filter(p => p.ID_Ketetapan === k.ID_Ketetapan);
            return pembayaranKetetapan.some(p => p.StatusPembayaran === 'Sukses');
        });
        document.getElementById('totalSkpdSkrd').textContent = ketetapanLunas.length;
        
        // Hitung SSPD/SSRD (pembayaran sukses)
        const pembayaranSukses = pembayaran.filter(p => p.StatusPembayaran === 'Sukses');
        document.getElementById('totalSspdSsrd').textContent = pembayaranSukses.length;
        
        // Hitung Fiskal (NPWPD yang sudah lunas reklame dan sampah)
        const npwpdMap = {};
        pembayaran.forEach(row => {
            if (!npwpdMap[row.NPWPD]) npwpdMap[row.NPWPD] = [];
            npwpdMap[row.NPWPD].push(row);
        });
        
        let totalFiskal = 0;
        Object.keys(npwpdMap).forEach(npwpd => {
            let lunasReklame = false;
            let lunasSampah = false;
            npwpdMap[npwpd].forEach(bayar => {
                const ket = ketetapan.find(k => k.ID_Ketetapan === bayar.ID_Ketetapan);
                if (!ket) return;
                const master = data.masterPajak?.find(m => m.KodeLayanan === ket.KodeLayanan);
                if (!master) return;
                if (master.NamaLayanan && master.NamaLayanan.toLowerCase().includes('reklame') && bayar.StatusPembayaran === 'Sukses') lunasReklame = true;
                if (master.NamaLayanan && master.NamaLayanan.toLowerCase().includes('sampah') && bayar.StatusPembayaran === 'Sukses') lunasSampah = true;
            });
            if (lunasReklame && lunasSampah) totalFiskal++;
        });
        document.getElementById('totalFiskal').textContent = totalFiskal;
        
        // Hitung total nilai ketetapan
        const totalNilaiKetetapan = ketetapan.reduce((sum, k) => {
            return sum + (parseFloat(k.TotalTagihan) || 0);
        }, 0);
        document.getElementById('totalNilaiKetetapan').textContent = `Rp ${totalNilaiKetetapan.toLocaleString('id-ID')}`;
        
        // Hitung total nilai setoran
        const totalNilaiSetoran = pembayaranSukses.reduce((sum, p) => {
            return sum + (parseFloat(p.JumlahBayar) || 0);
        }, 0);
        document.getElementById('totalNilaiSetoran').textContent = `Rp ${totalNilaiSetoran.toLocaleString('id-ID')}`;
        
        // Update grafik per bulan (tambahkan target bulanan)
        updateDashboardChart(ketetapan, pembayaran, totalTargetTahun);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        document.getElementById('totalWp').textContent = 'Error';
        document.getElementById('totalKetetapan').textContent = 'Error';
        document.getElementById('totalPembayaran').textContent = 'Error';
        document.getElementById('totalSkpdSkrd').textContent = 'Error';
        document.getElementById('totalSspdSsrd').textContent = 'Error';
        document.getElementById('totalFiskal').textContent = 'Error';
        document.getElementById('totalNilaiKetetapan').textContent = 'Error';
        document.getElementById('totalNilaiSetoran').textContent = 'Error';
    }
}

function updateRevenueReport(data) {
    // Ambil data master pajak/retribusi dan target
    const masterList = data.masterPajak || [];
    const targetList = data.targetPajakRetribusi || [];
    const pembayaranList = data.pembayaran || [];
    const tahunDipilih = (document.getElementById('dateRangeTahun')?.value || new Date().getFullYear()).toString();

    // Siapkan breakdown dinamis
    const breakdownContainer = document.getElementById('revenueBreakdown');
    breakdownContainer.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'revenue-header';
    header.style.display = 'flex';
    header.style.fontWeight = 'bold';
    header.style.gap = '24px';
    header.style.marginBottom = '4px';
    header.innerHTML = `
        <span style="width: 120px;">Jenis Pajak</span>
        <span style="width: 120px;">Realisasi</span>
        <span style="width: 120px;">Target</span>
        <span style="width: 80px;">Kontribusi</span>
        <span style="width: 80px;">Capaian</span>
    `;
    breakdownContainer.appendChild(header);

    // Hitung total realisasi semua jenis
    let totalRealisasi = 0;
    const realisasiByKode = {};
    pembayaranList.forEach(p => {
        if (p.StatusPembayaran !== 'Sukses') return;
        const ketetapan = data.ketetapan.find(k => k.ID_Ketetapan === p.ID_Ketetapan);
        if (!ketetapan) return;
        const kode = ketetapan.KodeLayanan;
        if (!realisasiByKode[kode]) realisasiByKode[kode] = 0;
        realisasiByKode[kode] += parseFloat(p.JumlahBayar) || 0;
        totalRealisasi += parseFloat(p.JumlahBayar) || 0;
    });

    // Render breakdown per jenis pajak/retribusi
    masterList.forEach(row => {
        const kode = row.KodeLayanan;
        const nama = row.NamaLayanan;
        const targetObj = targetList.find(t => t.KodeLayanan === kode && t.Tahun == tahunDipilih);
        const target = targetObj ? (parseFloat(targetObj.Target) || 0) : 0;
        const realisasi = realisasiByKode[kode] || 0;
        const kontribusi = totalRealisasi > 0 ? (realisasi / totalRealisasi * 100).toFixed(1) : 0;
        const capaian = target > 0 ? (realisasi / target * 100).toFixed(1) : 0;

        const item = document.createElement('div');
        item.className = 'revenue-item';
        item.style.display = 'flex';
        item.style.gap = '24px';
        item.innerHTML = `
            <span style="width: 120px;">${nama}</span>
            <span style="width: 120px;">Rp ${realisasi.toLocaleString('id-ID')}</span>
            <span style="width: 120px;">Rp ${target.toLocaleString('id-ID')}</span>
            <span style="width: 80px;">${kontribusi}%</span>
            <span style="width: 80px;">${capaian}%</span>
        `;
        breakdownContainer.appendChild(item);
    });
}

function updateDashboardChart(ketetapan, pembayaran, totalTargetTahun) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const currentYear = new Date().getFullYear();
    // Data nilai ketetapan per bulan
    const nilaiKetetapanPerBulan = new Array(12).fill(0);
    ketetapan.forEach(k => {
        if (k.TanggalKetetapan) {
            const date = new Date(k.TanggalKetetapan);
            if (date.getFullYear() === currentYear) {
                nilaiKetetapanPerBulan[date.getMonth()] += parseFloat(k.TotalTagihan) || 0;
            }
        }
    });
    // Data nilai pembayaran per bulan
    const nilaiPembayaranPerBulan = new Array(12).fill(0);
    pembayaran.forEach(p => {
        if (p.TanggalBayar && p.StatusPembayaran === 'Sukses') {
            const date = new Date(p.TanggalBayar);
            if (date.getFullYear() === currentYear) {
                nilaiPembayaranPerBulan[date.getMonth()] += parseFloat(p.JumlahBayar) || 0;
            }
        }
    });
    // Data target bulanan (bagi rata)
    const targetBulanan = new Array(12).fill(totalTargetTahun / 12);
    const ctx = document.getElementById('dashboardChart').getContext('2d');
    if (window.dashboardChartInstance) {
        window.dashboardChartInstance.destroy();
    }
    window.dashboardChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: `Nilai Ketetapan (${currentYear})`,
                    data: nilaiKetetapanPerBulan,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: false,
                    borderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 8
                },
                {
                    label: `Nilai Pembayaran (${currentYear})`,
                    data: nilaiPembayaranPerBulan,
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 8
                },
                {
                    label: `Target Bulanan (${currentYear})`,
                    data: targetBulanan,
                    borderColor: '#F59E42',
                    backgroundColor: 'rgba(245, 158, 66, 0.1)',
                    borderDash: [8, 4],
                    pointStyle: 'rectRot',
                    tension: 0.1,
                    fill: false,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { size: 14 }
                    }
                },
                title: {
                    display: true,
                    text: `Grafik Pendapatan Daerah Tahun ${currentYear}`,
                    font: { size: 18, weight: 'bold' },
                    padding: { top: 10, bottom: 20 }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            return context.dataset.label + ': Rp ' + value.toLocaleString('id-ID');
                        }
                    }
                }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false },
            scales: {
                x: {
                    display: true,
                    title: { display: true, text: 'Bulan', font: { size: 14, weight: 'bold' } },
                    ticks: { font: { size: 12 } }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Nilai (Rupiah)', font: { size: 14, weight: 'bold' } },
                    ticks: {
                        font: { size: 12 },
                        callback: function(value) {
                            if (value >= 1000000000) {
                                return 'Rp ' + (value / 1000000000).toFixed(1) + 'M';
                            } else if (value >= 1000000) {
                                return 'Rp ' + (value / 1000000).toFixed(1) + 'Jt';
                            } else if (value >= 1000) {
                                return 'Rp ' + (value / 1000).toFixed(0) + 'K';
                            }
                            return 'Rp ' + value.toLocaleString('id-ID');
                        }
                    }
                }
            },
            elements: { point: { hoverRadius: 8 } }
        }
    });
}