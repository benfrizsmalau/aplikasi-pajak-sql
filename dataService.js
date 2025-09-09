// dataService.js

const apiUrl = '/.netlify/functions/api';

// Fungsi fetch data (GET semua data)
export async function fetchData() {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error('Gagal fetch data dari server');
    return await response.json();
}

// Fungsi create/update data (POST dengan action)
export async function createData(action, payload) {
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload })
    });
    return await response.json();
}

// Fungsi delete data (POST dengan action)
export async function deleteData(action, payload) {
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload })
    });
    return await response.json();
} 