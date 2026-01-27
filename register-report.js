/**
 * register-report.js
 * Fungsi untuk mencetak Laporan Register Ketetapan dan Pembayaran
 * Format: F4 (210x330mm) Landscape
 */

document.addEventListener('DOMContentLoaded', function () {
    initYearSelectors();
});

function initYearSelectors() {
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1, currentYear - 2];

    ['filterTahunKetetapan', 'filterTahunPembayaran'].forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            years.forEach(y => {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y;
                select.appendChild(opt);
            });
        }
    });
}

async function cetakRegister(type) {
    console.log(`Cetak Register: ${type}`);

    try {
        // 1. Fetch data terbaru
        const response = await fetch('/.netlify/functions/api', { cache: 'no-store' });
        if (!response.ok) throw new Error('Gagal memuat data dari API');
        const allData = await response.json();

        // 2. Ambil filter
        const suffix = type === 'ketetapan' ? 'Ketetapan' : 'Pembayaran';
        const bulan = document.getElementById(`filterBulan${suffix}`).value;
        const tahun = document.getElementById(`filterTahun${suffix}`).value;

        // 3. Filter data
        let filtered = [];
        let title = '';

        if (type === 'ketetapan') {
            title = 'REGISTER KETETAPAN PAJAK DAERAH / RETRIBUSI DAERAH';
            filtered = (allData.ketetapan || []).filter(item => {
                if (!item.TanggalKetetapan) return false;
                const d = new Date(item.TanggalKetetapan);
                const matchBulan = bulan === '' || d.getMonth() == bulan;
                const matchTahun = tahun === '' || d.getFullYear() == tahun;
                return matchBulan && matchTahun;
            });
        } else {
            title = 'REGISTER SETORAN PAJAK DAERAH / RETRIBUSI DAERAH';
            filtered = (allData.pembayaran || []).filter(item => {
                if (!item.TanggalBayar) return false;
                const d = new Date(item.TanggalBayar);
                const matchBulan = bulan === '' || d.getMonth() == bulan;
                const matchTahun = tahun === '' || d.getFullYear() == tahun;
                return matchBulan && matchTahun;
            });
        }

        if (filtered.length === 0) {
            alert('Tidak ada data untuk periode yang dipilih.');
            return;
        }

        // 4. Generate PDF
        const { jsPDF } = window.jspdf;
        // F4 size in mm is 210 x 330. Landscape is 330 x 210.
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [330, 210]
        });

        const pageWidth = 330;
        let y = 15;

        // --- KOP DINAS ---
        try {
            const img = new Image();
            img.src = 'images/logo.png';
            await img.decode();
            pdf.addImage(img, 'PNG', 15, y - 5, 20, 20);
        } catch (e) { }

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text('PEMERINTAH KABUPATEN MAMBERAMO RAYA', pageWidth / 2, y, { align: 'center' });
        y += 6;
        pdf.setFontSize(14);
        pdf.text('BADAN PENDAPATAN PENGELOLAAN KEUANGAN DAN ASET DAERAH', pageWidth / 2, y, { align: 'center' });
        y += 6;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.text('Jl. Lingkar Burmeso, Distrik Mamberamo Tengah, Kabupaten Mamberamo Raya', pageWidth / 2, y, { align: 'center' });
        y += 4;
        pdf.setLineWidth(0.8);
        pdf.line(15, y, pageWidth - 15, y);
        y += 10;

        // --- JUDUL LAPORAN ---
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text(title, pageWidth / 2, y, { align: 'center' });
        y += 6;

        const bulanLabel = bulan !== '' ? getNamaBulan(parseInt(bulan)) : 'SEMUA BULAN';
        pdf.setFontSize(11);
        pdf.text(`PERIODE: ${bulanLabel} TAHUN ${tahun}`, pageWidth / 2, y, { align: 'center' });
        y += 10;

        // --- TABEL ---
        if (type === 'ketetapan') {
            drawKetetapanTable(pdf, filtered, allData, y);
        } else {
            drawPembayaranTable(pdf, filtered, allData, y);
        }

        // --- PENUTUP / TTD ---
        y = pdf.internal.pageSize.height - 50;
        if (y < pdf.lastAutoTableY + 20) {
            pdf.addPage();
            y = 20;
        }

        const xPosTtd = pageWidth - 100;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        const tglSkrg = new Date();
        pdf.text(`Burmeso, ${tglSkrg.getDate()} ${getNamaBulan(tglSkrg.getMonth())} ${tglSkrg.getFullYear()}`, xPosTtd, y);
        y += 5;
        pdf.setFont('helvetica', 'bold');
        pdf.text('KEPALA BIDANG PENDAPATAN', xPosTtd, y);
        y += 20;

        // Nama Bendahara (Underlined)
        const name = 'HERMAN TARIBABA.SE';
        pdf.text(name, xPosTtd, y);
        const nameWidth = pdf.getTextWidth(name);
        pdf.line(xPosTtd, y + 1, xPosTtd + nameWidth, y + 1);

        y += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.text('NIP. 197610202003121007', xPosTtd, y);

        pdf.save(`Register_${suffix}_${bulanLabel}_${tahun}.pdf`);

    } catch (error) {
        console.error('Error Cetak Register:', error);
        alert('Gagal mencetak laporan: ' + error.message);
    }
}

