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
        if (view === "payments" || view === "bookings" || view === "dashboard") {
            this._autoRefreshInterval = setInterval(() => {
                if (this.currentView === "payments") this.loadManualPayments();
                else if (this.currentView === "bookings") this.loadCustomerBookings();
                else if (this.currentView === "dashboard") this.loadDashboardStats();
            }, 30000);
        }
    }

    async loadDashboardStats() {
        try {
            const bookings = await window.AppAPI.fetchAdminBookings();
            const totalRevenue = bookings.filter(b => b.status === "approved").reduce((sum, b) => sum + b.total, 0);
            document.getElementById("stat-total-bookings").textContent = bookings.length;
            document.getElementById("stat-total-revenue").textContent = `₹${totalRevenue.toLocaleString()}`;
        } catch (err) {}
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

            this.renderBookingsTable(bookings);

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
                    filtered = filtered.filter(b =>
                        (b.date || '').includes(dateVal)
                    );
                }
                
                this.renderBookingsTable(filtered);
            };

            if (searchInput && !searchInput._bound) {
                searchInput._bound = true;
                searchInput.addEventListener("input", performFilter);
            }
            
            if (dateSearchInput && !dateSearchInput._bound) {
                dateSearchInput._bound = true;
                dateSearchInput.addEventListener("input", performFilter);
            }
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
        try {
            const bookings = await window.AppAPI.fetchAdminBookings();
            const b = bookings.find(item => item.id === id);
            if (!b) return;
            
            const modal = document.getElementById("modal-receipt");
            const content = document.getElementById("receipt-content");
            
            // The image uploaded by the user is stored as Base64 in b.paymentScreenshot
            // Since this is a demo, we show a dummy payment receipt image if missing.
            const imgUrl = b.paymentScreenshot || "https://images.unsplash.com/photo-1616077168079-7e09a6a70bb7?auto=format&fit=crop&w=400&q=80"; 
            
            content.innerHTML = `
                <p><strong>Booking ID:</strong> ${b.id}</p>
                <p><strong>Payment Time:</strong> ${new Date(b.createdAt).toLocaleString()}</p>
                <p><strong>Amount:</strong> ₹${b.total}</p>
                <img src="${imgUrl}" class="screenshot-img" alt="Payment Receipt" style="max-height: 60vh; object-fit: contain; width: 100%; border: 1px solid #ccc; border-radius: 4px; margin-top: 10px;">
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
        } catch(err) {}
    }

    async viewBookingDetails(id) {
        try {
            const bookings = await window.AppAPI.fetchAdminBookings();
            const b = bookings.find(item => item.id === id);
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
                                <strong>${b.venueName}</strong> 194a, 4th cross, Kalyan Nagar Chowrasta, Vengal Rao Nagar Rd, Kalyan Nagar Phase 1, Hyderabad, Telangana 500045 (8123496627)
                            </td>
                        </tr>
                        <tr><td style="padding:10px; border:1px solid #ddd; font-weight:bold; color:#555;">Booked on</td><td style="padding:10px; border:1px solid #ddd; color:#666;">${new Date(b.createdAt).toLocaleString()}</td></tr>
                        <tr><td style="padding:10px; border:1px solid #ddd; font-weight:bold; color:#555;">Name</td><td style="padding:10px; border:1px solid #ddd; color:#666;">${b.customerName}</td></tr>
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
            if (b.status === 'pending' || b.status === 'approved') {
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
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    window.AppAdminPanel = new AdminDashboard();
    window.AppAdminPanel.init();
});
