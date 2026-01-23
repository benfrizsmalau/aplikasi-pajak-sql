// --- KONFIGURASI ---
// Alamat backend di Netlify. Ini sudah final dan tidak perlu diubah.
const apiUrl = '/.netlify/functions/api';
// --------------------

// 🔍 DEBUG: Add function definition tracking
console.log('🔍 DEBUG: Script loading - tracking function definitions');
window.loadDashboardDataDefinitions = [];

// Debug logging for font loading issues
console.log('🔤 Font Loading Debug: Checking for font-related errors');
console.log('🔤 Font Loading Debug: Document fonts:', document.fonts);

// Monitor for font loading errors
document.fonts.onloadingerror = function(event) {
    console.error('❌ Font Loading Error:', event);
    console.log('🔍 Font Loading Debug: Failed font details:', {
        family: event.family,
        source: event.source,
        error: event.error
    });
};

// Check for chrome extension font errors
window.addEventListener('error', function(event) {
    if (event.message && event.message.includes('chrome-extension') && event.message.includes('font')) {
        console.warn('⚠️ Chrome Extension Font Error Detected:', event.message);
        console.log('🔍 Chrome Extension Debug: Error details:', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error
        });

        // Prevent error from bubbling up
        event.preventDefault();
        return false;
    }
});

// 🗑️ REMOVED: Old problematic loadDashboardData function - replaced with working version below

// Fungsi untuk mengecek status server
async function checkServerStatus() {
    try {
        const response = await fetch('/.netlify/functions/api', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        console.log('🏥 Server health check:', response.status);

        if (response.ok) {
            const healthData = await response.text();
            console.log('🏥 Server response:', healthData);
        }

        return response.ok;
    } catch (error) {
        console.error('🚨 Server health check failed:', error);
        return false;
    }
}

// Fungsi untuk test koneksi ke API endpoint
async function testApiEndpoint() {
    console.log('🧪 Testing API endpoint...');

    try {
        // Test dengan berbagai metode
        const methods = ['GET', 'POST'];

        for (const method of methods) {
            console.log(`🧪 Testing ${method} /.netlify/functions/api`);

            const options = {
                method: method,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            };

            if (method === 'POST') {
                options.body = JSON.stringify({});
            }

            try {
                const response = await fetch('/.netlify/functions/api', options);
                console.log(`📊 ${method} response:`, response.status, response.statusText);

                const text = await response.text();
                console.log(`📄 ${method} body:`, text.substring(0, 100));

            } catch (error) {
                console.error(`❌ ${method} failed:`, error);
            }
        }
    } catch (error) {
        console.error('🚨 API endpoint test failed:', error);
    }
}

// Fungsi untuk cek network requests di browser
function monitorNetworkRequests() {
    // Override fetch untuk monitoring
    const originalFetch = window.fetch;

    window.fetch = async function(...args) {
        const [url, options] = args;
        console.log('🌐 Network Request:', url, options);

        try {
            const response = await originalFetch.apply(this, args);
            console.log('🌐 Network Response:', response.status, response.headers);
            return response;
        } catch (error) {
            console.error('🌐 Network Error:', error);
            throw error;
        }
    };
}

// Test langsung dengan endpoint yang bekerja
async function testDirectApiCall() {
    console.log('🧪 Testing direct API call...');

    try {
        // Gunakan endpoint yang sama dengan health check yang berhasil
        const response = await fetch('/.netlify/functions/api', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        console.log('📊 Direct test - Status:', response.status);
        console.log('📊 Direct test - Headers:', Object.fromEntries(response.headers.entries()));

        if (response.ok) {
            const data = await response.json();
            console.log('📦 Direct test - JSON data:', data);
            console.log('📏 Direct test - Data type:', typeof data);
            console.log('📏 Direct test - Data keys:', Object.keys(data));

            // Test transform function
            if (data.status === 'sukses') {
                const transformed = transformApiDataToDashboard(data);
                console.log('🔄 Transformed data:', transformed);

                // Update UI langsung untuk testing
                updateDashboardUI(transformed);

                return true;
            }
        }

        return false;

    } catch (error) {
        console.error('❌ Direct test failed:', error);
        return false;
    }
}

// Fungsi untuk debugging response step by step
async function debugResponseStepByStep() {
    console.log('🔍 Starting step-by-step response debugging...');

    try {
        // Step 1: Basic fetch
        console.log('Step 1: Making fetch request...');
        const response = await fetch('/.netlify/functions/api');
        console.log('✅ Fetch successful, status:', response.status);

        // Step 2: Check response object
        console.log('Step 2: Response object properties:');
        console.log('- ok:', response.ok);
        console.log('- status:', response.status);
        console.log('- statusText:', response.statusText);
        console.log('- headers:', Object.fromEntries(response.headers.entries()));

        // Step 3: Clone response for multiple reads
        console.log('Step 3: Cloning response...');
        const responseClone1 = response.clone();
        const responseClone2 = response.clone();

        // Step 4: Read as text first
        console.log('Step 4: Reading as text...');
        const textData = await responseClone1.text();
        console.log('✅ Text length:', textData.length);
        console.log('✅ Text preview:', textData.substring(0, 200));

        // Step 5: Parse as JSON
        console.log('Step 5: Parsing as JSON...');
        const jsonData = JSON.parse(textData);
        console.log('✅ JSON parsed successfully');
        console.log('✅ JSON type:', typeof jsonData);
        console.log('✅ JSON keys:', Object.keys(jsonData));

        // Step 6: Alternative - direct JSON parsing
        console.log('Step 6: Direct JSON parsing...');
        const directJson = await responseClone2.json();
        console.log('✅ Direct JSON successful');
        console.log('✅ Data matches:', JSON.stringify(jsonData) === JSON.stringify(directJson));

        return directJson;

    } catch (error) {
        console.error('❌ Step-by-step debugging failed at:', error.message);
        console.error('❌ Full error:', error);
        return null;
    }
}

// Fungsi transform data API ke format dashboard
function transformApiDataToDashboard(apiData) {
    console.log('🔄 Transforming API data to dashboard format...');

    try {
        // Extract data dari response API
        const { wajibPajak = [], wilayah = [], masterPajak = [], ketetapan = [], pembayaran = [], fiskal = [], targetPajakRetribusi = [] } = apiData;

        // Hitung statistik dashboard
        const stats = {
            totalWp: wajibPajak.length,
            totalKetetapan: ketetapan.length,
            totalPembayaran: pembayaran.length,
            totalSkpdSkrd: ketetapan.filter(k => pembayaran.some(p => p.ID_Ketetapan === k.ID_Ketetapan)).length,
            totalSspdSsrd: pembayaran.filter(p => p.StatusPembayaran === 'Sukses').length,
            totalFiskal: fiskal.length,
            totalNilaiKetetapan: ketetapan.reduce((sum, k) => sum + (parseFloat(k.TotalTagihan) || 0), 0),
            totalNilaiSetoran: pembayaran.filter(p => p.StatusPembayaran === 'Sukses').reduce((sum, p) => sum + (parseFloat(p.JumlahBayar) || 0), 0)
        };

        console.log('📊 Calculated dashboard stats:', stats);
        return stats;

    } catch (error) {
        console.error('❌ Transform failed:', error);
        return {
            totalWp: 0,
            totalKetetapan: 0,
            totalPembayaran: 0,
            totalSkpdSkrd: 0,
            totalSspdSsrd: 0,
            totalFiskal: 0,
            totalNilaiKetetapan: 0,
            totalNilaiSetoran: 0
        };
    }
}

// Fungsi update dashboard UI
function updateDashboardUI(stats) {
    console.log('🎨 Updating dashboard UI with stats:', stats);

    try {
        // Update setiap element dashboard
        const elements = {
            'totalWp': stats.totalWp,
            'totalKetetapan': stats.totalKetetapan,
            'totalPembayaran': stats.totalPembayaran,
            'totalSkpdSkrd': stats.totalSkpdSkrd,
            'totalSspdSsrd': stats.totalSspdSsrd,
            'totalFiskal': stats.totalFiskal,
            'totalNilaiKetetapan': `Rp ${stats.totalNilaiKetetapan.toLocaleString('id-ID')}`,
            'totalNilaiSetoran': `Rp ${stats.totalNilaiSetoran.toLocaleString('id-ID')}`
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                element.style.color = ''; // Reset error styling
                console.log(`✅ Updated ${id}: ${value}`);
            } else {
                console.warn(`⚠️ Element ${id} not found`);
            }
        });

        console.log('🎉 Dashboard UI updated successfully');

    } catch (error) {
        console.error('❌ UI update failed:', error);
    }
}

