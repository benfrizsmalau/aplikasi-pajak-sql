// Report specific JavaScript
let reportData = {};
let currentReportType = 'summary';

document.addEventListener('DOMContentLoaded', function() {
    initRevenueReportFilters();
    loadReportData();
    setupDateRangeFilter();

    // Setup event listeners untuk laporan potensi
    document.getElementById('potensiMethod').addEventListener('change', function() {
        generatePotensiReport();
    });
    document.getElementById('potensiYears').addEventListener('change', function() {
        generatePotensiReport();
    });
    document.getElementById('growthRate').addEventListener('input', function() {
        generatePotensiReport();
    });
});

function initRevenueReportFilters() {
    const tahunSelect = document.getElementById('dateRangeTahun');
    if (!tahunSelect) return;
    const tahunSekarang = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
        const tahun = tahunSekarang - i;
        const option = document.createElement('option');
        option.value = tahun;
        option.textContent = tahun;
        tahunSelect.appendChild(option);
    }
    tahunSelect.value = tahunSekarang;
    tahunSelect.addEventListener('change', loadReportData);
}

function setupDateRangeFilter() {
    const dateRange = document.getElementById('dateRange');
    const customDateGroup = document.getElementById('customDateGroup');

    dateRange.addEventListener('change', function() {
        if (this.value === 'custom') {
            customDateGroup.style.display = 'flex';
            // Set default dates
            const today = new Date();
            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
            document.getElementById('startDate').value = lastMonth.toISOString().split('T')[0];
            document.getElementById('endDate').value = today.toISOString().split('T')[0];
        } else {
            customDateGroup.style.display = 'none';
        }
        loadReportData();
    });
}

function changeReportType() {
    const reportType = document.getElementById('reportType').value;
    currentReportType = reportType;

    // Hide all report sections
    const sections = document.querySelectorAll('.report-section');
    sections.forEach(section => section.style.display = 'none');

    // Show selected report section
    const selectedSection = document.getElementById(reportType + 'Report');
    if (selectedSection) {
        selectedSection.style.display = 'block';
    }

    // Show filter periode untuk semua laporan
    const dateRangeFilter = document.getElementById('dateRangeFilter');
    const customDateGroup = document.getElementById('customDateGroup');
    dateRangeFilter.style.display = 'flex';
    if (document.getElementById('dateRange').value === 'custom') {
        customDateGroup.style.display = 'flex';
    } else {
        customDateGroup.style.display = 'none';
    }

    loadReportData();
}

async function loadReportData() {
    try {
        const response = await fetch('/.netlify/functions/api');
        const data = await response.json();
        reportData = data;

        const dateRange = getDateRange();
        const filteredData = filterDataByDateRange(data, dateRange);

        switch (currentReportType) {
            case 'summary':
                updateSummaryReport(filteredData);
                break;
            case 'revenue':
                updateRevenueReport(filteredData);
                break;
            case 'wp':
                updateWpReport(filteredData);
                break;
            case 'ketetapan':
                updateKetetapanReport(filteredData);
                break;
            case 'pembayaran':
                updatePembayaranReport(filteredData);
                break;
            case 'fiskal':
                updateFiskalReport(filteredData);
                break;
            case 'performance':
                updatePerformanceReport(filteredData);
                break;
            case 'potensi':
                updatePotensiReport(filteredData);
                break;
        }

    } catch (error) {
        console.error('Error loading report data:', error);
        alert('Gagal memuat data laporan');
    }
}

function getDateRange() {
    const dateRange = document.getElementById('dateRange').value;
    const today = new Date();
    let startDate, endDate;
    switch (dateRange) {
        case 'today':
            startDate = new Date(today);
            endDate = new Date(today);
            break;
        case 'week':
            startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            endDate = new Date(today);
            break;
        case 'month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today);
            break;
        case 'quarter':
            const quarter = Math.floor(today.getMonth() / 3);
            startDate = new Date(today.getFullYear(), quarter * 3, 1);
            endDate = new Date(today);
            break;
        case 'year':
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = new Date(today);
            break;
        case 'custom':
            startDate = new Date(document.getElementById('startDate').value);
            endDate = new Date(document.getElementById('endDate').value);
            break;
        default:
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today);
    }
    return {
        startDate,
        endDate
    };
}

function filterDataByDateRange(data, dateRange) {
    const {
        startDate,
        endDate
    } = dateRange;

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const filteredKetetapan = (data.ketetapan || []).filter(k => {
        if (!k.TanggalKetetapan) return false;
        const ketetapanDate = new Date(k.TanggalKetetapan);
        return ketetapanDate >= startDate && ketetapanDate <= endDate;
    });

    const filteredPembayaran = (data.pembayaran || []).filter(p => {
        if (!p.TanggalBayar) return false;
        const pembayaranDate = new Date(p.TanggalBayar);
        return pembayaranDate >= startDate && pembayaranDate <= endDate;
    });

    return {
        ...data,
        ketetapan: filteredKetetapan,
        pembayaran: filteredPembayaran
    };
}

function updateSummaryReport(data) {
    const totalRevenue = data.pembayaran.reduce((sum, p) => sum + (parseFloat(p.JumlahBayar) || 0), 0);
    const activeWp = data.wajibPajak?.length || 0;
    const totalKetetapan = data.ketetapan.length;
    const successPayment = data.pembayaran.filter(p => p.StatusPembayaran === 'Sukses').length;

    document.getElementById('totalRevenue').textContent = `Rp ${totalRevenue.toLocaleString('id-ID')}`;
    document.getElementById('activeWp').textContent = activeWp;
    document.getElementById('totalKetetapan').textContent = totalKetetapan;
    document.getElementById('successPayment').textContent = successPayment;

    updateSummaryChart(data);
}