function drawKetetapanTable(pdf, data, allData, startY) {
    const columns = [
        { header: 'No', dataKey: 'no' },
        { header: 'Tanggal', dataKey: 'tanggal' },
        { header: 'Nomor SKPD/RD', dataKey: 'id' },
        { header: 'NPWPD', dataKey: 'npwpd' },
        { header: 'Nama Wajib Pajak / Usaha', dataKey: 'nama' },
        { header: 'Uraian Pajak/Retribusi', dataKey: 'uraian' },
        { header: 'Masa Pajak', dataKey: 'masa' },
        { header: 'Jumlah (Rp)', dataKey: 'jumlah' },
        { header: 'Status', dataKey: 'status' }
    ];

    const rows = data.map((item, index) => {
        const wp = (allData.wajibPajak || []).find(w => w.NPWPD === item.NPWPD) || {};
        const master = (allData.masterPajak || []).find(m => m.KodeLayanan === item.KodeLayanan) || {};
        return {
            no: index + 1,
            tanggal: formatDate(item.TanggalKetetapan),
            id: item.ID_Ketetapan,
            npwpd: item.NPWPD,
            nama: wp['Nama Usaha'] || wp['Nama Pemilik'] || '-',
            uraian: master.NamaLayanan || item.KodeLayanan || '-',
            masa: item.MasaPajak || '-',
            jumlah: formatRupiahReg(item.TotalTagihan),
            status: item.Status || '-'
        };
    });

    pdf.setFontSize(9);
    const colWidths = [10, 25, 45, 35, 55, 55, 25, 25, 25]; // Total 300mm
    const startX = 15;

    // Header
    pdf.setFont('helvetica', 'bold');
    let x = startX;
    columns.forEach((col, i) => {
        pdf.rect(x, startY, colWidths[i], 10);
        pdf.text(col.header, x + colWidths[i] / 2, startY + 6, { align: 'center' });
        x += colWidths[i];
    });

    // Rows
    pdf.setFont('helvetica', 'normal');
    let currentY = startY + 10;
    rows.forEach(row => {
        // Simple page break
        if (currentY > 180) {
            pdf.addPage();
            currentY = 20;
            // Draw header again on new page
            x = startX;
            pdf.setFont('helvetica', 'bold');
            columns.forEach((col, i) => {
                pdf.rect(x, currentY, colWidths[i], 10);
                pdf.text(col.header, x + colWidths[i] / 2, currentY + 6, { align: 'center' });
                x += colWidths[i];
            });
            pdf.setFont('helvetica', 'normal');
            currentY += 10;
        }

        x = startX;
        const rowData = [row.no, row.tanggal, row.id, row.npwpd, row.nama, row.uraian, row.masa, row.jumlah, row.status];
        let maxHeight = 8;

        // Multi-line for name and uraian
        const nameLines = pdf.splitTextToSize(String(row.nama), colWidths[4] - 4);
        const uraianLines = pdf.splitTextToSize(String(row.uraian), colWidths[5] - 4);
        maxHeight = Math.max(8, nameLines.length * 5, uraianLines.length * 5);

        rowData.forEach((text, i) => {
            pdf.rect(x, currentY, colWidths[i], maxHeight);
            if (i === 4) { // Nama
                pdf.text(nameLines, x + 2, currentY + 5);
            } else if (i === 5) { // Uraian
                pdf.text(uraianLines, x + 2, currentY + 5);
            } else if (i === 7) { // Jumlah
                pdf.text(String(text), x + colWidths[i] - 2, currentY + 5, { align: 'right' });
            } else {
                pdf.text(String(text), x + colWidths[i] / 2, currentY + 5, { align: 'center' });
            }
            x += colWidths[i];
        });
        currentY += maxHeight;
    });

    pdf.lastAutoTableY = currentY;
}

