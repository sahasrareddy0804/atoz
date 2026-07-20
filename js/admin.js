class AdminDashboard {
    constructor() {
        this.currentView = "dashboard";
    }

    init() {
        this.bindEvents();
        this.checkAuthState();
    }

    checkAuthState() {
        if (window.AppAPI.checkAdminAuth()) {
            this.showDashboardPanel();
        } else {
            this.showLoginPanel();
        }
    }

    showLoginPanel() {
        document.getElementById("admin-login-section").style.display = "flex";
        document.getElementById("admin-panel-section").style.display = "none";
    }

    showDashboardPanel() {
        document.getElementById("admin-login-section").style.display = "none";
        document.getElementById("admin-panel-section").style.display = "flex";
        this.switchAdminView("dashboard");
    }

    bindEvents() {
        // Login
        const loginForm = document.getElementById("admin-login-form");
        if (loginForm) {
            loginForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const user = document.getElementById("admin-user").value.trim();
                const pass = document.getElementById("admin-pass").value;
                window.AppMain.showLoader(true);
                try {
                    await window.AppAPI.adminLogin(user, pass);
                    window.AppMain.showToast("Login successful");
                    this.showDashboardPanel();
                } catch (err) {
                    window.AppMain.showToast(err.message, "error");
                } finally {
                    window.AppMain.showLoader(false);
                }
            });
        }

        // Logout
        const logoutBtn = document.getElementById("admin-logout-btn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", async () => {
                await window.AppAPI.adminLogout();
                this.showLoginPanel();
            });
        }

        // Sidebar Navigation (includes submenu links if they have data-view)
        document.querySelectorAll("[data-view]").forEach(link => {
            link.addEventListener("click", (e) => {
                // If it's a main sidebar link, manage active state
                if (link.classList.contains("sidebar-link")) {
                    document.querySelectorAll(".sidebar-link").forEach(l => l.classList.remove("active"));
                    link.classList.add("active");
                }
                const view = link.getAttribute("data-view");
                this.switchAdminView(view);
                
                // Close sidebar on mobile after view selection
                const sidebar = document.getElementById("admin-sidebar");
                if (sidebar) {
                    sidebar.classList.remove("mobile-open");
                }
            });
        });

        // Mobile menu toggle
        const mobileBtn = document.getElementById("admin-mobile-menu-btn");
        const sidebar = document.getElementById("admin-sidebar");
        if (mobileBtn && sidebar) {
            mobileBtn.addEventListener("click", (e) => {
                e.stopPropagation(); // Prevent immediate closing from document click
                sidebar.classList.toggle("mobile-open");
            });

            // Close sidebar when clicking outside on mobile
            document.addEventListener("click", (e) => {
                if (window.innerWidth <= 768) {
                    if (!sidebar.contains(e.target) && !mobileBtn.contains(e.target) && sidebar.classList.contains("mobile-open")) {
                        sidebar.classList.remove("mobile-open");
                    }
                }
            });
        }

        // Profile Form
        const profileForm = document.getElementById("update-credentials-form");
        if (profileForm) {
            profileForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const newUser = document.getElementById("new-admin-user").value.trim();
                const newPass = document.getElementById("new-admin-pass").value;
                try {
                    await window.AppAPI.updateAdminCredentials(newUser, newPass);
                    window.AppMain.showToast("Credentials updated successfully. Please login again.");
                    await window.AppAPI.adminLogout();
                    this.showLoginPanel();
                } catch (err) {
                    window.AppMain.showToast(err.message, "error");
                }
            });
        }
    }

    switchAdminView(view) {
        this.currentView = view;
        document.querySelectorAll(".admin-view-panel").forEach(p => p.classList.remove("active"));
        const activePanel = document.getElementById(`view-${view}`);
        if (activePanel) activePanel.classList.add("active");

        if (view === "dashboard") this.loadDashboardStats();
        if (view === "payments") this.loadManualPayments();
        if (view === "bookings") this.loadCustomerBookings();
        if (view === "slot-availability") this.initSlotAvailabilityView();

        // Start auto-refresh for live views
        this.startAutoRefresh(view);
    }

    startAutoRefresh(view) {
        // Clear any existing interval
        if (this._autoRefreshInterval) {
            clearInterval(this._autoRefreshInterval);
            this._autoRefreshInterval = null;
        }
        // Auto-refresh payments and bookings every 30 seconds
        if (view === "payments" || view === "bookings" || view === "dashboard" || view === "slot-availability") {
            this._autoRefreshInterval = setInterval(() => {
                if (this.currentView === "payments") this.loadManualPayments();
                else if (this.currentView === "bookings") this.loadCustomerBookings();
                else if (this.currentView === "dashboard") this.loadDashboardStats();
                else if (this.currentView === "slot-availability") this.refreshSlotView();
            }, 30000);
        }
    }

    async loadDashboardStats() {
        try {
            const monthSelect = document.getElementById("filter-month");
            const yearSelect = document.getElementById("filter-year");

            // Initialize defaults and listeners if not already bound
            if (monthSelect && !monthSelect.dataset.listenerBound) {
                monthSelect.value = new Date().getMonth();
                monthSelect.addEventListener("change", () => this.loadDashboardStats());
                monthSelect.dataset.listenerBound = "true";
            }
            if (yearSelect && !yearSelect.dataset.listenerBound) {
                yearSelect.value = new Date().getFullYear();
                yearSelect.addEventListener("change", () => this.loadDashboardStats());
                yearSelect.dataset.listenerBound = "true";
            }

            const selectedMonth = monthSelect ? parseInt(monthSelect.value, 10) : new Date().getMonth();
            const selectedYear = yearSelect ? parseInt(yearSelect.value, 10) : new Date().getFullYear();

            const bookings = await window.AppAPI.fetchAdminBookings();
            
            const parseDateDMY = (dateStr) => {
                if (!dateStr) return null;
                const parts = dateStr.split('/');
                if (parts.length !== 3) return null;
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1; // 0-indexed month
                const year = parseInt(parts[2], 10);
                return new Date(year, month, day);
            };

            const today = new Date();

            // Start of current calendar week (Sunday 00:00:00)
            const getStartOfWeek = (d) => {
                const date = new Date(d);
                const day = date.getDay();
                const diff = date.getDate() - day;
                return new Date(date.setDate(diff));
            };
            const startOfCurrentWeek = getStartOfWeek(today);
            startOfCurrentWeek.setHours(0, 0, 0, 0);
            
            const endOfCurrentWeek = new Date(startOfCurrentWeek);
            endOfCurrentWeek.setDate(endOfCurrentWeek.getDate() + 7);

            let currentWeeklyRevenue = 0;
            let filteredMonthlyRevenue = 0;
            let filteredYearlyRevenue = 0;
            let totalRevenue = 0;
            let totalBookingsCount = 0;

            // 5 weekly revenue buckets for the selected month/year
            // Week 1: 1-7, Week 2: 8-14, Week 3: 15-21, Week 4: 22-28, Week 5: 29+
            const weeklyBuckets = [0, 0, 0, 0, 0];

            bookings.forEach(b => {
                if (b.status === "approved" || b.status === "completed") {
                    const bookingTotal = typeof b.total === 'number' ? b.total : parseFloat(b.total || 0);
                    totalRevenue += bookingTotal;
                    totalBookingsCount++;

                    const bookingDate = parseDateDMY(b.date);
                    if (bookingDate) {
                        // 1. Current Live Week calculation for the top card
                        if (bookingDate >= startOfCurrentWeek && bookingDate < endOfCurrentWeek) {
                            currentWeeklyRevenue += bookingTotal;
                        }

                        const bMonth = bookingDate.getMonth();
                        const bYear = bookingDate.getFullYear();
                        const bDay = bookingDate.getDate();

                        // 2. Filtered Month/Year calculations
                        if (bYear === selectedYear) {
                            filteredYearlyRevenue += bookingTotal;

                            if (bMonth === selectedMonth) {
                                filteredMonthlyRevenue += bookingTotal;

                                // Distribute into weekly breakdown buckets
                                if (bDay <= 7) {
                                    weeklyBuckets[0] += bookingTotal;
                                } else if (bDay <= 14) {
                                    weeklyBuckets[1] += bookingTotal;
                                } else if (bDay <= 21) {
                                    weeklyBuckets[2] += bookingTotal;
                                } else if (bDay <= 28) {
                                    weeklyBuckets[3] += bookingTotal;
                                } else {
                                    weeklyBuckets[4] += bookingTotal;
                                }
                            }
                        }
                    }
                }
            });

            // Update stats cards in UI
            document.getElementById("stat-weekly-revenue").textContent = `₹${currentWeeklyRevenue.toLocaleString()}`;
            document.getElementById("stat-monthly-revenue").textContent = `₹${filteredMonthlyRevenue.toLocaleString()}`;
            document.getElementById("stat-yearly-revenue").textContent = `₹${filteredYearlyRevenue.toLocaleString()}`;
            document.getElementById("stat-total-revenue").textContent = `₹${totalRevenue.toLocaleString()}`;
            document.getElementById("stat-total-bookings").textContent = bookings.length;

            // Determine if we need to display Week 5
            const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
            const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
            const showWeek5 = daysInMonth > 28;

            // Update weekly breakdown table
            const tbody = document.getElementById("weekly-breakdown-tbody");
            if (tbody) {
                let tableHtml = `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 10px 0; color: #4a4a68;">Week 1 (1-7)</td>
                        <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #12121f;">₹${weeklyBuckets[0].toLocaleString()}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 10px 0; color: #4a4a68;">Week 2 (8-14)</td>
                        <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #12121f;">₹${weeklyBuckets[1].toLocaleString()}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 10px 0; color: #4a4a68;">Week 3 (15-21)</td>
                        <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #12121f;">₹${weeklyBuckets[2].toLocaleString()}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 10px 0; color: #4a4a68;">Week 4 (22-28)</td>
                        <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #12121f;">₹${weeklyBuckets[3].toLocaleString()}</td>
                    </tr>
                `;
                if (showWeek5) {
                    tableHtml += `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 0; color: #4a4a68;">Week 5 (29-${daysInMonth})</td>
                            <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #12121f;">₹${weeklyBuckets[4].toLocaleString()}</td>
                        </tr>
                    `;
                }
                tbody.innerHTML = tableHtml;
            }

            // Update Chart.js canvas
            const ctx = document.getElementById("revenueChart");
            if (ctx) {
                if (this.revenueChartInstance) {
                    this.revenueChartInstance.destroy();
                }

                const labels = ["Week 1", "Week 2", "Week 3", "Week 4"];
                const chartData = [weeklyBuckets[0], weeklyBuckets[1], weeklyBuckets[2], weeklyBuckets[3]];
                if (showWeek5) {
                    labels.push("Week 5");
                    chartData.push(weeklyBuckets[4]);
                }

                this.revenueChartInstance = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Revenue',
                            data: chartData,
                            backgroundColor: 'rgba(124, 58, 237, 0.75)',
                            borderColor: '#7c3aed',
                            borderWidth: 1,
                            borderRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: {
                                    color: '#f3f4f6'
                                },
                                ticks: {
                                    callback: function(value) {
                                        return '₹' + value.toLocaleString();
                                    },
                                    color: '#8080a3',
                                    font: {
                                        family: 'Outfit'
                                    }
                                }
                            },
                            x: {
                                grid: {
                                    display: false
                                },
                                ticks: {
                                    color: '#8080a3',
                                    font: {
                                        family: 'Outfit'
                                    }
                                }
                            }
                        }
                    }
                });
            }

        } catch (err) {
            console.error("Error loading dashboard stats:", err);
        }
    }

    async loadManualPayments() {
        const tbody = document.getElementById("payments-table-body");
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Loading...</td></tr>`;
        try {
            const bookings = await window.AppAPI.fetchAdminBookings();
            // Show pending approvals
            const pending = bookings.filter(b => b.status === 'pending');

            // Update pending count badge
            const countEl = document.getElementById("payments-pending-count");
            if (countEl) countEl.textContent = pending.length > 0 ? `(${pending.length} pending)` : '';

            if (pending.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#666;">No pending payments to approve.</td></tr>`;
                return;
            }
            tbody.innerHTML = pending.map(b => `
                <tr>
                    <td><button class="receipt-btn" onclick="window.AppAdminPanel.viewReceipt('${b.id}')">👁️</button></td>
                    <td>${b.id}</td>
                    <td>
                        <div style="font-size:0.85rem;"><strong>Event:</strong> ${b.date} ${b.slotTime}</div>
                        <div style="font-size:0.75rem; color:#666;"><strong>Paid:</strong> ${new Date(b.createdAt).toLocaleString()}</div>
                    </td>
                    <td>${b.customerName}</td>
                    <td>₹${b.total}</td>
                    <td>
                        <button class="action-btn btn-approve" onclick="window.AppAdminPanel.approvePayment('${b.id}', true)">✓</button>
                        <button class="action-btn btn-reject" onclick="window.AppAdminPanel.rejectPayment('${b.id}')">✗</button>
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="6">Error loading data.</td></tr>`;
        }
    }

    async loadCustomerBookings() {
        const tbody = document.getElementById("bookings-table-body");
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>`;
        try {
            const bookings = await window.AppAPI.fetchAdminBookings();

            // Store all bookings for search filtering
            this._allBookings = bookings;

            // Update total count
            const countEl = document.getElementById("bookings-total-count");
            if (countEl) countEl.textContent = `${bookings.length} total`;

            // Bind live search with simultaneous Date Filter
            const searchInput = document.getElementById("booking-search");
            const dateSearchInput = document.getElementById("booking-date-search");
            
            const performFilter = () => {
                const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : "";
                const dateVal = dateSearchInput ? dateSearchInput.value.trim() : "";
                
                let filtered = this._allBookings || [];
                
                if (searchVal) {
                    filtered = filtered.filter(b =>
                        (b.id || '').toLowerCase().includes(searchVal) ||
                        (b.customerName || '').toLowerCase().includes(searchVal) ||
                        (b.customerPhone || '').toLowerCase().includes(searchVal) ||
                        (b.status || '').toLowerCase().includes(searchVal)
                    );
                }
                
                if (dateVal) {
                    const targetParts = dateVal.split("-"); // [YYYY, MM, DD]
                    if (targetParts.length === 3) {
                        const targetDay = parseInt(targetParts[2], 10);
                        const targetMonth = parseInt(targetParts[1], 10);
                        const targetYear = parseInt(targetParts[0], 10);

                        filtered = filtered.filter(b => {
                            const dateStr = b.date || '';
                            const currentParts = dateStr.trim().split(/[\/\-]/);
                            if (currentParts.length === 3) {
                                let day, month, year;
                                // If the first part is 4 digits, it's YYYY-MM-DD
                                if (currentParts[0].length === 4) {
                                    year = parseInt(currentParts[0], 10);
                                    month = parseInt(currentParts[1], 10);
                                    day = parseInt(currentParts[2], 10);
                                } else {
                                    // Otherwise it's DD/MM/YYYY
                                    day = parseInt(currentParts[0], 10);
                                    month = parseInt(currentParts[1], 10);
                                    year = parseInt(currentParts[2], 10);
                                }
                                return day === targetDay &&
                                       month === targetMonth &&
                                       year === targetYear;
                            }
                            return false;
                        });
                    }
                }
                
                this.renderBookingsTable(filtered);
            };

            // Bind event listeners only once (avoid duplicate listeners on refresh)
            if (searchInput && !searchInput._bound) {
                searchInput._bound = true;
                searchInput.addEventListener("input", () => {
                    // Always read from latest _allBookings
                    const searchV = searchInput.value.toLowerCase().trim();
                    const dateV = dateSearchInput ? dateSearchInput.value.trim() : "";
                    let f = this._allBookings || [];
                    if (searchV) f = f.filter(b =>
                        (b.id || '').toLowerCase().includes(searchV) ||
                        (b.customerName || '').toLowerCase().includes(searchV) ||
                        (b.customerPhone || '').toLowerCase().includes(searchV) ||
                        (b.status || '').toLowerCase().includes(searchV)
                    );
                    if (dateV) {
                        const tp = dateV.split("-");
                        if (tp.length === 3) {
                            const td = parseInt(tp[2], 10), tm = parseInt(tp[1], 10), ty = parseInt(tp[0], 10);
                            f = f.filter(b => {
                                const cp = (b.date || '').trim().split(/[\/\-]/);
                                if (cp.length !== 3) return false;
                                const [d, m, y] = cp[0].length === 4
                                    ? [parseInt(cp[2],10), parseInt(cp[1],10), parseInt(cp[0],10)]
                                    : [parseInt(cp[0],10), parseInt(cp[1],10), parseInt(cp[2],10)];
                                return d === td && m === tm && y === ty;
                            });
                        }
                    }
                    this.renderBookingsTable(f);
                });
            }
            
            if (dateSearchInput && !dateSearchInput._bound) {
                dateSearchInput._bound = true;
                dateSearchInput.addEventListener("input", () => {
                    const searchV = searchInput ? searchInput.value.toLowerCase().trim() : "";
                    const dateV = dateSearchInput.value.trim();
                    let f = this._allBookings || [];
                    if (searchV) f = f.filter(b =>
                        (b.id || '').toLowerCase().includes(searchV) ||
                        (b.customerName || '').toLowerCase().includes(searchV) ||
                        (b.customerPhone || '').toLowerCase().includes(searchV) ||
                        (b.status || '').toLowerCase().includes(searchV)
                    );
                    if (dateV) {
                        const tp = dateV.split("-");
                        if (tp.length === 3) {
                            const td = parseInt(tp[2], 10), tm = parseInt(tp[1], 10), ty = parseInt(tp[0], 10);
                            f = f.filter(b => {
                                const cp = (b.date || '').trim().split(/[\/\-]/);
                                if (cp.length !== 3) return false;
                                const [d, m, y] = cp[0].length === 4
                                    ? [parseInt(cp[2],10), parseInt(cp[1],10), parseInt(cp[0],10)]
                                    : [parseInt(cp[0],10), parseInt(cp[1],10), parseInt(cp[2],10)];
                                return d === td && m === tm && y === ty;
                            });
                        }
                    }
                    this.renderBookingsTable(f);
                });
                dateSearchInput.addEventListener("change", () => dateSearchInput.dispatchEvent(new Event("input")));
            }

            // Apply filter immediately to respect any pre-filled inputs or active filter on auto-refresh
            performFilter();
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="5">Error loading data.</td></tr>`;
        }
    }


    renderBookingsTable(bookings) {
        const tbody = document.getElementById("bookings-table-body");
        if (!tbody) return;
        if (bookings.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#666;">No bookings found.</td></tr>`;
            return;
        }
        tbody.innerHTML = bookings.map(b => {
            let statusColor = '#f59e0b'; // pending
            if (b.status === 'approved') statusColor = '#10b981';
            if (b.status === 'rejected') statusColor = '#ef4444';
            if (b.status === 'cancelled') statusColor = '#6b7280';
            if (b.status === 'completed') statusColor = '#3b82f6';

            return `
            <tr>
                <td><button class="receipt-btn" onclick="window.AppAdminPanel.viewBookingDetails('${b.id}')">👁️</button></td>
                <td style="font-size:0.85rem;">${b.id}</td>
                <td>
                    <div style="font-size:0.85rem;"><strong>Event:</strong> ${b.date} ${b.slotTime}</div>
                    <div style="font-size:0.75rem; color:#666;"><strong>Booked:</strong> ${new Date(b.createdAt).toLocaleString()}</div>
                </td>
                <td>${b.customerName}<br><span style="font-size:0.75rem;color:#888;">${b.customerPhone || ''}</span></td>
                <td><span style="background:${statusColor}; color:white; padding:4px 8px; border-radius:4px; font-size:0.8rem;">${b.status.toUpperCase()}</span></td>
            </tr>`;
        }).join('');
    }

    async approvePayment(id, fromTable = false) {
        if (fromTable) {
            alert("Please verify the payment screenshot first by clicking the 👁️ (View) button!");
            this.viewReceipt(id);
            return;
        }

        const allBookings = window.AppDB.getBookings();
        const b = allBookings.find(item => item.id === id);

        if (b) {
            // Check if there is another APPROVED booking for the same slot
            const alreadyApproved = allBookings.some(item => 
                item.id !== b.id &&
                item.venueId === b.venueId &&
                item.date === b.date &&
                item.slotId === b.slotId &&
                item.status === "approved"
            );
            if (alreadyApproved) {
                alert(`Error: This slot is already booked and approved for another customer. You cannot confirm order ${id}.`);
                return;
            }
        }

        if (!confirm(`Are you sure you want to CONFIRM order ${id}? Did you verify the payment screenshot?`)) {
            return;
        }

        if (b && b.customerPhone) {
            const phone = b.customerPhone.replace(/[^0-9]/g, '');
            const message =
                `*A to Z Celebrations - Booking Confirmed!* %0A%0A` +
                `Hi ${b.customerName},%0A%0A` +
                `Your booking is successfully confirmed! 🎉%0A%0A` +
                `*Booking ID:* ${b.id}%0A` +
                `*Venue:* ${b.venueName}%0A` +
                `*Date:* ${b.date}%0A` +
                `*Time Slot:* ${b.slotTime}%0A` +
                `*Total Amount:* Rs. ${b.total}%0A` +
                `*Advance Paid:* Rs. 500%0A` +
                `*Balance Amount:* Rs. ${b.total - 500}%0A%0A` +
                `We look forward to hosting your ${b.occasion}!%0A` +
                `For any queries, please reply to this message.`;
            // Open WhatsApp immediately — before any await to bypass popup blockers
            window.open(`https://wa.me/91${phone}?text=${message}`, '_blank');
        }

        window.AppMain.showLoader(true);
        try {
            await window.AppAPI.updateBookingStatus(id, "approved");
            window.AppMain.showToast(`Booking ${id} confirmed ✓ — WhatsApp opened`, "success");
            this.loadManualPayments();
            document.getElementById("modal-receipt").style.display = "none";
        } catch(err) {
            window.AppMain.showToast(err.message, "error");
        } finally {
            window.AppMain.showLoader(false);
        }
    }

    async rejectPayment(id) {
        if (!confirm(`Are you sure you want to REJECT order ${id}? This action cannot be undone.`)) {
            return;
        }
        window.AppMain.showLoader(true);
        try {
            await window.AppAPI.updateBookingStatus(id, "rejected");
            window.AppMain.showToast(`Booking ${id} rejected`);
            this.loadManualPayments();
            document.getElementById("modal-receipt").style.display = "none";
        } catch(err) {
            window.AppMain.showToast(err.message, "error");
        } finally {
            window.AppMain.showLoader(false);
        }
    }

    async viewReceipt(id) {
        window.AppMain.showLoader(true);
        try {
            const b = await window.AppAPI.fetchBookingById(id);
            if (!b) return;
            
            const modal = document.getElementById("modal-receipt");
            const content = document.getElementById("receipt-content");
            
            // The image uploaded by the user is stored as Base64 in b.paymentScreenshot
            const screenshotHtml = b.paymentScreenshot
                ? `<img src="${b.paymentScreenshot}" class="screenshot-img" alt="Payment Receipt"
                       style="max-height: 60vh; object-fit: contain; width: 100%;
                              border: 1px solid #ccc; border-radius: 8px; margin-top: 10px;
                              display: block;">`
                : `<div style="margin-top: 12px; padding: 24px; background: #f9f9f9; border: 2px dashed #ddd;
                              border-radius: 8px; text-align: center; color: #aaa;">
                       <div style="font-size: 2.5rem; margin-bottom: 8px;">🖼️</div>
                       <p style="margin: 0; font-size: 0.9rem; font-weight: 600;">Payment Screenshot Not Uploaded</p>
                       <p style="margin: 4px 0 0; font-size: 0.8rem;">The customer did not attach a payment screenshot.</p>
                   </div>`;

            content.innerHTML = `
                <p><strong>Booking ID:</strong> ${b.id}</p>
                <p><strong>Payment Time:</strong> ${new Date(b.createdAt).toLocaleString()}</p>
                <p><strong>Amount:</strong> ₹${b.total}</p>
                ${screenshotHtml}
            `;

            const actionsDiv = document.getElementById("receipt-actions");
            if (b.status === 'pending') {
                actionsDiv.style.display = "flex";
                const btnApprove = document.getElementById("modal-btn-approve");
                const btnReject = document.getElementById("modal-btn-reject");
                
                // Remove old event listeners by cloning
                const newBtnApprove = btnApprove.cloneNode(true);
                const newBtnReject = btnReject.cloneNode(true);
                btnApprove.parentNode.replaceChild(newBtnApprove, btnApprove);
                btnReject.parentNode.replaceChild(newBtnReject, btnReject);

                newBtnApprove.addEventListener("click", () => this.approvePayment(id));
                newBtnReject.addEventListener("click", () => this.rejectPayment(id));
            } else {
                actionsDiv.style.display = "none";
            }
            
            modal.style.display = "flex";
        } catch(err) {
            window.AppMain.showToast(err.message, "error");
        } finally {
            window.AppMain.showLoader(false);
        }
    }

    async viewBookingDetails(id) {
        window.AppMain.showLoader(true);
        try {
            const b = await window.AppAPI.fetchBookingById(id);
            if (!b) return;

            const modal = document.getElementById("modal-booking-details");
            const content = document.getElementById("booking-details-content");
            const btnDownload = document.getElementById("btn-download-receipt");
            
            let cakeReq = "None";
            let otherAddons = [];
            if (b.addons && b.addons.length > 0) {
                b.addons.forEach(a => {
                    if (a.name.toLowerCase().includes("cake")) {
                        cakeReq = a.name;
                    } else {
                        otherAddons.push(a.name);
                    }
                });
            }
            let addonReq = otherAddons.length > 0 ? otherAddons.join(", ") : "None";

            content.innerHTML = `
                <table style="width:100%; border-collapse: collapse; margin-top: 10px; font-size: 0.9rem;">
                    <thead>
                        <tr style="background: #f5f5f5;">
                            <th style="text-align:left; padding:10px; border:1px solid #ddd; width:40%; color: #555;">Field</th>
                            <th style="text-align:left; padding:10px; border:1px solid #ddd; color: #555;">Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="2" style="padding:10px; border:1px solid #ddd; color:#666; font-size: 0.85rem;">
                                <strong>${b.venueName}</strong><br>
                                194a, 4th cross, Kalyan Nagar Chowrasta, Vengal Rao Nagar Rd,<br>
                                Kalyan Nagar Phase 1, Hyderabad, Telangana 500045 (8123496627)
                            </td>
                        </tr>
                        <tr><td style="padding:10px; border:1px solid #ddd; font-weight:bold; color:#555;">Booked on</td><td style="padding:10px; border:1px solid #ddd; color:#666;">${new Date(b.createdAt).toLocaleString()}</td></tr>
                        <tr><td style="padding:10px; border:1px solid #ddd; font-weight:bold; color:#555;">Name</td><td style="padding:10px; border:1px solid #ddd; color:#666;">${b.customerName}</td></tr>
                        <tr><td style="padding:10px; border:1px solid #ddd; font-weight:bold; color:#555;">Nick Name</td><td style="padding:10px; border:1px solid #ddd; color:#666;">${b.ledNickName || 'N/A'}</td></tr>
                        <tr><td style="padding:10px; border:1px solid #ddd; font-weight:bold; color:#555;">Phone</td><td style="padding:10px; border:1px solid #ddd; color:#666;">${b.customerPhone}</td></tr>
                        <tr><td style="padding:10px; border:1px solid #ddd; font-weight:bold; color:#555;">Email</td><td style="padding:10px; border:1px solid #ddd; color:#666;">${b.customerEmail}</td></tr>
                        <tr><td style="padding:10px; border:1px solid #ddd; font-weight:bold; color:#555;">Event Date</td><td style="padding:10px; border:1px solid #ddd; color:#666;">${b.date}</td></tr>
                        <tr><td style="padding:10px; border:1px solid #ddd; font-weight:bold; color:#555;">Timing</td><td style="padding:10px; border:1px solid #ddd; color:#666;">${b.slotTime}</td></tr>
                        <tr><td style="padding:10px; border:1px solid #ddd; font-weight:bold; color:#555;">Booking Type</td><td style="padding:10px; border:1px solid #ddd; color:#666;">${(() => {
                            if (b.bookingType === "standard") {
                                return "Standard";
                            } else if (b.bookingType === "combo") {
                                const comboMap = {
                                    "couple-combo": "Together Combo",
                                    "min-5-combo": "Mini Combo",
                                    "party-combo": "Party Pack",
                                    "family-combo": "Family Combo"
                                };
                                return `Combo (${comboMap[b.bookingComboId] || "Combo package"})`;
                            }
                            return "Standard";
                        })()}</td></tr>
                        <tr><td style="padding:10px; border:1px solid #ddd; font-weight:bold; color:#555;">Decoration Requirement</td><td style="padding:10px; border:1px solid #ddd; color:#666;">${b.occasion}</td></tr>
                        <tr><td style="padding:10px; border:1px solid #ddd; font-weight:bold; color:#555;">Cake Requirement</td><td style="padding:10px; border:1px solid #ddd; color:#666;">${cakeReq}</td></tr>
                        <tr><td style="padding:10px; border:1px solid #ddd; font-weight:bold; color:#555;">Add-on Requirement</td><td style="padding:10px; border:1px solid #ddd; color:#666;">${addonReq}</td></tr>
                        <tr><td style="padding:10px; border:1px solid #ddd; font-weight:bold; color:#555;">Number Of People</td><td style="padding:10px; border:1px solid #ddd; color:#666;">${(() => {
                            if (b.bookingType === "standard") {
                                return b.personCount ? b.personCount.toString() : "Not specified";
                            } else if (b.bookingType === "combo") {
                                const comboMap = {
                                    "couple-combo": "2",
                                    "min-5-combo": "5",
                                    "party-combo": "8",
                                    "family-combo": "10"
                                };
                                return comboMap[b.bookingComboId] || "Combo package";
                            }
                            return "Not specified";
                        })()}</td></tr>
                        <tr><td style="padding:10px; border:1px solid #ddd; font-weight:bold; color:#555;">Total Amount</td><td style="padding:10px; border:1px solid #ddd; color:#666;">${b.total}</td></tr>
                        <tr><td style="padding:10px; border:1px solid #ddd; font-weight:bold; color:#555;">Paid Amount</td><td style="padding:10px; border:1px solid #ddd; color:#666;">500</td></tr>
                        <tr><td style="padding:10px; border:1px solid #ddd; font-weight:bold; color:#555;">Balance Amount</td><td style="padding:10px; border:1px solid #ddd; color:#666;">${b.total - 500}</td></tr>
                        <tr><td style="padding:10px; border:1px solid #ddd; font-weight:bold; color:#555;">Payment Status</td><td style="padding:10px; border:1px solid #ddd; color:#666; text-transform: capitalize;">${b.status === 'approved' ? 'booked' : b.status}</td></tr>
                        <tr><td style="padding:10px; border:1px solid #ddd; font-weight:bold; color:#555;">Booking ID</td><td style="padding:10px; border:1px solid #ddd; color:#666;">${b.id}</td></tr>
                        <tr><td style="padding:10px; border:1px solid #ddd; font-weight:bold; color:#555;">Payment ID</td><td style="padding:10px; border:1px solid #ddd; color:#666;"></td></tr>
                    </tbody>
                </table>
                <div style="margin-top: 15px;">
                    <strong style="color:#555; display:block; margin-bottom:8px;">Payment Screenshot:</strong>
                    ${b.paymentScreenshot
                        ? `<img src="${b.paymentScreenshot}" alt="Payment Screenshot"
                               style="max-height: 250px; object-fit: contain; width: 100%;
                                      border: 1px solid #ccc; border-radius: 6px; display: block;">`
                        : `<div style="padding: 20px; background: #f9f9f9; border: 2px dashed #ddd;
                                      border-radius: 6px; text-align: center; color: #aaa;">
                               <div style="font-size: 2rem; margin-bottom: 6px;">🖼️</div>
                               <p style="margin: 0; font-size: 0.85rem; font-weight: 600;">No Screenshot Uploaded</p>
                           </div>`
                    }
                </div>
            `;

            const btnCancel = document.getElementById("btn-cancel-booking");
            const btnWhatsapp = document.getElementById("btn-whatsapp-receipt");

            // Setup PDF Download Button
            if (b.status === 'approved') {
                btnDownload.style.display = "block";
                btnDownload.onclick = () => {
                    if (window.AppExports && window.AppExports.downloadReceiptPDF) {
                        window.AppExports.downloadReceiptPDF(b);
                    } else {
                        alert("Export engine not loaded yet.");
                    }
                };
            } else {
                btnDownload.style.display = "none";
            }

            // Setup WhatsApp Send Button
            if (b.status === 'approved' && b.customerPhone) {
                btnWhatsapp.style.display = "block";
                btnWhatsapp.onclick = () => {
                    const phone = b.customerPhone.replace(/[^0-9]/g, '');
                    const message = `*A to Z Celebrations - Booking Confirmed!* %0A%0AHi ${b.customerName},%0A%0AYour booking is successfully confirmed.%0A%0A*Booking ID:* ${b.id}%0A*Venue:* ${b.venueName}%0A*Date:* ${b.date}%0A*Time Slot:* ${b.slotTime}%0A*Total Amount:* Rs. ${b.total}%0A*Advance Paid:* Rs. 500%0A*Balance Amount:* Rs. ${b.total - 500}%0A%0AWe look forward to hosting your ${b.occasion}!%0AFor any queries, please reply to this message.`;
                    window.open(`https://wa.me/91${phone}?text=${message}`, '_blank');
                };
            } else {
                btnWhatsapp.style.display = "none";
            }

            // Setup Cancel Button
            if (b.status === 'pending' || b.status === 'approved' || b.status === 'completed') {
                btnCancel.style.display = "block";
                btnCancel.onclick = async () => {
                    if (confirm(`Are you sure you want to CANCEL booking ${b.id}? The slot will be instantly freed up.`)) {
                        try {
                            window.AppMain.showLoader(true);
                            await window.AppAPI.updateBookingStatus(b.id, "cancelled");
                            window.AppMain.showToast(`Booking ${b.id} has been cancelled.`, "success");
                            this.loadManualPayments();
                            this.loadCustomerBookings();
                            modal.style.display = "none";
                        } catch (err) {
                            window.AppMain.showToast(err.message, "error");
                        } finally {
                            window.AppMain.showLoader(false);
                        }
                    }
                };
            } else {
                btnCancel.style.display = "none";
            }

            modal.style.display = "flex";
        } catch (err) {
            console.error(err);
            window.AppMain.showToast("Failed to load booking details.", "error");
        } finally {
            window.AppMain.showLoader(false);
        }
    }

    // ============================================================
    // SLOT AVAILABILITY FEATURE
    // ============================================================

    /** Called once when the view is first opened — sets today's date and loads */
    initSlotAvailabilityView() {
        const datePicker = document.getElementById("sa-date-picker");
        if (!datePicker) return;

        // Remove min restriction so admin can view ANY past date
        datePicker.removeAttribute("min");

        // Default to today if no date is set yet
        if (!datePicker.value) {
            const today = new Date();
            const yyyy  = today.getFullYear();
            const mm    = String(today.getMonth() + 1).padStart(2, "0");
            const dd    = String(today.getDate()).padStart(2, "0");
            datePicker.value = `${yyyy}-${mm}-${dd}`;
        }
        this.refreshSlotView();
    }

    /** Fetches slot data from the API and re-renders the entire view */
    async refreshSlotView() {
        const datePicker  = document.getElementById("sa-date-picker");
        const venueFilter = document.getElementById("sa-venue-filter");
        const dateLabel   = document.getElementById("sa-date-label");
        const grid        = document.getElementById("sa-slot-grid");

        if (!datePicker || !datePicker.value) return;

        const dateVal  = datePicker.value; // YYYY-MM-DD
        const venueVal = venueFilter ? venueFilter.value : "all";

        // Update the friendly date label
        if (dateLabel) {
            const d = new Date(dateVal + "T00:00:00");
            dateLabel.textContent = d.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
        }

        if (grid) {
            grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:50px; color:#aaa;">
                <div style="font-size:2rem; margin-bottom:8px;">⏳</div>Loading slots…</div>`;
        }

        try {
            const data = await window.AppAPI.fetchAdminSlots(dateVal, venueVal);
            this._lastSlotData = data; // cache for export/print

            // Update stat cards
            const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
            setEl("sa-stat-total",     data.totalSlots);
            setEl("sa-stat-booked",    data.booked);
            setEl("sa-stat-available", data.available);
            setEl("sa-stat-occupancy", data.occupancy + "%");

            // Occupancy bar
            const bar   = document.getElementById("sa-occ-bar");
            const barLbl= document.getElementById("sa-bar-label");
            if (bar) bar.style.width = data.occupancy + "%";
            if (barLbl) barLbl.textContent = `${data.booked} / ${data.totalSlots} slots booked`;

            // Render slot cards
            this.renderSlotGrid(data.slots, data.date);
        } catch (err) {
            if (grid) {
                grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:#ef4444;">
                    ⚠️ Failed to load slot data: ${err.message}</div>`;
            }
            window.AppMain.showToast("Could not load slot availability: " + err.message, "error");
        }
    }

    /** Renders color-coded slot cards into the grid */
    renderSlotGrid(slots, displayDate) {
        const grid = document.getElementById("sa-slot-grid");
        if (!grid) return;

        if (!slots || slots.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:#aaa;">
                No slots configured for the selected filter.</div>`;
            return;
        }

        // Group by venue for better readability
        const byVenue = {};
        slots.forEach(s => {
            if (!byVenue[s.venueName]) byVenue[s.venueName] = [];
            byVenue[s.venueName].push(s);
        });

        let html = "";

        Object.keys(byVenue).forEach(venueName => {
            const venueSlots = byVenue[venueName];

            // Venue sub-heading spanning full width
            html += `<div style="grid-column:1/-1; margin-top:10px; margin-bottom:4px;">
                <span style="font-size:0.8rem; font-weight:700; text-transform:uppercase;
                    letter-spacing:1px; color:#4a73e8; background:#eef2ff;
                    padding:4px 12px; border-radius:999px;">${venueName}</span>
            </div>`;

            venueSlots.forEach(slot => {
                if (slot.booked) {
                    // ─── BOOKED (Red) ───
                    const bStatus = slot.booking.bookingStatus === "approved" ? "Approved" : "Pending";
                    const statusColor = slot.booking.bookingStatus === "approved" ? "#10b981" : "#f59e0b";
                    html += `
                    <div onclick="window.AppAdminPanel.openSlotBookingModal(${JSON.stringify(slot).replace(/"/g, '&quot;')})"
                         style="background:#fff; border-radius:10px; padding:16px 18px;
                                border-left:5px solid #ef4444;
                                box-shadow:0 2px 10px rgba(239,68,68,0.1);
                                cursor:pointer; transition:transform 0.15s, box-shadow 0.15s;
                                position:relative;"
                         onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 18px rgba(239,68,68,0.18)'"
                         onmouseout="this.style.transform='';this.style.boxShadow='0 2px 10px rgba(239,68,68,0.1)'">

                        <!-- Status badge -->
                        <span style="position:absolute; top:12px; right:12px; font-size:0.7rem;
                                     font-weight:700; background:${statusColor}; color:#fff;
                                     padding:2px 8px; border-radius:999px;">
                            ${bStatus}
                        </span>

                        <!-- Time -->
                        <div style="font-size:1rem; font-weight:700; color:#333; margin-bottom:6px;">
                            🕐 ${slot.time}
                        </div>
                        <div style="font-size:0.75rem; color:#999; margin-bottom:10px;">${slot.label}</div>

                        <!-- Red Booked indicator -->
                        <div style="display:inline-flex; align-items:center; gap:5px;
                                    background:#fef2f2; color:#ef4444; font-size:0.8rem;
                                    font-weight:700; padding:3px 10px; border-radius:999px; margin-bottom:10px;">
                            🔴 Booked
                        </div>

                        <!-- Customer info -->
                        <div style="border-top:1px solid #f3f3f3; padding-top:10px; margin-top:6px;">
                            <div style="font-size:0.88rem; font-weight:600; color:#333; margin-bottom:3px;">
                                👤 ${slot.booking.name || "—"}
                            </div>
                            <div style="font-size:0.82rem; color:#666; margin-bottom:3px;">
                                📞 ${slot.booking.phone || "—"}
                            </div>
                            <div style="font-size:0.82rem; color:#666;">
                                🎉 ${slot.booking.occasion || "—"}
                            </div>
                        </div>
                        <div style="margin-top:8px; font-size:0.75rem; color:#aaa; text-align:right;">
                            Click to view full details ›
                        </div>
                    </div>`;
                } else {
                    // ─── AVAILABLE (Green) ───
                    html += `
                    <div style="background:#fff; border-radius:10px; padding:16px 18px;
                                border-left:5px solid #10b981;
                                box-shadow:0 2px 10px rgba(16,185,129,0.07);">

                        <!-- Time -->
                        <div style="font-size:1rem; font-weight:700; color:#333; margin-bottom:6px;">
                            🕐 ${slot.time}
                        </div>
                        <div style="font-size:0.75rem; color:#999; margin-bottom:12px;">${slot.label}</div>

                        <!-- Green Available indicator -->
                        <div style="display:inline-flex; align-items:center; gap:5px;
                                    background:#f0fdf4; color:#10b981; font-size:0.85rem;
                                    font-weight:700; padding:4px 12px; border-radius:999px;">
                            🟢 Available
                        </div>
                    </div>`;
                }
            });
        });

        grid.innerHTML = html;
    }

    /** Moves the date picker ±1 day and reloads */
    shiftSlotDate(delta) {
        const datePicker = document.getElementById("sa-date-picker");
        if (!datePicker || !datePicker.value) return;

        const current = new Date(datePicker.value + "T00:00:00");
        current.setDate(current.getDate() + delta);

        const yyyy = current.getFullYear();
        const mm   = String(current.getMonth() + 1).padStart(2, "0");
        const dd   = String(current.getDate()).padStart(2, "0");
        datePicker.value = `${yyyy}-${mm}-${dd}`;

        this.refreshSlotView();
    }

    /** Opens the slot booking detail modal for a booked slot */
    openSlotBookingModal(slot) {
        const modal   = document.getElementById("modal-slot-booking");
        const content = document.getElementById("slot-booking-modal-content");
        if (!modal || !content || !slot || !slot.booked) return;

        const b = slot.booking;
        const statusColor = b.bookingStatus === "approved" ? "#10b981" : "#f59e0b";
        const statusLabel = b.bookingStatus === "approved" ? "✅ Approved" : "⏳ Pending Approval";

        content.innerHTML = `
            <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
                <tr style="background:#fafafa;">
                    <td style="padding:9px 12px; border:1px solid #eee; font-weight:600; color:#555; width:42%;">Booking ID</td>
                    <td style="padding:9px 12px; border:1px solid #eee; color:#333;">${b.id || "—"}</td>
                </tr>
                <tr>
                    <td style="padding:9px 12px; border:1px solid #eee; font-weight:600; color:#555;">Screen</td>
                    <td style="padding:9px 12px; border:1px solid #eee; color:#333;">${slot.venueName}</td>
                </tr>
                <tr style="background:#fafafa;">
                    <td style="padding:9px 12px; border:1px solid #eee; font-weight:600; color:#555;">Time Slot</td>
                    <td style="padding:9px 12px; border:1px solid #eee; color:#333;">${slot.time}</td>
                </tr>
                <tr>
                    <td style="padding:9px 12px; border:1px solid #eee; font-weight:600; color:#555;">Label</td>
                    <td style="padding:9px 12px; border:1px solid #eee; color:#333;">${slot.label}</td>
                </tr>
                <tr style="background:#fafafa;">
                    <td style="padding:9px 12px; border:1px solid #eee; font-weight:600; color:#555;">Customer Name</td>
                    <td style="padding:9px 12px; border:1px solid #eee; color:#333;">${b.name || "—"}</td>
                </tr>
                <tr>
                    <td style="padding:9px 12px; border:1px solid #eee; font-weight:600; color:#555;">Phone</td>
                    <td style="padding:9px 12px; border:1px solid #eee; color:#333;">${b.phone || "—"}</td>
                </tr>
                <tr style="background:#fafafa;">
                    <td style="padding:9px 12px; border:1px solid #eee; font-weight:600; color:#555;">Occasion</td>
                    <td style="padding:9px 12px; border:1px solid #eee; color:#333;">${b.occasion || "—"}</td>
                </tr>
                <tr>
                    <td style="padding:9px 12px; border:1px solid #eee; font-weight:600; color:#555;">Total Amount</td>
                    <td style="padding:9px 12px; border:1px solid #eee; color:#333;">₹${b.total || "—"}</td>
                </tr>
                <tr style="background:#fafafa;">
                    <td style="padding:9px 12px; border:1px solid #eee; font-weight:600; color:#555;">Status</td>
                    <td style="padding:9px 12px; border:1px solid #eee;">
                        <span style="background:${statusColor}; color:#fff; font-size:0.8rem;
                                     font-weight:700; padding:3px 10px; border-radius:999px;">
                            ${statusLabel}
                        </span>
                    </td>
                </tr>
            </table>
            ${b.id ? `
            <div style="margin-top:14px; display:flex; gap:8px; flex-wrap:wrap;">
                <button onclick="window.AppAdminPanel.viewBookingDetails('${b.id}'); document.getElementById('modal-slot-booking').style.display='none';"
                    style="padding:8px 16px; background:#4a73e8; color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:0.85rem;">
                    📋 Open Full Details
                </button>
                ${b.phone ? `<button onclick="window.open('https://wa.me/91${b.phone.replace(/[^0-9]/g,'')}','_blank')"
                    style="padding:8px 16px; background:#25d366; color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:0.85rem;">
                    💬 WhatsApp
                </button>` : ""}
            </div>` : ""}
        `;

        modal.style.display = "flex";
    }

    /** Exports the currently loaded slot data as a CSV file */
    exportSlotCSV() {
        const data = this._lastSlotData;
        if (!data || !data.slots || data.slots.length === 0) {
            window.AppMain.showToast("No slot data to export. Please select a date first.", "error");
            return;
        }

        const dateLabel = data.date || "N/A";
        const rows = [
            ["Date", "Screen", "Time Slot", "Label", "Status", "Booking ID", "Customer Name", "Phone", "Occasion", "Total Amount"]
        ];

        data.slots.forEach(s => {
            if (s.booked) {
                rows.push([
                    dateLabel, s.venueName, s.time, s.label, "Booked",
                    s.booking.id || "", s.booking.name || "", s.booking.phone || "",
                    s.booking.occasion || "", s.booking.total || ""
                ]);
            } else {
                rows.push([dateLabel, s.venueName, s.time, s.label, "Available", "", "", "", "", ""]);
            }
        });

        const csvContent = rows.map(r =>
            r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        ).join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url  = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const safeDate = dateLabel.replace(/\//g, "-");
        link.href     = url;
        link.download = `slot-schedule-${safeDate}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        window.AppMain.showToast("CSV exported successfully!", "success");
    }

    /** Opens a print-friendly slot schedule in a new window */
    printSlotSchedule() {
        const data = this._lastSlotData;
        if (!data || !data.slots || data.slots.length === 0) {
            window.AppMain.showToast("No slot data to print. Please select a date first.", "error");
            return;
        }

        const dateLabel = data.date || "—";
        const printWin  = window.open("", "_blank", "width=900,height=700");

        let rows = "";
        data.slots.forEach(s => {
            const statusCell = s.booked
                ? `<span style="background:#ef4444;color:#fff;padding:2px 8px;border-radius:999px;font-size:0.75rem;">Booked</span>`
                : `<span style="background:#10b981;color:#fff;padding:2px 8px;border-radius:999px;font-size:0.75rem;">Available</span>`;
            const cusName  = s.booked ? (s.booking.name  || "—") : "—";
            const cusPhone = s.booked ? (s.booking.phone || "—") : "—";
            const occasion = s.booked ? (s.booking.occasion || "—") : "—";
            const bgColor  = s.booked ? "#fff5f5" : "#f0fdf4";

            rows += `<tr style="background:${bgColor};">
                <td style="padding:8px 10px; border:1px solid #eee;">${s.venueName}</td>
                <td style="padding:8px 10px; border:1px solid #eee;">${s.time}</td>
                <td style="padding:8px 10px; border:1px solid #eee;">${s.label}</td>
                <td style="padding:8px 10px; border:1px solid #eee; text-align:center;">${statusCell}</td>
                <td style="padding:8px 10px; border:1px solid #eee;">${cusName}</td>
                <td style="padding:8px 10px; border:1px solid #eee;">${cusPhone}</td>
                <td style="padding:8px 10px; border:1px solid #eee;">${occasion}</td>
            </tr>`;
        });

        printWin.document.write(`<!DOCTYPE html><html><head>
            <title>Slot Schedule – ${dateLabel}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 30px; color: #333; }
                h1 { color: #4a73e8; margin-bottom: 4px; font-size: 1.4rem; }
                .meta { font-size: 0.85rem; color: #888; margin-bottom: 20px; }
                .summary { display: flex; gap: 20px; margin-bottom: 20px; }
                .stat { background: #f4f6f9; padding: 12px 20px; border-radius: 8px; text-align: center; }
                .stat .val { font-size: 1.5rem; font-weight: 800; }
                .stat .lbl { font-size: 0.75rem; color: #888; }
                table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
                th { background: #4a73e8; color: #fff; padding: 10px; text-align: left; }
                @media print { .no-print { display: none; } }
            </style>
        </head><body>
            <h1>🗓️ A2Z Celebrations — Slot Schedule</h1>
            <p class="meta">Date: <strong>${dateLabel}</strong> &nbsp;|&nbsp; Generated: ${new Date().toLocaleString("en-IN")}</p>
            <div class="summary">
                <div class="stat"><div class="val" style="color:#4a73e8;">${data.totalSlots}</div><div class="lbl">Total Slots</div></div>
                <div class="stat"><div class="val" style="color:#ef4444;">${data.booked}</div><div class="lbl">Booked</div></div>
                <div class="stat"><div class="val" style="color:#10b981;">${data.available}</div><div class="lbl">Available</div></div>
                <div class="stat"><div class="val" style="color:#f59e0b;">${data.occupancy}%</div><div class="lbl">Occupancy</div></div>
            </div>
            <table>
                <thead><tr>
                    <th>Screen</th><th>Time Slot</th><th>Label</th><th>Status</th>
                    <th>Customer</th><th>Phone</th><th>Occasion</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <div class="no-print" style="margin-top:20px; text-align:center;">
                <button onclick="window.print()" style="padding:10px 24px; background:#4a73e8; color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:1rem;">
                    🖨️ Print
                </button>
            </div>
        </body></html>`);

        printWin.document.close();
        printWin.focus();
        setTimeout(() => printWin.print(), 600);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    window.AppAdminPanel = new AdminDashboard();
    window.AppAdminPanel.init();
});
