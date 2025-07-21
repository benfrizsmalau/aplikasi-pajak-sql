// Report specific JavaScript
let reportData = {};
let currentReportType = 'summary';

document.addEventListener('DOMContentLoaded', function() {
    initRevenueReportFilters();
    loadReportData();
    setupDateRangeFilter();
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

    // Show/hide filters based on report type
    const revenueYearFilter = document.getElementById('revenueYearFilter');
    const dateRangeFilter = document.getElementById('dateRangeFilter');
    const customDateGroup = document.getElementById('customDateGroup');

    if (reportType === 'revenue') {
        revenueYearFilter.style.display = 'flex';
        dateRangeFilter.style.display = 'none';
        customDateGroup.style.display = 'none';
    } else {
        revenueYearFilter.style.display = 'none';
        dateRangeFilter.style.display = 'flex';
        if (document.getElementById('dateRange').value === 'custom') {
            customDateGroup.style.display = 'flex';
        }
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
        }

    } catch (error) {
        console.error('Error loading report data:', error);
        alert('Gagal memuat data laporan');
    }
}

function getDateRange() {
    const reportType = document.getElementById('reportType').value;
    const today = new Date();
    let startDate, endDate;

    if (reportType === 'revenue') {
        const year = document.getElementById('dateRangeTahun').value;
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59);
    } else {
        const dateRange = document.getElementById('dateRange').value;
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

    let totalRealisasi = 0;
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

    const revenueForChart = {};
    masterList.forEach(row => {
        const kode = row.KodeLayanan;
        const nama = row.NamaLayanan;
        const targetObj = targetList.find(t => t.KodeLayanan === kode && t.Tahun == tahunDipilih);
        const target = targetObj ? (parseFloat(targetObj.Target) || 0) : 0;
        const realisasi = realisasiByKode[kode] || 0;
        const kontribusi = totalRealisasi > 0 ? (realisasi / totalRealisasi * 100).toFixed(1) : 0;
        const capaian = target > 0 ? (realisasi / target * 100).toFixed(1) : 0;

        if (realisasi > 0) {
            revenueForChart[nama] = realisasi;
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
    const totalKetetapan = data.ketetapan.length;
    const lunasKetetapan = data.ketetapan.filter(k => k.Status === 'Lunas').length;
    const complianceRate = totalKetetapan > 0 ? (lunasKetetapan / totalKetetapan * 100).toFixed(1) : 0;

    document.getElementById('targetRealisasi').textContent = '85%';
    document.getElementById('avgProcessTime').textContent = '2.5 hari';
    document.getElementById('wpCompliance').textContent = `${complianceRate}%`;
    document.querySelector('#wpCompliance + .metric-bar .metric-fill').style.width = `${complianceRate}%`;

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
    const targetData = new Array(12).fill(85);

    for (let month = 0; month < 12; month++) {
        const monthKetetapan = data.ketetapan.filter(k => {
            if (!k.TanggalKetetapan) return false;
            const date = new Date(k.TanggalKetetapan);
            return date.getFullYear() === currentYear && date.getMonth() === month;
        });
        const monthLunas = monthKetetapan.filter(k => k.Status === 'Lunas').length;
        complianceData[month] = monthKetetapan.length > 0 ? (monthLunas / monthKetetapan.length * 100) : 0;
    }

    window.performanceChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Target Kepatuhan',
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
    alert('Fitur export akan segera tersedia.');
}

function exportExcel() {
    alert('Fitur export Excel akan segera tersedia');
} 