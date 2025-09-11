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
  // Geser kolom Target (dan isian) 10mm ke kiri
  // Perlebar border kolom Kontribusi (%) 15mm ke kanan, header & isi tetap
  // Perlebar border kolom Capaian (%) 15mm ke kanan, header & isi digeser 15mm ke kanan
  // Geser header & isi kolom Capaian (%) 10mm ke kiri
  const colX = [15, 27, 47, 119, 156, 193, 232]; // border tetap
  const colW = [10, 18, 80, 35, 35, 37, 37];
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
    pdf.text('Kode', colX[1] + colW[1] / 2 - 2, yPos, { align: 'center' }); // header kode 2mm ke kiri
    pdf.text('Uraian Pajak/Retribusi', colX[2] + 2, yPos, { align: 'left' });
    pdf.text('Target (Rp)', colX[3] + colW[3] - 2, yPos, { align: 'right' });
    pdf.text('Realisasi (Rp)', colX[4] + colW[4] - 2, yPos, { align: 'right' });
    pdf.text('Kontribusi (%)', colX[5] + colW[5] - 2, yPos, { align: 'right' });
    pdf.text('Capaian (%)', colX[6] + colW[6] - 2 - 10, yPos, { align: 'right' });
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
    pdf.text(r.kode, colX[1] + colW[1] / 2 - 2, yPos, { align: 'center' }); // isi kode 2mm ke kiri
    let uraian = r.nama.length > 45 ? r.nama.slice(0, 43) + '…' : r.nama;
    pdf.text(uraian, colX[2] + 2, yPos, { align: 'left', maxWidth: colW[2] - 4 });
    pdf.text(formatRupiahPdfShort(r.target), colX[3] + colW[3] - 2 + 2, yPos, { align: 'right', maxWidth: colW[3] - 4 });
    pdf.text(formatRupiahPdfShort(r.realisasi), colX[4] + colW[4] - 2, yPos, { align: 'right', maxWidth: colW[4] - 4 });
    pdf.text(r.kontribusi.toFixed(1), colX[5] + colW[5] - 2, yPos, { align: 'right', maxWidth: colW[5] - 4 });
    pdf.text(r.capaian.toFixed(1), colX[6] + colW[6] - 2 - 10, yPos, { align: 'right', maxWidth: colW[6] - 4 });
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
  pdf.text(formatRupiahPdfShort(totalTarget), colX[3] + colW[3] - 2 + 2, y, { align: 'right' });
  pdf.text(formatRupiahPdfShort(totalRealisasi), colX[4] + colW[4] - 2, y, { align: 'right' });
  pdf.text('100.0', colX[5] + colW[5] - 2, y, { align: 'right' });
  pdf.text(rataCapaian.toFixed(1), colX[6] + colW[6] - 2 - 10, y, { align: 'right' });
  y += 10;

  // Penutup
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('Demikian laporan ini kami sampaikan, atas perhatiannya kami sampaikan terima kasih.', colX[0], y, { align: 'left' });
  y += 10;
  // Geser tanggal ke kiri tepat di bawah pertemuan kolom Realisasi dan Kontribusi
  const xTanggal = colX[4] + colW[4];
  pdf.text('Tanggal : ' + formatTanggalCetak(new Date()), xTanggal, y, { align: 'left' });
  y += 7;
  // Tulisan Dibuat di : tepat di bawah tanggal
  pdf.text('Dibuat di : Burmeso', xTanggal, y, { align: 'left' });
  y += 10;
  // Blok An., Pengelolaan Keuangan, Kepala Bidang, Nama, NIP di bawah Dibuat di
  pdf.setFont('helvetica', 'bold');
  pdf.text('An. KEPALA BADAN PENDAPATAN', xTanggal, y, { align: 'left' });
  y += 6;
  pdf.text('PENGELOLAAN KEUANGAN DAN ASET DAERAH', xTanggal, y, { align: 'left' });
  y += 6;
  pdf.text('STAF BIDANG PENDAPATAN', xTanggal, y, { align: 'left' });
  y += 18;
  pdf.setFont('helvetica', 'normal');
  pdf.text('BENFRIZS C REYNOLDS, SE', xTanggal, y, { align: 'left' });
  y += 6;
  pdf.text('NIP. 19750212 200909 1 001', xTanggal, y, { align: 'left' });

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

