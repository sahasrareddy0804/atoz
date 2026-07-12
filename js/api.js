// A to Z Celebrations - REAL-TIME RESILIENT API (js/api.js)

// Configurable Backend API URL
// For local development or unified servers, leave this empty to use the same host.
// For static hosting like Netlify, set this to your deployed Render/Railway backend URL
// (e.g., 'https://a2z-celebrations-backend.onrender.com').
// You can also set it dynamically in your browser console using: localStorage.setItem('azc_backend_url', 'https://...')
const API_BASE_URL =
    localStorage.getItem("azc_backend_url") ||
    "https://a2z-backend-wdm7.onrender.com";
async function fetchWithRetry(url, options = {}, retries = 5, delay = 3000) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, options);
            // Render cold start can cause 502 Bad Gateway, 503 Service Unavailable, or 504 Gateway Timeout
            if (res.status === 502 || res.status === 503 || res.status === 504) {
                throw new Error(`Server is waking up (Status ${res.status})`);
            }
            // Do not retry on permanent client/routing errors
            if (res.status === 400 || res.status === 404) {
                return res; // We return it immediately so the caller can handle the 404/400 properly without retrying
            }
            return res;
        } catch (err) {
            if (i === retries - 1) {
                throw err; // Reached max retries, throw the error
            }
            console.warn(`[API Connection Warning] ${err.message}. Retrying in ${delay}ms... (${i + 1}/${retries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

const API = {
    // ----------------------------------------------------
    // CUSTOMER ENDPOINTS
    // ----------------------------------------------------

    // Fetch Cities (Local)
    fetchCities() {
        const local = window.AppDB ? window.AppDB.getCities() : [];
        if (local && local.length > 0) {
            return Promise.resolve(local);
        }
        const fallback = window.AppDB_SEED_DATA ? window.AppDB_SEED_DATA.cities : [];
        return Promise.resolve(fallback);
    },

    // Fetch Venues, optionally filtered by city (Local)
    fetchVenues(cityId = null) {
        const local = window.AppDB ? window.AppDB.getVenues() : [];
        const list = (local && local.length > 0) ? local : (window.AppDB_SEED_DATA ? window.AppDB_SEED_DATA.venues : []);
        const result = cityId ? list.filter(v => v.cityId === cityId) : list;
        return Promise.resolve(result);
    },

    // Fetch Add-ons (Local)
    fetchAddons() {
        const local = window.AppDB ? window.AppDB.getAddons() : [];
        if (local && local.length > 0) {
            return Promise.resolve(local);
        }
        const fallback = window.AppDB_SEED_DATA ? window.AppDB_SEED_DATA.addons : [];
        return Promise.resolve(fallback);
    },

    // Fetch Available Slots for a given Venue and Date (Server synced with fast timeout fallback)
    async fetchSlotsAvailability(venueId, date) {
        const getSlotsLocal = (bookedSlotIds = []) => {
            if (window.AppDB) return window.AppDB.getSlots(venueId);
            const list = window.AppDB_SEED_DATA ? window.AppDB_SEED_DATA.slots : [];
            return list.filter(s => s.venueId === venueId);
        };

        // Helper to map slots status
        const mapSlots = (bookedSlotIds) => {
            const slots = getSlotsLocal();
            return slots.map(s => {
                const isBooked = bookedSlotIds.includes(s.id);
                return { ...s, isBooked };
            });
        };

        // Try to fetch with a fast timeout (600ms)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 600);

        try {
            const res = await fetch(`${API_BASE_URL}/api/bookings/booked-slots?venueId=${venueId}&date=${encodeURIComponent(date)}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!res.ok) {
                throw new Error("Failed to fetch slots");
            }
            const bookedSlotIds = await res.json();
            return mapSlots(bookedSlotIds);
        } catch (e) {
            clearTimeout(timeoutId);
            console.warn("Using offline / cached slot availability database due to slow response or startup latency:", e);

            // Fallback: Check local bookings in AppDB memory cache
            let localBookedIds = [];
            try {
                if (window.AppDB) {
                    const bookings = window.AppDB.getBookings() || [];
                    localBookedIds = bookings
                        .filter(b => b.venueId === venueId && b.date === date && (b.status === "approved" || b.status === "pending" || b.status === "completed"))
                        .map(b => b.slotId);
                }
            } catch (err) {
                console.error("Local database read error:", err);
            }

            return mapSlots(localBookedIds);
        }
    },

    // Validate Coupon Code (Local)
    validateCoupon(code, purchaseAmount) {
        const coupons = window.AppDB.getCoupons();
        const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase());

        if (!coupon) {
            return Promise.reject(new Error("Invalid coupon code!"));
        }
        if (purchaseAmount < coupon.minPurchase) {
            return Promise.reject(new Error(`Minimum purchase of ₹${coupon.minPurchase} required for this coupon!`));
        }
        return Promise.resolve(coupon);
    },

    // Create new Booking (Server synced - NO silent local write fallbacks to prevent double-booking)
    async createBooking(bookingInput) {
        try {
            const res = await fetchWithRetry(`${API_BASE_URL}/api/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bookingInput)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to create booking");
            }

            const newBooking = await res.json();
            window.AppDB.saveBooking(newBooking); // Cache locally for client tracking
            return newBooking;
        } catch (e) {
            console.error("Error submitting booking to backend server:", e);
            throw new Error(e.message || "Failed to reach the booking server. Please verify your connection and try again.");
        }
    },

    // Track Booking (Customer - Server synced)
    async trackBooking(bookingId, phone) {
        try {
            const res = await fetchWithRetry(`${API_BASE_URL}/api/bookings?id=${bookingId}&phone=${phone}`);
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "No booking found.");
            }
            return await res.json();
        } catch (e) {
            // If the server explicitly says "No booking found", throw that error directly
            if (e.message && e.message.includes("No booking found")) {
                throw e;
            }
            console.warn("Backend server not reached. Falling back to local tracking cache:", e);
            const bookings = window.AppDB.getBookings();
            const b = bookings.find(x => x.id === bookingId && x.customerPhone === phone);
            if (!b) {
                throw new Error("No booking found with this ID and Phone Number combination. (Server unreachable)");
            }
            return b;
        }
    },

    // Cancel Booking (Customer - Server synced)
    async cancelCustomerBooking(bookingId, phone) {
        try {
            const res = await fetchWithRetry(`${API_BASE_URL}/api/bookings/${bookingId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'cancelled' })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to cancel booking.");
            }

            await res.json();
            window.AppDB.updateBookingStatus(bookingId, 'cancelled');
            return { id: bookingId, status: 'cancelled' };
        } catch (e) {
            console.error("Failed to cancel booking on the server:", e);
            throw new Error("Unable to cancel booking. The server is unreachable.");
        }
    },

    // ----------------------------------------------------
    // ADMIN ENDPOINTS
    // ----------------------------------------------------

    // Admin Login Authentication (Server synced)
    async adminLogin(username, password) {
        try {
            const res = await fetchWithRetry(`${API_BASE_URL}/api/admin/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Invalid username or password!");
            }

            const data = await res.json();
            sessionStorage.setItem("azc_auth_token", data.token);
            return data;
        } catch (e) {
            console.error("Failed to login to server:", e);
            throw new Error(e.message || "Failed to authenticate with the server. Please check your internet connection.");
        }
    },

    // Admin Update Credentials (Server synced)
    async updateAdminCredentials(newUsername, newPassword) {
        try {
            const res = await fetchWithRetry(`${API_BASE_URL}/api/admin/update-credentials`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username: newUsername, password: newPassword })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to update admin credentials.");
            }

            return await res.json();
        } catch (e) {
            console.error("Failed to update credentials on server:", e);
            throw new Error("Unable to update credentials. The server is unreachable.");
        }
    },

    // Admin Check Authentication State
    checkAdminAuth() {
        return sessionStorage.getItem("azc_auth_token") !== null;
    },

    // Admin Logout
    adminLogout() {
        sessionStorage.removeItem("azc_auth_token");
        return Promise.resolve(true);
    },

    // Admin Get Bookings with Filters & Searching (Server synced)
    async fetchAdminBookings(filters = {}) {
        try {
            let url = `${API_BASE_URL}/api/bookings?`;
            if (filters.search) url += `search=${encodeURIComponent(filters.search)}&`;
            if (filters.venueId) url += `venueId=${filters.venueId}&`;
            if (filters.status) url += `status=${filters.status}&`;
            if (filters.date) url += `date=${encodeURIComponent(filters.date)}&`;

            const res = await fetchWithRetry(url);
            if (!res.ok) throw new Error("Failed to fetch bookings");

            const bookings = await res.json();

            // Synchronize full list to window.AppDB if no search filter is applied
            if (!filters.search && (!filters.venueId || filters.venueId === 'all') && (!filters.status || filters.status === 'all') && !filters.date) {
                window.AppDB.write("bookings", bookings);
            }

            return bookings;
        } catch (e) {
            console.error("Failed to fetch bookings from server:", e);
            throw new Error("Unable to retrieve bookings from the server. Please verify the server is running.");
        }
    },

    // Admin Update Booking Status (Approve / Reject / Cancel) (Server synced)
    async updateBookingStatus(id, status) {
        try {
            const res = await fetchWithRetry(`${API_BASE_URL}/api/bookings/${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to update status");
            }

            const data = await res.json();
            window.AppDB.updateBookingStatus(id, status);
            return { success: true, id, status };
        } catch (e) {
            console.error("Failed to update status on server:", e);
            throw new Error(e.message || "Unable to update booking status. Server connection failed.");
        }
    },

    // Admin Get Single Booking by ID (Server synced)
    async fetchBookingById(id) {
        try {
            const res = await fetchWithRetry(`${API_BASE_URL}/api/bookings/${id}`);
            if (!res.ok) throw new Error("Failed to fetch booking details");
            const booking = await res.json();
            return booking;
        } catch (e) {
            console.error("Failed to fetch booking details from server:", e);
            throw new Error("Unable to retrieve booking details. Server connection failed.");
        }
    },

    // Admin Update full Booking details (Server synced)
    async updateBookingDetails(booking) {
        try {
            const res = await fetchWithRetry(`${API_BASE_URL}/api/bookings/${booking.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(booking)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to update booking");
            }

            await res.json();
            window.AppDB.updateBookingDetails(booking);
            return { success: true, booking };
        } catch (e) {
            console.error("Failed to update booking details on server:", e);
            throw new Error("Unable to save booking changes. Server connection failed.");
        }
    },

    // Admin Delete Booking (Server synced)
    async deleteBooking(id) {
        try {
            const res = await fetchWithRetry(`${API_BASE_URL}/api/bookings/${id}`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to delete booking");
            }

            await res.json();
            window.AppDB.deleteBooking(id);
            return { success: true, id };
        } catch (e) {
            console.error("Failed to delete booking on server:", e);
            throw new Error("Unable to delete booking. Server connection failed.");
        }
    },

    // Admin Fetch Analytics Stats & Charts Data (Server synced)
    async fetchAnalytics() {
        // Fetch latest bookings list to sync AppDB local analytics computer cache
        await this.fetchAdminBookings();
        return window.AppDB.getAnalytics();
    },

    // Admin Save Venue (Add or Edit) (Local placeholder)
    saveVenue(venue) {
        return Promise.resolve(window.AppDB.saveVenue(venue));
    },

    // Admin Delete Venue (Local placeholder)
    deleteVenue(id) {
        return Promise.resolve(window.AppDB.deleteVenue(id));
    },

    // Admin Save Addon (Add or Edit) (Local placeholder)
    saveAddon(addon) {
        return Promise.resolve(window.AppDB.saveAddon(addon));
    },

    // Admin Delete Addon (Local placeholder)
    deleteAddon(id) {
        return Promise.resolve(window.AppDB.deleteAddon(id));
    },

    // Admin Slot Availability for a date (Server synced with local fallback)
    async fetchAdminSlots(date, venueId = 'all') {
        try {
            let url = `${API_BASE_URL}/api/admin/slots?date=${encodeURIComponent(date)}`;
            if (venueId && venueId !== 'all') url += `&venueId=${encodeURIComponent(venueId)}`;

            const res = await fetchWithRetry(url);
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to fetch slot availability');
            }
            return await res.json();
        } catch (e) {
            console.warn('[fetchAdminSlots] Backend unreachable, computing from local cache:', e.message);

            // Local fallback: cross-reference AppDB slots vs bookings
            const allSlots = window.AppDB ? window.AppDB.getSlots() : (window.AppDB_SEED_DATA ? window.AppDB_SEED_DATA.slots : []);
            const venues = window.AppDB ? window.AppDB.getVenues() : (window.AppDB_SEED_DATA ? window.AppDB_SEED_DATA.venues : []);
            const bookings = window.AppDB ? window.AppDB.getBookings() : [];

            // Normalise date to DD/MM/YYYY
            let queryDateDMY = date;
            if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                const [y, m, d] = date.split('-');
                queryDateDMY = `${d}/${m}/${y}`;
            }

            const dayBookings = bookings.filter(b =>
                b.date === queryDateDMY && (b.status === 'approved' || b.status === 'pending' || b.status === 'completed')
            );
            const slotBookingMap = {};
            dayBookings.forEach(b => { slotBookingMap[b.slotId] = b; });

            const venueMap = {};
            venues.forEach(v => { venueMap[v.id] = v.name; });

            let slotsToProcess = venueId && venueId !== 'all'
                ? allSlots.filter(s => s.venueId === venueId)
                : allSlots;

            const slots = slotsToProcess.map(slot => {
                const booking = slotBookingMap[slot.id];
                if (booking) {
                    return {
                        slotId: slot.id, venueId: slot.venueId,
                        venueName: venueMap[slot.venueId] || slot.venueId,
                        time: slot.time, label: slot.label,
                        booked: true, status: booking.status,
                        booking: { id: booking.id, name: booking.customerName, phone: booking.customerPhone, occasion: booking.occasion, total: booking.total, bookingStatus: booking.status }
                    };
                }
                return { slotId: slot.id, venueId: slot.venueId, venueName: venueMap[slot.venueId] || slot.venueId, time: slot.time, label: slot.label, booked: false, status: 'available' };
            });

            const bookedCount = slots.filter(s => s.booked).length;
            const totalSlots = slots.length;
            return {
                date: queryDateDMY, queryDate: date, totalSlots,
                booked: bookedCount, available: totalSlots - bookedCount,
                occupancy: totalSlots > 0 ? Math.round((bookedCount / totalSlots) * 100) : 0,
                slots
            };
        }
    }
};

window.AppAPI = API;
