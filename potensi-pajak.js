// potensi-pajak.js
// Script untuk halaman perhitungan potensi pajak

let potensiData = {};
let masterPajakData = [];
let targetData = [];

// Inisialisasi halaman
document.addEventListener('DOMContentLoaded', function() {
    loadPotensiData();
});

// Load data potensi pajak
async function loadPotensiData() {
    try {
        const response = await fetch('/.netlify/functions/api');
        const data = await response.json();

        potensiData = data;
        masterPajakData = data.masterPajak || [];
        targetData = data.targetPajakRetribusi || [];

        updatePotensiData();
    } catch (error) {
        console.error('Error loading potensi data:', error);
        alert('Gagal memuat data potensi pajak');
    }
}

// Update perhitungan potensi berdasarkan parameter
function updatePotensiData() {
    const tahun = document.getElementById('tahunPotensi').value;
    const tingkatKepatuhan = parseFloat(document.getElementById('tingkatKepatuhan').value) / 100;
    const faktorPertumbuhan = parseFloat(document.getElementById('faktorPertumbuhan').value) / 100;
    const bulanAnalisis = parseInt(document.getElementById('bulanAnalisis').value);

    // Hitung potensi per jenis pajak
    const potensiPerJenis = calculatePotensiPerJenis(tahun, tingkatKepatuhan, faktorPertumbuhan, bulanAnalisis);

    // Update ringkasan
    updatePotensiSummary(potensiPerJenis);

    // Update tabel
    updatePotensiTable(potensiPerJenis);

    // Update chart
    updatePotensiChart(potensiPerJenis);
}

// Hitung potensi per jenis pajak
function calculatePotensiPerJenis(tahun, tingkatKepatuhan, faktorPertumbuhan, bulanAnalisis) {
    const hasil = [];

    masterPajakData.forEach(master => {
        const kodeLayanan = master.KodeLayanan;
        const namaLayanan = master.NamaLayanan;

        // Cari target untuk tahun tersebut
        const targetItem = targetData.find(t => t.KodeLayanan === kodeLayanan && String(t.Tahun) === String(tahun));
        const targetTahunan = targetItem ? parseFloat(targetItem.Target) || 0 : 0;

        // Hitung jumlah wajib pajak aktif untuk jenis pajak ini
        const wpAktif = potensiData.wajibPajak?.filter(wp => {
            // Cek apakah WP memiliki ketetapan untuk jenis pajak ini
            const hasKetetapan = potensiData.ketetapan?.some(k =>
                k.NPWPD === wp.NPWPD && k.KodeLayanan === kodeLayanan
            );
            return hasKetetapan;
        }).length || 0;

        // Hitung rata-rata objek pajak (berdasarkan pembayaran yang ada)
        const pembayaranJenis = potensiData.pembayaran?.filter(p => {
            const ketetapan = potensiData.ketetapan?.find(k => k.ID_Ketetapan === p.ID_Ketetapan);
            return ketetapan && ketetapan.KodeLayanan === kodeLayanan && p.StatusPembayaran === 'Sukses';
        }) || [];

        const totalPembayaran = pembayaranJenis.reduce((sum, p) => sum + (parseFloat(p.JumlahBayar) || 0), 0);
        const rataRataObjek = pembayaranJenis.length > 0 ? totalPembayaran / pembayaranJenis.length : 0;

        // Hitung tarif pajak (berdasarkan data yang ada atau estimasi)
        const tarifPajak = calculateTarifPajak(kodeLayanan, rataRataObjek);

        // Hitung potensi per wajib pajak
        const potensiPerWP = rataRataObjek * tarifPajak * tingkatKepatuhan * (1 + faktorPertumbuhan);

        // Hitung total potensi
        const totalPotensi = wpAktif * potensiPerWP;

        // Hitung realisasi saat ini (berdasarkan bulan analisis)
        const realisasiSaatIni = calculateRealisasiSaatIni(kodeLayanan, bulanAnalisis, tahun);

        // Hitung gap dan pencapaian
        const gap = totalPotensi - realisasiSaatIni;
        const pencapaian = totalPotensi > 0 ? (realisasiSaatIni / totalPotensi) * 100 : 0;

        hasil.push({
            kodeLayanan,
            namaLayanan,
            wpAktif,
            rataRataObjek,
            tarifPajak: tarifPajak * 100, // Convert to percentage
            potensiPerWP,
            totalPotensi,
            realisasiSaatIni,
            gap,
            pencapaian
        });
    });

    return hasil;
}

// Hitung tarif pajak berdasarkan jenis pajak
function calculateTarifPajak(kodeLayanan, rataRataObjek) {
    // Tarif pajak berdasarkan jenis (dalam desimal)
    const tarifDasar = {
        'PHTB': 0.05,    // 5% Pajak Penghasilan
        'BPHTB': 0.05,   // 5% Bea Perolehan Hak atas Tanah
        'HOTEL': 0.10,   // 10% Pajak Hotel
        'RESTORAN': 0.10, // 10% Pajak Restoran
        'HIBURAN': 0.25,  // 25% Pajak Hiburan
        'PARKIR': 0.20,   // 20% Pajak Parkir
        'AIR_TANAH': 0.05, // 5% Pajak Air Tanah
        'MINERAL': 0.025  // 2.5% Pajak Mineral Bukan Logam
    };

    return tarifDasar[kodeLayanan] || 0.10; // Default 10%
}