function updateSummaryChart(data) {
    const ctx = document.getElementById('summaryChart').getContext('2d');
    if (window.summaryChartInstance) {
        window.summaryChartInstance.destroy();
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const currentYear = new Date().getFullYear();
    const revenueData = new Array(12).fill(0);
    const ketetapanData = new Array(12).fill(0);

    data.pembayaran.forEach(p => {
        if (p.TanggalBayar) {
            const date = new Date(p.TanggalBayar);
            if (date.getFullYear() === currentYear) {
                revenueData[date.getMonth()] += parseFloat(p.JumlahBayar) || 0;
            }
        }
    });
    data.ketetapan.forEach(k => {
        if (k.TanggalKetetapan) {
            const date = new Date(k.TanggalKetetapan);
            if (date.getFullYear() === currentYear) {
                ketetapanData[date.getMonth()]++;
            }
        }
    });

    window.summaryChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Pendapatan (Juta Rupiah)',
                data: revenueData.map(v => v / 1000000),
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                tension: 0.4
            }, {
                label: 'Jumlah Ketetapan',
                data: ketetapanData,
                borderColor: '#2196F3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Tren Pendapatan dan Ketetapan'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function updateRevenueReport(data) {
    const masterList = reportData.masterPajak || [];
    const targetList = reportData.targetPajakRetribusi || [];
    const pembayaranList = data.pembayaran || [];
    const tahunDipilih = (document.getElementById('dateRangeTahun')?.value || new Date().getFullYear()).toString();

    const breakdownContainer = document.getElementById('revenueBreakdown');
    breakdownContainer.innerHTML = '';

    // --- Perhitungan total tetap dipertahankan ---
    let totalKetetapan = 0;
    let totalRealisasi = 0;
    let totalKontribusi = 0;
    let totalCapaian = 0;
    let countCapaian = 0;
    const realisasiByKode = {};
    pembayaranList.forEach(p => {
        if (p.StatusPembayaran !== 'Sukses') return;
        const ketetapan = (reportData.ketetapan || []).find(k => k.ID_Ketetapan === p.ID_Ketetapan);
        if (!ketetapan) return;
        const kode = ketetapan.KodeLayanan;
        if (!realisasiByKode[kode]) realisasiByKode[kode] = 0;
        const amount = parseFloat(p.JumlahBayar) || 0;
        realisasiByKode[kode] += amount;
        totalRealisasi += amount;
    });
    masterList.forEach(row => {
        const kode = row.KodeLayanan;
        const targetObj = targetList.find(t => t.KodeLayanan === kode && t.Tahun == tahunDipilih);
        const target = targetObj ? (parseFloat(targetObj.Target) || 0) : 0;
        totalKetetapan += target;
    });
    masterList.forEach(row => {
        const kode = row.KodeLayanan;
        const targetObj = targetList.find(t => t.KodeLayanan === kode && t.Tahun == tahunDipilih);
        const target = targetObj ? (parseFloat(targetObj.Target) || 0) : 0;
        const realisasi = realisasiByKode[kode] || 0;
        if (target > 0) {
            totalCapaian += (realisasi / target * 100);
            countCapaian++;
        }
    });
    const rataCapaian = countCapaian > 0 ? (totalCapaian / countCapaian).toFixed(1) : 0;

    // --- KARTU STATISTIK DIHILANGKAN ---
    // (Bagian statCard dihapus, hanya tabel dan baris total yang tampil)

    // --- HEADER TABEL ---
    const header = document.createElement('div');
    header.className = 'revenue-header';
    header.style.cssText = 'display: flex; font-weight: bold; gap: 16px; margin-bottom: 8px; padding: 8px; background-color: #f4f6f8; border-radius: 4px;';
    header.innerHTML = `
        <span style="flex: 3;">Jenis Pajak/Retribusi</span>
        <span style="flex: 2; text-align: right;">Realisasi</span>
        <span style="flex: 2; text-align: right;">Target ${tahunDipilih}</span>
        <span style="flex: 1; text-align: center;">Kontribusi</span>
        <span style="flex: 1; text-align: center;">Capaian</span>
    `;
    breakdownContainer.appendChild(header);

    // --- ISI TABEL ---
    let totalKontribusiTabel = 0;
    let totalCapaianTabel = 0;
    let countCapaianTabel = 0;
    masterList.forEach(row => {
        const kode = row.KodeLayanan;
        const nama = row.NamaLayanan;
        const targetObj = targetList.find(t => t.KodeLayanan === kode && t.Tahun == tahunDipilih);
        const target = targetObj ? (parseFloat(targetObj.Target) || 0) : 0;
        const realisasi = realisasiByKode[kode] || 0;
        const kontribusi = totalRealisasi > 0 ? (realisasi / totalRealisasi * 100).toFixed(1) : 0;
        const capaian = target > 0 ? (realisasi / target * 100).toFixed(1) : 0;
        totalKontribusiTabel += parseFloat(kontribusi);
        if (target > 0) {
            totalCapaianTabel += parseFloat(capaian);
            countCapaianTabel++;
        }
        const item = document.createElement('div');
        item.className = 'revenue-item';
        item.style.cssText = 'display: flex; gap: 16px; padding: 8px; border-bottom: 1px solid #e0e0e0; align-items: center;';
        item.innerHTML = `
            <span style="flex: 3;">${nama}</span>
            <span style="flex: 2; text-align: right;">${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(realisasi)}</span>
            <span style="flex: 2; text-align: right;">${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(target)}</span>
            <span style="flex: 1; text-align: center;">${kontribusi}%</span>
            <span style="flex: 1; text-align: center; font-weight: bold; color: ${capaian >= 100 ? '#28a745' : (capaian >= 50 ? '#fd7e14' : '#dc3545')};">${capaian}%</span>
        `;
        breakdownContainer.appendChild(item);
    });

    // --- BARIS TOTAL DI BAWAH TABEL ---
    const totalRow = document.createElement('div');
    totalRow.className = 'revenue-total-row';
    totalRow.style.cssText = 'display: flex; gap: 16px; padding: 10px 8px; font-weight: bold; background: #e9ecef; border-radius: 4px; margin-top: 4px;';
    totalRow.innerHTML = `
        <span style="flex: 3; text-align: right;">TOTAL</span>
        <span style="flex: 2; text-align: right;">${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalRealisasi)}</span>
        <span style="flex: 2; text-align: right;">${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalKetetapan)}</span>
        <span style="flex: 1; text-align: center;">100%</span>
        <span style="flex: 1; text-align: center; color: #007bff;">${countCapaianTabel > 0 ? (totalCapaianTabel / countCapaianTabel).toFixed(1) : 0}%</span>
    `;
    breakdownContainer.appendChild(totalRow);

    // Update chart
    const revenueForChart = {};
    masterList.forEach(row => {
        const kode = row.KodeLayanan;
        const nama = row.NamaLayanan;
        const realisasi = realisasiByKode[kode] || 0;
        if (realisasi > 0) {
            revenueForChart[nama] = realisasi;
        }
    });
    updateRevenueChart(revenueForChart);
}

function updateRevenueChart(revenueByType) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    if (window.revenueChartInstance) {
        window.revenueChartInstance.destroy();
    }
    const labels = Object.keys(revenueByType);
    const data = Object.values(revenueByType);
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#E7E9ED', '#839E9A'];

    window.revenueChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Distribusi Pendapatan per Jenis Pajak'
                },
                legend: {
                    position: 'right',
                }
            }
        }
    });
}

