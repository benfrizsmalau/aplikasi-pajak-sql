// DOM
const form = document.getElementById('formTarget');
const kodeLayananSelect = document.getElementById('kodeLayanan');
const tahunInput = document.getElementById('tahun');
const targetInput = document.getElementById('target');
const tabelTarget = document.getElementById('tabelTarget').getElementsByTagName('tbody')[0];

// Load MasterPajakRetribusi untuk dropdown
async function loadMasterPajak() {
    const response = await fetch('/.netlify/functions/api');
    const data = await response.json();
    const master = data.masterPajak || [];
    kodeLayananSelect.innerHTML = '<option value="">Pilih Kode Layanan</option>';
    master.forEach(row => {
        const opt = document.createElement('option');
        opt.value = row.KodeLayanan;
        opt.textContent = `${row.KodeLayanan} - ${row.NamaLayanan}`;
        kodeLayananSelect.appendChild(opt);
    });
}

// Load data TargetPajakRetribusi ke tabel
async function loadTargetTable() {
    const response = await fetch('/.netlify/functions/api');
    const data = await response.json();
    const targetList = data.targetPajakRetribusi || [];
    tabelTarget.innerHTML = '';
    targetList.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.KodeLayanan}</td>
            <td>${row.NamaLayanan || ''}</td>
            <td>${row.Tahun}</td>
            <td>Rp ${Number(row.Target).toLocaleString('id-ID')}</td>
            <td><button onclick="hapusTarget('${row.KodeLayanan}', ${row.Tahun})">Hapus</button></td>
        `;
        tabelTarget.appendChild(tr);
    });
}

// Simpan data baru
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kodeLayanan = kodeLayananSelect.value;
    const tahun = parseInt(tahunInput.value);
    const target = parseInt(targetInput.value);
    if (!kodeLayanan || !tahun || !target) {
        alert('Semua field wajib diisi!');
        return;
    }
    const namaLayanan = kodeLayananSelect.options[kodeLayananSelect.selectedIndex].text.split(' - ')[1] || '';
    const res = await fetch('/.netlify/functions/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'createTarget',
            KodeLayanan: kodeLayanan,
            Tahun: tahun,
            Target: target,
            NamaLayanan: namaLayanan
        })
    });
    const result = await res.json();
    if (result.status !== 'sukses') {
        alert('Gagal menyimpan data!\n' + (result.message || ''));
        return;
    }
    form.reset();
    tahunInput.value = new Date().getFullYear();
    await loadTargetTable();
});

// Hapus data
window.hapusTarget = async (kodeLayanan, tahun) => {
    if (!confirm('Yakin hapus target ini?')) return;
    const res = await fetch('/.netlify/functions/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'deleteTarget',
            KodeLayanan: kodeLayanan,
            Tahun: tahun
        })
    });
    const result = await res.json();
    if (result.status !== 'sukses') {
        alert('Gagal menghapus data!');
        return;
    }
    await loadTargetTable();
};

// Inisialisasi
window.addEventListener('DOMContentLoaded', async () => {
    await loadMasterPajak();
    await loadTargetTable();
}); 