// Helper format rupiah untuk PDF (global)
function formatRupiahPdfShort(angka) {
  if (!angka || isNaN(angka)) return '0';
  let str = Number(angka).toLocaleString('id-ID', { maximumFractionDigits: 0 });
  return str;
}

// Fungsi export PDF untuk Laporan Wajib Pajak
async function exportWpToPDF({ data, reportData, periodeLabel }) {
  const wpList = (data.wajibPajak || []).map(wpData => {
    const totalPayment = data.pembayaran
      .filter(p => p.NPWPD === wpData.NPWPD)
      .reduce((sum, p) => sum + (parseFloat(p.JumlahBayar) || 0), 0);
    const isActive = totalPayment > 0;
    return {
      npwpd: wpData.NPWPD,
      namaUsaha: wpData['Nama Usaha'] || '-',
      namaPemilik: wpData['Nama Pemilik'] || '-',
      jenisWp: wpData.JenisWP || '-',
      status: isActive ? 'Aktif' : 'Non-Aktif',
      totalPembayaran: totalPayment
    };
  });

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
  pdf.text('LAPORAN WAJIB PAJAK', pageWidth / 2, y, { align: 'center' });
  y += 7;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.text(`Periode: ${periodeLabel}`, pageWidth / 2, y, { align: 'center' });
  y += 17; // tambah 10mm (1cm) untuk menghindari tumpang tindih

  // Tabel header - diperlebar untuk menghindari terpotong
  const colX = [15, 35, 65, 120, 165, 200, 215];
  const colW = [18, 28, 53, 43, 33, 33, 65];
  const rowHeight = 10.5; // 1.5 cm
  const maxY = 180; // dikurangi untuk memberi ruang signature

  function drawTableHeader(yPos) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    let x = colX[0];
    for (let i = 0; i < colW.length; i++) {
      pdf.rect(x, yPos - rowHeight + 2, colW[i], rowHeight, 'S');
      x += colW[i];
    }
    pdf.text('No.', colX[0] + colW[0] / 2, yPos, { align: 'center' });
    pdf.text('NPWPD', colX[1] + colW[1] / 2, yPos, { align: 'center' });
    pdf.text('Nama Usaha', colX[2] + colW[2] / 2, yPos, { align: 'center' });
    pdf.text('Nama Pemilik', colX[3] + colW[3] / 2 - 5, yPos, { align: 'center' }); // 5mm ke kanan dari posisi sebelumnya
    pdf.text('Jenis WP', colX[4] + colW[4] / 2 - 10, yPos, { align: 'center' }); // 1cm ke kiri
    pdf.text('Status', colX[5] + colW[5] / 2 - 10, yPos, { align: 'center' }); // 1cm ke kiri
    pdf.text('Total Pembayaran', colX[6] + colW[6] / 2, yPos, { align: 'center' }); // kembali ke posisi tengah
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
  }

  function drawTableRow(r, idx, yPos) {
    let x = colX[0];
    for (let i = 0; i < colW.length; i++) {
      pdf.rect(x, yPos - rowHeight + 2, colW[i], rowHeight, 'S');
      x += colW[i];
    }
    pdf.text(String(idx + 1), colX[0] + colW[0] / 2, yPos, { align: 'center' });
    pdf.text(r.npwpd, colX[1] + 2, yPos, { align: 'left', maxWidth: colW[1] - 4 });
    pdf.text(r.namaUsaha, colX[2] + 2, yPos, { align: 'left', maxWidth: colW[2] - 4 });
    pdf.text(r.namaPemilik, colX[3] + 2, yPos, { align: 'left', maxWidth: colW[3] - 4 });
    pdf.text(r.jenisWp, colX[4] + 2, yPos, { align: 'left', maxWidth: colW[4] - 4 });
    pdf.text(r.status, colX[5] + 2, yPos, { align: 'left', maxWidth: colW[5] - 4 });
    pdf.text(formatRupiahPdfShort(r.totalPembayaran), colX[6] + colW[6] - 2, yPos, { align: 'right', maxWidth: colW[6] - 4 }); // kembali ke posisi normal
  }

  drawTableHeader(y);
  y += rowHeight;

  // Tabel isi
  wpList.forEach((r, idx) => {
    if (y > maxY) {
      pdf.addPage();
      y = 18;
      drawTableHeader(y);
      y += rowHeight;
    }
    drawTableRow(r, idx, y);
    y += rowHeight;
  });

  // Penutup - pastikan ada ruang cukup untuk signature, jika tidak pindah ke halaman baru
  if (y > maxY - 60) { // butuh minimal 60mm untuk signature
    pdf.addPage();
    y = 18;
  }
  y += 15;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('Demikian laporan ini kami sampaikan, atas perhatiannya kami sampaikan terima kasih.', colX[0], y, { align: 'left' });
  y += 15;
  const xTanggal = colX[3] + colW[3]; // posisi lebih proporsional
  pdf.text('Tanggal : ' + formatTanggalCetak(new Date()), xTanggal, y, { align: 'left' });
  y += 8;
  pdf.text('Dibuat di : Burmeso', xTanggal, y, { align: 'left' });
  y += 12;
  pdf.setFont('helvetica', 'bold');
  pdf.text('An. KEPALA BADAN PENDAPATAN', xTanggal, y, { align: 'left' });
  y += 7;
  pdf.text('PENGELOLAAN KEUANGAN DAN ASET DAERAH', xTanggal, y, { align: 'left' });
  y += 7;
  pdf.text('STAF BIDANG PENDAPATAN', xTanggal, y, { align: 'left' });
  y += 20;
  pdf.setFont('helvetica', 'normal');
  pdf.text('BENFRIZS C REYNOLDS, SE', xTanggal, y, { align: 'left' });
  y += 7;
  pdf.text('NIP. 19750212 200909 1 001', xTanggal, y, { align: 'left' });

  // Simpan PDF
  pdf.save('Laporan_Wajib_Pajak.pdf');
}

