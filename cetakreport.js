// cetakreport.js
// Modul export PDF untuk report.html
// Menggunakan jsPDF & html2canvas

// Pastikan jsPDF & html2canvas sudah di-load di HTML sebelum file ini

async function exportReportToPDF({
  reportType = 'laporan-pendapatan',
  kopDinasUrl = 'images/logo.png',
  namaDinas = 'PEMERINTAH KABUPATEN/KOTA',
  namaLaporan = 'Laporan Pendapatan',
  ttdNama = '',
  ttdNip = ''
} = {}) {
  // Ambil elemen laporan yang ingin di-export
  const reportSection = document.getElementById(reportType);
  if (!reportSection) {
    alert('Bagian laporan tidak ditemukan!');
    return;
  }

  // Buat canvas dari elemen laporan
  const canvas = await html2canvas(reportSection, { scale: 2 });
  const imgData = canvas.toDataURL('image/png');

  // Siapkan dokumen PDF
  const pdf = new window.jspdf.jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Ukuran A4: 210 x 297 mm
  const pageWidth = 210;
  let y = 15;

  // Kop dinas & logo
  if (kopDinasUrl) {
    try {
      const img = new Image();
      img.src = kopDinasUrl;
      await img.decode();
      pdf.addImage(img, 'PNG', 15, y, 20, 20);
    } catch (e) {
      // Logo gagal dimuat, lanjutkan tanpa logo
    }
  }
  pdf.setFontSize(14);
  pdf.text(namaDinas, pageWidth / 2, y + 8, { align: 'center' });
  pdf.setFontSize(12);
  pdf.text(namaLaporan, pageWidth / 2, y + 16, { align: 'center' });
  y += 28;

  // Gambar isi laporan (tabel)
  const imgWidth = pageWidth - 30;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  pdf.addImage(imgData, 'PNG', 15, y, imgWidth, imgHeight);
  y += imgHeight + 10;

  // Tanda tangan
  pdf.setFontSize(11);
  pdf.text('Mengetahui,', pageWidth - 80, y + 10);
  pdf.text('Kepala Dinas', pageWidth - 80, y + 16);
  pdf.text(' ', pageWidth - 80, y + 28);
  pdf.text('Nama: ' + (ttdNama || '..................'), pageWidth - 80, y + 38);
  pdf.text('NIP: ' + (ttdNip || '..................'), pageWidth - 80, y + 44);

  // Simpan PDF
  pdf.save(`${namaLaporan.replace(/\s+/g, '_')}.pdf`);
}

