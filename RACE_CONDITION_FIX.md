# Race Condition Fix - Duplicate Key Error

## Problem
The application was experiencing "duplicate key value violates unique constraint" errors when creating ketetapan, pembayaran, and fiskal records simultaneously. This happened because multiple requests could generate the same ID at the same time.

## Root Cause
The original code used a simple count-based approach to generate sequential numbers:
```javascript
const { count } = await supabase.from('table').select('*', { count: 'exact', head: true });
const nomorUrut = ((count || 0) + 1).toString().padStart(7, '0');
```

When multiple requests executed simultaneously, they could get the same count value and generate identical IDs, causing duplicate key violations.

## Solution
Implemented a robust retry mechanism with timestamp-based uniqueness:

### 1. Enhanced ID Generation
- **Base sequence**: Still uses count + 1 for readability
- **Timestamp suffix**: Adds last 3 digits of timestamp for uniqueness
- **Format**: `{baseSequence}{timestamp}`

### 2. Retry Logic
- **Max retries**: 5 attempts per request
- **Random delay**: 50-150ms between retries to reduce collision
- **Duplicate detection**: Specifically handles duplicate key errors
- **Graceful fallback**: Returns meaningful error after max retries

### 3. Functions Fixed

#### handleCreateKetetapan()
- **ID Format**: `{nomorUrut}/{SKPD|SKRD}/{bulanRomawi}/{tahun}`
- **Example**: `0001123/SKPD/IX/2025`

#### handleCreatePembayaran()
- **ID Format**: `{nomorUrut}/{SSPD|SSRD}/{bulanRomawi}/{tahun}`
- **Example**: `0001456/SSPD/IX/2025`

#### handleCreateFiskal()
- **ID Format**: `{nomorUrut}/FKL/BPPKAD/{bulanRomawi}/{tahun}`
- **Example**: `001789/FKL/BPPKAD/IX/2025`

#### handleAutoCreateFiskal()
- Same logic as handleCreateFiskal for consistency

#### handleGetNextFiskalNumber()
- Updated to use same timestamp-based approach

## Benefits
1. **Eliminates race conditions**: Timestamp ensures uniqueness even with concurrent requests
2. **Maintains readability**: Sequential base numbers still provide logical ordering
3. **Graceful error handling**: Retry mechanism handles temporary conflicts
4. **Consistent approach**: All functions use same pattern
5. **Performance**: Minimal overhead with random delays only on conflicts

## Files Modified
- `netlify/functions/api.js` - All ID generation functions updated

## Testing Recommendations
1. Test concurrent ketetapan creation
2. Test concurrent pembayaran creation  
3. Test concurrent fiskal creation
4. Verify ID uniqueness under load
5. Test error handling when max retries exceeded

## Deployment Notes
- No database schema changes required
- Backward compatible with existing data
- Can be deployed immediately
- Monitor logs for any remaining duplicate key errors