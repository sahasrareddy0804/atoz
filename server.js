require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');


const app = express();
const PORT = process.env.PORT || 8000;

// -----------------------------------------------------------------------------
// Database Helper Methods
// -----------------------------------------------------------------------------
function applyAutoStatusUpdates(bookings) {
    let updated = false;
    const updatedBookings = [];
    const now = new Date();
    
    bookings.forEach(b => {
        if (b.status === "approved" || b.status === "pending") {
            try {
                if (b.date && b.slotTime) {
                    const timeParts = b.slotTime.split(" - ");
                    if (timeParts.length === 2) {
                        const parseTime = (timeStr) => {
                            const match = timeStr.match(/(\d+):(\d+)\s+(AM|PM)/i);
                            if (!match) return null;
                            let hours = parseInt(match[1]);
                            const mins = parseInt(match[2]);
                            const ampm = match[3].toUpperCase();
                            if (ampm === "PM" && hours < 12) hours += 12;
                            if (ampm === "AM" && hours === 12) hours = 0;
                            return { hours, mins };
                        };
                        const start = parseTime(timeParts[0]);
                        const end = parseTime(timeParts[1]);
                        if (start && end) {
                            const parseDateString = (str) => {
                                if (!str) return new Date();
                                if (str.includes("/")) {
                                    const parts = str.split("/");
                                    return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                                }
                                return new Date(str);
                            };
                            const endDate = parseDateString(b.date);
                            endDate.setHours(end.hours, end.mins, 0, 0);
                            
                            const startVal = start.hours * 60 + start.mins;
                            const endVal = end.hours * 60 + end.mins;
                            if (endVal < startVal) {
                                endDate.setDate(endDate.getDate() + 1);
                            }
                            
                            if (now > endDate) {
                                b.status = (b.status === "approved") ? "completed" : "cancelled";
                                updated = true;
                                updatedBookings.push(b);
                            }
                        }
                    }
                }
            } catch(e) {}
        }
    });
    
    return { bookings, updated, updatedBookings };
}


// Enable CORS and increase body parser limits for base64 screenshots
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const DB_DIR = path.join(__dirname, 'db');
const BOOKINGS_FILE = path.join(DB_DIR, 'bookings.json');
const ADMIN_FILE = path.join(DB_DIR, 'admin.json');

// Ensure db directory and files exist for local JSON fallback
function ensureLocalDbExists() {
    if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR);
    }
    if (!fs.existsSync(BOOKINGS_FILE)) {
        fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([]));
    }
    if (!fs.existsSync(ADMIN_FILE)) {
        const defaultAdmin = {
            username: "A2Z celebrations",
            password: "A2Z@celebrations"
        };
        fs.writeFileSync(ADMIN_FILE, JSON.stringify(defaultAdmin));
    }
}

