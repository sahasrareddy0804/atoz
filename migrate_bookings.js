require('dotenv').config();
const https = require('https');
const { MongoClient } = require('mongodb');

const OLD_API = 'https://a2z-backend-wdm7.onrender.com/api/bookings';
const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
    console.error("❌ MONGODB_URI not set in .env file");
    process.exit(1);
}

function fetchUrl(url, timeoutMs = 180000) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try { resolve(JSON.parse(data)); }
                    catch (e) { reject(new Error("JSON parse error: " + e.message)); }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });
        req.on('error', reject);
        req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error(`Timeout after ${timeoutMs/1000}s`)); });
    });
}

async function migrate() {
    console.log("📦 Fetching all bookings from old production server...");
    console.log("   (Render cold start may take up to 3 minutes — please wait)\n");

    let oldBookings;
    try {
        oldBookings = await fetchUrl(OLD_API, 180000);
        console.log(`✅ Fetched ${oldBookings.length} bookings from old server`);
    } catch (err) {
        console.error("❌ Failed to fetch from old server:", err.message);
        process.exit(1);
    }

    // Now fetch full details (including screenshots) for active bookings in parallel
    const active = oldBookings.filter(b => b.status === 'approved' || b.status === 'pending');
    console.log(`\n🔍 Fetching full details (screenshots) for ${active.length} active bookings in parallel...`);

    await Promise.allSettled(active.map(async (b) => {
        try {
            const detail = await fetchUrl(`${OLD_API}/${b.id}`, 150000);
            if (detail && detail.paymentScreenshot) {
                b.paymentScreenshot = detail.paymentScreenshot;
                console.log(` -> Screenshot fetched for ${b.id} (${Math.round(detail.paymentScreenshot.length / 1024)} KB)`);
            }
        } catch (e) {
            console.warn(` -> Could not get screenshot for ${b.id}: ${e.message}`);
        }
    }));

    // Connect to new MongoDB
    console.log("\n🔗 Connecting to new MongoDB...");
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db();
    const collection = db.collection('bookings');

    const existingIds = new Set(
        (await collection.find({}, { projection: { id: 1 } }).toArray()).map(d => d.id)
    );
    console.log(`📋 New database already has ${existingIds.size} bookings`);

    const toInsert = oldBookings.filter(b => !existingIds.has(b.id));
    console.log(`📥 Inserting ${toInsert.length} missing bookings...`);

    if (toInsert.length > 0) {
        const result = await collection.insertMany(toInsert, { ordered: false });
        console.log(`✅ Inserted ${result.insertedCount} bookings successfully!`);
    } else {
        console.log("✅ All bookings already exist in new database. Nothing to import.");
    }

    await client.close();
    console.log("\n🎉 Migration complete! Restart your local server to use the new data.");
}

migrate().catch(err => {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
});