// Fungsi export PDF untuk Laporan Ketetapan
async function exportKetetapanToPDF({ data, reportData, periodeLabel }) {
  const ketetapanList = (data.ketetapan || []).map(k => {
    const masterPajak = reportData.masterPajak?.find(m => m.KodeLayanan === k.KodeLayanan);
    return {
      idKetetapan: k.ID_Ketetapan,
      npwpd: k.NPWPD,
      jenisPajak: masterPajak?.NamaLayanan || k.KodeLayanan,
      masaPajak: k.MasaPajak || '-',
      totalTagihan: parseFloat(k.TotalTagihan) || 0,
      status: k.Status,
      tanggal: k.TanggalKetetapan ? new Date(k.TanggalKetetapan).toLocaleDateString('id-ID') : '-'
    };
  });

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
  pdf.text('LAPORAN KETETAPAN', pageWidth / 2, y, { align: 'center' });
  y += 7;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.text(`Periode: ${periodeLabel}`, pageWidth / 2, y, { align: 'center' });
  y += 7;

  // Tabel header - penyesuaian final berdasarkan feedback
  const colX = [15, 35, 75, 95, 135, 180, 215, 250];
  const colW = [18, 38, 38, 48, 43, 33, 28, 28];
  const rowHeight = 7;
  const maxY = 195;

  function drawTableHeader(yPos) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    let x = colX[0];
    for (let i = 0; i < colW.length; i++) {
      pdf.rect(x, yPos - rowHeight + 2, colW[i], rowHeight, 'S');
      x += colW[i];
    }
    pdf.text('No.', colX[0] + colW[0] / 2, yPos, { align: 'center' });
    pdf.text('ID Ketetapan', colX[1] + colW[1] / 2, yPos, { align: 'center' });
    pdf.text('NPWPD', colX[2] + colW[2] / 2, yPos, { align: 'center' });
    pdf.text('Jenis Pajak', colX[3] + colW[3] / 2 + 10, yPos, { align: 'center' }); // geser 2cm ke kanan dari posisi sebelumnya
    pdf.text('Masa Pajak', colX[4] + colW[4] / 2 + 20, yPos, { align: 'center' }); // geser 2cm ke kanan
    pdf.text('Total Tagihan', colX[5] + colW[5] / 2, yPos, { align: 'center' }); // geser 2cm ke kanan dari posisi sebelumnya
    pdf.text('Status', colX[6] + colW[6] / 2, yPos, { align: 'center' }); // geser 2cm ke kanan dari posisi sebelumnya
    pdf.text('Tanggal', colX[7] + colW[7] / 2 + 5, yPos, { align: 'center' }); // geser 2cm ke kanan dari posisi sebelumnya
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
  }

  function drawTableRow(r, idx, yPos) {
    let x = colX[0];
    for (let i = 0; i < colW.length; i++) {
      pdf.rect(x, yPos - rowHeight + 2, colW[i], rowHeight, 'S');
      x += colW[i];
    }
    pdf.text(String(idx + 1), colX[0] + colW[0] / 2, yPos, { align: 'center' });
    pdf.text(r.idKetetapan, colX[1] + 2, yPos, { align: 'left', maxWidth: colW[1] - 4 });
    pdf.text(r.npwpd, colX[2] + 2, yPos, { align: 'left', maxWidth: colW[2] - 4 });
    pdf.text(r.jenisPajak, colX[3] + 2 + 10, yPos, { align: 'left', maxWidth: colW[3] - 4 }); // geser 2cm ke kanan sesuai header
    pdf.text(r.masaPajak, colX[4] + 2 + 20, yPos, { align: 'left', maxWidth: colW[4] - 4 }); // geser 2cm ke kanan sesuai header
    pdf.text(formatRupiahPdfShort(r.totalTagihan), colX[5] + colW[5] - 2, yPos, { align: 'right', maxWidth: colW[5] - 4 }); // geser 2cm ke kanan dari posisi sebelumnya
    pdf.text(r.status, colX[6] + 2, yPos, { align: 'left', maxWidth: colW[6] - 4 }); // sesuai header yang sudah digeser
    pdf.text(r.tanggal, colX[7] + 2 + 5, yPos, { align: 'left', maxWidth: colW[7] - 4 }); // geser sesuai header
  }

  drawTableHeader(y);
  y += rowHeight;

  // Tabel isi
  ketetapanList.forEach((r, idx) => {
    if (y > maxY) {
      pdf.addPage();
      y = 18;
      drawTableHeader(y);
      y += rowHeight;
    }
    drawTableRow(r, idx, y);
    y += rowHeight;
  });

  // Penutup
  if (y > maxY - 30) {
    pdf.addPage();
    y = 18;
  }
  y += 10;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('Demikian laporan ini kami sampaikan, atas perhatiannya kami sampaikan terima kasih.', colX[0], y, { align: 'left' });
  y += 10;
  const xTanggal = colX[4] + colW[4];
  pdf.text('Tanggal : ' + formatTanggalCetak(new Date()), xTanggal, y, { align: 'left' });
  y += 7;
  pdf.text('Dibuat di : Burmeso', xTanggal, y, { align: 'left' });
  y += 10;
  pdf.setFont('helvetica', 'bold');
  pdf.text('An. KEPALA BADAN PENDAPATAN', xTanggal, y, { align: 'left' });
  y += 6;
  pdf.text('PENGELOLAAN KEUANGAN DAN ASET DAERAH', xTanggal, y, { align: 'left' });
  y += 6;
  pdf.text('STAF BIDANG PENDAPATAN', xTanggal, y, { align: 'left' });
  y += 18;
  pdf.setFont('helvetica', 'normal');
  pdf.text('BENFRIZS C REYNOLDS, SE', xTanggal, y, { align: 'left' });
  y += 6;
  pdf.text('NIP. 19750212 200909 1 001', xTanggal, y, { align: 'left' });

  // Simpan PDF
  pdf.save('Laporan_Ketetapan.pdf');
}