// Quick fix untuk replace loadDashboardData yang bermasalah
function replaceProblematicLoadDashboardData() {
    // Override fungsi yang bermasalah
    window.originalLoadDashboardData = window.loadDashboardData;

    window.loadDashboardData = async function() {
        console.log('🔄 Using fixed loadDashboardData...');
        return await testDirectApiCall();
    };
}

// FINAL CLEANUP - Hapus kode lama dan ganti dengan yang sudah bekerja

// 🔍 DEBUG: Second loadDashboardData definition (REPLACEMENT ATTEMPT)
async function loadDashboardData_OLD_V2() {
    console.log('🚨 DEBUG: OLD loadDashboardData_V2 called - THIS SHOULD NOT HAPPEN');
    console.log('� loadDashboardData_V2: Starting with working method...');

    try {
        const response = await fetch('/.netlify/functions/api', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        console.log('📊 Response status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📦 Data received:', data);

        if (data && data.status === 'sukses') {
            const transformed = transformApiDataToDashboard(data);
            updateDashboardUI(transformed);
            console.log('✅ Dashboard loaded successfully');
            return transformed;
        } else {
            throw new Error('Invalid data structure');
        }

    } catch (error) {
        console.error('❌ loadDashboardData failed:', error);
        setDashboardDefaults();
        throw error;
    }
}

// 🗑️ REMOVED: Duplicate functions - using the main working version below

// 5. OPTIONAL: Tambahkan favicon untuk menghilangkan 404
function addFavicon() {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/x-icon';
    link.href = 'data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
    document.head.appendChild(link);
}

// 6. HILANGKAN network monitoring jika tidak diperlukan lagi
function removeNetworkMonitoring() {
    // Restore original fetch jika sudah di-override
    if (window.originalFetch) {
        window.fetch = window.originalFetch;
    }
}

// 🗑️ REMOVED: Merged into main DOMContentLoaded listener below

// Variabel global untuk menyimpan data
let dataWajibPajakGlobal = [];
let dataWilayahGlobal = [];
let dataMasterPajakGlobal = [];
let dataKetetapanGlobal = [];
let kelurahanChoices = null;

// Error state management
let dashboardLoadingState = {
    isLoading: false,
    lastAttempt: 0,
    failureCount: 0,
    maxRetries: 3,
    cooldownPeriod: 30000 // 30 seconds
};

// 🔧 MAIN DOMContentLoaded - Consolidated all initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Main initialization: Starting application...');
    
    // 1. Setup favicon and cleanup
    addFavicon();
    
    // 2. Page routing
    const pageId = document.body.id;
    console.log('📄 Detected page ID:', pageId || 'none (assuming dashboard)');
    
    switch (pageId) {
        case 'page-dashboard':
            console.log('🏠 Initializing dashboard page...');
            initDashboardPage();
            break;
        case 'page-tambah-wp': initTambahWpPage(); break;
        case 'page-lihat-wp': initLihatWpPage(); break;
        case 'page-tambah-ketetapan': initKetetapanPage(); break;
        case 'page-detail-wp': initDetailPage(); break;
        default:
            console.log('🏠 No specific page ID, assuming dashboard...');
            initDashboardPage();
            break;
    }
    
    // 3. Run deployment diagnostics if in production
    if (window.location.hostname.includes('netlify') || window.location.hostname !== 'localhost') {
        setTimeout(runDeploymentDiagnostics, 2000);
    }
});