function updateWpReport(data) {
    const totalWp = data.wajibPajak?.length || 0;
    const activeWp = new Set(data.pembayaran.map(p => p.NPWPD)).size;

    document.getElementById('totalWpRegistered').textContent = totalWp;
    document.getElementById('activeWpCount').textContent = activeWp;
    document.getElementById('inactiveWpCount').textContent = totalWp - activeWp;

    const tbody = document.getElementById('wpTableBody');
    tbody.innerHTML = '';
    (data.wajibPajak || []).forEach(wpData => {
        const totalPayment = data.pembayaran
            .filter(p => p.NPWPD === wpData.NPWPD)
            .reduce((sum, p) => sum + (parseFloat(p.JumlahBayar) || 0), 0);
        const isActive = totalPayment > 0;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${wpData.NPWPD}</td>
            <td>${wpData['Nama Usaha'] || '-'}</td>
            <td>${wpData['Nama Pemilik'] || '-'}</td>
            <td>${wpData.JenisWP || '-'}</td>
            <td><span class="status-badge ${isActive ? 'active' : 'inactive'}">${isActive ? 'Aktif' : 'Non-Aktif'}</span></td>
            <td>Rp ${totalPayment.toLocaleString('id-ID')}</td>
        `;
        tbody.appendChild(row);
    });
}

function updateKetetapanReport(data) {
    const totalKetetapan = data.ketetapan.length;
    const lunasCount = data.ketetapan.filter(k => k.Status === 'Lunas').length;
    const belumLunasCount = totalKetetapan - lunasCount;
    const totalNilai = data.ketetapan.reduce((sum, k) => sum + (parseFloat(k.TotalTagihan) || 0), 0);

    document.getElementById('totalKetetapanCount').textContent = totalKetetapan;
    document.getElementById('lunasCount').textContent = lunasCount;
    document.getElementById('belumLunasCount').textContent = belumLunasCount;
    document.getElementById('totalNilaiKetetapan').textContent = `Rp ${totalNilai.toLocaleString('id-ID')}`;

    const tbody = document.getElementById('ketetapanTableBody');
    tbody.innerHTML = '';
    data.ketetapan.forEach(k => {
        const masterPajak = reportData.masterPajak?.find(m => m.KodeLayanan === k.KodeLayanan);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${k.ID_Ketetapan}</td>
            <td>${k.NPWPD}</td>
            <td>${masterPajak?.NamaLayanan || k.KodeLayanan}</td>
            <td>${k.MasaPajak || '-'}</td>
            <td>Rp ${(parseFloat(k.TotalTagihan) || 0).toLocaleString('id-ID')}</td>
            <td><span class="status-badge ${k.Status === 'Lunas' ? 'success' : 'warning'}">${k.Status}</span></td>
            <td>${k.TanggalKetetapan ? new Date(k.TanggalKetetapan).toLocaleDateString('id-ID') : '-'}</td>
        `;
        tbody.appendChild(row);
    });
}

