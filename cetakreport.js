// cetakreport.js
// Modul export PDF untuk report.html
// Menggunakan jsPDF & html2canvas

// Pastikan jsPDF & html2canvas sudah di-load di HTML sebelum file ini

async function exportReportToPDF({
  reportType = 'laporan-pendapatan',
  kopDinasUrl = 'images/logo.png',
  namaDinas = 'PEMERINTAH KABUPATEN/KOTA',
  namaLaporan = 'Laporan Pendapatan',
  periodeLabel = '',
  ttdNama = '',
  ttdPangkat = '',
  ttdNip = ''
} = {}) {
  // Ambil elemen laporan yang ingin di-export
  const reportSection = document.getElementById(reportType);
  if (!reportSection) {
    alert('Bagian laporan tidak ditemukan!');
    return;
  }

  let elementToCapture = reportSection;

  // Khusus untuk laporan pembayaran: hanya ambil statistik dan tabel, bukan chart
  if (reportType === 'pembayaranReport') {
    // Buat container sementara yang hanya berisi statistik dan tabel
    const tempContainer = document.createElement('div');
    tempContainer.style.width = '900px'; // Lebar lebih besar untuk tabel yang lebih lebar
    tempContainer.style.backgroundColor = '#fff';
    tempContainer.style.padding = '25px';
    tempContainer.style.fontFamily = 'Arial, sans-serif';
    tempContainer.style.fontSize = '14px'; // Font size lebih besar
    tempContainer.style.lineHeight = '1.4';

    // Salin statistik pembayaran dengan styling yang lebih besar
    const pembayaranStats = reportSection.querySelector('.pembayaran-stats');
    if (pembayaranStats) {
      const statsClone = pembayaranStats.cloneNode(true);
      statsClone.style.display = 'flex';
      statsClone.style.gap = '25px';
      statsClone.style.marginBottom = '35px';
      statsClone.style.flexWrap = 'wrap';
      statsClone.style.fontSize = '16px'; // Font statistik lebih besar

      // Pastikan styling statistik terbawa dengan ukuran yang lebih besar
      const statItems = statsClone.querySelectorAll('.pembayaran-stat');
      statItems.forEach(item => {
        item.style.flex = '1';
        item.style.minWidth = '180px';
        item.style.textAlign = 'center';
        item.style.padding = '20px';
        item.style.border = '2px solid #ddd';
        item.style.borderRadius = '10px';
        item.style.backgroundColor = '#f8f9fa';
        item.style.fontSize = '16px';
        item.style.fontWeight = 'bold';

        // Styling untuk judul statistik
        const h4 = item.querySelector('h4');
        if (h4) {
          h4.style.margin = '0 0 8px 0';
          h4.style.fontSize = '14px';
          h4.style.fontWeight = 'bold';
          h4.style.color = '#333';
        }

        // Styling untuk nilai statistik
        const div = item.querySelector('.pembayaran-value');
        if (div) {
          div.style.fontSize = '18px';
          div.style.fontWeight = 'bold';
          div.style.color = '#007bff';
        }
      });

      tempContainer.appendChild(statsClone);
    }

    // Salin tabel pembayaran dengan styling yang lebih baik
    const tableContainer = reportSection.querySelector('.table-container');
    if (tableContainer) {
      const tableClone = tableContainer.cloneNode(true);
      tableClone.style.marginTop = '25px';

      // Styling untuk judul tabel
      const h4 = tableClone.querySelector('h4');
      if (h4) {
        h4.style.fontSize = '16px';
        h4.style.fontWeight = 'bold';
        h4.style.marginBottom = '15px';
        h4.style.color = '#333';
      }

      // Pastikan tabel responsive dan rapi
      const tableResponsive = tableClone.querySelector('.table-responsive');
      if (tableResponsive) {
        tableResponsive.style.overflowX = 'visible'; // Biarkan tabel penuh
      }

      // Pastikan styling tabel terbawa dengan ukuran yang lebih besar
      const table = tableClone.querySelector('table');
      if (table) {
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginTop = '15px';
        table.style.fontSize = '12px'; // Font tabel lebih besar
        table.style.border = '1px solid #ddd';

        // Styling untuk header tabel dengan lebar kolom yang lebih proporsional
        const thead = table.querySelector('thead');
        if (thead) {
          thead.style.backgroundColor = '#f8f9fa';
          const ths = thead.querySelectorAll('th');
          ths.forEach((th, index) => {
            th.style.border = '1px solid #ddd';
            th.style.padding = '12px 8px';
            th.style.fontWeight = 'bold';
            th.style.fontSize = '11px';
            th.style.backgroundColor = '#e9ecef';
            th.style.color = '#333';

            // Atur lebar kolom yang lebih proporsional
            switch(index) {
              case 0: // ID Pembayaran
                th.style.width = '80px';
                th.style.textAlign = 'center';
                break;
              case 1: // ID Ketetapan
                th.style.width = '90px';
                th.style.textAlign = 'center';
                break;
              case 2: // NPWPD
                th.style.width = '100px';
                th.style.textAlign = 'center';
                break;
              case 3: // Nama Wajib Pajak
                th.style.width = '150px';
                th.style.textAlign = 'left';
                break;
              case 4: // Jenis Pajak
                th.style.width = '120px';
                th.style.textAlign = 'left';
                break;
              case 5: // Jumlah Bayar
                th.style.width = '100px';
                th.style.textAlign = 'right';
                break;
              case 6: // Status
                th.style.width = '70px';
                th.style.textAlign = 'center';
                break;
              case 7: // Tanggal Bayar
                th.style.width = '90px';
                th.style.textAlign = 'center';
                break;
            }
          });
        }

        // Styling untuk body tabel dengan lebar kolom yang konsisten
        const tbody = table.querySelector('tbody');
        if (tbody) {
          const trs = tbody.querySelectorAll('tr');
          trs.forEach((tr, index) => {
            tr.style.backgroundColor = index % 2 === 0 ? '#fff' : '#f8f9fa';
            const tds = tr.querySelectorAll('td');
            tds.forEach((td, tdIndex) => {
              td.style.border = '1px solid #ddd';
              td.style.padding = '10px 8px';
              td.style.fontSize = '10px';
              td.style.verticalAlign = 'top';

              // Atur lebar kolom yang konsisten dengan header
              switch(tdIndex) {
                case 0: // ID Pembayaran
                  td.style.width = '80px';
                  td.style.textAlign = 'center';
                  break;
                case 1: // ID Ketetapan
                  td.style.width = '90px';
                  td.style.textAlign = 'center';
                  break;
                case 2: // NPWPD
                  td.style.width = '100px';
                  td.style.textAlign = 'center';
                  break;
                case 3: // Nama Wajib Pajak
                  td.style.width = '150px';
                  td.style.textAlign = 'left';
                  td.style.wordWrap = 'break-word';
                  break;
                case 4: // Jenis Pajak
                  td.style.width = '120px';
                  td.style.textAlign = 'left';
                  break;
                case 5: // Jumlah Bayar
                  td.style.width = '100px';
                  td.style.textAlign = 'right';
                  break;
                case 6: // Status
                  td.style.width = '70px';
                  td.style.textAlign = 'center';
                  break;
                case 7: // Tanggal Bayar
                  td.style.width = '90px';
                  td.style.textAlign = 'center';
                  break;
              }
            });
          });
        }
      }

      tempContainer.appendChild(tableClone);
    }

    // Sembunyikan sementara dari DOM utama
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.style.zIndex = '-1';
    document.body.appendChild(tempContainer);

    elementToCapture = tempContainer;

    // Setelah capture, hapus container sementara
    setTimeout(() => {
      if (document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer);
      }
    }, 100);
  }

  // Buat canvas dari elemen laporan (atau container sementara untuk pembayaran)
  const canvas = await html2canvas(elementToCapture, { scale: 2 });
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
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('PEMERINTAH KABUPATEN MAMBERAMO RAYA', pageWidth / 2, y + 8, { align: 'center' });
  y += 7;
  pdf.setFontSize(14);
  pdf.text('BADAN PENDAPATAN PENGELOLAAN KEUANGAN', pageWidth / 2, y + 8, { align: 'center' });
  y += 6;
  pdf.text('DAN ASET DAERAH', pageWidth / 2, y + 8, { align: 'center' });
  y += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('KANTOR OTONOM PEMDA KABUPATEN MAMBERAMO RAYA JL. LINGKAR BURMESO', pageWidth / 2, y + 8, { align: 'center' });
  y += 5;
  pdf.text('DISTRIK MAMBERAMO TENGAH KABUPATEN MAMBERAMO RAYA PROVINSI PAPUA', pageWidth / 2, y + 8, { align: 'center' });
  y += 3;
  pdf.setLineWidth(1.2);
  pdf.line(15, y + 8, pageWidth - 15, y + 8);
  y += 15;
  
  // Judul laporan
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text(namaLaporan, pageWidth / 2, y + 8, { align: 'center' });
  y += 7;
  
  // Periode laporan
  if (periodeLabel) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.text(`Periode: ${periodeLabel}`, pageWidth / 2, y + 8, { align: 'center' });
    y += 10;
  } else {
    y += 5;
  }

  // Gambar isi laporan (tabel)
  const imgWidth = pageWidth - 30;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  // Cek apakah perlu halaman baru untuk penandatanganan
  const spaceNeeded = 80; // Ruang yang dibutuhkan untuk penandatanganan
  const maxY = 250; // Batas maksimal sebelum perlu halaman baru
  
  if (y + imgHeight + spaceNeeded > maxY) {
    // Jika tabel terlalu panjang, bagi menjadi dua halaman
    const availableHeight = maxY - y - 20;
    pdf.addImage(imgData, 'PNG', 15, y, imgWidth, availableHeight);
    
    // Tambah halaman baru untuk sisa tabel dan penandatanganan
    pdf.addPage();
    y = 15;
    
    // Tambahkan sisa gambar jika ada
    const remainingHeight = imgHeight - availableHeight;
    if (remainingHeight > 0) {
      const remainingCanvas = document.createElement('canvas');
      const remainingCtx = remainingCanvas.getContext('2d');
      remainingCanvas.width = canvas.width;
      remainingCanvas.height = canvas.height - (availableHeight * canvas.width / imgWidth);
      
      remainingCtx.drawImage(canvas, 0, -(availableHeight * canvas.width / imgWidth));
      const remainingImgData = remainingCanvas.toDataURL('image/png');
      
      pdf.addImage(remainingImgData, 'PNG', 15, y, imgWidth, remainingHeight);
      y += remainingHeight + 15;
    }
  } else {
    // Jika muat dalam satu halaman
    pdf.addImage(imgData, 'PNG', 15, y, imgWidth, imgHeight);
    y += imgHeight + 15;
  }

  // Pastikan ada ruang untuk penandatanganan
  if (y > 220) {
    pdf.addPage();
    y = 15;
  }

  // Penutup
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('Demikian laporan ini kami sampaikan, atas perhatiannya kami sampaikan terima kasih.', 15, y, { align: 'left' });
  y += 15;
  
  // Bagian penandatanganan
  const xTanggal = pageWidth - 80;
  pdf.text('Dibuat di : Burmeso', xTanggal, y, { align: 'left' });
  y += 7;
  pdf.text('Tanggal : ' + formatTanggalCetak(new Date()), xTanggal, y, { align: 'left' });
  y += 12;
  
  // Tanda tangan
  pdf.setFont('helvetica', 'bold');
  pdf.text('An. KEPALA BADAN PENDAPATAN', xTanggal, y, { align: 'left' });
  y += 6;
  pdf.text('PENGELOLAAN KEUANGAN DAN ASET DAERAH', xTanggal, y, { align: 'left' });
  y += 6;
  pdf.text('KEPALA BIDANG PENDAPATAN', xTanggal, y, { align: 'left' });
  y += 20;
  
  // Detail penandatangan
  pdf.setFont('helvetica', 'normal');
  pdf.text('Nama : ' + (ttdNama || '..........................................'), xTanggal, y, { align: 'left' });
  y += 6;
  pdf.text('Pangkat : ' + (ttdPangkat || '..........................................'), xTanggal, y, { align: 'left' });
  y += 6;
  pdf.text('NIP : ' + (ttdNip || '..........................................'), xTanggal, y, { align: 'left' });

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

  // Format angka pendek tanpa koma desimal jika tidak perlu, tanpa 'Rp'
  function formatRupiahPdfShort(angka) {
    if (!angka || isNaN(angka)) return '0';
    let str = Number(angka).toLocaleString('id-ID', { maximumFractionDigits: 0 });
    return str;
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
  pdf.text('KEPALA BIDANG PENDAPATAN', xTanggal, y, { align: 'left' });
  y += 18;
  pdf.setFont('helvetica', 'normal');
  pdf.text('NAMA.', xTanggal, y, { align: 'left' });
  y += 6;
  pdf.text('NIP.', xTanggal, y, { align: 'left' });

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

// Export PDF untuk kertas kerja potensi pajak
window.exportPotensiToPDF = async function() {
  try {
    // Ambil parameter dari halaman potensi pajak
    const tahun = document.getElementById('tahunPotensi')?.value || new Date().getFullYear();
    const tingkatKepatuhan = parseFloat(document.getElementById('tingkatKepatuhan')?.value || 85) / 100;
    const faktorPertumbuhan = parseFloat(document.getElementById('faktorPertumbuhan')?.value || 5) / 100;
    const bulanAnalisis = parseInt(document.getElementById('bulanAnalisis')?.value || 12);

    // Ambil data dari API
    const response = await fetch('/.netlify/functions/api');
    const data = await response.json();

    // Hitung potensi
    const masterPajakData = data.masterPajak || [];
    const potensiPerJenis = calculatePotensiForPDF(data, masterPajakData, tahun, tingkatKepatuhan, faktorPertumbuhan, bulanAnalisis);

    // Setup PDF
    const pdf = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = 297;
    let y = 18;

    // Kop dinas
    try {
      const img = new Image();
      img.src = 'images/logo.png';
      await img.decode();
      pdf.addImage(img, 'PNG', 15, y - 3, 20, 20);
    } catch (e) { /* logo gagal dimuat */ }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('PEMERINTAH KABUPATEN MAMBERAMO RAYA', pageWidth / 2, y, { align: 'center' });
    y += 6;
    pdf.setFontSize(12);
    pdf.text('BADAN PENDAPATAN PENGELOLAAN KEUANGAN', pageWidth / 2, y, { align: 'center' });
    y += 5;
    pdf.text('DAN ASET DAERAH', pageWidth / 2, y, { align: 'center' });
    y += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('KANTOR OTONOM PEMDA KABUPATEN MAMBERAMO RAYA JL. LINGKAR BURMESO', pageWidth / 2, y, { align: 'center' });
    y += 4;
    pdf.text('DISTRIK MAMBERAMO TENGAH KABUPATEN MAMBERAMO RAYA PROVINSI PAPUA', pageWidth / 2, y, { align: 'center' });
    y += 3;
    pdf.setLineWidth(1.2);
    pdf.line(15, y, pageWidth - 15, y);
    y += 8;

    // Judul laporan
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('KERTAS KERJA PERHITUNGAN POTENSI PAJAK', pageWidth / 2, y, { align: 'center' });
    y += 8;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.text(`TAHUN ${tahun}`, pageWidth / 2, y, { align: 'center' });
    y += 6;
    pdf.text(`Periode Analisis: ${getBulanName(bulanAnalisis)} ${tahun}`, pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Parameter perhitungan
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('PARAMETER PERHITUNGAN:', 15, y);
    y += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`• Tingkat Kepatuhan: ${(tingkatKepatuhan * 100).toFixed(1)}%`, 20, y);
    y += 5;
    pdf.text(`• Faktor Pertumbuhan: ${(faktorPertumbuhan * 100).toFixed(1)}%`, 20, y);
    y += 5;
    pdf.text(`• Periode Analisis: ${bulanAnalisis === 12 ? 'Full Year' : getBulanName(bulanAnalisis)}`, 20, y);
    y += 8;

    // Tabel hasil perhitungan
    const colX = [15, 45, 75, 105, 135, 165, 195, 225, 255];
    const colW = [25, 25, 25, 25, 25, 25, 25, 25, 25];
    const rowHeight = 8;

    // Header tabel
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setFillColor(240, 240, 240);
    pdf.rect(15, y - 5, pageWidth - 30, rowHeight, 'F');

    const headers = ['Jenis Pajak', 'Jml WP', 'Rata-rata', 'Tarif', 'Potensi/WP', 'Total', 'Realisasi', 'Gap', 'Pencapaian'];
    headers.forEach((header, i) => {
      pdf.rect(colX[i], y - 5, colW[i], rowHeight, 'S');
      pdf.text(header, colX[i] + 2, y, { maxWidth: colW[i] - 4 });
    });
    y += rowHeight;

    // Isi tabel
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);

    potensiPerJenis.forEach((item, index) => {
      if (y > 180) { // New page if needed
        pdf.addPage();
        y = 18;
        // Redraw header
        pdf.setFillColor(240, 240, 240);
        pdf.rect(15, y - 5, pageWidth - 30, rowHeight, 'F');
        headers.forEach((header, i) => {
          pdf.rect(colX[i], y - 5, colW[i], rowHeight, 'S');
          pdf.text(header, colX[i] + 2, y, { maxWidth: colW[i] - 4 });
        });
        y += rowHeight;
      }

      const bgColor = index % 2 === 0 ? [255, 255, 255] : [248, 249, 250];
      pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
      pdf.rect(15, y - 5, pageWidth - 30, rowHeight, 'F');

      const values = [
        item.namaLayanan,
        item.wpAktif.toString(),
        formatNumber(item.rataRataObjek),
        item.tarifPajak.toFixed(1) + '%',
        formatNumber(item.potensiPerWP),
        formatNumber(item.totalPotensi),
        formatNumber(item.realisasiSaatIni),
        formatNumber(item.gap),
        item.pencapaian.toFixed(1) + '%'
      ];

      values.forEach((value, i) => {
        pdf.rect(colX[i], y - 5, colW[i], rowHeight, 'S');
        pdf.text(value, colX[i] + 2, y, { maxWidth: colW[i] - 4 });
      });
      y += rowHeight;
    });

    // Ringkasan total
    y += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    const totalPotensi = potensiPerJenis.reduce((sum, item) => sum + item.totalPotensi, 0);
    const totalRealisasi = potensiPerJenis.reduce((sum, item) => sum + item.realisasiSaatIni, 0);
    const totalGap = totalPotensi - totalRealisasi;
    const persentase = totalPotensi > 0 ? (totalRealisasi / totalPotensi) * 100 : 0;

    pdf.text(`TOTAL POTENSI: ${formatNumber(totalPotensi)}`, 15, y);
    y += 5;
    pdf.text(`TOTAL REALISASI: ${formatNumber(totalRealisasi)}`, 15, y);
    y += 5;
    pdf.text(`GAP: ${formatNumber(totalGap)}`, 15, y);
    y += 5;
    pdf.text(`PENCAPAIAN: ${persentase.toFixed(1)}%`, 15, y);
    y += 10;

    // Kesimpulan dan rekomendasi
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('KESIMPULAN DAN REKOMENDASI:', 15, y);
    y += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);

    const rekomendasi = [
      `1. Total potensi pajak tahun ${tahun} sebesar ${formatNumber(totalPotensi)}`,
      `2. Realisasi saat ini mencapai ${persentase.toFixed(1)}% dari potensi`,
      `3. Gap sebesar ${formatNumber(totalGap)} perlu menjadi fokus penggalian`,
      `4. Jenis pajak dengan gap terbesar perlu perhatian khusus`,
      `5. Tingkatkan sosialisasi dan pengawasan untuk meningkatkan kepatuhan`
    ];

    rekomendasi.forEach((rec, i) => {
      if (y > 190) {
        pdf.addPage();
        y = 18;
      }
      pdf.text(rec, 20, y);
      y += 5;
    });

    // Tanda tangan
    y += 10;
    if (y > 170) {
      pdf.addPage();
      y = 18;
    }

    pdf.text('Dibuat di: Burmeso', pageWidth - 80, y);
    y += 5;
    pdf.text(`Tanggal: ${formatTanggalCetak(new Date())}`, pageWidth - 80, y);
    y += 10;

    pdf.setFont('helvetica', 'bold');
    pdf.text('An. KEPALA BADAN PENDAPATAN', pageWidth - 80, y);
    y += 5;
    pdf.text('PENGELOLAAN KEUANGAN DAN ASET DAERAH', pageWidth - 80, y);
    y += 5;
    pdf.text('KEPALA BIDANG PENDAPATAN', pageWidth - 80, y);
    y += 15;

    pdf.setFont('helvetica', 'normal');
    pdf.text('Nama: _______________________________', pageWidth - 80, y);
    y += 5;
    pdf.text('NIP: _______________________________', pageWidth - 80, y);

    // Simpan PDF
    pdf.save(`Kertas_Kerja_Potensi_Pajak_${tahun}.pdf`);

  } catch (error) {
    console.error('Error exporting potensi to PDF:', error);
    alert('Gagal export kertas kerja potensi pajak');
  }
}