// =================================================================
// Inisialisasi Halaman
// =================================================================

async function initDashboardPage() {
    // Check if already loading or in cooldown period
    const now = Date.now();
    if (dashboardLoadingState.isLoading) {
        console.log('Dashboard already loading, skipping...');
        return;
    }
    
    if (dashboardLoadingState.failureCount >= dashboardLoadingState.maxRetries && 
        (now - dashboardLoadingState.lastAttempt) < dashboardLoadingState.cooldownPeriod) {
        console.log('Dashboard in cooldown period, setting defaults...');
        setDashboardDefaults();
        return;
    }

    // Set loading state
    dashboardLoadingState.isLoading = true;
    dashboardLoadingState.lastAttempt = now;

    try {
        // Set default values first to ensure UI is in consistent state
        setDashboardDefaults();
        
        // Attempt to load dashboard data
        await loadDashboardData();
        
        // Reset failure count on success
        dashboardLoadingState.failureCount = 0;
        
    } catch (error) {
        console.error("Error di Dasbor:", error);
        dashboardLoadingState.failureCount++;
        
        // Ensure defaults are set on error
        setDashboardDefaults();
        
        // Show user-friendly error message
        const errorElements = ['totalWp', 'totalKetetapan', 'totalPembayaran'];
        errorElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = 'Offline';
                element.style.color = '#666';
            }
        });
        
    } finally {
        // Always reset loading state
        dashboardLoadingState.isLoading = false;
    }
}

