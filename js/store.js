// A2Z CELEBRATIONS - LOCAL DATABASE ENGINE (js/store.js)

const DB_PREFIX = "azc_";

const SEED_DATA = {
    cities: [
        { id: "hyd", name: "Hyderabad", icon: "🕌" }
    ],
    
    venues: [
        { id: "v1", cityId: "hyd", name: "SR Nagar - Screen 1: Garden Theme", price: 1999, capacity: 20, rating: 4.9, image: "assets/images/screen1.jpg", description: "Enjoy a dreamy celebration inside Screen 1 featuring our lush green Garden Theme, beautiful floral creepers, glowing neon signs, and fairy-lit canopy seating." },
        { id: "v2", cityId: "hyd", name: "SR Nagar - Screen 2: Heart Shape Decor", price: 1899, capacity: 20, rating: 4.8, image: "assets/images/screen2.jpg", description: "Indulge in pure romance inside Screen 2 featuring our Heart Shape Decor. Specially tailored with glowing neon hearts, aromatic candles, and low cozy seating." },
        { id: "v3", cityId: "hyd", name: "SR Nagar - Screen 3: Ring Theme", price: 2099, capacity: 20, rating: 4.8, image: "assets/images/screen3.jpg", description: "A premium circular Ring Theme setup in Screen 3. Complete with a majestic metal ring backdrop decorated with gold and black balloon clusters, fairy lights, and welcome board." },
        { id: "v4", cityId: "hyd", name: "SR Nagar - Screen 4: Big Screen Theatre", price: 2499, capacity: 20, rating: 4.9, image: "assets/images/screen4.jpg", description: "Experience cinema like never before in Screen 4's Big Screen Theatre. Features a colossal 180-inch screen, Dolby Atmos surround system, luxury leather recliners, and golden ambient lights." }
    ],
    
    addons: [
        { id: "a1", name: "Fog entry", price: 500, icon: "assets/images/fog_entry.jpg", description: "Dramatic fog entry effect covering the floor." },
        { id: "a2_80", name: "Photography (80 Photos)", price: 800, icon: "assets/images/photography.jpg", description: "Professional photography session (80 photos)." },
        { id: "a2_40", name: "Photography (40 Photos)", price: 500, icon: "assets/images/photography.jpg", description: "Professional photography session (40 photos)." },
        { id: "a3", name: "Rose bouquet", price: 500, icon: "assets/images/rose_bouquet.jpg", description: "Beautiful fresh rose bouquet." },
        { id: "c1_half", name: "Vanilla Cake (1/2 KG)", price: 500, icon: "assets/images/vanilla_cake.jpg", description: "Fresh Vanilla Cake" },
        { id: "c1_full", name: "Vanilla Cake (1 KG)", price: 800, icon: "assets/images/vanilla_cake.jpg", description: "Fresh Vanilla Cake" },
        { id: "c2_half", name: "Mango Cake (1/2 KG)", price: 500, icon: "assets/images/mango_cake.jpg", description: "Fresh Mango Cake" },
        { id: "c2_full", name: "Mango Cake (1 KG)", price: 800, icon: "assets/images/mango_cake.jpg", description: "Fresh Mango Cake" },
        { id: "c3_half", name: "Strawberry Cake (1/2 KG)", price: 500, icon: "🍓", description: "Sweet Strawberry Cake" },
        { id: "c3_full", name: "Strawberry Cake (1 KG)", price: 800, icon: "🍓", description: "Sweet Strawberry Cake" },
        { id: "c4_half", name: "Pineapple Cake (1/2 KG)", price: 500, icon: "🍍", description: "Classic Pineapple Cake" },
        { id: "c4_full", name: "Pineapple Cake (1 KG)", price: 800, icon: "🍍", description: "Classic Pineapple Cake" },
        { id: "c5_half", name: "Black Forest Cake (1/2 KG)", price: 600, icon: "assets/images/black_forest_cake.jpg", description: "Classic Black Forest Cake" },
        { id: "c5_full", name: "Black Forest Cake (1 KG)", price: 900, icon: "assets/images/black_forest_cake.jpg", description: "Classic Black Forest Cake" },
        { id: "c6_half", name: "Black Currant Cake (1/2 KG)", price: 600, icon: "assets/images/black_currant_cake.jpg", description: "Rich Black Currant Cake" },
        { id: "c6_full", name: "Black Currant Cake (1 KG)", price: 900, icon: "assets/images/black_currant_cake.jpg", description: "Rich Black Currant Cake" },
        { id: "c7_half", name: "Butterscotch Cake (1/2 KG)", price: 600, icon: "🎂", description: "Crunchy Butterscotch Cake" },
        { id: "c7_full", name: "Butterscotch Cake (1 KG)", price: 900, icon: "🎂", description: "Crunchy Butterscotch Cake" },
        { id: "c8_half", name: "White Forest Cake (1/2 KG)", price: 600, icon: "assets/images/white_forest_cake.jpg", description: "White Forest Cake" },
        { id: "c8_full", name: "White Forest Cake (1 KG)", price: 900, icon: "assets/images/white_forest_cake.jpg", description: "White Forest Cake" },
        { id: "c9_half", name: "Choco Truffle Cake (1/2 KG)", price: 600, icon: "assets/images/chocolate_cake.jpg", description: "Rich Choco Truffle Cake" },
        { id: "c9_full", name: "Choco Truffle Cake (1 KG)", price: 900, icon: "assets/images/chocolate_cake.jpg", description: "Rich Choco Truffle Cake" },
        { id: "c10_half", name: "Blueberry Cake (1/2 KG)", price: 600, icon: "🫐", description: "Fresh Blueberry Cake" },
        { id: "c10_full", name: "Blueberry Cake (1 KG)", price: 900, icon: "🫐", description: "Fresh Blueberry Cake" },
        { id: "c11_half", name: "Dead by Chocolate (1/2 KG)", price: 700, icon: "assets/images/chocolate_cake.jpg", description: "Extreme Chocolate Cake" },
        { id: "c11_full", name: "Dead by Chocolate (1 KG)", price: 1100, icon: "assets/images/chocolate_cake.jpg", description: "Extreme Chocolate Cake" },
        { id: "c12_half", name: "Rasamalai Almond (1/2 KG)", price: 700, icon: "assets/images/rasamalai_cake.jpg", description: "Fusion Rasamalai Almond Cake" },
        { id: "c12_full", name: "Rasamalai Almond (1 KG)", price: 1100, icon: "assets/images/rasamalai_cake.jpg", description: "Fusion Rasamalai Almond Cake" },
        { id: "c13_half", name: "Red Velvet (1/2 KG)", price: 700, icon: "assets/images/red_velvet_cake.jpg", description: "Classic Red Velvet Cake" },
        { id: "c13_full", name: "Red Velvet (1 KG)", price: 1300, icon: "assets/images/red_velvet_cake.jpg", description: "Classic Red Velvet Cake" },
        { id: "c14_half", name: "Red Velvet Heart Shape (1/2 KG)", price: 800, icon: "assets/images/red_velvet_cake.jpg", description: "Heart Shaped Red Velvet Cake" },
        { id: "c14_full", name: "Red Velvet Heart Shape (1 KG)", price: 1500, icon: "assets/images/red_velvet_cake.jpg", description: "Heart Shaped Red Velvet Cake" },
        { id: "c15_half", name: "Ferro Blast (1/2 KG)", price: 800, icon: "assets/images/chocolate_cake.jpg", description: "Premium Ferro Blast Cake" },
        { id: "c15_full", name: "Ferro Blast (1 KG)", price: 1300, icon: "assets/images/chocolate_cake.jpg", description: "Premium Ferro Blast Cake" },
        { id: "c16_half", name: "Pinata Cake (1/2 KG)", price: 1200, icon: "🎉", description: "Fun Pinata Cake" },
        { id: "c16_full", name: "Pinata Cake (1 KG)", price: 1800, icon: "🎉", description: "Fun Pinata Cake" }
    ],
    
    slots: [
        // Screen 1: Garden Theme (v1)
        { id: "v1_s1", venueId: "v1", time: "09:00 AM - 12:00 PM", label: "Morning Magic" },
        { id: "v1_s2", venueId: "v1", time: "12:30 PM - 03:30 PM", label: "Matinee Joy" },
        { id: "v1_s3", venueId: "v1", time: "04:00 PM - 07:00 PM", label: "Sunset Romance" },
        { id: "v1_s4", venueId: "v1", time: "07:30 PM - 10:30 PM", label: "Starry Night" },
        { id: "v1_s5", venueId: "v1", time: "11:00 PM - 01:00 AM", label: "Midnight Show" },

        // Screen 2: Heart Shape Decor (v2)
        { id: "v2_s1", venueId: "v2", time: "09:15 AM - 12:15 PM", label: "Morning Magic" },
        { id: "v2_s2", venueId: "v2", time: "12:45 PM - 03:45 PM", label: "Matinee Joy" },
        { id: "v2_s3", venueId: "v2", time: "04:15 PM - 07:15 PM", label: "Sunset Romance" },
        { id: "v2_s4", venueId: "v2", time: "07:45 PM - 10:45 PM", label: "Starry Night" },
        { id: "v2_s5", venueId: "v2", time: "11:00 PM - 01:00 AM", label: "Midnight Show" },

        // Screen 3: Ring Theme (v3)
        { id: "v3_s1", venueId: "v3", time: "09:30 AM - 12:30 PM", label: "Morning Magic" },
        { id: "v3_s2", venueId: "v3", time: "01:00 PM - 04:00 PM", label: "Matinee Joy" },
        { id: "v3_s3", venueId: "v3", time: "04:20 PM - 07:20 PM", label: "Sunset Romance" },
        { id: "v3_s4", venueId: "v3", time: "07:45 PM - 10:45 PM", label: "Starry Night" },
        { id: "v3_s5", venueId: "v3", time: "11:00 PM - 01:00 AM", label: "Midnight Show" },

        // Screen 4: Big Screen Theatre (v4)
        { id: "v4_s1", venueId: "v4", time: "09:15 AM - 12:15 PM", label: "Morning Magic" },
        { id: "v4_s2", venueId: "v4", time: "12:45 PM - 03:45 PM", label: "Matinee Joy" },
        { id: "v4_s3", venueId: "v4", time: "04:15 PM - 07:15 PM", label: "Sunset Romance" },
        { id: "v4_s4", venueId: "v4", time: "07:40 PM - 10:40 PM", label: "Starry Night" },
        { id: "v4_s5", venueId: "v4", time: "11:00 PM - 01:00 AM", label: "Midnight Show" }
    ],
    
    coupons: [
        { code: "A2Z15", discountPercent: 15, minPurchase: 1000 },
        { code: "CELEBRATE10", discountPercent: 10, minPurchase: 500 },
        { code: "WELCOME5", discountPercent: 5, minPurchase: 0 }
    ],
    
    bookings: []
};