// -----------------------------------------------------------------------------
// LOCAL FILE DATABASE PROVIDER
// -----------------------------------------------------------------------------
class FileDbProvider {
    async connect() {
        ensureLocalDbExists();
        console.log("Connected to Local JSON File Database");

        // Startup migration: Revert incorrectly auto-completed future bookings back to pending
        try {
            const bookings = this._readBookings();
            const now = new Date();
            let revertedCount = 0;
            bookings.forEach(b => {
                if (b.status === "completed") {
                    try {
                        if (b.date && b.slotTime) {
                            const timeParts = b.slotTime.split(" - ");
                            if (timeParts.length === 2) {
                                const parseTime = (timeStr) => {
                                    const match = timeStr.match(/(\d+):(\d+)\s+(AM|PM)/i);
                                    if (!match) return null;
                                    let hours = parseInt(match[1]);
                                    const mins = parseInt(match[2]);
                                    const ampm = match[3].toUpperCase();
                                    if (ampm === "PM" && hours < 12) hours += 12;
                                    if (ampm === "AM" && hours === 12) hours = 0;
                                    return { hours, mins };
                                };
                                const start = parseTime(timeParts[0]);
                                const end = parseTime(timeParts[1]);
                                if (start && end) {
                                    const parseDateString = (str) => {
                                        if (!str) return new Date();
                                        if (str.includes("/")) {
                                            const parts = str.split("/");
                                            return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                                        }
                                        return new Date(str);
                                    };
                                    const endDate = parseDateString(b.date);
                                    endDate.setHours(end.hours, end.mins, 0, 0);
                                    
                                    const startVal = start.hours * 60 + start.mins;
                                    const endVal = end.hours * 60 + end.mins;
                                    if (endVal < startVal) {
                                        endDate.setDate(endDate.getDate() + 1);
                                    }
                                    
                                    if (now < endDate) {
                                        b.status = "pending";
                                        console.log(`[Migration] Reverted booking ${b.id} for '${b.customerName}' back to 'pending' (event date: ${b.date} ${b.slotTime})`);
                                        revertedCount++;
                                    }
                                }
                            }
                        }
                    } catch (e) {}
                }
            });
            if (revertedCount > 0) {
                this._writeBookings(bookings);
                console.log(`[Migration Completed] Reverted ${revertedCount} prematurely completed future bookings back to 'pending'.`);
            } else {
                console.log("[Migration Completed] No future bookings found that were incorrectly marked as 'completed'.");
            }
        } catch (migrationError) {
            console.error("[Migration Error] Failed to run startup bookings migration:", migrationError);
        }
    }

    _readBookings() {
        try {
            const data = fs.readFileSync(BOOKINGS_FILE, 'utf8');
            const bookings = JSON.parse(data);
            
            // Apply auto status updates
            const { bookings: updatedBookings, updated } = applyAutoStatusUpdates(bookings);
            
            if (updated) {
                fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(updatedBookings, null, 2));
            }
            
            return updatedBookings;
        } catch (e) {
            console.error('[FileDbProvider _readBookings] Error reading bookings:', e);
            return [];
        }
    }

    _writeBookings(bookings) {
        fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
    }

    async getBookings() {
        return this._readBookings();
    }

    async isSlotBooked(venueId, date, slotId, excludeBookingId = null) {
        const bookings = this._readBookings();
        return bookings.some(b => 
            b.id !== excludeBookingId &&
            (!b._id || b._id.toString() !== excludeBookingId) &&
            b.venueId === venueId && 
            b.date === date && 
            b.slotId === slotId && 
            (b.status === "approved" || b.status === "pending" || b.status === "completed")
        );
    }

    async saveBooking(bookingInput) {
        if (await this.isSlotBooked(bookingInput.venueId, bookingInput.date, bookingInput.slotId)) {
            throw new Error("This slot is already booked by another customer. Please select a different slot.");
        }

        const year = new Date().getFullYear();
        const random = Math.floor(1000 + Math.random() * 9000);
        const bookingId = `AZC-${year}-${random}`;

        const newBooking = {
            ...bookingInput,
            id: bookingId,
            status: "pending",
            createdAt: new Date().toISOString()
        };

        const bookings = this._readBookings();
        bookings.push(newBooking);
        this._writeBookings(bookings);
        return newBooking;
    }

    async updateBookingStatus(id, status) {
        const bookings = this._readBookings();
        const idx = bookings.findIndex(b => b.id === id || (b._id && b._id.toString() === id));
        if (idx === -1) return null;

        const booking = bookings[idx];
        if (status === 'approved') {
            const alreadyApproved = bookings.some(item => 
                item.id !== booking.id &&
                (!item._id || item._id.toString() !== booking.id) &&
                item.venueId === booking.venueId &&
                item.date === booking.date &&
                item.slotId === booking.slotId &&
                (item.status === "approved" || item.status === "completed")
            );
            if (alreadyApproved) {
                throw new Error("This slot is already booked and approved for another customer.");
            }
        }

        booking.status = status;
        this._writeBookings(bookings);
        return { success: true, id, status };
    }

    async updateBookingDetails(id, updatedBooking) {
        const bookings = this._readBookings();
        const idx = bookings.findIndex(b => b.id === id || (b._id && b._id.toString() === id));
        if (idx === -1) return null;

        bookings[idx] = { ...bookings[idx], ...updatedBooking };
        this._writeBookings(bookings);
        return bookings[idx];
    }

    async deleteBooking(id) {
        const bookings = this._readBookings();
        const filtered = bookings.filter(b => b.id !== id && (!b._id || b._id.toString() !== id));
        if (bookings.length === filtered.length) return false;

        this._writeBookings(filtered);
        return true;
    }

    async getAdmin() {
        try {
            const data = fs.readFileSync(ADMIN_FILE, 'utf8');
            return JSON.parse(data);
        } catch (e) {
            return { username: "A2Z celebrations", password: "A2Z@celebrations" };
        }
    }

    async updateAdmin(admin) {
        fs.writeFileSync(ADMIN_FILE, JSON.stringify(admin, null, 2));
        return true;
    }
}