// Fungsi export PDF untuk Laporan Pembayaran
async function exportPembayaranToPDF({ data, reportData, periodeLabel }) {
  const pembayaranList = (data.pembayaran || []).map(p => {
    const wpData = (reportData.wajibPajak || []).find(wp => wp.NPWPD === p.NPWPD);
    const namaUsaha = wpData ? (wpData['Nama Usaha'] || '-') : '-';
    return {
      idPembayaran: p.ID_Pembayaran || '-',
      npwpd: p.NPWPD || '-',
      namaUsaha,
      idKetetapan: p.ID_Ketetapan || '-',
      tanggalBayar: p.TanggalBayar ? new Date(p.TanggalBayar).toLocaleDateString('id-ID') : '-',
      jumlahBayar: parseFloat(p.JumlahBayar) || 0,
      metodeBayar: p.MetodeBayar || '-',
      operator: p.Operator || '-',
      status: p.StatusPembayaran || '-'
    };
  });

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
  pdf.text('LAPORAN PEMBAYARAN', pageWidth / 2, y, { align: 'center' });
  y += 7;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.text(`Periode: ${periodeLabel}`, pageWidth / 2, y, { align: 'center' });
  y += 7;

  // Tabel header
  const colX = [15, 30, 50, 70, 90, 110, 130, 150, 170, 190];
  const colW = [13, 18, 18, 18, 18, 18, 18, 18, 18, 18];
  const rowHeight = 7;
  const maxY = 195;

  function drawTableHeader(yPos) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    let x = colX[0];
    for (let i = 0; i < colW.length; i++) {
      pdf.rect(x, yPos - rowHeight + 2, colW[i], rowHeight, 'S');
      x += colW[i];
    }
    pdf.text('No.', colX[0] + colW[0] / 2, yPos, { align: 'center' });
    pdf.text('ID Pembayaran', colX[1] + colW[1] / 2, yPos, { align: 'center' });
    pdf.text('NPWPD', colX[2] + colW[2] / 2, yPos, { align: 'center' });
    pdf.text('Nama Usaha', colX[3] + colW[3] / 2, yPos, { align: 'center' });
    pdf.text('ID Ketetapan', colX[4] + colW[4] / 2, yPos, { align: 'center' });
    pdf.text('Tanggal Bayar', colX[5] + colW[5] / 2, yPos, { align: 'center' });
    pdf.text('Jumlah Bayar', colX[6] + colW[6] / 2, yPos, { align: 'center' });
    pdf.text('Metode Bayar', colX[7] + colW[7] / 2, yPos, { align: 'center' });
    pdf.text('Operator', colX[8] + colW[8] / 2, yPos, { align: 'center' });
    pdf.text('Status', colX[9] + colW[9] / 2, yPos, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
  }

  function drawTableRow(r, idx, yPos) {
    let x = colX[0];
    for (let i = 0; i < colW.length; i++) {
      pdf.rect(x, yPos - rowHeight + 2, colW[i], rowHeight, 'S');
      x += colW[i];
    }
    pdf.text(String(idx + 1), colX[0] + colW[0] / 2, yPos, { align: 'center' });
    pdf.text(r.idPembayaran, colX[1] + 1, yPos, { align: 'left', maxWidth: colW[1] - 2 });
    pdf.text(r.npwpd, colX[2] + 1, yPos, { align: 'left', maxWidth: colW[2] - 2 });
    pdf.text(r.namaUsaha, colX[3] + 1, yPos, { align: 'left', maxWidth: colW[3] - 2 });
    pdf.text(r.idKetetapan, colX[4] + 1, yPos, { align: 'left', maxWidth: colW[4] - 2 });
    pdf.text(r.tanggalBayar, colX[5] + 1, yPos, { align: 'left', maxWidth: colW[5] - 2 });
    pdf.text(formatRupiahPdfShort(r.jumlahBayar), colX[6] + colW[6] - 1, yPos, { align: 'right', maxWidth: colW[6] - 2 });
    pdf.text(r.metodeBayar, colX[7] + 1, yPos, { align: 'left', maxWidth: colW[7] - 2 });
    pdf.text(r.operator, colX[8] + 1, yPos, { align: 'left', maxWidth: colW[8] - 2 });
    pdf.text(r.status, colX[9] + 1, yPos, { align: 'left', maxWidth: colW[9] - 2 });
  }

  drawTableHeader(y);
  y += rowHeight;

  // Tabel isi
  pembayaranList.forEach((r, idx) => {
    if (y > maxY) {
      pdf.addPage();
      y = 18;
      drawTableHeader(y);
      y += rowHeight;
    }
    drawTableRow(r, idx, y);
    y += rowHeight;
  });

  // Penutup
  if (y > maxY - 30) {
    pdf.addPage();
    y = 18;
  }
  y += 10;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('Demikian laporan ini kami sampaikan, atas perhatiannya kami sampaikan terima kasih.', colX[0], y, { align: 'left' });
  y += 10;
  const xTanggal = colX[4] + colW[4];
  pdf.text('Tanggal : ' + formatTanggalCetak(new Date()), xTanggal, y, { align: 'left' });
  y += 7;
  pdf.text('Dibuat di : Burmeso', xTanggal, y, { align: 'left' });
  y += 10;
  pdf.setFont('helvetica', 'bold');
  pdf.text('An. KEPALA BADAN PENDAPATAN', xTanggal, y, { align: 'left' });
  y += 6;
  pdf.text('PENGELOLAAN KEUANGAN DAN ASET DAERAH', xTanggal, y, { align: 'left' });
  y += 6;
  pdf.text('STAF BIDANG PENDAPATAN', xTanggal, y, { align: 'left' });
  y += 18;
  pdf.setFont('helvetica', 'normal');
  pdf.text('BENFRIZS C REYNOLDS, SE', xTanggal, y, { align: 'left' });
  y += 6;
  pdf.text('NIP. 19750212 200909 1 001', xTanggal, y, { align: 'left' });

  // Simpan PDF
  pdf.save('Laporan_Pembayaran.pdf');
}