// Hitung realisasi saat ini berdasarkan bulan analisis
function calculateRealisasiSaatIni(kodeLayanan, bulanAnalisis, tahun) {
    const pembayaranFiltered = potensiData.pembayaran?.filter(p => {
        if (p.StatusPembayaran !== 'Sukses') return false;

        const ketetapan = potensiData.ketetapan?.find(k => k.ID_Ketetapan === p.ID_Ketetapan);
        if (!ketetapan || ketetapan.KodeLayanan !== kodeLayanan) return false;

        const tanggalBayar = new Date(p.TanggalBayar);
        const tahunBayar = tanggalBayar.getFullYear();
        const bulanBayar = tanggalBayar.getMonth() + 1;

        // Jika bulan analisis = 12, hitung full year
        if (bulanAnalisis === 12) {
            return tahunBayar === parseInt(tahun);
        } else {
            return tahunBayar === parseInt(tahun) && bulanBayar <= bulanAnalisis;
        }
    }) || [];

    return pembayaranFiltered.reduce((sum, p) => sum + (parseFloat(p.JumlahBayar) || 0), 0);
}

// Update ringkasan potensi
function updatePotensiSummary(potensiPerJenis) {
    const totalPotensi = potensiPerJenis.reduce((sum, item) => sum + item.totalPotensi, 0);
    const totalRealisasi = potensiPerJenis.reduce((sum, item) => sum + item.realisasiSaatIni, 0);
    const totalGap = totalPotensi - totalRealisasi;
    const persentasePencapaian = totalPotensi > 0 ? (totalRealisasi / totalPotensi) * 100 : 0;

    document.getElementById('totalPotensi').textContent = formatCurrency(totalPotensi);
    document.getElementById('realisasiSaatIni').textContent = formatCurrency(totalRealisasi);
    document.getElementById('gapPotensi').textContent = formatCurrency(totalGap);
    document.getElementById('persentasePencapaian').textContent = persentasePencapaian.toFixed(1) + '%';
}

// Update tabel potensi
function updatePotensiTable(potensiPerJenis) {
    const tbody = document.getElementById('potensiTableBody');
    tbody.innerHTML = '';

    if (potensiPerJenis.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">Tidak ada data potensi pajak</td></tr>';
        return;
    }

    potensiPerJenis.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.namaLayanan}</td>
            <td style="text-align: center;">${item.wpAktif}</td>
            <td style="text-align: right;">${formatCurrency(item.rataRataObjek)}</td>
            <td style="text-align: center;">${item.tarifPajak.toFixed(1)}%</td>
            <td style="text-align: right;">${formatCurrency(item.potensiPerWP)}</td>
            <td style="text-align: right;">${formatCurrency(item.totalPotensi)}</td>
            <td style="text-align: right;">${formatCurrency(item.realisasiSaatIni)}</td>
            <td style="text-align: right;">${formatCurrency(item.gap)}</td>
            <td style="text-align: center;">${item.pencapaian.toFixed(1)}%</td>
        `;
        tbody.appendChild(row);
    });
}

// Update chart potensi
function updatePotensiChart(potensiPerJenis) {
    const ctx = document.getElementById('potensiChart').getContext('2d');

    if (window.potensiChartInstance) {
        window.potensiChartInstance.destroy();
    }

    const labels = potensiPerJenis.map(item => item.namaLayanan);
    const potensiData = potensiPerJenis.map(item => item.totalPotensi / 1000000); // Dalam jutaan
    const realisasiData = potensiPerJenis.map(item => item.realisasiSaatIni / 1000000);

    window.potensiChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Potensi (Juta Rupiah)',
                data: potensiData,
                backgroundColor: 'rgba(54, 162, 235, 0.8)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }, {
                label: 'Realisasi (Juta Rupiah)',
                data: realisasiData,
                backgroundColor: 'rgba(255, 99, 132, 0.8)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Perbandingan Potensi vs Realisasi per Jenis Pajak'
                },
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Nilai (Juta Rupiah)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Jenis Pajak'
                    }
                }
            }
        }
    });
}

// Format currency helper
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

// Export ke PDF
function exportPotensiToPDF() {
    // Gunakan fungsi khusus export potensi dari cetakreport.js
    if (typeof window.exportPotensiToPDF === 'function') {
        window.exportPotensiToPDF();
    } else {
        alert('Fungsi export PDF potensi belum tersedia. Pastikan cetakreport.js dimuat dengan benar.');
    }
}

// Export ke Excel (placeholder)
function exportPotensiToExcel() {
    alert('Fitur export ke Excel akan segera tersedia');
}

// Print laporan
function printPotensiReport() {
    window.print();
}

// Helper untuk nama bulan
function getBulanName(bulanNumber) {
    const bulanNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return bulanNames[parseInt(bulanNumber) - 1] || 'Desember';
}