const DB = {
    // Read list
    read(key) {
        try {
            const item = localStorage.getItem(DB_PREFIX + key);
            return item ? JSON.parse(item) : [];
        } catch (e) {
            console.error("LocalDB Read Error:", e);
            return [];
        }
    },
    
    // Write list
    write(key, data) {
        try {
            localStorage.setItem(DB_PREFIX + key, JSON.stringify(data));
        } catch (e) {
            console.error("LocalDB Write Error:", e);
        }
    },
    
    // Database initialize
    init() {
        // Force rewrite static configurations to ensure 100% synchronization and no legacy cache
        this.write("cities", SEED_DATA.cities);
        this.write("venues", SEED_DATA.venues);
        this.write("addons", SEED_DATA.addons);
        this.write("slots", SEED_DATA.slots);
        this.write("coupons", SEED_DATA.coupons);

        // Only initialize bookings on the very first visit (key doesn't exist yet).
        // This ensures new customer bookings are never wiped on page reload.
        if (localStorage.getItem(DB_PREFIX + "bookings") === null) {
            this.write("bookings", []);
        }
    },

    // Generic Fetchers
    getCities() { return this.read("cities"); },
    getVenues() { return this.read("venues"); },
    getAddons() { return this.read("addons"); },
    getSlots(venueId = null) {
        const slots = this.read("slots");
        return venueId ? slots.filter(s => s.venueId === venueId) : slots;
    },
    getCoupons() { return this.read("coupons"); },
    
    // BOOKINGS CRUD
    getBookings() {
        let bookings = this.read("bookings");
        let updated = false;
        const now = new Date();
        
        bookings.forEach(b => {
            if (b.status === "approved") {
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
            this.write("bookings", bookings);
        }
        
        return bookings.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    
    clearAllBookings() {
        this.write("bookings", []);
    },
    
    saveBooking(booking) {
        const bookings = this.read("bookings");
        bookings.push(booking);
        this.write("bookings", bookings);
        return booking;
    },
    
    updateBookingStatus(id, newStatus) {
        const bookings = this.read("bookings");
        const idx = bookings.findIndex(b => b.id === id);
        if (idx !== -1) {
            bookings[idx].status = newStatus;
            this.write("bookings", bookings);
            return true;
        }
        return false;
    },
    
    updateBookingDetails(updatedBooking) {
        const bookings = this.read("bookings");
        const idx = bookings.findIndex(b => b.id === updatedBooking.id);
        if (idx !== -1) {
            bookings[idx] = { ...bookings[idx], ...updatedBooking };
            this.write("bookings", bookings);
            return true;
        }
        return false;
    },
    
    deleteBooking(id) {
        const bookings = this.read("bookings");
        const filtered = bookings.filter(b => b.id !== id);
        this.write("bookings", filtered);
        return true;
    },
    
    // VENUES CRUD
    saveVenue(venue) {
        const venues = this.read("venues");
        if (venue.id) {
            const idx = venues.findIndex(v => v.id === venue.id);
            if (idx !== -1) {
                venues[idx] = { ...venues[idx], ...venue };
            }
        } else {
            venue.id = "v" + Date.now();
            venues.push(venue);
        }
        this.write("venues", venues);
        return venue;
    },
    
    deleteVenue(id) {
        const venues = this.read("venues");
        const filtered = venues.filter(v => v.id !== id);
        this.write("venues", filtered);
        return true;
    },
    
    // ADDONS CRUD
    saveAddon(addon) {
        const addons = this.read("addons");
        if (addon.id) {
            const idx = addons.findIndex(a => a.id === addon.id);
            if (idx !== -1) {
                addons[idx] = { ...addons[idx], ...addon };
            }
        } else {
            addon.id = "a" + Date.now();
            addons.push(addon);
        }
        this.write("addons", addons);
        return addon;
    },
    
    deleteAddon(id) {
        const addons = this.read("addons");
        const filtered = addons.filter(a => a.id !== id);
        this.write("addons", filtered);
        return true;
    },

    // Check Slot availability on Date
    isSlotBooked(venueId, date, slotId) {
        const bookings = this.getBookings();
        return bookings.some(b => 
            b.venueId === venueId && 
            b.date === date && 
            b.slotId === slotId && 
            (b.status === "approved" || b.status === "pending")
        );
    },
    
    // ANALYTICS COMPUTATIONS
    getAnalytics() {
        const bookings = this.getBookings();
        const venues = this.getVenues();
        
        let totalRevenue = 0;
        let approvedCount = 0;
        let pendingCount = 0;
        
        bookings.forEach(b => {
            if (b.status === "approved" || b.status === "completed") {
                totalRevenue += b.total;
                if (b.status === "approved") approvedCount++;
            } else if (b.status === "pending") {
                pendingCount++;
            }
        });
        
        // Venue Popularity (Booking counts per venue)
        const venueChartData = {};
        venues.forEach(v => { venueChartData[v.name] = 0; });
        bookings.forEach(b => {
            if (b.status === "approved" && venueChartData[b.venueName] !== undefined) {
                venueChartData[b.venueName]++;
            }
        });
        
        // Monthly booking trends (last 6 months simulation)
        // Group by month
        const trends = {};
        bookings.forEach(b => {
            if (b.status === "approved" || b.status === "completed") {
                const parseDateString = (str) => {
                    if (!str) return new Date();
                    if (str.includes("/")) {
                        const parts = str.split("/");
                        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                    }
                    return new Date(str);
                };
                const dateObj = parseDateString(b.date);
                const monthYear = dateObj.toLocaleString('default', { month: 'short' }) + ' ' + dateObj.getFullYear();
                trends[monthYear] = (trends[monthYear] || 0) + b.total;
            }
        });
        
        return {
            totalBookings: bookings.length,
            approvedBookings: approvedCount,
            pendingBookings: pendingCount,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            venuePopularity: venueChartData,
            revenueTrends: trends
        };
    }
};

// Auto Initialize
DB.init();
window.AppDB = DB;
window.AppDB_SEED_DATA = SEED_DATA;