// Fungsi export PDF untuk Laporan Fiskal
async function exportFiskalToPDF({ data, reportData, periodeLabel }) {
  const fiskalList = (reportData.fiskal || []).map(f => {
    const wpData = reportData.wajibPajak?.find(w => w.NPWPD === f.NPWPD);
    const namaUsaha = wpData?.['Nama Usaha'] || f['Nama Usaha'] || '-';
    const isExpired = new Date(f.tanggal_berlaku) < new Date();
    return {
      nomorFiskal: f.nomor_fiskal || '-',
      npwpd: f.NPWPD,
      namaUsaha,
      tanggalCetak: f.tanggal_cetak ? new Date(f.tanggal_cetak).toLocaleDateString('id-ID') : '-',
      tanggalBerlaku: f.tanggal_berlaku ? new Date(f.tanggal_berlaku).toLocaleDateString('id-ID') : '-',
      status: isExpired ? 'Kadaluarsa' : 'Aktif'
    };
  });

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
  pdf.text('LAPORAN FISKAL', pageWidth / 2, y, { align: 'center' });
  y += 7;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.text(`Periode: ${periodeLabel}`, pageWidth / 2, y, { align: 'center' });
  y += 7;

  // Tabel header
  const colX = [15, 35, 55, 85, 125, 155, 185];
  const colW = [18, 18, 38, 38, 28, 28, 28];
  const rowHeight = 7;
  const maxY = 195;

  function drawTableHeader(yPos) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    let x = colX[0];
    for (let i = 0; i < colW.length; i++) {
      pdf.rect(x, yPos - rowHeight + 2, colW[i], rowHeight, 'S');
      x += colW[i];
    }
    pdf.text('No.', colX[0] + colW[0] / 2, yPos, { align: 'center' });
    pdf.text('Nomor Fiskal', colX[1] + colW[1] / 2, yPos, { align: 'center' });
    pdf.text('NPWPD', colX[2] + colW[2] / 2, yPos, { align: 'center' });
    pdf.text('Nama Usaha', colX[3] + colW[3] / 2, yPos, { align: 'center' });
    pdf.text('Tanggal Cetak', colX[4] + colW[4] / 2, yPos, { align: 'center' });
    pdf.text('Tanggal Berlaku', colX[5] + colW[5] / 2, yPos, { align: 'center' });
    pdf.text('Status', colX[6] + colW[6] / 2, yPos, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
  }

  function drawTableRow(r, idx, yPos) {
    let x = colX[0];
    for (let i = 0; i < colW.length; i++) {
      pdf.rect(x, yPos - rowHeight + 2, colW[i], rowHeight, 'S');
      x += colW[i];
    }
    pdf.text(String(idx + 1), colX[0] + colW[0] / 2, yPos, { align: 'center' });
    pdf.text(r.nomorFiskal, colX[1] + 2, yPos, { align: 'left', maxWidth: colW[1] - 4 });
    pdf.text(r.npwpd, colX[2] + 2, yPos, { align: 'left', maxWidth: colW[2] - 4 });
    pdf.text(r.namaUsaha, colX[3] + 2, yPos, { align: 'left', maxWidth: colW[3] - 4 });
    pdf.text(r.tanggalCetak, colX[4] + 2, yPos, { align: 'left', maxWidth: colW[4] - 4 });
    pdf.text(r.tanggalBerlaku, colX[5] + 2, yPos, { align: 'left', maxWidth: colW[5] - 4 });
    pdf.text(r.status, colX[6] + 2, yPos, { align: 'left', maxWidth: colW[6] - 4 });
  }

  drawTableHeader(y);
  y += rowHeight;

  // Tabel isi
  fiskalList.forEach((r, idx) => {
    if (y > maxY) {
      pdf.addPage();
      y = 18;
      drawTableHeader(y);
      y += rowHeight;
    }
    drawTableRow(r, idx, y);
    y += rowHeight;
  });

  // Penutup
  if (y > maxY - 30) {
    pdf.addPage();
    y = 18;
  }
  y += 10;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('Demikian laporan ini kami sampaikan, atas perhatiannya kami sampaikan terima kasih.', colX[0], y, { align: 'left' });
  y += 10;
  const xTanggal = colX[4] + colW[4];
  pdf.text('Tanggal : ' + formatTanggalCetak(new Date()), xTanggal, y, { align: 'left' });
  y += 7;
  pdf.text('Dibuat di : Burmeso', xTanggal, y, { align: 'left' });
  y += 10;
  pdf.setFont('helvetica', 'bold');
  pdf.text('An. KEPALA BADAN PENDAPATAN', xTanggal, y, { align: 'left' });
  y += 6;
  pdf.text('PENGELOLAAN KEUANGAN DAN ASET DAERAH', xTanggal, y, { align: 'left' });
  y += 6;
  pdf.text('STAF BIDANG PENDAPATAN', xTanggal, y, { align: 'left' });
  y += 18;
  pdf.setFont('helvetica', 'normal');
  pdf.text('BENFRIZS C REYNOLDS, SE', xTanggal, y, { align: 'left' });
  y += 6;
  pdf.text('NIP. 19750212 200909 1 001', xTanggal, y, { align: 'left' });

  // Simpan PDF
  pdf.save('Laporan_Fiskal.pdf');
}

