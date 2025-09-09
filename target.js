// DOM
const form = document.getElementById('formTarget');
const kodeLayananSelect = document.getElementById('kodeLayanan');
const tahunInput = document.getElementById('tahun');
const targetInput = document.getElementById('target');
const tabelTarget = document.getElementById('tabelTarget').getElementsByTagName('tbody')[0];
const dropdownTahun = document.getElementById('dropdownTahun');
const btnSalinTahun = document.getElementById('btnSalinTahun');
const checkAll = document.getElementById('checkAll');

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

let tahunList = [];
let tahunAktif = new Date().getFullYear();
let masterPajak = [];
let targetList = [];

// Helper: generate list tahun dari data target
function getTahunList(targets) {
    const tahunSet = new Set(targets.map(t => t.Tahun));
    tahunSet.add(new Date().getFullYear());
    return Array.from(tahunSet).sort();
}

// Load MasterPajakRetribusi dan target
async function loadAllData() {
    const response = await fetch('/.netlify/functions/api');
    const data = await response.json();
    masterPajak = data.masterPajak || [];
    targetList = data.targetPajakRetribusi || [];
    tahunList = getTahunList(targetList);
}

// Render dropdown tahun
function renderDropdownTahun() {
    dropdownTahun.innerHTML = '';
    tahunList.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        if (t == tahunAktif) opt.selected = true;
        dropdownTahun.appendChild(opt);
    });
}

// Render tabel target lengkap (semua jenis pajak)
function renderTargetTable() {
    tabelTarget.innerHTML = '';
    let totalTarget = 0;
    masterPajak.forEach(row => {
        const target = targetList.find(t => t.KodeLayanan === row.KodeLayanan && t.Tahun == tahunAktif);
        const nilaiTarget = target ? target.Target : 0;
        totalTarget += Number(nilaiTarget) || 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" class="rowCheck"></td>
            <td>${row.KodeLayanan}</td>
            <td>${row.NamaLayanan}</td>
            <td><input type="number" class="inputTarget" value="${nilaiTarget}" min="0" data-kodelayanan="${row.KodeLayanan}" style="text-align:right;"> <span class="target-format">Rp ${Number(nilaiTarget).toLocaleString('id-ID')}</span></td>
        `;
        tabelTarget.appendChild(tr);
    });
    // Tambahkan baris total di bawah tabel
    let tfoot = tabelTarget.parentNode.querySelector('tfoot');
    if (!tfoot) {
        tfoot = document.createElement('tfoot');
        tabelTarget.parentNode.appendChild(tfoot);
    }
    tfoot.innerHTML = `<tr><td colspan="3" style="text-align:right;font-weight:bold;">Jumlah Target Keseluruhan</td><td style="text-align:right;font-weight:bold;">Rp ${totalTarget.toLocaleString('id-ID')}</td></tr>`;
}

// Update tampilan format rupiah saat input berubah
function updateFormatRupiah() {
    document.querySelectorAll('.inputTarget').forEach(input => {
        input.addEventListener('input', function() {
            const span = this.parentNode.querySelector('.target-format');
            span.textContent = 'Rp ' + Number(this.value).toLocaleString('id-ID');
            // Update total
            renderTargetTable();
        });
    });
}

// Panggil updateFormatRupiah setelah render tabel
function renderTargetTableWithFormat() {
    renderTargetTable();
    updateFormatRupiah();
}

// Salin target tahun sebelumnya
btnSalinTahun.addEventListener('click', () => {
    const tahunSebelumnya = tahunList.filter(t => t < tahunAktif).pop();
    if (!tahunSebelumnya) {
        alert('Tidak ada data tahun sebelumnya untuk disalin!');
        return;
    }
    masterPajak.forEach(row => {
        const prev = targetList.find(t => t.KodeLayanan === row.KodeLayanan && t.Tahun == tahunSebelumnya);
        const idx = targetList.findIndex(t => t.KodeLayanan === row.KodeLayanan && t.Tahun == tahunAktif);
        if (prev) {
            if (idx === -1) {
                targetList.push({
                    KodeLayanan: row.KodeLayanan,
                    Tahun: tahunAktif,
                    Target: prev.Target,
                    NamaLayanan: row.NamaLayanan
                });
            } else {
                targetList[idx].Target = prev.Target;
            }
        }
    });
    renderTargetTableWithFormat();
});

// Checkbox all
checkAll.addEventListener('change', function() {
    document.querySelectorAll('.rowCheck').forEach(cb => cb.checked = checkAll.checked);
});

// Simpan perubahan target (edit massal)
async function simpanPerubahan() {
    const rows = tabelTarget.querySelectorAll('tr');
    for (const tr of rows) {
        const cb = tr.querySelector('.rowCheck');
        if (cb && cb.checked) {
            const kodeLayanan = tr.querySelector('.inputTarget').dataset.kodelayanan;
            const target = parseInt(tr.querySelector('.inputTarget').value) || 0;
            await fetch('/.netlify/functions/api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'createTarget',
                    KodeLayanan: kodeLayanan,
                    Tahun: tahunAktif,
                    Target: target,
                    NamaLayanan: masterPajak.find(m => m.KodeLayanan === kodeLayanan)?.NamaLayanan || ''
                })
            });
        }
    }
    await loadAllData();
    renderTargetTableWithFormat();
    alert('Perubahan target berhasil disimpan!');
}

// Tombol simpan perubahan
const btnSimpan = document.createElement('button');
btnSimpan.textContent = 'Simpan Perubahan';
btnSimpan.type = 'button';
btnSimpan.style.margin = '8px 0';
btnSimpan.onclick = simpanPerubahan;
dropdownTahun.parentNode.appendChild(btnSimpan);

// Inisialisasi
window.addEventListener('DOMContentLoaded', async () => {
    await loadAllData();
    renderDropdownTahun();
    renderTargetTableWithFormat();
}); 