// Fungsi helper untuk perhitungan potensi (sama dengan di potensi-pajak.js)
function calculatePotensiForPDF(data, masterPajakData, tahun, tingkatKepatuhan, faktorPertumbuhan, bulanAnalisis) {
  const hasil = [];

  masterPajakData.forEach(master => {
    const kodeLayanan = master.KodeLayanan;
    const namaLayanan = master.NamaLayanan;

    // Cari target untuk tahun tersebut
    const targetItem = data.targetPajakRetribusi?.find(t => t.KodeLayanan === kodeLayanan && String(t.Tahun) === String(tahun));
    const targetTahunan = targetItem ? parseFloat(targetItem.Target) || 0 : 0;

    // Hitung jumlah wajib pajak aktif untuk jenis pajak ini
    const wpAktif = data.wajibPajak?.filter(wp => {
      const hasKetetapan = data.ketetapan?.some(k =>
        k.NPWPD === wp.NPWPD && k.KodeLayanan === kodeLayanan
      );
      return hasKetetapan;
    }).length || 0;

    // Hitung rata-rata objek pajak
    const pembayaranJenis = data.pembayaran?.filter(p => {
      const ketetapan = data.ketetapan?.find(k => k.ID_Ketetapan === p.ID_Ketetapan);
      return ketetapan && ketetapan.KodeLayanan === kodeLayanan && p.StatusPembayaran === 'Sukses';
    }) || [];

    const totalPembayaran = pembayaranJenis.reduce((sum, p) => sum + (parseFloat(p.JumlahBayar) || 0), 0);
    const rataRataObjek = pembayaranJenis.length > 0 ? totalPembayaran / pembayaranJenis.length : 0;

    // Hitung tarif pajak
    const tarifPajak = calculateTarifPajakForPDF(kodeLayanan, rataRataObjek);

    // Hitung potensi per wajib pajak
    const potensiPerWP = rataRataObjek * tarifPajak * tingkatKepatuhan * (1 + faktorPertumbuhan);

    // Hitung total potensi
    const totalPotensi = wpAktif * potensiPerWP;

    // Hitung realisasi saat ini
    const realisasiSaatIni = calculateRealisasiForPDF(data, kodeLayanan, bulanAnalisis, tahun);

    // Hitung gap dan pencapaian
    const gap = totalPotensi - realisasiSaatIni;
    const pencapaian = totalPotensi > 0 ? (realisasiSaatIni / totalPotensi) * 100 : 0;

    hasil.push({
      kodeLayanan,
      namaLayanan,
      wpAktif,
      rataRataObjek,
      tarifPajak: tarifPajak * 100,
      potensiPerWP,
      totalPotensi,
      realisasiSaatIni,
      gap,
      pencapaian
    });
  });

  return hasil;
}

