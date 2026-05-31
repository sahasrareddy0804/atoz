const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

// Enable CORS and increase body parser limits for base64 screenshots
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const DB_DIR = path.join(__dirname, 'db');
const BOOKINGS_FILE = path.join(DB_DIR, 'bookings.json');
const ADMIN_FILE = path.join(DB_DIR, 'admin.json');

// Ensure db directory and files exist
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

// Helpers to read/write DB
function readBookings() {
    try {
        const data = fs.readFileSync(BOOKINGS_FILE, 'utf8');
        const bookings = JSON.parse(data);
        
        // Auto-complete checking
        let updated = false;
        const now = new Date();
        bookings.forEach(b => {
            if (b.status === "approved" || b.status === "pending") {
                try {
                    if (b.date && b.slotTime) {
                        const endTimeStr = b.slotTime.split(" - ")[1]; // e.g. "12:00 PM"
                        if (endTimeStr) {
                            const match = endTimeStr.match(/(\d+):(\d+)\s+(AM|PM)/i);
                            if (match) {
                                let hours = parseInt(match[1]);
                                const mins = parseInt(match[2]);
                                const ampm = match[3].toUpperCase();
                                if (ampm === "PM" && hours < 12) hours += 12;
                                if (ampm === "AM" && hours === 12) hours = 0;
                                
                                const parseDateString = (str) => {
                                    if (!str) return new Date();
                                    if (str.includes("/")) {
                                        const parts = str.split("/");
                                        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                                    }
                                    return new Date(str);
                                };
                                const endDate = parseDateString(b.date);
                                endDate.setHours(hours, mins, 0, 0);
                                
                                if (now > endDate) {
                                    b.status = "completed";
                                    updated = true;
                                }
                            }
                        }
                    }
                } catch(e) {}
            }
        });
        
        if (updated) {
            fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
        }
        
        return bookings;
    } catch (e) {
        return [];
    }
}

function writeBookings(bookings) {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
}

function readAdmin() {
    try {
        const data = fs.readFileSync(ADMIN_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return { username: "A2Z celebrations", password: "A2Z@celebrations" };
    }
}

function writeAdmin(admin) {
    fs.writeFileSync(ADMIN_FILE, JSON.stringify(admin, null, 2));
}

// Helper: Check if a slot is booked
function isSlotBooked(venueId, date, slotId, excludeBookingId = null) {
    const bookings = readBookings();
    return bookings.some(b => 
        b.id !== excludeBookingId &&
        b.venueId === venueId && 
        b.date === date && 
        b.slotId === slotId && 
        (b.status === "approved" || b.status === "pending")
    );
}

// REST API

// 1. Get booked slot IDs for a venue and date
app.get('/api/bookings/booked-slots', (req, res) => {
    const { venueId, date } = req.query;
    if (!venueId || !date) {
        return res.status(400).json({ error: "Missing venueId or date parameters" });
    }
    const bookings = readBookings();
    const bookedSlotIds = bookings
        .filter(b => b.venueId === venueId && b.date === date && (b.status === "approved" || b.status === "pending"))
        .map(b => b.slotId);
    
    res.json(bookedSlotIds);
});

// 2. Get bookings (for client tracking or admin panel)
app.get('/api/bookings', (req, res) => {
    const { search, venueId, status, date, id, phone } = req.query;
    let bookings = readBookings();

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
});

// 3. Create a booking
app.post('/api/bookings', (req, res) => {
    const bookingInput = req.body;
    
    if (isSlotBooked(bookingInput.venueId, bookingInput.date, bookingInput.slotId)) {
        return res.status(400).json({ error: "This slot is already booked by another customer. Please select a different slot." });
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

    const bookings = readBookings();
    bookings.push(newBooking);
    writeBookings(bookings);

    res.status(201).json(newBooking);
});

// 4. Update booking status (Approve / Reject / Cancel)
app.patch('/api/bookings/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ error: "Missing status parameter" });
    }

    const bookings = readBookings();
    const idx = bookings.findIndex(b => b.id === id);

    if (idx === -1) {
        return res.status(404).json({ error: "Booking not found" });
    }

    const booking = bookings[idx];

    // If approving, check if slot is already approved for someone else
    if (status === 'approved') {
        const alreadyApproved = bookings.some(item => 
            item.id !== booking.id &&
            item.venueId === booking.venueId &&
            item.date === booking.date &&
            item.slotId === booking.slotId &&
            item.status === "approved"
        );
        if (alreadyApproved) {
            return res.status(400).json({ error: "This slot is already booked and approved for another customer." });
        }
    }

    booking.status = status;
    writeBookings(bookings);

    res.json({ success: true, id, status });
});

// 5. Update full booking details
app.put('/api/bookings/:id', (req, res) => {
    const { id } = req.params;
    const updatedBooking = req.body;

    const bookings = readBookings();
    const idx = bookings.findIndex(b => b.id === id);

    if (idx === -1) {
        return res.status(404).json({ error: "Booking not found" });
    }

    bookings[idx] = { ...bookings[idx], ...updatedBooking };
    writeBookings(bookings);

    res.json({ success: true, booking: bookings[idx] });
});

// 6. Delete a booking
app.delete('/api/bookings/:id', (req, res) => {
    const { id } = req.params;
    const bookings = readBookings();
    const filtered = bookings.filter(b => b.id !== id);

    if (bookings.length === filtered.length) {
        return res.status(404).json({ error: "Booking not found" });
    }

    writeBookings(filtered);
    res.json({ success: true, id });
});

// 7. Admin Login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    const admin = readAdmin();

    if (username === admin.username && password === admin.password) {
        const token = "token_" + Math.random().toString(36).substring(2);
        res.json({ success: true, token });
    } else {
        res.status(401).json({ error: "Invalid username or password!" });
    }
});

// 8. Admin Update Credentials
app.post('/api/admin/update-credentials', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password cannot be empty." });
    }

    writeAdmin({ username, password });
    res.json({ success: true });
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

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