// Fungsi export PDF untuk Laporan Kinerja
async function exportPerformanceToPDF({ data, reportData, periodeLabel }) {
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
    .sort(([,a], [,b]) => b.kepatuhan - a.kepatuhan)
    .map(([npwpd, perf]) => ({ npwpd, ...perf }));

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
  pdf.text('LAPORAN KINERJA', pageWidth / 2, y, { align: 'center' });
  y += 7;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.text(`Periode: ${periodeLabel}`, pageWidth / 2, y, { align: 'center' });
  y += 7;

  // Tabel header
  const colX = [15, 30, 50, 80, 100, 120, 140, 160, 180, 200, 220];
  const colW = [13, 18, 28, 18, 18, 18, 18, 18, 18, 18, 18];
  const rowHeight = 7;
  const maxY = 195;

  function drawTableHeader(yPos) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    let x = colX[0];
    for (let i = 0; i < colW.length; i++) {
      pdf.rect(x, yPos - rowHeight + 2, colW[i], rowHeight, 'S');
      x += colW[i];
    }
    pdf.text('No.', colX[0] + colW[0] / 2, yPos, { align: 'center' });
    pdf.text('NPWPD', colX[1] + colW[1] / 2, yPos, { align: 'center' });
    pdf.text('Nama Usaha', colX[2] + colW[2] / 2, yPos, { align: 'center' });
    pdf.text('Nama Pemilik', colX[3] + colW[3] / 2, yPos, { align: 'center' });
    pdf.text('Total Ketetapan', colX[4] + colW[4] / 2, yPos, { align: 'center' });
    pdf.text('Ket. Lunas', colX[5] + colW[5] / 2, yPos, { align: 'center' });
    pdf.text('Total Tagihan', colX[6] + colW[6] / 2, yPos, { align: 'center' });
    pdf.text('Total Bayar', colX[7] + colW[7] / 2, yPos, { align: 'center' });
    pdf.text('Sisa Tagihan', colX[8] + colW[8] / 2, yPos, { align: 'center' });
    pdf.text('Kepatuhan', colX[9] + colW[9] / 2, yPos, { align: 'center' });
    pdf.text('Status', colX[10] + colW[10] / 2, yPos, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
  }

  function drawTableRow(r, idx, yPos) {
    let x = colX[0];
    for (let i = 0; i < colW.length; i++) {
      pdf.rect(x, yPos - rowHeight + 2, colW[i], rowHeight, 'S');
      x += colW[i];
    }
    pdf.text(String(idx + 1), colX[0] + colW[0] / 2, yPos, { align: 'center' });
    pdf.text(r.npwpd, colX[1] + 1, yPos, { align: 'left', maxWidth: colW[1] - 2 });
    pdf.text(r.namaUsaha, colX[2] + 1, yPos, { align: 'left', maxWidth: colW[2] - 2 });
    pdf.text(r.namaPemilik, colX[3] + 1, yPos, { align: 'left', maxWidth: colW[3] - 2 });
    pdf.text(String(r.totalKetetapan), colX[4] + colW[4] / 2, yPos, { align: 'center' });
    pdf.text(String(r.ketetapanLunas), colX[5] + colW[5] / 2, yPos, { align: 'center' });
    pdf.text(formatRupiahPdfShort(r.totalTagihan), colX[6] + colW[6] - 1, yPos, { align: 'right', maxWidth: colW[6] - 2 });
    pdf.text(formatRupiahPdfShort(r.totalBayar), colX[7] + colW[7] - 1, yPos, { align: 'right', maxWidth: colW[7] - 2 });
    pdf.text(formatRupiahPdfShort(r.sisaTagihan), colX[8] + colW[8] - 1, yPos, { align: 'right', maxWidth: colW[8] - 2 });
    pdf.text(r.kepatuhan + '%', colX[9] + colW[9] / 2, yPos, { align: 'center' });
    pdf.text(r.status, colX[10] + 1, yPos, { align: 'left', maxWidth: colW[10] - 2 });
  }

  drawTableHeader(y);
  y += rowHeight;

  // Tabel isi
  sortedWp.forEach((r, idx) => {
    if (y > maxY) {
      pdf.addPage();
      y = 18;
      drawTableHeader(y);
      y += rowHeight;
    }
    drawTableRow(r, idx, y);
    y += rowHeight;
  });

  // Penutup
  if (y > maxY - 30) {
    pdf.addPage();
    y = 18;
  }
  y += 10;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('Demikian laporan ini kami sampaikan, atas perhatiannya kami sampaikan terima kasih.', colX[0], y, { align: 'left' });
  y += 10;
  const xTanggal = colX[4] + colW[4];
  pdf.text('Tanggal : ' + formatTanggalCetak(new Date()), xTanggal, y, { align: 'left' });
  y += 7;
  pdf.text('Dibuat di : Burmeso', xTanggal, y, { align: 'left' });
  y += 10;
  pdf.setFont('helvetica', 'bold');
  pdf.text('An. KEPALA BADAN PENDAPATAN', xTanggal, y, { align: 'left' });
  y += 6;
  pdf.text('PENGELOLAAN KEUANGAN DAN ASET DAERAH', xTanggal, y, { align: 'left' });
  y += 6;
  pdf.text('STAF BIDANG PENDAPATAN', xTanggal, y, { align: 'left' });
  y += 18;
  pdf.setFont('helvetica', 'normal');
  pdf.text('BENFRIZS C REYNOLDS, SE', xTanggal, y, { align: 'left' });
  y += 6;
  pdf.text('NIP. 19750212 200909 1 001', xTanggal, y, { align: 'left' });

  // Simpan PDF
  pdf.save('Laporan_Kinerja.pdf');
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