function calculateTarifPajakForPDF(kodeLayanan, rataRataObjek) {
  const tarifDasar = {
    'PHTB': 0.05, 'BPHTB': 0.05, 'HOTEL': 0.10, 'RESTORAN': 0.10,
    'HIBURAN': 0.25, 'PARKIR': 0.20, 'AIR_TANAH': 0.05, 'MINERAL': 0.025
  };
  return tarifDasar[kodeLayanan] || 0.10;
}

function calculateRealisasiForPDF(data, kodeLayanan, bulanAnalisis, tahun) {
  const pembayaranFiltered = data.pembayaran?.filter(p => {
    if (p.StatusPembayaran !== 'Sukses') return false;
    const ketetapan = data.ketetapan?.find(k => k.ID_Ketetapan === p.ID_Ketetapan);
    if (!ketetapan || ketetapan.KodeLayanan !== kodeLayanan) return false;

    const tanggalBayar = new Date(p.TanggalBayar);
    const tahunBayar = tanggalBayar.getFullYear();
    const bulanBayar = tanggalBayar.getMonth() + 1;

    if (bulanAnalisis === 12) {
      return tahunBayar === parseInt(tahun);
    } else {
      return tahunBayar === parseInt(tahun) && bulanBayar <= bulanAnalisis;
    }
  }) || [];

  return pembayaranFiltered.reduce((sum, p) => sum + (parseFloat(p.JumlahBayar) || 0), 0);
}

function formatNumber(amount) {
  if (!amount || isNaN(amount)) return '0';
  return Number(amount).toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

function getBulanName(bulanNumber) {
  const bulanNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return bulanNames[parseInt(bulanNumber) - 1] || 'Desember';
}

// Fungsi integrasi tombol export di report.html
function setupExportPendapatanButton() {
  const btn = document.getElementById('btn-export-pdf');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (typeof window.getPendapatanExportContext === 'function') {
      const ctx = window.getPendapatanExportContext();
      exportPendapatanToPDF(ctx);
    } else {
      alert('Fungsi context export belum tersedia!');
    }
  });
}
document.addEventListener('DOMContentLoaded', setupExportPendapatanButton);