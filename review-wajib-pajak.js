// review-wajib-pajak.js
import { createData } from './dataService.js';

// Global variables
let inboxData = [];
let selectedItems = [];
let currentDetailId = null;

// DOM elements
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const filterStatus = document.getElementById('filterStatus');
const refreshDataBtn = document.getElementById('refreshData');
const inboxTableBody = document.getElementById('inboxTableBody');
const totalRecords = document.getElementById('totalRecords');
const checkAllInbox = document.getElementById('checkAllInbox');
const aksiInbox = document.getElementById('aksiInbox');
const prosesAksiInbox = document.getElementById('prosesAksiInbox');

// Modal elements
const detailModal = document.getElementById('detailModal');
const rejectModal = document.getElementById('rejectModal');
const detailContent = document.getElementById('detailContent');
const approveBtn = document.getElementById('approveBtn');
const rejectBtn = document.getElementById('rejectBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const confirmRejectBtn = document.getElementById('confirmRejectBtn');
const cancelRejectBtn = document.getElementById('cancelRejectBtn');
const rejectReason = document.getElementById('rejectReason');
const loadingOverlay = document.getElementById('loadingOverlay');

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    loadInboxData();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Search and filter
    searchButton.addEventListener('click', filterData);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') filterData();
    });
    filterStatus.addEventListener('change', filterData);
    refreshDataBtn.addEventListener('click', loadInboxData);

    // Table actions
    checkAllInbox.addEventListener('change', toggleSelectAll);
    aksiInbox.addEventListener('change', updateProsesButton);
    prosesAksiInbox.addEventListener('click', handleBulkAction);

    // Modal events
    closeModalBtn.addEventListener('click', closeDetailModal);
    approveBtn.addEventListener('click', approveCurrentItem);
    rejectBtn.addEventListener('click', showRejectModal);
    confirmRejectBtn.addEventListener('click', rejectCurrentItem);
    cancelRejectBtn.addEventListener('click', closeRejectModal);

    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === detailModal) closeDetailModal();
        if (event.target === rejectModal) closeRejectModal();
    });

    // Close modals with escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeDetailModal();
            closeRejectModal();
        }
    });
}