// -----------------------------------------------------------------------------
// MONGODB CLOUD DATABASE PROVIDER (Loaded dynamically if environment key exists)
// -----------------------------------------------------------------------------
let MongoDbProvider = null;
if (process.env.MONGODB_URI) {
    try {
        const { MongoClient, ObjectId } = require('mongodb');
        
        MongoDbProvider = class MongoDbProvider {
            constructor(uri) {
                this.uri = uri;
                this.client = new MongoClient(this.uri);
                this.db = null;
                this.bookings = null;
                this.admin = null;
            }

            async connect() {
                await this.client.connect();
                this.db = this.client.db();
                this.bookings = this.db.collection('bookings');
                this.admin = this.db.collection('admin');
                console.log("Connected to MongoDB Database");

                // Establish partial unique index to restrict double bookings
                try {
                    await this.bookings.createIndex(
                        { venueId: 1, date: 1, slotId: 1 },
                        { 
                            unique: true, 
                            partialFilterExpression: { status: { $in: ["pending", "approved"] } } 
                        }
                    );
                    console.log("MongoDB Partial Unique Index verified successfully.");
                } catch (indexError) {
                    console.error("Index Initialization Failure:", indexError.message);
                }

                // Check default admin
                const count = await this.admin.countDocuments();
                if (count === 0) {
                    await this.admin.insertOne({
                        username: "A2Z celebrations",
                        password: "A2Z@celebrations"
                    });
                }

                // Startup migration: Revert incorrectly auto-completed future bookings back to pending
                try {
                    const completedBookings = await this.bookings.find({ status: "completed" }).toArray();
                    const now = new Date();
                    let revertedCount = 0;
                    
                    for (const b of completedBookings) {
                        if (b.date && b.slotTime) {
                            const timeParts = b.slotTime.split(" - ");
                            if (timeParts.length === 2) {
                                const parseTime = (timeStr) => {
                                    const match = timeStr.match(/(\d+):(\d+)\s+(AM|PM)/i);
                                    if (!match) return null;
                                    let hours = parseInt(match[1]);
                                    const mins = parseInt(match[2]);
                                    const ampm = match[3].toUpperCase();
                                    if (ampm === "PM" && hours < 12) hours += 12;
                                    if (ampm === "AM" && hours === 12) hours = 0;
                                    return { hours, mins };
                                };
                                const start = parseTime(timeParts[0]);
                                const end = parseTime(timeParts[1]);
                                if (start && end) {
                                    const parseDateString = (str) => {
                                        if (!str) return new Date();
                                        if (str.includes("/")) {
                                            const parts = str.split("/");
                                            return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                                        }
                                        return new Date(str);
                                    };
                                    const endDate = parseDateString(b.date);
                                    endDate.setHours(end.hours, end.mins, 0, 0);
                                    
                                    const startVal = start.hours * 60 + start.mins;
                                    const endVal = end.hours * 60 + end.mins;
                                    if (endVal < startVal) {
                                        endDate.setDate(endDate.getDate() + 1);
                                    }
                                    
                                    if (now < endDate) {
                                        // Revert it back to "pending"
                                        await this.bookings.updateOne({ _id: b._id }, { $set: { status: "pending" } });
                                        console.log(`[Migration] Reverted booking ${b.id || b._id.toString()} for '${b.customerName}' back to 'pending' (event date: ${b.date} ${b.slotTime})`);
                                        revertedCount++;
                                    }
                                }
                            }
                        }
                    }
                    if (revertedCount > 0) {
                        console.log(`[Migration Completed] Reverted ${revertedCount} prematurely completed future bookings back to 'pending'.`);
                    } else {
                        console.log("[Migration Completed] No future bookings found that were incorrectly marked as 'completed'.");
                    }
                } catch (migrationError) {
                    console.error("[Migration Error] Failed to run startup bookings migration:", migrationError);
                }
            }

            async getBookings() {
                const list = await this.bookings.find().toArray();
                const now = new Date();
                
                for (let b of list) {
                    // Normalize MongoDB object to fit application model expectations
                    b.id = b.id || b._id.toString();
                }
                
                // Apply auto status updates
                const { bookings: updatedList, updatedBookings } = applyAutoStatusUpdates(list);
                
                // Save updates back to Mongo
                for (let b of updatedBookings) {
                    await this.bookings.updateOne({ _id: b._id }, { $set: { status: b.status } });
                }
                
                return updatedList;
            }

            async isSlotBooked(venueId, date, slotId, excludeBookingId = null) {
                const filter = {
                    venueId,
                    date,
                    slotId,
                    status: { $in: ["pending", "approved"] }
                };
                if (excludeBookingId) {
                    if (ObjectId.isValid(excludeBookingId)) {
                        filter._id = { $ne: new ObjectId(excludeBookingId) };
                    } else {
                        filter.id = { $ne: excludeBookingId };
                    }
                }
                const count = await this.bookings.countDocuments(filter);
                return count > 0;
            }

            async saveBooking(bookingInput) {
                if (await this.isSlotBooked(bookingInput.venueId, bookingInput.date, bookingInput.slotId)) {
                    throw new Error("This slot is already booked by another customer. Please select a different slot.");
                }

                const year = new Date().getFullYear();
                const random = Math.floor(1000 + Math.random() * 9000);
                const bookingId = `AZC-${year}-${random}`;

                const newBooking = {
                    ...bookingInput,
                    id: bookingId,
                    status: "pending",
                    createdAt: new Date().toISOString()
                };

                try {
                    await this.bookings.insertOne(newBooking);
                    return newBooking;
                } catch (err) {
                    if (err.code === 11000) {
                        throw new Error("This slot was just booked by another customer. Please select a different slot.");
                    }
                    throw err;
                }
            }

            async updateBookingStatus(id, status) {
                const query = { $or: [{ id: id }] };
                if (ObjectId.isValid(id)) {
                    query.$or.push({ _id: new ObjectId(id) });
                }
                const booking = await this.bookings.findOne(query);
                if (!booking) return null;

                if (status === 'approved') {
                    const alreadyApproved = await this.bookings.findOne({
                        _id: { $ne: booking._id },
                        venueId: booking.venueId,
                        date: booking.date,
                        slotId: booking.slotId,
                        status: "approved"
                    });
                    if (alreadyApproved) {
                        throw new Error("This slot is already booked and approved for another customer.");
                    }
                }

                await this.bookings.updateOne({ _id: booking._id }, { $set: { status } });
                return { success: true, id, status };
            }

            async updateBookingDetails(id, updatedBooking) {
                const query = { $or: [{ id: id }] };
                if (ObjectId.isValid(id)) {
                    query.$or.push({ _id: new ObjectId(id) });
                }
                const booking = await this.bookings.findOne(query);
                if (!booking) return null;

                const cleanUpdate = { ...updatedBooking };
                delete cleanUpdate._id; // Prevent MongoDB immutability conflicts
                
                await this.bookings.updateOne({ _id: booking._id }, { $set: cleanUpdate });
                const updated = await this.bookings.findOne({ _id: booking._id });
                return updated;
            }

            async deleteBooking(id) {
                const query = { $or: [{ id: id }] };
                if (ObjectId.isValid(id)) {
                    query.$or.push({ _id: new ObjectId(id) });
                }
                const result = await this.bookings.deleteOne(query);
                return result.deletedCount > 0;
            }

            async getAdmin() {
                const adminDoc = await this.admin.findOne();
                if (!adminDoc) {
                    return { username: "A2Z celebrations", password: "A2Z@celebrations" };
                }
                return adminDoc;
            }

            async updateAdmin(adminCredentials) {
                await this.admin.updateOne(
                    {}, 
                    { $set: { username: adminCredentials.username, password: adminCredentials.password } }, 
                    { upsert: true }
                );
                return true;
            }
        };
    } catch (loadError) {
        console.error("Fatal: MongoDb module configuration error:", loadError.message);
    }
}

