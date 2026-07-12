const fs = require('fs');
const https = require('https');

const baseUrl = 'https://a2z-backend-wdm7.onrender.com/api/bookings';
const dest = './db/bookings.json';

console.log("Fetching live bookings list from " + baseUrl + "...");

function fetchUrl(url, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error("JSON parse error: " + e.message));
                    }
                } else {
                    reject(new Error(`Failed with status: ${res.statusCode}`));
                }
            });
        });
        
        req.on('error', reject);
        
        req.setTimeout(timeoutMs, () => {
            req.destroy();
            reject(new Error(`Request timeout after ${timeoutMs / 1000} seconds`));
        });
    });
}

async function sync() {
    try {
        // Render server cold start and large dataset fetch can take up to 180 seconds
        const bookings = await fetchUrl(baseUrl, 180000);
        console.log(`Successfully fetched ${bookings.length} bookings. Syncing details/screenshots for active ones...`);

        // Filter for bookings that might have screenshots (approved or pending)
        const activeBookings = bookings.filter(b => b.status === 'approved' || b.status === 'pending');
        console.log(`Found ${activeBookings.length} active bookings. Fetching full details in parallel...`);

        // Run fetches in parallel with a timeout of 150 seconds per request
        const promises = activeBookings.map(async (b) => {
            try {
                const details = await fetchUrl(`${baseUrl}/${b.id}`, 150000);
                if (details && details.paymentScreenshot) {
                    b.paymentScreenshot = details.paymentScreenshot;
                    console.log(` -> Found screenshot for ${b.id} (${Math.round(details.paymentScreenshot.length / 1024)} KB)`);
                } else {
                    console.log(` -> No screenshot field for ${b.id}`);
                }
            } catch (err) {
                console.error(` -> Failed to fetch details for ${b.id}: ${err.message}`);
            }
        });

        await Promise.allSettled(promises);

        fs.writeFileSync(dest, JSON.stringify(bookings, null, 2));
        console.log(`Sync complete! Saved all bookings to ${dest}`);
    } catch (err) {
        console.error("Sync failed:", err.message);
    }
}

sync();