// Load inbox data from API
async function loadInboxData() {
    try {
        showLoading(true);
        const response = await createData('getInboxWajibPajak', {
            status: filterStatus.value || 'pending'
        });
        
        if (response.status === 'sukses') {
            inboxData = response.inboxWajibPajak || [];
            renderTable();
        } else {
            throw new Error(response.message || 'Gagal mengambil data');
        }
    } catch (error) {
        console.error('Error loading inbox data:', error);
        showAlert('error', 'Gagal mengambil data: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Render table with data
function renderTable() {
    const filteredData = filterInboxData();
    
    inboxTableBody.innerHTML = '';
    
    if (filteredData.length === 0) {
        inboxTableBody.innerHTML = `
            <tr>
                <td colspan="14" class="text-center">Tidak ada data untuk ditampilkan</td>
            </tr>
        `;
        totalRecords.textContent = 'Total: 0 data';
        return;
    }

    filteredData.forEach((item, index) => {
        const wpData = item.data;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="checkbox" class="row-checkbox" value="${item.id}"></td>
            <td>${index + 1}</td>
            <td>${wpData.NPWPD || '-'}</td>
            <td>${wpData.JenisWP || '-'}</td>
            <td>${wpData['Nama Usaha'] || '-'}</td>
            <td>${wpData['Nama Pemilik'] || '-'}</td>
            <td>${wpData['NIK KTP'] || '-'}</td>
            <td>${wpData.Alamat || '-'}</td>
            <td>${wpData.Telephone || '-'}</td>
            <td>${wpData.Kelurahan || '-'}</td>
            <td>${wpData.Kecamatan || '-'}</td>
            <td><span class="status-badge status-${item.status}">${getStatusText(item.status)}</span></td>
            <td>${formatDate(item.created_at)}</td>
            <td>
                <button class="btn-small btn-info" onclick="showDetail(${item.id})">Detail</button>
                ${item.status === 'pending' ? `
                    <button class="btn-small btn-success" onclick="approveItem(${item.id})">Approve</button>
                    <button class="btn-small btn-danger" onclick="rejectItem(${item.id})">Reject</button>
                ` : ''}
            </td>
        `;
        inboxTableBody.appendChild(row);
    });

    // Add event listeners to checkboxes
    document.querySelectorAll('.row-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectedItems);
    });

    totalRecords.textContent = `Total: ${filteredData.length} data`;
}

// Filter data based on search and status
function filterInboxData() {
    let filtered = inboxData;
    const searchTerm = searchInput.value.toLowerCase();
    const statusFilter = filterStatus.value;

    // Filter by status
    if (statusFilter) {
        filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
        filtered = filtered.filter(item => {
            const wpData = item.data;
            return (
                (wpData.NPWPD && wpData.NPWPD.toLowerCase().includes(searchTerm)) ||
                (wpData['Nama Usaha'] && wpData['Nama Usaha'].toLowerCase().includes(searchTerm)) ||
                (wpData['Nama Pemilik'] && wpData['Nama Pemilik'].toLowerCase().includes(searchTerm)) ||
                (wpData['NIK KTP'] && wpData['NIK KTP'].includes(searchTerm))
            );
        });
    }

    return filtered;
}

// Filter data and re-render table
function filterData() {
    renderTable();
}

// Toggle select all checkboxes
function toggleSelectAll() {
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = checkAllInbox.checked;
    });
    updateSelectedItems();
}

// Update selected items array
function updateSelectedItems() {
    selectedItems = Array.from(document.querySelectorAll('.row-checkbox:checked'))
        .map(checkbox => parseInt(checkbox.value));
    updateProsesButton();
}

// Update proses button state
function updateProsesButton() {
    const hasSelection = selectedItems.length > 0;
    const hasAction = aksiInbox.value !== '';
    prosesAksiInbox.disabled = !(hasSelection && hasAction);
}

// Handle bulk actions
async function handleBulkAction() {
    const action = aksiInbox.value;
    if (!action || selectedItems.length === 0) return;

    if (action === 'approve') {
        await bulkApprove();
    } else if (action === 'reject') {
        showBulkRejectModal();
    }
}

// Bulk approve items
async function bulkApprove() {
    if (!confirm(`Apakah Anda yakin ingin approve ${selectedItems.length} data wajib pajak?`)) {
        return;
    }

    try {
        showLoading(true);
        let successCount = 0;
        let errorCount = 0;

        for (const id of selectedItems) {
            try {
                const response = await createData('approveWajibPajak', { id });
                if (response.status === 'sukses') {
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (error) {
                errorCount++;
                console.error(`Error approving item ${id}:`, error);
            }
        }

        showAlert('success', `Berhasil approve ${successCount} data${errorCount > 0 ? `, ${errorCount} gagal` : ''}`);
        loadInboxData();
        selectedItems = [];
        checkAllInbox.checked = false;
        aksiInbox.value = '';
        updateProsesButton();
    } catch (error) {
        showAlert('error', 'Gagal melakukan bulk approve: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Show bulk reject modal
function showBulkRejectModal() {
    rejectReason.value = '';
    rejectModal.style.display = 'block';
    currentDetailId = selectedItems; // Store selected items for bulk reject
}

// Show detail modal
function showDetail(id) {
    const item = inboxData.find(item => item.id === id);
    if (!item) return;

    const wpData = item.data;
    detailContent.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item">
                <label>NPWPD:</label>
                <span>${wpData.NPWPD || '-'}</span>
            </div>
            <div class="detail-item">
                <label>Jenis WP:</label>
                <span>${wpData.JenisWP || '-'}</span>
            </div>
            <div class="detail-item">
                <label>Nama Usaha:</label>
                <span>${wpData['Nama Usaha'] || '-'}</span>
            </div>
            <div class="detail-item">
                <label>Nama Pemilik:</label>
                <span>${wpData['Nama Pemilik'] || '-'}</span>
            </div>
            <div class="detail-item">
                <label>NIK KTP:</label>
                <span>${wpData['NIK KTP'] || '-'}</span>
            </div>
            <div class="detail-item">
                <label>Alamat:</label>
                <span>${wpData.Alamat || '-'}</span>
            </div>
            <div class="detail-item">
                <label>Telephone:</label>
                <span>${wpData.Telephone || '-'}</span>
            </div>
            <div class="detail-item">
                <label>Kelurahan:</label>
                <span>${wpData.Kelurahan || '-'}</span>
            </div>
            <div class="detail-item">
                <label>Kecamatan:</label>
                <span>${wpData.Kecamatan || '-'}</span>
            </div>
            <div class="detail-item">
                <label>Status:</label>
                <span class="status-badge status-${item.status}">${getStatusText(item.status)}</span>
            </div>
            <div class="detail-item">
                <label>Tanggal Input:</label>
                <span>${formatDate(item.created_at)}</span>
            </div>
        </div>
    `;

    currentDetailId = id;
    detailModal.style.display = 'block';
    
    // Show/hide action buttons based on status
    const canAction = item.status === 'pending';
    approveBtn.style.display = canAction ? 'inline-block' : 'none';
    rejectBtn.style.display = canAction ? 'inline-block' : 'none';
}

// Approve current item
async function approveCurrentItem() {
    if (!currentDetailId) return;
    await approveItem(currentDetailId);
}

// Approve single item
async function approveItem(id) {
    if (!confirm('Apakah Anda yakin ingin approve data wajib pajak ini?')) {
        return;
    }

    try {
        showLoading(true);
        const response = await createData('approveWajibPajak', { id });
        
        if (response.status === 'sukses') {
            showAlert('success', response.message);
            closeDetailModal();
            loadInboxData();
        } else {
            throw new Error(response.message);
        }
    } catch (error) {
        showAlert('error', 'Gagal approve data: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Reject current item
async function rejectCurrentItem() {
    if (!currentDetailId) return;
    await rejectItem(currentDetailId);
}

// Reject single item
async function rejectItem(id) {
    const alasan = rejectReason.value.trim();
    if (!alasan) {
        showAlert('error', 'Alasan penolakan harus diisi!');
        return;
    }

    try {
        showLoading(true);
        const response = await createData('rejectWajibPajak', { id, alasan });
        
        if (response.status === 'sukses') {
            showAlert('success', response.message);
            closeRejectModal();
            closeDetailModal();
            loadInboxData();
        } else {
            throw new Error(response.message);
        }
    } catch (error) {
        showAlert('error', 'Gagal reject data: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Bulk reject items
async function bulkRejectItems() {
    const alasan = rejectReason.value.trim();
    if (!alasan) {
        showAlert('error', 'Alasan penolakan harus diisi!');
        return;
    }

    if (!Array.isArray(currentDetailId)) {
        showAlert('error', 'Tidak ada data yang dipilih untuk ditolak!');
        return;
    }

    try {
        showLoading(true);
        let successCount = 0;
        let errorCount = 0;

        for (const id of currentDetailId) {
            try {
                const response = await createData('rejectWajibPajak', { id, alasan });
                if (response.status === 'sukses') {
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (error) {
                errorCount++;
                console.error(`Error rejecting item ${id}:`, error);
            }
        }

        showAlert('success', `Berhasil reject ${successCount} data${errorCount > 0 ? `, ${errorCount} gagal` : ''}`);
        closeRejectModal();
        loadInboxData();
        selectedItems = [];
        checkAllInbox.checked = false;
        aksiInbox.value = '';
        updateProsesButton();
    } catch (error) {
        showAlert('error', 'Gagal melakukan bulk reject: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Close detail modal
function closeDetailModal() {
    detailModal.style.display = 'none';
    currentDetailId = null;
}

// Show reject modal
function showRejectModal() {
    rejectReason.value = '';
    rejectModal.style.display = 'block';
}

// Close reject modal
function closeRejectModal() {
    rejectModal.style.display = 'none';
    currentDetailId = null;
}

// Update confirm reject button based on current action
function updateConfirmRejectButton() {
    if (Array.isArray(currentDetailId)) {
        confirmRejectBtn.textContent = `Tolak ${currentDetailId.length} Data`;
        confirmRejectBtn.onclick = bulkRejectItems;
    } else {
        confirmRejectBtn.textContent = 'Tolak Data';
        confirmRejectBtn.onclick = rejectCurrentItem;
    }
}

// Helper functions
function getStatusText(status) {
    const statusMap = {
        'pending': 'Pending',
        'approved': 'Approved',
        'rejected': 'Rejected'
    };
    return statusMap[status] || status;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

function showAlert(type, message) {
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <span class="alert-message">${message}</span>
        <button class="alert-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    // Add to page
    document.body.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentElement) {
            alert.remove();
        }
    }, 5000);
}

// Make functions globally available for onclick handlers
window.showDetail = showDetail;
window.approveItem = approveItem;
window.rejectItem = rejectItem;

// Update confirm reject button when modal opens
document.addEventListener('DOMContentLoaded', function() {
    const originalShowRejectModal = showRejectModal;
    const originalShowBulkRejectModal = showBulkRejectModal;
    
    showRejectModal = function() {
        originalShowRejectModal();
        updateConfirmRejectButton();
    };
    
    showBulkRejectModal = function() {
        originalShowBulkRejectModal();
        updateConfirmRejectButton();
    };
}); 