// -----------------------------------------------------------------------------
// STORAGE CONTROLLER SELECTION
// -----------------------------------------------------------------------------
let db;
if (process.env.MONGODB_URI && MongoDbProvider) {
    db = new MongoDbProvider(process.env.MONGODB_URI);
} else {
    db = new FileDbProvider();
}

// -----------------------------------------------------------------------------
// REST API ENDPOINTS
// -----------------------------------------------------------------------------

// 1. Get booked slot IDs for a venue and date
app.get('/api/bookings/booked-slots', async (req, res) => {
    const { venueId, date } = req.query;
    if (!venueId || !date) {
        return res.status(400).json({ error: "Missing venueId or date parameters" });
    }
    try {
        const bookings = await db.getBookings();
        const bookedSlotIds = bookings
            .filter(b => b.venueId === venueId && b.date === date && (b.status === "approved" || b.status === "pending" || b.status === "completed"))
            .map(b => b.slotId);
        
        res.json(bookedSlotIds);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Get bookings (for client tracking or admin panel)
app.get('/api/bookings', async (req, res) => {
    const { search, venueId, status, date, id, phone } = req.query;
    try {
        let bookings = await db.getBookings();

        // Client tracking specific booking
        if (id && phone) {
            const b = bookings.find(x => x.id === id && x.customerPhone === phone);
            if (!b) {
                return res.status(404).json({ error: "No booking found with this ID and Phone Number combination." });
            }
            return res.json(b);
        }

        // Admin filters
        if (search) {
            const q = search.toLowerCase();
            bookings = bookings.filter(b => 
                (b.customerName || '').toLowerCase().includes(q) ||
                (b.id || '').toLowerCase().includes(q) ||
                (b.customerPhone || '').includes(q)
            );
        }
        if (venueId && venueId !== 'all') {
            bookings = bookings.filter(b => b.venueId === venueId);
        }
        if (status && status !== 'all') {
            bookings = bookings.filter(b => b.status === status);
        }
        if (date) {
            bookings = bookings.filter(b => b.date === date);
        }

        // Sort by createdAt descending
        bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Create a booking
app.post('/api/bookings', async (req, res) => {
    const bookingInput = req.body;
    try {
        const newBooking = await db.saveBooking(bookingInput);
        res.status(201).json(newBooking);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// 3.5. Get a single booking by ID (Admin)
app.get('/api/bookings/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const bookings = await db.getBookings();
        const booking = bookings.find(b => b.id === id || (b._id && b._id.toString() === id));
        
        if (!booking) {
            return res.status(404).json({ error: "Booking not found" });
        }
        res.json(booking);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Update booking status (Approve / Reject / Cancel)
app.patch('/api/bookings/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ error: "Missing status parameter" });
    }

    try {
        const result = await db.updateBookingStatus(id, status);
        if (!result) {
            return res.status(404).json({ error: "Booking not found" });
        }
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// 5. Update full booking details
app.put('/api/bookings/:id', async (req, res) => {
    const { id } = req.params;
    const updatedBooking = req.body;

    try {
        const booking = await db.updateBookingDetails(id, updatedBooking);
        if (!booking) {
            return res.status(404).json({ error: "Booking not found" });
        }
        res.json({ success: true, booking });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// 6. Delete a booking
app.delete('/api/bookings/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const success = await db.deleteBooking(id);
        if (!success) {
            return res.status(404).json({ error: "Booking not found" });
        }
        res.json({ success: true, id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 7. Admin Login
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const admin = await db.getAdmin();

        if (username === admin.username && password === admin.password) {
            const token = "token_" + Math.random().toString(36).substring(2);
            res.json({ success: true, token });
        } else {
            res.status(401).json({ error: "Invalid username or password!" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 7.5. Run Migration manually
app.get('/api/admin/run-migration', async (req, res) => {
    try {
        let revertedCount = 0;
        let logs = [];
        const now = new Date();

        if (process.env.MONGODB_URI && MongoDbProvider) {
            const completedBookings = await db.bookings.find({ status: "completed" }).toArray();
            for (const b of completedBookings) {
                if (b.date && b.slotTime) {
                    const timeParts = b.slotTime.split(" - ");
                    if (timeParts.length === 2) {
                        const parseTime = (timeStr) => {
                            const match = timeStr.match(/(\d+):(\d+)\s+(AM|PM)/i);
                            if (!match) return null;
                            let hours = parseInt(match[1]);
                            const mins = parseInt(match[2]);
                            const ampm = match[3].toUpperCase();
                            if (ampm === "PM" && hours < 12) hours += 12;
                            if (ampm === "AM" && hours === 12) hours = 0;
                            return { hours, mins };
                        };
                        const start = parseTime(timeParts[0]);
                        const end = parseTime(timeParts[1]);
                        if (start && end) {
                            const parseDateString = (str) => {
                                if (!str) return new Date();
                                if (str.includes("/")) {
                                    const parts = str.split("/");
                                    return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                                }
                                return new Date(str);
                            };
                            const endDate = parseDateString(b.date);
                            endDate.setHours(end.hours, end.mins, 0, 0);
                            
                            const startVal = start.hours * 60 + start.mins;
                            const endVal = end.hours * 60 + end.mins;
                            if (endVal < startVal) {
                                endDate.setDate(endDate.getDate() + 1);
                            }
                            
                            if (now < endDate) {
                                await db.bookings.updateOne({ _id: b._id }, { $set: { status: "pending" } });
                                logs.push(`Reverted ${b.id} for '${b.customerName}' back to 'pending'`);
                                revertedCount++;
                            }
                        }
                    }
                }
            }
        } else {
            const bookings = db._readBookings();
            bookings.forEach(b => {
                if (b.status === "completed") {
                    try {
                        if (b.date && b.slotTime) {
                            const timeParts = b.slotTime.split(" - ");
                            if (timeParts.length === 2) {
                                const parseTime = (timeStr) => {
                                    const match = timeStr.match(/(\d+):(\d+)\s+(AM|PM)/i);
                                    if (!match) return null;
                                    let hours = parseInt(match[1]);
                                    const mins = parseInt(match[2]);
                                    const ampm = match[3].toUpperCase();
                                    if (ampm === "PM" && hours < 12) hours += 12;
                                    if (ampm === "AM" && hours === 12) hours = 0;
                                    return { hours, mins };
                                };
                                const start = parseTime(timeParts[0]);
                                const end = parseTime(timeParts[1]);
                                if (start && end) {
                                    const parseDateString = (str) => {
                                        if (!str) return new Date();
                                        if (str.includes("/")) {
                                            const parts = str.split("/");
                                            return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                                        }
                                        return new Date(str);
                                    };
                                    const endDate = parseDateString(b.date);
                                    endDate.setHours(end.hours, end.mins, 0, 0);
                                    
                                    const startVal = start.hours * 60 + start.mins;
                                    const endVal = end.hours * 60 + end.mins;
                                    if (endVal < startVal) {
                                        endDate.setDate(endDate.getDate() + 1);
                                    }
                                    
                                    if (now < endDate) {
                                        b.status = "pending";
                                        logs.push(`Reverted local ${b.id} back to 'pending'`);
                                        revertedCount++;
                                    }
                                }
                            }
                        }
                    } catch (e) {}
                }
            });
            if (revertedCount > 0) {
                db._writeBookings(bookings);
            }
        }
        res.json({ success: true, revertedCount, logs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 8. Admin Update Credentials
app.post('/api/admin/update-credentials', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password cannot be empty." });
    }

    try {
        await db.updateAdmin({ username, password });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 9. Admin Slot Availability for a given date (with optional venueId filter)
app.get('/api/admin/slots', async (req, res) => {
    const { date, venueId } = req.query;
    if (!date) {
        return res.status(400).json({ error: "Missing required 'date' parameter (YYYY-MM-DD or DD/MM/YYYY)." });
    }

    // Normalise the incoming date to DD/MM/YYYY (the format stored in bookings)
    let queryDateDMY = date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [y, m, d] = date.split('-');
        queryDateDMY = `${d}/${m}/${y}`;
    }

    // All configured venue → slots (from seed data mirrored in the codebase)
    const ALL_SLOTS = [
        { id: "v1_s1", venueId: "v1", venueName: "SR Nagar - Screen 1: Garden Theme",      time: "09:00 AM - 12:00 PM", label: "Morning Magic" },
        { id: "v1_s2", venueId: "v1", venueName: "SR Nagar - Screen 1: Garden Theme",      time: "12:30 PM - 03:30 PM", label: "Matinee Joy" },
        { id: "v1_s3", venueId: "v1", venueName: "SR Nagar - Screen 1: Garden Theme",      time: "04:00 PM - 07:00 PM", label: "Sunset Romance" },
        { id: "v1_s4", venueId: "v1", venueName: "SR Nagar - Screen 1: Garden Theme",      time: "07:30 PM - 10:30 PM", label: "Starry Night" },
        { id: "v1_s5", venueId: "v1", venueName: "SR Nagar - Screen 1: Garden Theme",      time: "11:00 PM - 01:00 AM", label: "Midnight Show" },

        { id: "v2_s1", venueId: "v2", venueName: "SR Nagar - Screen 2: Heart Shape Decor", time: "09:15 AM - 12:15 PM", label: "Morning Magic" },
        { id: "v2_s2", venueId: "v2", venueName: "SR Nagar - Screen 2: Heart Shape Decor", time: "12:45 PM - 03:45 PM", label: "Matinee Joy" },
        { id: "v2_s3", venueId: "v2", venueName: "SR Nagar - Screen 2: Heart Shape Decor", time: "04:15 PM - 07:15 PM", label: "Sunset Romance" },
        { id: "v2_s4", venueId: "v2", venueName: "SR Nagar - Screen 2: Heart Shape Decor", time: "07:45 PM - 10:45 PM", label: "Starry Night" },
        { id: "v2_s5", venueId: "v2", venueName: "SR Nagar - Screen 2: Heart Shape Decor", time: "11:00 PM - 01:00 AM", label: "Midnight Show" },

        { id: "v3_s1", venueId: "v3", venueName: "SR Nagar - Screen 3: Ring Theme",        time: "09:30 AM - 12:30 PM", label: "Morning Magic" },
        { id: "v3_s2", venueId: "v3", venueName: "SR Nagar - Screen 3: Ring Theme",        time: "01:00 PM - 04:00 PM", label: "Matinee Joy" },
        { id: "v3_s3", venueId: "v3", venueName: "SR Nagar - Screen 3: Ring Theme",        time: "04:20 PM - 07:20 PM", label: "Sunset Romance" },
        { id: "v3_s4", venueId: "v3", venueName: "SR Nagar - Screen 3: Ring Theme",        time: "07:45 PM - 10:45 PM", label: "Starry Night" },
        { id: "v3_s5", venueId: "v3", venueName: "SR Nagar - Screen 3: Ring Theme",        time: "11:00 PM - 01:00 AM", label: "Midnight Show" },

        { id: "v4_s1", venueId: "v4", venueName: "SR Nagar - Screen 4: Big Screen Theatre",time: "09:15 AM - 12:15 PM", label: "Morning Magic" },
        { id: "v4_s2", venueId: "v4", venueName: "SR Nagar - Screen 4: Big Screen Theatre",time: "12:45 PM - 03:45 PM", label: "Matinee Joy" },
        { id: "v4_s3", venueId: "v4", venueName: "SR Nagar - Screen 4: Big Screen Theatre",time: "04:15 PM - 07:15 PM", label: "Sunset Romance" },
        { id: "v4_s4", venueId: "v4", venueName: "SR Nagar - Screen 4: Big Screen Theatre",time: "07:40 PM - 10:40 PM", label: "Starry Night" },
        { id: "v4_s5", venueId: "v4", venueName: "SR Nagar - Screen 4: Big Screen Theatre",time: "11:00 PM - 01:00 AM", label: "Midnight Show" },
    ];

    try {
        const allBookings = await db.getBookings();
        console.log(`[API /api/admin/slots] queryDateDMY: ${queryDateDMY}, total bookings: ${allBookings.length}`);

        // Get bookings for this date (pending, approved, or completed)
        const dayBookings = allBookings.filter(b =>
            b.date === queryDateDMY &&
            (b.status === "approved" || b.status === "pending" || b.status === "completed")
        );
        console.log(`[API /api/admin/slots] dayBookings count: ${dayBookings.length}`);

        // Build a lookup: slotId -> booking
        const slotBookingMap = {};
        dayBookings.forEach(b => {
            slotBookingMap[b.slotId] = b;
        });

        // Filter by venue if requested
        let slotsToProcess = venueId && venueId !== 'all'
            ? ALL_SLOTS.filter(s => s.venueId === venueId)
            : ALL_SLOTS;

        const slots = slotsToProcess.map(slot => {
            const booking = slotBookingMap[slot.id];
            if (booking) {
                return {
                    slotId: slot.id,
                    venueId: slot.venueId,
                    venueName: slot.venueName,
                    time: slot.time,
                    label: slot.label,
                    booked: true,
                    status: booking.status,
                    booking: {
                        id: booking.id,
                        name: booking.customerName,
                        phone: booking.customerPhone,
                        occasion: booking.occasion,
                        total: booking.total,
                        bookingStatus: booking.status
                    }
                };
            }
            return {
                slotId: slot.id,
                venueId: slot.venueId,
                venueName: slot.venueName,
                time: slot.time,
                label: slot.label,
                booked: false,
                status: "available"
            };
        });

        const bookedCount  = slots.filter(s => s.booked).length;
        const totalSlots   = slots.length;
        const availableCount = totalSlots - bookedCount;
        const occupancy    = totalSlots > 0 ? Math.round((bookedCount / totalSlots) * 100) : 0;

        res.json({
            date: queryDateDMY,
            queryDate: date,
            totalSlots,
            booked: bookedCount,
            available: availableCount,
            occupancy,
            slots
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Intercept /js/, /css/, and /assets/ requests to support flat-file deployments (fallback to root folder)
app.use((req, res, next) => {
    const filePath = req.path;
    const exactPath = path.join(__dirname, filePath);
    try {
        if (fs.existsSync(exactPath) && fs.statSync(exactPath).isFile()) {
            return next();
        }
    } catch (e) {}

    if (filePath.startsWith('/js/') || filePath.startsWith('/css/') || filePath.startsWith('/assets/')) {
        const fileName = path.basename(filePath);
        const rootPath = path.join(__dirname, fileName);
        try {
            if (fs.existsSync(rootPath) && fs.statSync(rootPath).isFile()) {
                return res.sendFile(rootPath);
            }
        } catch (e) {}
    }
    next();
});

// Serve static assets from root folder
app.use(express.static(path.join(__dirname)));

// Fallback to index.html for unknown requests (except API)
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.includes('.')) {
        return res.sendFile(path.join(__dirname, 'index.html'));
    }
    next();
});

// -----------------------------------------------------------------------------
// SERVER INITIALIZATION
// -----------------------------------------------------------------------------
db.connect()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running at http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error("Database connection failure:", err);
        process.exit(1);
    });