function updatePembayaranReport(data) {
    const totalPembayaran = data.pembayaran.length;
    const successCount = data.pembayaran.filter(p => p.StatusPembayaran === 'Sukses').length;
    const failedCount = totalPembayaran - successCount;
    const totalNilai = data.pembayaran.reduce((sum, p) => sum + (parseFloat(p.JumlahBayar) || 0), 0);

    document.getElementById('totalPembayaranCount').textContent = totalPembayaran;
    document.getElementById('successCount').textContent = successCount;
    document.getElementById('failedCount').textContent = failedCount;
    document.getElementById('totalNilaiPembayaran').textContent = `Rp ${totalNilai.toLocaleString('id-ID')}`;

    // Isi tabel detail pembayaran
    const tbody = document.getElementById('pembayaranTableBody');
    tbody.innerHTML = '';
    data.pembayaran.forEach(p => {
        // Cari data wajib pajak untuk mendapatkan nama usaha
        const wpData = (reportData.wajibPajak || []).find(wp => wp.NPWPD === p.NPWPD);
        const namaUsaha = wpData ? (wpData['Nama Usaha'] || '-') : '-';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${p.ID_Pembayaran || '-'}</td>
            <td>${p.NPWPD || '-'}</td>
            <td>${namaUsaha}</td>
            <td>${p.ID_Ketetapan || '-'}</td>
            <td>${p.TanggalBayar ? new Date(p.TanggalBayar).toLocaleDateString('id-ID') : '-'}</td>
            <td>Rp ${(parseFloat(p.JumlahBayar) || 0).toLocaleString('id-ID')}</td>
            <td>${p.MetodeBayar || '-'}</td>
            <td>${p.Operator || '-'}</td>
            <td><span class="status-badge ${p.StatusPembayaran === 'Sukses' ? 'success' : 'danger'}">${p.StatusPembayaran || '-'}</span></td>
        `;
        tbody.appendChild(row);
    });

    updatePembayaranChart(data);
}

function updatePembayaranChart(data) {
    const ctx = document.getElementById('pembayaranChart').getContext('2d');
    if (window.pembayaranChartInstance) {
        window.pembayaranChartInstance.destroy();
    }
    const monthlyData = {};
    data.pembayaran.forEach(p => {
        if (p.TanggalBayar) {
            const date = new Date(p.TanggalBayar);
            const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            if (!monthlyData[monthKey]) monthlyData[monthKey] = 0;
            monthlyData[monthKey] += parseFloat(p.JumlahBayar) || 0;
        }
    });
    const labels = Object.keys(monthlyData).sort();
    const values = labels.map(key => monthlyData[key]);

    window.pembayaranChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pendapatan per Bulan',
                data: values,
                backgroundColor: 'rgba(54, 162, 235, 0.8)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Tren Pembayaran per Bulan'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function updateFiskalReport(data) {
    const fiskalData = reportData.fiskal || [];
    const totalFiskal = fiskalData.length;
    const activeFiskal = fiskalData.filter(f => new Date(f.tanggal_berlaku) > new Date()).length;
    const expiredFiskal = totalFiskal - activeFiskal;

    document.getElementById('totalFiskalCount').textContent = totalFiskal;
    document.getElementById('activeFiskalCount').textContent = activeFiskal;
    document.getElementById('expiredFiskalCount').textContent = expiredFiskal;

    const tbody = document.getElementById('fiskalTableBody');
    tbody.innerHTML = '';
    if (fiskalData.length > 0) {
        fiskalData.forEach(f => {
            const wpData = reportData.wajibPajak?.find(w => w.NPWPD === f.NPWPD);
            const row = document.createElement('tr');
            const isExpired = new Date(f.tanggal_berlaku) < new Date();
            row.innerHTML = `
                <td>${f.nomor_fiskal || '-'}</td>
                <td>${f.NPWPD}</td>
                <td>${wpData?.['Nama Usaha'] || f['Nama Usaha'] || '-'}</td>
                <td>${f.tanggal_cetak ? new Date(f.tanggal_cetak).toLocaleDateString('id-ID') : '-'}</td>
                <td>${f.tanggal_berlaku ? new Date(f.tanggal_berlaku).toLocaleDateString('id-ID') : '-'}</td>
                <td><span class="status-badge ${isExpired ? 'inactive' : 'active'}">${isExpired ? 'Kadaluarsa' : 'Aktif'}</span></td>
            `;
            tbody.appendChild(row);
        });
    } else {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #666; font-style: italic;">Belum ada data fiskal.</td></tr>`;
    }
}

function updatePerformanceReport(data) {
    // Hitung kepatuhan berdasarkan pembayaran vs tagihan dengan validasi yang ketat
    const totalTagihanSemua = data.ketetapan.reduce((sum, k) => sum + (parseFloat(k.TotalTagihan) || 0), 0);

    // Hitung total pembayaran yang terkait dengan ketetapan yang ada
    let totalBayarSemua = 0;
    data.ketetapan.forEach(ketetapan => {
        const pembayaranKetetapan = data.pembayaran.filter(p =>
            p.ID_Ketetapan === ketetapan.ID_Ketetapan &&
            p.StatusPembayaran === 'Sukses'
        );
        pembayaranKetetapan.forEach(p => {
            totalBayarSemua += parseFloat(p.JumlahBayar) || 0;
        });
    });

    // Pastikan kepatuhan tidak melebihi 100%
    const complianceRate = totalTagihanSemua > 0 ? Math.min((totalBayarSemua / totalTagihanSemua * 100), 100).toFixed(1) : 0;

    // Hitung Target vs Realisasi (Real Data) dengan validasi ketat
    let totalRealisasi = 0;
    data.ketetapan.forEach(ketetapan => {
        const pembayaranKetetapan = data.pembayaran.filter(p =>
            p.ID_Ketetapan === ketetapan.ID_Ketetapan &&
            p.StatusPembayaran === 'Sukses'
        );
        pembayaranKetetapan.forEach(p => {
            totalRealisasi += parseFloat(p.JumlahBayar) || 0;
        });
    });

    const currentYear = new Date().getFullYear();
    const totalTarget = (reportData.targetPajakRetribusi || [])
        .filter(t => t.Tahun == currentYear)
        .reduce((sum, t) => sum + (parseFloat(t.Target) || 0), 0);

    const targetRealisasi = totalTarget > 0 ? (totalRealisasi / totalTarget * 100).toFixed(1) : 0;

    // Hitung Rata-rata Waktu Proses (Real Data)
    const processTimes = data.pembayaran
        .filter(p => p.StatusPembayaran === 'Sukses')
        .map(p => {
            const ketetapan = data.ketetapan.find(k => k.ID_Ketetapan === p.ID_Ketetapan);
            if (ketetapan && ketetapan.TanggalKetetapan && p.TanggalBayar) {
                const start = new Date(ketetapan.TanggalKetetapan);
                const end = new Date(p.TanggalBayar);
                const diffTime = end - start;
                const diffDays = diffTime / (1000 * 60 * 60 * 24);
                return diffDays > 0 ? diffDays : 0; // Pastikan positif
            }
            return 0;
        })
        .filter(time => time > 0);

    const avgProcessTime = processTimes.length > 0
        ? (processTimes.reduce((sum, time) => sum + time, 0) / processTimes.length).toFixed(1) + ' hari'
        : 'N/A';

    document.getElementById('targetRealisasi').textContent = `${targetRealisasi}%`;
    document.getElementById('avgProcessTime').textContent = avgProcessTime;
    document.getElementById('wpCompliance').textContent = `${complianceRate}%`;
    
    // Update progress bar dengan data real
    const targetFill = document.getElementById('targetRealisasi-fill');
    if(targetFill) targetFill.style.width = `${Math.min(targetRealisasi, 100)}%`;

    const complianceFill = document.getElementById('wpCompliance-fill');
    if(complianceFill) complianceFill.style.width = `${complianceRate}%`;

    // Isi tabel detail kinerja per wajib pajak
    const tbody = document.getElementById('performanceTableBody');
    tbody.innerHTML = '';

    // Hitung kinerja per wajib pajak berdasarkan pembayaran vs tagihan
    const wpPerformance = {};
    (data.wajibPajak || []).forEach(wp => {
        const npwpd = wp.NPWPD;
        const wpKetetapan = data.ketetapan.filter(k => k.NPWPD === npwpd);

        // Hitung total tagihan dari semua ketetapan
        const totalTagihan = wpKetetapan.reduce((sum, k) => sum + (parseFloat(k.TotalTagihan) || 0), 0);

        // Hitung total pembayaran yang BERKAITAN dengan ketetapan yang ada
        let totalBayar = 0;
        wpKetetapan.forEach(ketetapan => {
            const pembayaranKetetapan = data.pembayaran.filter(p =>
                p.ID_Ketetapan === ketetapan.ID_Ketetapan &&
                p.StatusPembayaran === 'Sukses' &&
                p.NPWPD === npwpd
            );
            pembayaranKetetapan.forEach(p => {
                totalBayar += parseFloat(p.JumlahBayar) || 0;
            });
        });

        // Pastikan total bayar tidak melebihi total tagihan (maksimal 100%)
        const kepatuhan = totalTagihan > 0 ? Math.min(((totalBayar / totalTagihan) * 100), 100).toFixed(1) : 0;
        const status = kepatuhan >= 80 ? 'Baik' : kepatuhan >= 50 ? 'Sedang' : 'Buruk';

        // Hitung ketetapan lunas berdasarkan pembayaran
        const ketetapanLunas = wpKetetapan.filter(k => {
            const pembayaranK = data.pembayaran.filter(p =>
                p.ID_Ketetapan === k.ID_Ketetapan &&
                p.StatusPembayaran === 'Sukses'
            );
            const totalBayarK = pembayaranK.reduce((sum, p) => sum + (parseFloat(p.JumlahBayar) || 0), 0);
            return totalBayarK >= (parseFloat(k.TotalTagihan) || 0);
        }).length;

        // Hitung sisa tagihan
        const sisaTagihan = Math.max(0, totalTagihan - totalBayar);

        wpPerformance[npwpd] = {
            namaUsaha: wp['Nama Usaha'] || '-',
            namaPemilik: wp['Nama Pemilik'] || '-',
            totalKetetapan: wpKetetapan.length,
            ketetapanLunas,
            totalTagihan,
            totalBayar,
            sisaTagihan,
            kepatuhan: parseFloat(kepatuhan),
            status
        };
    });

    // Urutkan berdasarkan kepatuhan (tertinggi ke terendah)
    const sortedWp = Object.entries(wpPerformance)
        .sort(([,a], [,b]) => b.kepatuhan - a.kepatuhan);

    // Isi tabel
    sortedWp.forEach(([npwpd, perf]) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${npwpd}</td>
            <td>${perf.namaUsaha}</td>
            <td>${perf.namaPemilik}</td>
            <td>${perf.totalKetetapan}</td>
            <td>${perf.ketetapanLunas}</td>
            <td>Rp ${perf.totalTagihan.toLocaleString('id-ID')}</td>
            <td>Rp ${perf.totalBayar.toLocaleString('id-ID')}</td>
            <td>Rp ${perf.sisaTagihan.toLocaleString('id-ID')}</td>
            <td>${perf.kepatuhan}%</td>
            <td><span class="status-badge ${perf.status === 'Baik' ? 'success' : perf.status === 'Sedang' ? 'warning' : 'danger'}">${perf.status}</span></td>
        `;
        tbody.appendChild(row);
    });

    updatePerformanceChart(data);
}

function updatePerformanceChart(data) {
    const ctx = document.getElementById('performanceChart').getContext('2d');
    if (window.performanceChartInstance) {
        window.performanceChartInstance.destroy();
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const currentYear = new Date().getFullYear();
    const complianceData = new Array(12).fill(0);

    // Hitung ulang target realisasi untuk chart
    const totalTargetChart = (reportData.targetPajakRetribusi || [])
        .filter(t => t.Tahun == currentYear)
        .reduce((sum, t) => sum + (parseFloat(t.Target) || 0), 0);

    let totalRealisasiChart = 0;
    data.ketetapan.forEach(ketetapan => {
        const pembayaranKetetapan = data.pembayaran.filter(p =>
            p.ID_Ketetapan === ketetapan.ID_Ketetapan &&
            p.StatusPembayaran === 'Sukses'
        );
        pembayaranKetetapan.forEach(p => {
            totalRealisasiChart += parseFloat(p.JumlahBayar) || 0;
        });
    });

    const targetRealisasiChart = totalTargetChart > 0 ? Math.min((totalRealisasiChart / totalTargetChart * 100), 100).toFixed(1) : 0;
    const targetData = new Array(12).fill(parseFloat(targetRealisasiChart));

    for (let month = 0; month < 12; month++) {
        // Hitung kepatuhan bulanan berdasarkan pembayaran vs tagihan dengan validasi ketat
        const monthKetetapan = data.ketetapan.filter(k => {
            if (!k.TanggalKetetapan) return false;
            const date = new Date(k.TanggalKetetapan);
            return date.getFullYear() === currentYear && date.getMonth() === month;
        });

        let monthBayar = 0;
        monthKetetapan.forEach(ketetapan => {
            const pembayaranKetetapan = data.pembayaran.filter(p => {
                if (!p.TanggalBayar || p.StatusPembayaran !== 'Sukses') return false;
                const date = new Date(p.TanggalBayar);
                return p.ID_Ketetapan === ketetapan.ID_Ketetapan &&
                       date.getFullYear() === currentYear &&
                       date.getMonth() === month;
            });
            pembayaranKetetapan.forEach(p => {
                monthBayar += parseFloat(p.JumlahBayar) || 0;
            });
        });

        const monthTagihan = monthKetetapan.reduce((sum, k) => sum + (parseFloat(k.TotalTagihan) || 0), 0);
        complianceData[month] = monthTagihan > 0 ? Math.min((monthBayar / monthTagihan * 100), 100) : 0;
    }

    window.performanceChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: `Target Realisasi (${targetRealisasiChart}%)`,
                data: targetData,
                borderColor: '#FF6384',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                borderDash: [5, 5],
                tension: 0.4
            }, {
                label: 'Realisasi Kepatuhan',
                data: complianceData,
                borderColor: '#36A2EB',
                backgroundColor: 'rgba(54, 162, 235, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Kinerja Kepatuhan Wajib Pajak'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

function exportReport() {
    // Hanya aktif untuk reportType 'revenue'
    const reportType = document.getElementById('reportType').value;
    if (reportType !== 'revenue') {
        alert('Export PDF hanya tersedia untuk Laporan Pendapatan!');
        return;
    }
    const tahun = (document.getElementById('dateRangeTahun')?.value || new Date().getFullYear()).toString();
    const periodeLabel = getPeriodeLabel();
    const { startDate, endDate } = getDateRange();
    if (typeof window.exportPendapatanToPDF === 'function') {
        window.exportPendapatanToPDF({
            reportData,
            periodeLabel,
            tahun,
            startDate,
            endDate
        });
    } else {
        alert('Fungsi export PDF belum tersedia!');
    }
}

// Helper label periode dinamis
function getPeriodeLabel() {
    const tahun = (document.getElementById('dateRangeTahun')?.value || new Date().getFullYear()).toString();
    const dateRange = document.getElementById('dateRange')?.value;
    if (dateRange === undefined) return `Tahun ${tahun}`;
    if (dateRange === 'custom') {
        const start = document.getElementById('startDate').value;
        const end = document.getElementById('endDate').value;
        if (start && end) {
            const s = new Date(start);
            const e = new Date(end);
            return `${s.getDate()} ${getNamaBulan(s.getMonth())} ${s.getFullYear()} – ${e.getDate()} ${getNamaBulan(e.getMonth())} ${e.getFullYear()}`;
        }
    }
    if (dateRange === 'month') {
        const now = new Date();
        return `${getNamaBulan(now.getMonth())} ${tahun}`;
    }
    if (dateRange === 'quarter') {
        const now = new Date();
        const q = Math.floor(now.getMonth() / 3) + 1;
        return `Triwulan ${q} ${tahun}`;
    }
    if (dateRange === 'year') {
        return `Tahun ${tahun}`;
    }
    // Default: tampilkan bulan berjalan
    const now = new Date();
    return `${getNamaBulan(now.getMonth())} ${tahun}`;
}
function getNamaBulan(idx) {
    return [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ][idx] || '';
}

function exportExcel() {
    alert('Fitur export Excel akan segera tersedia');
}

// ==========================================
// LAPORAN POTENSI PAJAK
// ==========================================

function updatePotensiReport(data) {
    // Cek apakah elemen HTML sudah tersedia
    const potensiSummary = document.getElementById('potensiSummary');
    if (!potensiSummary) {
        console.warn('Potensi report elements not ready yet');
        return;
    }

    // Tampilkan pesan awal
    potensiSummary.innerHTML = `
        <div class="summary-card stat-blue" style="grid-column: 1 / -1; text-align: center;">
            <h4>Laporan Potensi Pajak</h4>
            <div class="summary-value">Siap Digenerate</div>
            <div class="summary-change">⚙️</div>
            <p style="margin-top: 10px; font-size: 0.9rem; color: #666;">
                Pilih metode perhitungan dan klik "Generate Laporan" untuk melihat hasil analisis potensi pajak.
            </p>
        </div>
    `;

    // Kosongkan tabel dan kertas kerja
    document.getElementById('potensiTableBody').innerHTML = '';
    document.getElementById('methodologyContent').innerHTML = '';
    document.getElementById('assumptionsContent').innerHTML = '';
    document.getElementById('dataSourcesContent').innerHTML = '';
    document.getElementById('recommendationsContent').innerHTML = '';
}

function generatePotensiReport() {
    const method = document.getElementById('potensiMethod').value;
    const years = parseInt(document.getElementById('potensiYears').value);
    const growthRate = parseFloat(document.getElementById('growthRate').value) / 100;

    console.log('Generating potensi report:', { method, years, growthRate });

    // Gunakan reportData global yang sudah dimuat
    const potensiData = calculatePotensiPajak(reportData, method, years, growthRate);

    // Update ringkasan
    updatePotensiSummary(potensiData);

    // Update tabel detail
    updatePotensiTable(potensiData, years);

    // Update kertas kerja
    updateWorkingPaper(potensiData, method, years, growthRate);
}

function calculatePotensiPajak(data, method, years, growthRate) {
    const masterList = data.masterPajak || [];
    const pembayaranList = data.pembayaran || [];
    const targetList = data.targetPajakRetribusi || [];
    const currentYear = new Date().getFullYear();

    // Hitung realisasi saat ini per jenis pajak
    const realisasiByKode = {};
    pembayaranList.forEach(p => {
        if (p.StatusPembayaran !== 'Sukses') return;
        const ketetapan = (data.ketetapan || []).find(k => k.ID_Ketetapan === p.ID_Ketetapan);
        if (!ketetapan) return;
        const kode = ketetapan.KodeLayanan;
        if (!realisasiByKode[kode]) realisasiByKode[kode] = 0;
        realisasiByKode[kode] += parseFloat(p.JumlahBayar) || 0;
    });

    const potensiResult = {};

    masterList.forEach(master => {
        const kode = master.KodeLayanan;
        const nama = master.NamaLayanan;
        const realisasi = realisasiByKode[kode] || 0;

        // Cari target tahun berjalan
        const targetObj = targetList.find(t => t.KodeLayanan === kode && t.Tahun == currentYear);
        const target = targetObj ? (parseFloat(targetObj.Target) || 0) : 0;

        // Hitung potensi berdasarkan metode
        let potensiTambahan = 0;
        let baseValue = 0;

        switch (method) {
            case 'wp':
                // Berdasarkan WP terdaftar - asumsikan rata-rata tagihan per WP
                baseValue = realisasi; // Gunakan realisasi sebagai baseline
                potensiTambahan = Math.max(0, target - realisasi);
                break;

            case 'historis':
                // Berdasarkan data historis dengan growth rate
                baseValue = realisasi;
                potensiTambahan = realisasi * growthRate;
                break;

            case 'kombinasi':
                // Kombinasi: 70% berdasarkan target, 30% berdasarkan growth
                const targetGap = Math.max(0, target - realisasi);
                const growthPotensi = realisasi * growthRate;
                potensiTambahan = (targetGap * 0.7) + (growthPotensi * 0.3);
                baseValue = realisasi;
                break;
        }

        // Hitung proyeksi untuk beberapa tahun ke depan
        const proyeksi = [];
        let currentValue = realisasi + potensiTambahan;

        for (let year = 1; year <= 5; year++) {
            if (year <= years) {
                // Untuk tahun yang dipilih, gunakan growth rate
                currentValue = currentValue * (1 + growthRate);
            } else {
                // Untuk tahun di luar pilihan, tetap konstan
                currentValue = currentValue;
            }
            proyeksi.push(Math.round(currentValue));
        }

        potensiResult[kode] = {
            nama,
            realisasi,
            target,
            potensiTambahan: Math.round(potensiTambahan),
            proyeksi,
            baseValue
        };
    });

    return potensiResult;
}

function updatePotensiSummary(potensiData) {
    const summaryContainer = document.getElementById('potensiSummary');
    summaryContainer.innerHTML = '';

    // Hitung total
    let totalRealisasi = 0;
    let totalTarget = 0;
    let totalPotensi = 0;
    let totalProyeksi1Tahun = 0;

    Object.values(potensiData).forEach(item => {
        totalRealisasi += item.realisasi;
        totalTarget += item.target;
        totalPotensi += item.potensiTambahan;
        totalProyeksi1Tahun += item.proyeksi[0] || 0;
    });

    const summaryCards = [
        {
            title: 'Total Realisasi Saat Ini',
            value: `Rp ${totalRealisasi.toLocaleString('id-ID')}`,
            icon: '📊',
            color: 'stat-blue'
        },
        {
            title: 'Total Target Tahunan',
            value: `Rp ${totalTarget.toLocaleString('id-ID')}`,
            icon: '🎯',
            color: 'stat-green'
        },
        {
            title: 'Total Potensi Tambahan',
            value: `Rp ${totalPotensi.toLocaleString('id-ID')}`,
            icon: '💰',
            color: 'stat-orange'
        },
        {
            title: 'Proyeksi 1 Tahun',
            value: `Rp ${totalProyeksi1Tahun.toLocaleString('id-ID')}`,
            icon: '📈',
            color: 'stat-purple'
        }
    ];

    summaryCards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = `summary-card ${card.color}`;
        cardElement.innerHTML = `
            <h4>${card.title}</h4>
            <div class="summary-value">${card.value}</div>
            <div class="summary-change">${card.icon}</div>
        `;
        summaryContainer.appendChild(cardElement);
    });
}

function updatePotensiTable(potensiData, years) {
    const tbody = document.getElementById('potensiTableBody');
    tbody.innerHTML = '';

    Object.values(potensiData).forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.nama}</td>
            <td>Rp ${item.realisasi.toLocaleString('id-ID')}</td>
            <td>Rp ${item.target.toLocaleString('id-ID')}</td>
            <td>Rp ${item.potensiTambahan.toLocaleString('id-ID')}</td>
            <td>Rp ${(item.proyeksi[0] || 0).toLocaleString('id-ID')}</td>
            <td>Rp ${(item.proyeksi[1] || 0).toLocaleString('id-ID')}</td>
            <td>Rp ${(item.proyeksi[2] || 0).toLocaleString('id-ID')}</td>
            <td>Rp ${(item.proyeksi[3] || 0).toLocaleString('id-ID')}</td>
            <td>Rp ${(item.proyeksi[4] || 0).toLocaleString('id-ID')}</td>
        `;
        tbody.appendChild(row);
    });
}