// Fungsi utama export PDF laporan pendapatan
async function exportPendapatanToPDF({
  reportData,
  periodeLabel = '',
  tahun = '2025',
  startDate,
  endDate
}) {
  // Siapkan data sumber
  const masterList = reportData.masterPajak || [];
  const targetList = (reportData.targetPajakRetribusi || []).filter(t => String(t.Tahun) === String(tahun));
  const pembayaranList = (reportData.pembayaran || []).filter(p => {
    if (!p.TanggalBayar) return false;
    const tgl = new Date(p.TanggalBayar);
    return tgl.getFullYear() === Number(tahun) && (!startDate || !endDate || (tgl >= startDate && tgl <= endDate));
  });

  // Hitung realisasi per kode layanan
  const realisasiByKode = {};
  pembayaranList.forEach(p => {
    if (p.StatusPembayaran !== 'Sukses') return;
    const ketetapan = (reportData.ketetapan || []).find(k => k.ID_Ketetapan === p.ID_Ketetapan);
    if (!ketetapan) return;
    const kode = ketetapan.KodeLayanan;
    if (!realisasiByKode[kode]) realisasiByKode[kode] = 0;
    realisasiByKode[kode] += parseFloat(p.JumlahBayar) || 0;
  });

  // Hitung target per kode layanan
  const targetByKode = {};
  targetList.forEach(t => {
    targetByKode[t.KodeLayanan] = (parseFloat(t.Target) || 0);
  });

  // Siapkan data tabel
  const rows = masterList.map((row, idx) => {
    const kode = row.KodeLayanan;
    const nama = row.NamaLayanan;
    const target = targetByKode[kode] || 0;
    const realisasi = realisasiByKode[kode] || 0;
    const kontribusi = 0; // Akan dihitung setelah total realisasi diketahui
    const capaian = target > 0 ? (realisasi / target * 100) : 0;
    return { idx: idx + 1, kode, nama, target, realisasi, kontribusi, capaian };
  });
  // Hitung total realisasi
  const totalRealisasi = rows.reduce((sum, r) => sum + r.realisasi, 0);
  const totalTarget = rows.reduce((sum, r) => sum + r.target, 0);
  // Hitung kontribusi per baris
  rows.forEach(r => {
    r.kontribusi = totalRealisasi > 0 ? (r.realisasi / totalRealisasi * 100) : 0;
  });
  // Hitung rata-rata capaian
  const rataCapaian = rows.filter(r => r.target > 0).reduce((sum, r) => sum + r.capaian, 0) / (rows.filter(r => r.target > 0).length || 1);

  // Siapkan jsPDF landscape
  const pdf = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = 297;
  let y = 18;

  // Kop dinas & logo
  try {
    const img = new Image();
    img.src = 'images/logo.png';
    await img.decode();
    pdf.addImage(img, 'PNG', 15, y - 5, 22, 22);
  } catch (e) { /* logo gagal dimuat, lanjut tanpa logo */ }
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('PEMERINTAH KABUPATEN MAMBERAMO RAYA', pageWidth / 2, y, { align: 'center' });
  y += 7;
  pdf.setFontSize(14);
  pdf.text('BADAN PENDAPATAN PENGELOLAAN KEUANGAN', pageWidth / 2, y, { align: 'center' });
  y += 6;
  pdf.text('DAN ASET DAERAH', pageWidth / 2, y, { align: 'center' });
  y += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('KANTOR OTONOM PEMDA KABUPATEN MAMBERAMO RAYA JL. LINGKAR BURMESO', pageWidth / 2, y, { align: 'center' });
  y += 5;
  pdf.text('DISTRIK MAMBERAMO TENGAH KABUPATEN MAMBERAMO RAYA PROVINSI PAPUA', pageWidth / 2, y, { align: 'center' });
  y += 3;
  pdf.setLineWidth(1.2);
  pdf.line(15, y, pageWidth - 15, y);
  y += 7;

  // Judul laporan & periode
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('LAPORAN REALISASI PENERIMAAN PENDAPATAN ASLI DAERAH (PAD)', pageWidth / 2, y, { align: 'center' });
  y += 7;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.text(`Periode: ${periodeLabel}`, pageWidth / 2, y, { align: 'center' });
  y += 7;

  // Tabel header
  // Kolom proporsional untuk landscape (disesuaikan agar angka muat)
  const colX = [15, 27, 47, 129, 166, 203, 227];
  const colW = [10, 18, 80, 35, 35, 22, 22];
  const rowHeight = 7;
  const maxY = 195;

  function drawTableHeader(yPos) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    let x = colX[0];
    for (let i = 0; i < colW.length; i++) {
      pdf.rect(x, yPos - rowHeight + 2, colW[i], rowHeight, 'S');
      x += colW[i];
    }
    pdf.text('No.', colX[0] + colW[0] / 2, yPos, { align: 'center' });
    pdf.text('Kode', colX[1] + colW[1] / 2, yPos, { align: 'center' });
    pdf.text('Uraian Pajak/Retribusi', colX[2] + 2, yPos, { align: 'left' });
    pdf.text('Target (Rp)', colX[3] + colW[3] - 2, yPos, { align: 'right' });
    pdf.text('Realisasi (Rp)', colX[4] + colW[4] - 2, yPos, { align: 'right' });
    pdf.text('Kontribusi (%)', colX[5] + colW[5] - 2, yPos, { align: 'right' });
    pdf.text('Capaian (%)', colX[6] + colW[6] - 2, yPos, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
  }

  function drawTableRow(r, yPos) {
    let x = colX[0];
    for (let i = 0; i < colW.length; i++) {
      pdf.rect(x, yPos - rowHeight + 2, colW[i], rowHeight, 'S');
      x += colW[i];
    }
    pdf.text(String(r.idx), colX[0] + colW[0] / 2, yPos, { align: 'center' });
    pdf.text(r.kode, colX[1] + colW[1] / 2, yPos, { align: 'center' });
    let uraian = r.nama.length > 45 ? r.nama.slice(0, 43) + '…' : r.nama;
    pdf.text(uraian, colX[2] + 2, yPos, { align: 'left', maxWidth: colW[2] - 4 });
    pdf.text(formatRupiahPdfShort(r.target), colX[3] + colW[3] - 2, yPos, { align: 'right', maxWidth: colW[3] - 4 });
    pdf.text(formatRupiahPdfShort(r.realisasi), colX[4] + colW[4] - 2, yPos, { align: 'right', maxWidth: colW[4] - 4 });
    pdf.text(r.kontribusi.toFixed(1), colX[5] + colW[5] - 2, yPos, { align: 'right', maxWidth: colW[5] - 4 });
    pdf.text(r.capaian.toFixed(1), colX[6] + colW[6] - 2, yPos, { align: 'right', maxWidth: colW[6] - 4 });
  }

  // Format angka pendek tanpa koma desimal jika tidak perlu
  function formatRupiahPdfShort(angka) {
    if (!angka || isNaN(angka)) return 'Rp 0';
    let str = Number(angka).toLocaleString('id-ID', { maximumFractionDigits: 0 });
    return 'Rp ' + str;
  }

  drawTableHeader(y);
  y += rowHeight;

  // Tabel isi
  rows.forEach(r => {
    if (y > maxY) {
      pdf.addPage();
      y = 18;
      drawTableHeader(y);
      y += rowHeight;
    }
    drawTableRow(r, y);
    y += rowHeight;
  });

  // Baris total
  if (y > maxY) {
    pdf.addPage();
    y = 18;
    drawTableHeader(y);
    y += rowHeight;
  }
  // Baris total dengan border
  let x = colX[0];
  for (let i = 0; i < colW.length; i++) {
    pdf.rect(x, y - rowHeight + 2, colW[i], rowHeight, 'S');
    x += colW[i];
  }
  pdf.setFont('helvetica', 'bold');
  pdf.text('TOTAL', colX[2] + 2, y, { align: 'left' });
  pdf.text(formatRupiahPdfShort(totalTarget), colX[3] + colW[3] - 2, y, { align: 'right' });
  pdf.text(formatRupiahPdfShort(totalRealisasi), colX[4] + colW[4] - 2, y, { align: 'right' });
  pdf.text('100.0', colX[5] + colW[5] - 2, y, { align: 'right' });
  pdf.text(rataCapaian.toFixed(1), colX[6] + colW[6] - 2, y, { align: 'right' });
  y += 10;

  // Penutup
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('Demikian laporan ini kami sampaikan, atas perhatiannya kami sampaikan terima kasih.', pageWidth / 2, y, { align: 'center' });
  y += 10;
  pdf.text('Dibuat di : Burmeso', 25, y);
  pdf.text('Tanggal : ' + formatTanggalCetak(new Date()), 120, y);
  y += 8;
  pdf.setFont('helvetica', 'bold');
  pdf.text('An. KEPALA BADAN PENDAPATAN', pageWidth / 2, y, { align: 'center' });
  y += 6;
  pdf.text('PENGELOLAAN KEUANGAN DAN ASET DAERAH', pageWidth / 2, y, { align: 'center' });
  y += 6;
  pdf.text('KEPALA BIDANG PENDAPATAN', pageWidth / 2, y, { align: 'center' });
  y += 18;
  pdf.setFont('helvetica', 'normal');
  pdf.text('NAMA.', pageWidth / 2, y, { align: 'center' });
  y += 6;
  pdf.text('NIP.', pageWidth / 2, y, { align: 'center' });

  // Simpan PDF
  pdf.save('Laporan_Pendapatan_PAD.pdf');
}

// Helper format rupiah untuk PDF
function formatRupiahPdf(angka) {
  if (!angka) return 'Rp 0';
  return 'Rp ' + Number(angka).toLocaleString('id-ID', { minimumFractionDigits: 0 });
}

// Helper format tanggal cetak
function formatTanggalCetak(date) {
  const bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
}

// Fungsi integrasi tombol export di report.html
function setupExportPendapatanButton() {
  const btn = document.getElementById('btn-export-pdf');
  if (!btn) return;
  btn.addEventListener('click', () => {
    // Ambil data periode dari report.js
    if (typeof window.getPendapatanExportContext === 'function') {
      const ctx = window.getPendapatanExportContext();
      exportPendapatanToPDF(ctx);
    } else {
      alert('Fungsi context export belum tersedia!');
    }
  });
}
document.addEventListener('DOMContentLoaded', setupExportPendapatanButton); 