async function initTambahWpPage() {
    const form = document.getElementById('pajakForm');
    const kelurahanSelect = document.getElementById('kelurahan');
    const kecamatanSelect = document.getElementById('kecamatan');
    const generateCheckbox = document.getElementById('generateNpwpd');
    const npwpdInput = document.getElementById('npwpd');
    const jenisWpGroup = document.getElementById('jenisWpGroup');

    console.log('🔍 DEBUG: initTambahWpPage - Starting initialization');

    try {
        console.log('🔍 DEBUG: initTambahWpPage - Calling fetchAllData()');
        const data = await fetchAllData();
        console.log('🔍 DEBUG: initTambahWpPage - fetchAllData() returned:', data);

        dataWilayahGlobal = data.wilayah || [];
        console.log('🔍 DEBUG: initTambahWpPage - dataWilayahGlobal:', dataWilayahGlobal);
        console.log('🔍 DEBUG: initTambahWpPage - dataWilayahGlobal length:', dataWilayahGlobal.length);

        if (dataWilayahGlobal.length === 0) {
            console.warn('⚠️ DEBUG: initTambahWpPage - No wilayah data received! Dropdowns will be empty.');
            kecamatanSelect.innerHTML = '<option value="">Tidak ada data wilayah</option>';
            kelurahanSelect.innerHTML = '<option value="">Tidak ada data wilayah</option>';
            return;
        }

        // Isi dropdown kecamatan unik
        const kecamatanUnik = [...new Set(dataWilayahGlobal.map(item => item.Kecamatan))];
        console.log('🔍 DEBUG: initTambahWpPage - Unique kecamatan:', kecamatanUnik);

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
            console.log('🔍 DEBUG: initTambahWpPage - Kecamatan changed to:', this.value);
            kelurahanSelect.innerHTML = '<option value="">-- Pilih Kelurahan --</option>';
            if (!this.value) return;

            const kelurahanFiltered = dataWilayahGlobal.filter(item => item.Kecamatan === this.value);
            console.log('🔍 DEBUG: initTambahWpPage - Filtered kelurahan for kecamatan:', this.value, kelurahanFiltered);

            kelurahanFiltered.forEach(item => {
                const option = document.createElement('option');
                option.value = item.Kelurahan;
                option.textContent = item.Kelurahan;
                option.dataset.kodekel = item.KodeKelurahan;
                option.dataset.kodekec = item.KodeKecamatan;
                kelurahanSelect.appendChild(option);
            });

            console.log('🔍 DEBUG: initTambahWpPage - Added', kelurahanFiltered.length, 'kelurahan options');
        });

        console.log('✅ DEBUG: initTambahWpPage - Dropdown initialization completed successfully');

    } catch (error) {
        console.error('❌ DEBUG: initTambahWpPage - Error during initialization:', error);
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

        aksiContent.innerHTML = `<a href="#" onclick="alert('Menu ini dinonaktifkan karena sudah beralih ke aplikasi baru.'); return false;" class="btn-primary" style="display: inline-flex; align-items: center; gap: 8px; text-decoration: none; padding: 12px 24px; background: #999; color: white; border-radius: 8px; font-weight: 500; cursor: not-allowed;"><span>📋</span>Buat Ketetapan Baru</a>`;
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

async function validateKodeLayanan(kodeLayanan) {
    try {
        console.log('🔍 DEBUG: Validating kodeLayanan:', kodeLayanan);
        const data = await fetchAllData();
        const master = data.masterPajak.find(m => m.KodeLayanan === kodeLayanan);
        if (!master) {
            throw new Error(`Kode layanan ${kodeLayanan} tidak ditemukan di master pajak`);
        }
        console.log('✅ DEBUG: Kode layanan valid:', master);
        return master;
    } catch (error) {
        console.error('❌ DEBUG: Kode layanan validation failed:', error);
        throw error;
    }
}

async function handleKetetapanFormSubmit(event) {
    event.preventDefault();
    const submitButton = document.getElementById('submitKetetapanButton');
    const statusDiv = document.getElementById('status');
    submitButton.disabled = true; submitButton.textContent = 'Membuat Ketetapan...'; statusDiv.style.display = 'none';

    try {
        const kodeLayanan = document.getElementById('ketetapanLayanan').value;

        // Validasi kode layanan sebelum mengirim
        console.log('🔍 DEBUG: Starting ketetapan form validation');
        const masterData = await validateKodeLayanan(kodeLayanan);
        console.log('✅ DEBUG: Master data validation passed:', masterData);

        const dataToSend = {
            action: 'createKetetapan',
            npwpd: document.getElementById('ketetapanNpwpd').value,
            kodeLayanan: kodeLayanan,
            masaPajak: document.getElementById('ketetapanMasaPajak').value,
            jumlahPokok: document.getElementById('ketetapanJumlahPokok').value,
            tglTunggakan: document.getElementById('tglTunggakan').value,
            catatan: document.getElementById('catatan').value
        };

        console.log('📤 DEBUG: Sending ketetapan data:', dataToSend);
        const result = await postData(dataToSend);
        console.log('✅ DEBUG: Ketetapan creation successful:', result);

        showStatus(result.message || 'Ketetapan berhasil dibuat!', true, 'status');
        event.target.reset();
        const npwpdFromUrl = new URLSearchParams(window.location.search).get('npwpd');
        if (npwpdFromUrl) document.getElementById('ketetapanNpwpd').value = npwpdFromUrl;
    } catch (error) {
        console.error('❌ DEBUG: Ketetapan creation failed:', error);
        showStatus('Gagal membuat ketetapan: ' + error.message, false, 'status');
    } finally {
        submitButton.disabled = false; submitButton.textContent = 'Buat Ketetapan';
    }
}

async function handleDeleteKetetapanClick(idKetetapan) {
    if (!confirm(`Anda yakin ingin menghapus ketetapan dengan ID: ${idKetetapan}?`)) return;

    console.log('Frontend: Attempting to delete ketetapan:', idKetetapan);

    try {
        const requestData = { action: 'deleteKetetapan', id_ketetapan: idKetetapan };
        console.log('Frontend: Sending request data:', requestData);

        const result = await postData(requestData);
        console.log('Frontend: Received response:', result);

        alert(result.message || 'Ketetapan berhasil dihapus.');

        // Always reload the page to ensure fresh data
        console.log('Frontend: Reloading page to refresh data');
        location.reload();

    } catch (error) {
        console.error('Frontend: Delete failed:', error);
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
    console.log('📤 PostData: Sending request:', data);
    console.log('🔗 PostData: API URL:', apiUrl);
    console.log('📊 PostData: Request action:', data.action || 'unknown');
    console.log('🔍 DEBUG: PostData called from:', new Error().stack.split('\n')[2]);

    try {
        const startTime = Date.now();
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            cache: 'no-store' // Prevent caching of API responses
        });
        const endTime = Date.now();

        console.log(`✅ PostData: Response received in ${endTime - startTime}ms`);
        console.log('📊 PostData: Response status:', response.status, response.statusText);
        console.log('📋 PostData: Response headers:', Object.fromEntries(response.headers.entries()));

        // Check if response has content
        const contentLength = response.headers.get('content-length');
        const contentType = response.headers.get('content-type');

        console.log('📏 PostData: Content-Length:', contentLength);
        console.log('📄 PostData: Content-Type:', contentType);

        // If response is empty or not JSON, handle gracefully
        if (!contentLength || contentLength === '0' || !contentType || !contentType.includes('application/json')) {
            console.warn('⚠️ PostData: Empty or non-JSON response detected');
            console.log('🔍 PostData: Response validation:', {
                hasContentLength: !!contentLength,
                contentLength,
                hasContentType: !!contentType,
                contentType,
                isJson: contentType && contentType.includes('application/json'),
                responseOk: response.ok
            });

            if (response.ok) {
                // If response is OK but empty, assume success
                console.log('✅ PostData: Returning success for empty OK response');
                return { status: 'sukses', message: 'Operation completed successfully' };
            } else {
                // If response is not OK and empty, try to get error details
                console.error('❌ PostData: Non-OK empty response, trying to get error details');
                let errorMessage = `HTTP error! status: ${response.status} ${response.statusText}`;

                try {
                    // Try to get response text for more details
                    const errorText = await response.text();
                    if (errorText) {
                        console.error('❌ PostData: Error response text:', errorText);
                        errorMessage += ` - Details: ${errorText.substring(0, 200)}`;
                    }
                } catch (textError) {
                    console.warn('⚠️ PostData: Could not read error response text:', textError);
                }

                throw new Error(errorMessage);
            }
        }

        // Try to parse JSON response
        let result;
        try {
            const responseText = await response.text();
            console.log('📄 PostData: Raw response text length:', responseText.length);
            console.log('📄 PostData: Response text (first 500 chars):', responseText.substring(0, 500));

            result = JSON.parse(responseText);
            console.log('✅ PostData: Successfully parsed JSON result:', result);
        } catch (jsonError) {
            console.error('❌ PostData: JSON parsing failed:', jsonError);
            console.error('🔍 PostData: Raw response that failed to parse:', responseText);

            // If JSON parsing fails, check if response is actually OK
            if (response.ok) {
                console.log('✅ PostData: Response OK but JSON parsing failed, returning success');
                return { status: 'sukses', message: 'Operation completed successfully' };
            } else {
                // Get text content for better error message
                const textContent = await response.text().catch(() => '');
                console.error('❌ PostData: Server error with text content:', textContent);
                throw new Error(`Server error (${response.status}): ${textContent || response.statusText}`);
            }
        }

        // Check for API-level errors
        if (result.status === 'gagal' || !response.ok) {
            console.error('❌ PostData: API-level error detected:', result);
            console.log('🔍 PostData: Error details:', {
                resultStatus: result.status,
                responseOk: response.ok,
                responseStatus: response.status,
                message: result.message
            });
            throw new Error(result.message || `HTTP error! status: ${response.status}`);
        }

        console.log('✅ PostData: Returning successful result:', result);
        return result;
    } catch (error) {
        console.error('❌ PostData: Final error:', error);
        console.error('🔍 PostData: Error stack:', error.stack);
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
    let retryCount = 0;
    const maxRetries = 3;

    console.log('🔄 fetchAllData: Starting data fetch process');
    console.log('🔍 DEBUG: fetchAllData called from:', new Error().stack.split('\n')[2]);

    while (retryCount < maxRetries) {
        try {
            console.log(`🔄 fetchAllData: Attempt ${retryCount + 1}/${maxRetries} - Making GET request to:`, apiUrl);

            const startTime = Date.now();
            const response = await fetch(apiUrl, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            const endTime = Date.now();

            console.log(`✅ fetchAllData: Response received in ${endTime - startTime}ms`);
            console.log('📊 fetchAllData: Response status:', response.status, response.statusText);

            // Periksa apakah respons adalah fallback HTML dari Service Worker
            const contentType = response.headers.get('content-type');
            console.log('📄 fetchAllData: Content-Type:', contentType);

            if (contentType && contentType.includes('text/html')) {
                console.warn('⚠️ fetchAllData: Received HTML response from Service Worker (offline fallback)');
                throw new Error('Tidak ada koneksi internet dan tidak ada data tersimpan secara offline.');
            }

            // Jika bukan fallback HTML, lanjutkan seperti biasa (mengharapkan JSON)
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ fetchAllData: HTTP error:', response.status, response.statusText);
                console.error('🔍 fetchAllData: Error response text:', errorText);
                throw new Error(`Gagal mengambil data dari server. Status: ${response.status}. Pesan: ${errorText}`);
            }

            // Check if response has content - be more lenient
            const contentLength = response.headers.get('content-length');
            console.log('📏 fetchAllData: Content-Length:', contentLength);

            // Don't immediately throw error for empty content-length
            // Let the JSON parsing handle it
            if (!contentLength || contentLength === '0') {
                console.warn('⚠️ fetchAllData: Server returned empty content-length, attempting to parse anyway');
            }

            // Try to parse JSON response
            let result;
            try {
                const responseText = await response.text();
                console.log('📄 fetchAllData: Raw response text length:', responseText.length);
                console.log('📄 fetchAllData: Response text (first 500 chars):', responseText.substring(0, 500));

                if (!responseText || responseText.trim() === '') {
                    console.warn('⚠️ fetchAllData: Empty response text received');
                    console.log('🔄 fetchAllData: Returning empty data structure as fallback');
                    // Return empty data structure instead of throwing error
                    return {
                        wajibPajak: [],
                        wilayah: [],
                        masterPajak: [],
                        ketetapan: [],
                        pembayaran: [],
                        fiskal: [],
                        targetPajakRetribusi: []
                    };
                }

                result = JSON.parse(responseText);
                console.log('✅ fetchAllData: Successfully parsed JSON result');
                console.log('📊 fetchAllData: Data structure keys:', Object.keys(result));
                console.log('📈 fetchAllData: Data counts:', {
                    wajibPajak: result.wajibPajak?.length || 0,
                    wilayah: result.wilayah?.length || 0,
                    masterPajak: result.masterPajak?.length || 0,
                    ketetapan: result.ketetapan?.length || 0,
                    pembayaran: result.pembayaran?.length || 0,
                    fiskal: result.fiskal?.length || 0,
                    targetPajakRetribusi: result.targetPajakRetribusi?.length || 0
                });

                // Specific logging for wilayah data
                console.log('🔍 DEBUG: fetchAllData - Wilayah data details:');
                console.log('- Wilayah array exists:', !!result.wilayah);
                console.log('- Wilayah length:', result.wilayah?.length || 0);
                if (result.wilayah && result.wilayah.length > 0) {
                    console.log('- First few wilayah items:', result.wilayah.slice(0, 3));
                    console.log('- Unique kecamatan from wilayah:', [...new Set(result.wilayah.map(item => item.Kecamatan))]);
                } else {
                    console.warn('⚠️ DEBUG: fetchAllData - Wilayah data is empty or undefined!');
                }

            } catch (jsonError) {
                console.error('❌ fetchAllData: JSON parsing failed:', jsonError);
                console.error('🔍 fetchAllData: Response text that failed to parse:', responseText);
                // If JSON parsing fails, return empty data instead of throwing error
                console.warn('🔄 fetchAllData: Returning empty data due to parsing error');
                return {
                    wajibPajak: [],
                    wilayah: [],
                    masterPajak: [],
                    ketetapan: [],
                    pembayaran: [],
                    fiskal: [],
                    targetPajakRetribusi: []
                };
            }

            if (result.status === 'gagal') {
                console.warn('⚠️ fetchAllData: API returned error status:', result.message);
                console.log('🔍 fetchAllData: Error result:', result);
                // Return empty data instead of throwing error
                console.log('🔄 fetchAllData: Returning empty data due to API error');
                return {
                    wajibPajak: [],
                    wilayah: [],
                    masterPajak: [],
                    ketetapan: [],
                    pembayaran: [],
                    fiskal: [],
                    targetPajakRetribusi: []
                };
            }

            console.log('✅ fetchAllData: Successfully returning data');
            return result;

        } catch (error) {
            console.warn(`❌ fetchAllData: Attempt ${retryCount + 1} failed:`, error.message);
            console.error('🔍 fetchAllData: Error details:', error);
            retryCount++;

            if (retryCount >= maxRetries) {
                console.error('🚫 fetchAllData: All retry attempts failed');
                console.log('🔄 fetchAllData: Returning empty data structure as final fallback');
                // Return empty data structure instead of throwing error
                return {
                    wajibPajak: [],
                    wilayah: [],
                    masterPajak: [],
                    ketetapan: [],
                    pembayaran: [],
                    fiskal: [],
                    targetPajakRetribusi: []
                };
            }

            // Wait before retrying (exponential backoff)
            const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
            console.log(`⏳ fetchAllData: Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
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


function setDashboardDefaults() {
    console.log('Setting dashboard default values');
    
    // List of dashboard elements to set defaults for
    const dashboardElements = [
        { id: 'totalWp', value: '0' },
        { id: 'totalKetetapan', value: '0' },
        { id: 'totalPembayaran', value: '0' },
        { id: 'totalSkpdSkrd', value: '0' },
        { id: 'totalSspdSsrd', value: '0' },
        { id: 'totalFiskal', value: '0' },
        { id: 'totalNilaiKetetapan', value: 'Rp 0' },
        { id: 'totalNilaiSetoran', value: 'Rp 0' }
    ];
    
    // Safely set default values for each element
    dashboardElements.forEach(({ id, value }) => {
        try {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                element.style.color = ''; // Reset any error styling
            } else {
                console.warn(`setDashboardDefaults: Element with id '${id}' not found`);
            }
        } catch (error) {
            console.error(`setDashboardDefaults: Error setting ${id}:`, error);
        }
    });
    
    // Clear any existing chart
    try {
        if (window.dashboardChartInstance) {
            window.dashboardChartInstance.destroy();
            window.dashboardChartInstance = null;
        }
    } catch (error) {
        console.warn('setDashboardDefaults: Error clearing chart:', error);
    }
}

// 🔍 DEBUG: Third loadDashboardData definition (CURRENT - SHOULD BE ACTIVE)
async function loadDashboardData() {
    console.log('✅ DEBUG: CURRENT loadDashboardData called - this is correct');
    window.loadDashboardDataDefinitions.push('CURRENT_V3_CALLED');
    
    let retryCount = 0;
    const maxRetries = 3;

    console.log('🔄 loadDashboardData: Starting dashboard data load process');

    while (retryCount < maxRetries) {
        try {
            console.log(`🔄 loadDashboardData: Attempt ${retryCount + 1}/${maxRetries} - Making API request`);

            const startTime = Date.now();
            const response = await fetch('/.netlify/functions/api', {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                },
                timeout: 10000 // 10 second timeout
            });
            const endTime = Date.now();

            // Debug logging for response details
            console.log(`✅ loadDashboardData: Response received in ${endTime - startTime}ms`);
            console.log('📊 loadDashboardData: Response status:', response.status, response.statusText);
            console.log('📋 loadDashboardData: Response headers:', Object.fromEntries(response.headers.entries()));

            // Check if response has content
            const contentLength = response.headers.get('content-length');
            const contentType = response.headers.get('content-type');
            console.log('📏 loadDashboardData: Content-Length:', contentLength, 'Content-Type:', contentType);

            // Handle invalid responses gracefully - FIXED: Don't check Content-Length
            if (!contentType || !contentType.includes('application/json')) {
                console.warn('⚠️ loadDashboardData: Non-JSON response detected');
                console.log('🔍 loadDashboardData: Response details:', {
                    hasContentLength: !!contentLength,
                    contentLength,
                    hasContentType: !!contentType,
                    contentType,
                    isJson: contentType && contentType.includes('application/json')
                });
                setDashboardDefaults();
                return; // Exit gracefully without throwing error
            }
            
            console.log('✅ loadDashboardData: Valid JSON response detected, proceeding to parse...');

            // Handle non-OK HTTP responses
            if (!response.ok) {
                console.warn(`❌ loadDashboardData: HTTP error ${response.status} - ${response.statusText}`);
                console.log('🔍 loadDashboardData: Error response details:', {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries())
                });
                setDashboardDefaults();
                return; // Exit gracefully without throwing error
            }

            // Try to parse JSON response
            let data;
            try {
                const responseText = await response.text();
                console.log('📄 loadDashboardData: Raw response text length:', responseText.length);
                console.log('📄 loadDashboardData: Response text (first 500 chars):', responseText.substring(0, 500));

                if (!responseText || responseText.trim() === '') {
                    console.warn('⚠️ loadDashboardData: Empty response text received');
                    setDashboardDefaults();
                    return; // Exit gracefully
                }

                data = JSON.parse(responseText);
                console.log('✅ loadDashboardData: Successfully parsed JSON data');
                console.log('📊 loadDashboardData: Parsed data keys:', Object.keys(data));
                console.log('📈 loadDashboardData: Data counts:', {
                    wajibPajak: data.wajibPajak?.length || 0,
                    wilayah: data.wilayah?.length || 0,
                    masterPajak: data.masterPajak?.length || 0,
                    ketetapan: data.ketetapan?.length || 0,
                    pembayaran: data.pembayaran?.length || 0,
                    fiskal: data.fiskal?.length || 0,
                    targetPajakRetribusi: data.targetPajakRetribusi?.length || 0
                });

            } catch (jsonError) {
                console.error('❌ loadDashboardData: JSON parsing failed:', jsonError.message);
                console.error('🔍 loadDashboardData: Response text that failed to parse:', responseText);
                console.warn('⚠️ loadDashboardData: Setting default values due to JSON parsing error');
                setDashboardDefaults();
                return; // Exit gracefully
            }

            // Check for API-level errors
            if (data.status === 'gagal') {
                console.warn('⚠️ loadDashboardData: API returned error status:', data.message);
                console.log('🔍 loadDashboardData: Error data:', data);
                setDashboardDefaults();
                return; // Exit gracefully
            }

            // Successfully got data - update dashboard
            console.log('🎉 loadDashboardData: Successfully received valid data, updating dashboard');
            updateDashboardWithData(data);

            // Success - break out of retry loop
            console.log('✅ loadDashboardData: Dashboard update completed successfully');
            break;

        } catch (error) {
            console.warn(`❌ loadDashboardData: Attempt ${retryCount + 1} failed:`, error.message);
            console.error('🔍 loadDashboardData: Error details:', error);
            retryCount++;

            if (retryCount >= maxRetries) {
                console.warn('🚫 loadDashboardData: All retry attempts failed, setting defaults');
                setDashboardDefaults();
                break;
            }

            // Wait before retrying (exponential backoff)
            const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
            console.log(`⏳ loadDashboardData: Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Separate function to update dashboard with valid data
function updateDashboardWithData(data) {
    try {
        // Update statistik
        const wajibPajak = data.wajibPajak || [];
        const ketetapan = data.ketetapan || [];
        const pembayaran = data.pembayaran || [];
        const targetList = data.targetPajakRetribusi || [];
        const tahunBerjalan = new Date().getFullYear();
        
        // Hitung total target tahun berjalan
        const totalTargetTahun = targetList.filter(t => t.Tahun == tahunBerjalan).reduce((sum, t) => sum + (parseFloat(t.Target) || 0), 0);
        
        // Hitung statistik lama
        const totalWpElement = document.getElementById('totalWp');
        const totalKetetapanElement = document.getElementById('totalKetetapan');
        const totalPembayaranElement = document.getElementById('totalPembayaran');
        
        if (totalWpElement) totalWpElement.textContent = wajibPajak.length;
        if (totalKetetapanElement) totalKetetapanElement.textContent = ketetapan.length;
        if (totalPembayaranElement) totalPembayaranElement.textContent = pembayaran.length;
        
        // Hitung SKPD/SKRD (ketetapan yang sudah lunas)
        const ketetapanLunas = ketetapan.filter(k => {
            const pembayaranKetetapan = pembayaran.filter(p => p.ID_Ketetapan === k.ID_Ketetapan);
            return pembayaranKetetapan.some(p => p.StatusPembayaran === 'Sukses');
        });
        const totalSkpdSkrdElement = document.getElementById('totalSkpdSkrd');
        if (totalSkpdSkrdElement) totalSkpdSkrdElement.textContent = ketetapanLunas.length;
        
        // Hitung SSPD/SSRD (pembayaran sukses)
        const pembayaranSukses = pembayaran.filter(p => p.StatusPembayaran === 'Sukses');
        const totalSspdSsrdElement = document.getElementById('totalSspdSsrd');
        if (totalSspdSsrdElement) totalSspdSsrdElement.textContent = pembayaranSukses.length;
        
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
        const totalFiskalElement = document.getElementById('totalFiskal');
        if (totalFiskalElement) totalFiskalElement.textContent = totalFiskal;
        
        // Hitung total nilai ketetapan
        const totalNilaiKetetapan = ketetapan.reduce((sum, k) => {
            return sum + (parseFloat(k.TotalTagihan) || 0);
        }, 0);
        const totalNilaiKetetapanElement = document.getElementById('totalNilaiKetetapan');
        if (totalNilaiKetetapanElement) totalNilaiKetetapanElement.textContent = `Rp ${totalNilaiKetetapan.toLocaleString('id-ID')}`;
        
        // Hitung total nilai setoran
        const totalNilaiSetoran = pembayaranSukses.reduce((sum, p) => {
            return sum + (parseFloat(p.JumlahBayar) || 0);
        }, 0);
        const totalNilaiSetoranElement = document.getElementById('totalNilaiSetoran');
        if (totalNilaiSetoranElement) totalNilaiSetoranElement.textContent = `Rp ${totalNilaiSetoran.toLocaleString('id-ID')}`;
        
        // Update grafik per bulan (tambahkan target bulanan)
        if (typeof updateDashboardChart === 'function') {
            updateDashboardChart(ketetapan, pembayaran, totalTargetTahun);
        }
        
        console.log('loadDashboardData: Dashboard updated successfully');
        
    } catch (error) {
        console.error('updateDashboardWithData: Error updating dashboard:', error);
        setDashboardDefaults();
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

// 🔧 PRODUCTION ERROR HANDLING - Tambahan untuk deployment Netlify
function showConfigurationError() {
    console.error('❌ Configuration error detected - showing user message');
    
    const dashboardElements = [
        { id: 'totalWp', value: 'Config Error' },
        { id: 'totalKetetapan', value: 'Config Error' },
        { id: 'totalPembayaran', value: 'Config Error' },
        { id: 'totalSkpdSkrd', value: 'Config Error' },
        { id: 'totalSspdSsrd', value: 'Config Error' },
        { id: 'totalFiskal', value: 'Config Error' },
        { id: 'totalNilaiKetetapan', value: 'Konfigurasi Error' },
        { id: 'totalNilaiSetoran', value: 'Konfigurasi Error' }
    ];
    
    dashboardElements.forEach(({ id, value }) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            element.style.color = '#dc3545'; // Red color for errors
            element.title = 'Server configuration error. Please check environment variables.';
        }
    });
    
    // Show alert to user
    setTimeout(() => {
        alert('⚠️ Konfigurasi server bermasalah. Silakan hubungi administrator.\n\nConfiguration error detected. Please contact administrator.');
    }, 1000);
}

// 🔧 DEPLOYMENT DIAGNOSTICS - Fungsi untuk membantu debugging deployment
function runDeploymentDiagnostics() {
    console.log('🔍 DEPLOYMENT DIAGNOSTICS:');
    console.log('- Current URL:', window.location.href);
    console.log('- API URL:', apiUrl);
    console.log('- User Agent:', navigator.userAgent);
    console.log('- Environment:', {
        isLocalhost: window.location.hostname === 'localhost',
        isNetlify: window.location.hostname.includes('netlify'),
        protocol: window.location.protocol,
        port: window.location.port
    });
    
    // Test API endpoint availability
    fetch(apiUrl, { method: 'HEAD' })
        .then(response => {
            console.log('✅ API endpoint reachable:', response.status);
        })
        .catch(error => {
            console.error('❌ API endpoint not reachable:', error.message);
        });
}

// Run diagnostics on page load for debugging
// 🗑️ REMOVED: Merged into main DOMContentLoaded listener above