function drawPembayaranTable(pdf, data, allData, startY) {
    const columns = [
        { header: 'No', dataKey: 'no' },
        { header: 'Tanggal Bayar', dataKey: 'tanggal' },
        { header: 'Nomor SSPD/RD', dataKey: 'id' },
        { header: 'NPWPD', dataKey: 'npwpd' },
        { header: 'Nama Wajib Pajak / Usaha', dataKey: 'nama' },
        { header: 'ID Ketetapan', dataKey: 'idk' },
        { header: 'Metode', dataKey: 'metode' },
        { header: 'Jumlah (Rp)', dataKey: 'jumlah' }
    ];

    const rows = data.map((item, index) => {
        const wp = (allData.wajibPajak || []).find(w => w.NPWPD === item.NPWPD) || {};
        return {
            no: index + 1,
            tanggal: formatDate(item.TanggalBayar),
            id: item.ID_Pembayaran,
            npwpd: item.NPWPD,
            nama: wp['Nama Usaha'] || wp['Nama Pemilik'] || '-',
            idk: item.ID_Ketetapan || '-',
            metode: item.MetodeBayar || '-',
            jumlah: formatRupiahReg(item.JumlahBayar)
        };
    });

    pdf.setFontSize(9);
    const colWidths = [10, 25, 45, 40, 60, 45, 30, 45]; // Total 300mm
    const startX = 15;

    // Header
    pdf.setFont('helvetica', 'bold');
    let x = startX;
    columns.forEach((col, i) => {
        pdf.rect(x, startY, colWidths[i], 10);
        pdf.text(col.header, x + colWidths[i] / 2, startY + 6, { align: 'center' });
        x += colWidths[i];
    });

    // Rows
    pdf.setFont('helvetica', 'normal');
    let currentY = startY + 10;
    rows.forEach(row => {
        if (currentY > 180) {
            pdf.addPage();
            currentY = 20;
            x = startX;
            pdf.setFont('helvetica', 'bold');
            columns.forEach((col, i) => {
                pdf.rect(x, currentY, colWidths[i], 10);
                pdf.text(col.header, x + colWidths[i] / 2, currentY + 6, { align: 'center' });
                x += colWidths[i];
            });
            pdf.setFont('helvetica', 'normal');
            currentY += 10;
        }

        x = startX;
        const rowData = [row.no, row.tanggal, row.id, row.npwpd, row.nama, row.idk, row.metode, row.jumlah];
        let maxHeight = 8;
        const nameLines = pdf.splitTextToSize(String(row.nama), colWidths[4] - 4);
        maxHeight = Math.max(8, nameLines.length * 5);

        rowData.forEach((text, i) => {
            pdf.rect(x, currentY, colWidths[i], maxHeight);
            if (i === 4) { // Nama
                pdf.text(nameLines, x + 2, currentY + 5);
            } else if (i === 7) { // Jumlah
                pdf.text(String(text), x + colWidths[i] - 2, currentY + 5, { align: 'right' });
            } else {
                pdf.text(String(text), x + colWidths[i] / 2, currentY + 5, { align: 'center' });
            }
            x += colWidths[i];
        });
        currentY += maxHeight;
    });

    pdf.lastAutoTableY = currentY;
}

// Helpers
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

function formatRupiahReg(angka) {
    if (!angka) return '0';
    return Number(angka).toLocaleString('id-ID');
}

function getNamaBulan(idx) {
    return [
        'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
        'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
    ][idx] || '';
}