function updateWorkingPaper(potensiData, method, years, growthRate) {
    // Update metodologi
    const methodologyContent = document.getElementById('methodologyContent');
    let methodologyText = '';

    switch (method) {
        case 'wp':
            methodologyText = `
                <p><strong>Metode Berdasarkan WP Terdaftar:</strong></p>
                <ul>
                    <li>Potensi = Target Tahunan - Realisasi Saat Ini</li>
                    <li>Fokus pada gap antara target yang ditetapkan vs pencapaian aktual</li>
                    <li>Asumsi: Semua WP terdaftar akan berkontribusi sesuai target</li>
                </ul>
            `;
            break;
        case 'historis':
            methodologyText = `
                <p><strong>Metode Berdasarkan Data Historis:</strong></p>
                <ul>
                    <li>Potensi = Realisasi Saat Ini × Growth Rate (${(growthRate * 100).toFixed(1)}%)</li>
                    <li>Fokus pada tren pertumbuhan historis</li>
                    <li>Asumsi: Pertumbuhan akan berlanjut dengan rate konstan</li>
                </ul>
            `;
            break;
        case 'kombinasi':
            methodologyText = `
                <p><strong>Metode Kombinasi:</strong></p>
                <ul>
                    <li>Potensi = (Target Gap × 70%) + (Growth Potensi × 30%)</li>
                    <li>Menggabungkan pendekatan target dan historis</li>
                    <li>Asumsi: Balance antara pencapaian target dan pertumbuhan</li>
                </ul>
            `;
            break;
    }

    methodologyContent.innerHTML = methodologyText;

    // Update asumsi
    const assumptionsContent = document.getElementById('assumptionsContent');
    assumptionsContent.innerHTML = `
        <ul>
            <li>Growth Rate: ${(growthRate * 100).toFixed(1)}% per tahun</li>
            <li>Jangka Waktu Analisis: ${years} tahun</li>
            <li>Metode Perhitungan: ${method === 'wp' ? 'WP Terdaftar' : method === 'historis' ? 'Data Historis' : 'Kombinasi'}</li>
            <li>Data Realisasi: Berdasarkan pembayaran yang berhasil (${Object.values(potensiData).reduce((sum, item) => sum + item.realisasi, 0).toLocaleString('id-ID')})</li>
            <li>Data Target: Berdasarkan target yang ditetapkan untuk tahun berjalan</li>
        </ul>
    `;

    // Update sumber data
    const dataSourcesContent = document.getElementById('dataSourcesContent');
    dataSourcesContent.innerHTML = `
        <ul>
            <li>Data Wajib Pajak: ${reportData.wajibPajak?.length || 0} records</li>
            <li>Data Ketetapan: ${reportData.ketetapan?.length || 0} records</li>
            <li>Data Pembayaran: ${reportData.pembayaran?.length || 0} records</li>
            <li>Data Target: ${reportData.targetPajakRetribusi?.length || 0} records</li>
            <li>Data Master Pajak: ${reportData.masterPajak?.length || 0} records</li>
        </ul>
        <p><em>Data diambil dari database sistem per tanggal ${new Date().toLocaleDateString('id-ID')}</em></p>
    `;

    // Update rekomendasi
    const recommendationsContent = document.getElementById('recommendationsContent');
    const totalPotensi = Object.values(potensiData).reduce((sum, item) => sum + item.potensiTambahan, 0);

    recommendationsContent.innerHTML = `
        <h6>Rekomendasi Kebijakan Penganggaran:</h6>
        <ul>
            <li><strong>Potensi Tambahan Total: Rp ${totalPotensi.toLocaleString('id-ID')}</strong></li>
            <li>Tambahkan alokasi anggaran sebesar ${((totalPotensi / Object.values(potensiData).reduce((sum, item) => sum + item.realisasi, 0)) * 100).toFixed(1)}% dari realisasi saat ini</li>
            <li>Fokus penggalian potensi pada jenis pajak dengan gap terbesar</li>
            <li>Monitoring kinerja setiap 3 bulan untuk evaluasi pencapaian</li>
            <li>Perencanaan strategis jangka ${years} tahun dengan growth rate ${(growthRate * 100).toFixed(1)}%</li>
        </ul>

        <h6>Prioritas Penggalian Potensi:</h6>
        <ol>
            ${Object.values(potensiData)
                .sort((a, b) => b.potensiTambahan - a.potensiTambahan)
                .slice(0, 3)
                .map(item => `<li>${item.nama}: Rp ${item.potensiTambahan.toLocaleString('id-ID')} (${((item.potensiTambahan / totalPotensi) * 100).toFixed(1)}% dari total potensi)</li>`)
                .join('')}
        </ol>
    `;
}
