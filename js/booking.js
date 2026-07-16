// A2Z CELEBRATIONS - BOOKING SYSTEM STATE ENGINE (js/booking.js)

const INITIAL_STATE = {
    cityId: "",
    cityName: "",
    venueId: "",
    venueName: "",
    venuePrice: 0,
    date: "",
    slotId: "",
    slotTime: "",
    addons: [], // array of {id, name, price}
    subtotal: 0,
    discount: 0,
    total: 0,
    couponCode: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    occasion: "",
    specialInstructions: "",
    paymentScreenshot: "",
    yourName: "",
    partnerName: "",
    standardDecorLabel: "",
    decorationPrice: 0
};

class BookingWizard {
    constructor() {
        this.state = JSON.parse(JSON.stringify(INITIAL_STATE));
        this.currentStep = 1;
        this.totalSteps = 6;
        this.calendarDate = new Date(); // Month showing in calendar
        this.isTransitioning = false;
        this.eventsBound = false;
    }

    init() {
        if (!this.eventsBound) {
            this.bindEvents();
            this.eventsBound = true;
        }
        this.resetWizard();
    }

    resetWizard() {
        this.state = JSON.parse(JSON.stringify(INITIAL_STATE));
        this.currentStep = 1;
        this.isTransitioning = false;
        this.updateStepper();
        this.showStepView(1);

        // Populate static components
        this.loadStep1Cities();

        // Reset inputs
        const form = document.getElementById("booking-details-form");
        if (form) form.reset();

        const preview = document.getElementById("screenshot-preview");
        if (preview) preview.style.display = "none";

        const couponInput = document.getElementById("coupon-code-input");
        if (couponInput) couponInput.value = "";

        const decorTypeSelect = document.getElementById("decor-type");
        if (decorTypeSelect) decorTypeSelect.value = "";

        // Remove active/selected classes from custom buttons/cards in DOM
        document.querySelectorAll(".person-count-btn.selected").forEach(b => b.classList.remove("selected"));
        document.querySelectorAll(".decor-type-btn.selected").forEach(b => b.classList.remove("selected"));
        document.querySelectorAll(".combo-card.selected").forEach(c => c.classList.remove("selected"));
        document.querySelectorAll(".slot-btn.selected").forEach(s => s.classList.remove("selected"));
        document.querySelectorAll(".addon-card.selected").forEach(a => a.classList.remove("selected"));
        document.querySelectorAll(".calendar-cell.selected").forEach(c => c.classList.remove("selected"));

        // Hide Step 2 sub-sections
        const screenSelection = document.getElementById("screen-selection-container");
        if (screenSelection) screenSelection.style.display = "none";

        const bookingTypeContainer = document.getElementById("booking-type-container");
        if (bookingTypeContainer) bookingTypeContainer.style.display = "none";

        const standardDetails = document.getElementById("standard-details-container");
        if (standardDetails) standardDetails.style.display = "none";

        const comboContainer = document.getElementById("combo-packages-selection-container");
        if (comboContainer) comboContainer.style.display = "none";

        const comboCustomDetails = document.getElementById("combo-custom-details-container");
        if (comboCustomDetails) comboCustomDetails.style.display = "none";

        this.recalculatePrices();
    }

    bindEvents() {
        // Prev/Next buttons
        const prevBtn = document.getElementById("wizard-prev-btn");
        const nextBtn = document.getElementById("wizard-next-btn");

        if (prevBtn) {
            prevBtn.addEventListener("click", () => this.handleNavigation(-1));
        }
        if (nextBtn) {
            nextBtn.addEventListener("click", () => this.handleNavigation(1));
        }

        // Calendar navigation
        const prevMonth = document.getElementById("calendar-prev-month");
        const nextMonth = document.getElementById("calendar-next-month");

        if (prevMonth) {
            prevMonth.addEventListener("click", () => {
                this.calendarDate.setMonth(this.calendarDate.getMonth() - 1);
                this.renderCalendar();
            });
        }
        if (nextMonth) {
            nextMonth.addEventListener("click", () => {
                this.calendarDate.setMonth(this.calendarDate.getMonth() + 1);
                this.renderCalendar();
            });
        }

        // Populate and bind month/year dropdowns
        const selectMonth = document.getElementById("calendar-select-month");
        const selectYear = document.getElementById("calendar-select-year");
        if (selectMonth && selectYear) {
            // Populate months
            selectMonth.innerHTML = "";
            const months = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];
            months.forEach((m, idx) => {
                const opt = document.createElement("option");
                opt.value = idx;
                opt.textContent = m;
                selectMonth.appendChild(opt);
            });

            // Populate years (current year to current year + 10)
            selectYear.innerHTML = "";
            const startYear = new Date().getFullYear();
            for (let y = startYear; y <= startYear + 10; y++) {
                const opt = document.createElement("option");
                opt.value = y;
                opt.textContent = y;
                selectYear.appendChild(opt);
            }

            // Bind changes
            selectMonth.addEventListener("change", (e) => {
                this.calendarDate.setMonth(parseInt(e.target.value));
                this.renderCalendar();
            });

            selectYear.addEventListener("change", (e) => {
                this.calendarDate.setFullYear(parseInt(e.target.value));
                this.renderCalendar();
            });
        }

        // Coupon code application
        const applyCouponBtn = document.getElementById("apply-coupon-btn");
        if (applyCouponBtn) {
            applyCouponBtn.addEventListener("click", () => {
                const code = document.getElementById("coupon-code-input").value.trim();
                if (code) this.applyCouponCode(code);
            });
        }

        // Payment screenshot file upload trigger
        const uploadArea = document.getElementById("payment-upload-area");
        const fileInput = document.getElementById("payment-file-input");

        if (uploadArea && fileInput) {
            uploadArea.addEventListener("click", (e) => {
                if (e.target !== fileInput) {
                    fileInput.click();
                }
            });

            fileInput.addEventListener("click", (e) => {
                e.stopPropagation();
            });

            fileInput.addEventListener("change", (e) => {
                const file = e.target.files[0];
                if (file) this.handleScreenshotSelect(file);
                fileInput.value = ""; // Reset so same file can be re-selected if needed
            });

            // Drag and drop
            uploadArea.addEventListener("dragover", (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = "var(--gold-primary)";
            });

            uploadArea.addEventListener("dragleave", () => {
                uploadArea.style.borderColor = "var(--border-color)";
            });

            uploadArea.addEventListener("drop", (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = "var(--border-color)";
                const file = e.dataTransfer.files[0];
                if (file) {
                    fileInput.files = e.dataTransfer.files;
                    this.handleScreenshotSelect(file);
                }
            });
        }
    }

    showStepView(step) {
        document.querySelectorAll(".wizard-view").forEach(el => el.classList.remove("active"));
        const activeView = document.getElementById(`wizard-step-${step}`);
        if (activeView) activeView.classList.add("active");

        if (step === 5) {
            this.loadStep5PaymentDetails();
        }

        // Button controls visibility
        const prevBtn = document.getElementById("wizard-prev-btn");
        const nextBtn = document.getElementById("wizard-next-btn");
        const actionsRow = document.getElementById("wizard-actions-row");

        if (actionsRow) {
            if (step === 6) {
                // Confirmation step has its own actions in layout
                actionsRow.style.display = "none";
            } else {
                actionsRow.style.display = "flex";
            }
        }

        if (prevBtn) {
            prevBtn.style.visibility = (step === 1) ? "hidden" : "visible";
        }

        if (nextBtn) {
            if (step === 5) {
                nextBtn.innerHTML = `Complete Booking <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
            } else {
                nextBtn.innerHTML = `Next Step <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
            }
        }

        // Auto load lists on steps transition
        if (step === 2) this.loadStep2Venues();
        if (step === 3) this.loadStep3Addons();
        if (step === 4) this.loadStep4Summary();
        if (step === 5) {
            // Dynamically set up the QR code with ₹500 advance amount
            const qrImg = document.querySelector(".qr-code-img");
            if (qrImg) {
                qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent('upi://pay?pa=7058754646-2@axl&pn=NAVNEET KRUSHNAMOHAN NALLA&mc=0000&mode=02&purpose=00&am=500')}`;
            }
        }
    }

    updateStepper() {
        document.querySelectorAll(".step-indicator").forEach((el, idx) => {
            const stepNum = idx + 1;
            el.classList.remove("active", "completed");

            if (stepNum === this.currentStep) {
                el.classList.add("active");
            } else if (stepNum < this.currentStep) {
                el.classList.add("completed");
            }
        });

        const progressBar = document.getElementById("step-progress-bar");
        if (progressBar) {
            const pct = ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
            progressBar.style.width = `${pct}%`;
        }
    }

    showConfirmationModal(title, message, nextStepName) {
        return new Promise((resolve) => {
            const modal = document.getElementById("step-confirm-modal");
            const modalTitle = document.getElementById("step-confirm-modal-title");
            const modalMsg = document.getElementById("step-confirm-modal-message");
            const proceedBtn = document.getElementById("step-confirm-proceed-btn");
            const cancelBtn = document.getElementById("step-confirm-cancel-btn");

            if (!modal || !proceedBtn || !cancelBtn) {
                resolve(true); // default to true if modal is missing in DOM
                return;
            }

            if (modalTitle) modalTitle.textContent = title;
            if (modalMsg) modalMsg.textContent = message;

            // Clone buttons to clear previous event listeners
            const newProceedBtn = proceedBtn.cloneNode(true);
            proceedBtn.parentNode.replaceChild(newProceedBtn, proceedBtn);

            const newCancelBtn = cancelBtn.cloneNode(true);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

            modal.style.display = "flex";
            // Force reflow
            modal.offsetHeight;
            modal.classList.add("active");

            newProceedBtn.addEventListener("click", () => {
                modal.classList.remove("active");
                setTimeout(() => {
                    modal.style.display = "none";
                }, 300);
                resolve(true);
            });

            newCancelBtn.addEventListener("click", () => {
                modal.classList.remove("active");
                setTimeout(() => {
                    modal.style.display = "none";
                }, 300);
                resolve(false);
            });
        });
    }

    checkStep2Completion() {
        // Disabled auto-navigation to allow natural typing without skipping step 3 (addons).
        // The user must click the "Next Step" button which validates all inputs properly.
    }

    async handleNavigation(dir) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        try {
            const nextStep = this.currentStep + dir;

            if (dir === 1) {
                // Validation before moving forward
                if (!this.validateStep(this.currentStep)) {
                    return;
                }

                if (this.currentStep === 5) {
                    const confirmed = await this.showConfirmationModal(
                        "Submit Reservation",
                        "Are you sure you want to submit your celebration booking request?",
                        "Submit"
                    );
                    if (!confirmed) {
                        return;
                    }
                    await this.submitFinalBooking();
                    return;
                }
            }

            if (nextStep >= 1 && nextStep <= this.totalSteps) {
                this.currentStep = nextStep;
                this.updateStepper();
                this.showStepView(this.currentStep);

                // Smoothly scroll the page to top of booking section
                const bookingSec = document.getElementById("booking-section");
                if (bookingSec) {
                    bookingSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        } finally {
            this.isTransitioning = false;
        }
    }

    validateStep(step) {
        switch (step) {
            case 1:
                if (!this.state.cityId) {
                    window.AppMain.showToast("Please select a city to proceed!", "error");
                    return false;
                }
                return true;
            case 2:
                if (!this.state.venueId) {
                    window.AppMain.showToast("Please select a themed screen to proceed!", "error");
                    return false;
                }
                if (!this.state.date) {
                    window.AppMain.showToast("Please select an available date from the calendar!", "error");
                    return false;
                }
                if (!this.state.slotId) {
                    window.AppMain.showToast("Please select an available time slot!", "error");
                    return false;
                }
                if (!this.state.bookingType) {
                    window.AppMain.showToast("Please select a booking type to proceed!", "error");
                    return false;
                }
                if (this.state.bookingType === "standard") {
                    if (!this.state.standardDecor) {
                        window.AppMain.showToast("Please select a decoration theme type!", "error");
                        return false;
                    }
                    if (!this.state.personCount) {
                        window.AppMain.showToast("Please select the number of persons!", "error");
                        return false;
                    }
                    const venue = window.AppDB.getVenues().find(v => v.id === this.state.venueId);
                    if (venue && this.state.personCount > venue.capacity) {
                        window.AppMain.showToast(`Selected screen capacity is limited to ${venue.capacity} guests!`, "error");
                        return false;
                    }
                } else if (this.state.bookingType === "combo") {
                    if (!this.state.bookingComboId) {
                        window.AppMain.showToast("Please select a combo package!", "error");
                        return false;
                    }
                    const decorSelect = document.getElementById("decor-type");
                    const decorVal = decorSelect ? decorSelect.value : "";
                    if (!decorVal) {
                        window.AppMain.showToast("Please select a decoration theme type for the combo!", "error");
                        return false;
                    }
                    this.state.decorType = decorVal;
                }
                return true;
            case 3:
                // Add-ons are optional, no validation required
                return true;
            case 4:
                return this.validateCustomerDetailsForm();
            case 5:
                if (!this.state.paymentScreenshot) {
                    window.AppMain.showToast("Please upload the payment transaction screenshot to complete your booking!", "error");
                    return false;
                }
                return true;
            default:
                return true;
        }
    }

    // ----------------------------------------------------
    // STEP 1: CITIES
    // ----------------------------------------------------
    async loadStep1Cities() {
        window.AppMain.showLoader(true);
        try {
            const cities = await window.AppAPI.fetchCities();
            const grid = document.getElementById("cities-grid-container");
            if (!grid) return;

            grid.innerHTML = cities.map(c => `
                <div class="glass-card city-select-card ${this.state.cityId === c.id ? 'selected' : ''}" data-id="${c.id}" data-name="${c.name}">
                    <span class="city-icon">${c.icon}</span>
                    <h4 class="city-name">${c.name}</h4>
                    <p class="city-select-desc">Private Theatres & Lounges Available</p>
                </div>
            `).join('');

            // Add click events
            grid.querySelectorAll(".city-select-card").forEach(card => {
                card.addEventListener("click", () => {
                    grid.querySelectorAll(".city-select-card").forEach(c => c.classList.remove("selected"));
                    card.classList.add("selected");

                    this.state.cityId = card.getAttribute("data-id");
                    this.state.cityName = card.getAttribute("data-name");

                    // Reset succeeding steps
                    this.state.venueId = "";
                    this.state.venueName = "";
                    this.state.date = "";
                    this.state.slotId = "";

                    // Auto transition
                    setTimeout(() => this.handleNavigation(1), 200);
                });
            });
        } catch (err) {
            window.AppMain.showToast("Failed to load cities.", "error");
        } finally {
            window.AppMain.showLoader(false);
        }
    }

    // ----------------------------------------------------
    // STEP 2: VENUES
    // ----------------------------------------------------
    async loadStep2Venues() {
        window.AppMain.showLoader(true);
        try {
            // 1. Populate SR Nagar location card
            const locContainer = document.getElementById("locations-grid-container");
            if (locContainer) {
                locContainer.innerHTML = `
                    <div class="glass-card city-select-card selected" id="sr-nagar-location-card" style="padding: 20px; cursor: pointer;">
                        <span class="city-icon" style="font-size: 2rem; margin-bottom: 8px;">📍</span>
                        <h4 class="city-name" style="font-size: 1.1rem; margin-bottom: 4px;">SR Nagar</h4>
                        <p class="city-select-desc" style="font-size: 0.8rem;">Hyderabad branch</p>
                        <span class="slots-available-badge" style="margin-top: 8px;">✨ 5 Slots Daily</span>
                    </div>
                `;

                // Add click event to Sr Nagar card
                const card = document.getElementById("sr-nagar-location-card");
                if (card) {
                    card.addEventListener("click", () => {
                        const screenSelection = document.getElementById("screen-selection-container");
                        if (screenSelection) screenSelection.style.display = "block";
                    });
                }
            }

            // Person Count button clicks
            document.querySelectorAll('.person-count-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.person-count-btn').forEach(b => {
                        b.style.border = '1px solid var(--border-color)';
                        b.style.background = 'var(--glass-bg)';
                        b.style.color = '';
                    });
                    btn.style.border = '2px solid var(--gold-primary)';
                    btn.style.background = 'rgba(124,58,237,0.08)';
                    this.state.personCount = parseInt(btn.getAttribute('data-count'), 10);
                    this.recalculatePrices();
                    if (typeof this.checkStep2Completion === 'function') this.checkStep2Completion();
                });
            });

            // Decoration Type button clicks
            document.querySelectorAll('.decor-type-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.decor-type-btn').forEach(b => {
                        b.style.border = '1px solid var(--border-color)';
                        b.style.background = 'var(--glass-bg)';
                    });
                    btn.style.border = '2px solid var(--gold-primary)';
                    btn.style.background = 'rgba(124,58,237,0.08)';
                    this.state.standardDecor = btn.getAttribute('data-decor');
                    this.state.standardDecorLabel = btn.querySelector('div div:first-child').textContent.trim();
                    this.state.decorationPrice = parseInt(btn.getAttribute('data-price'), 10) || 0;
                    this.recalculatePrices();
                    if (typeof this.checkStep2Completion === 'function') this.checkStep2Completion();
                });
            });

            // Auto-display screens since SR Nagar is selected by default
            const screenSelection = document.getElementById("screen-selection-container");
            if (screenSelection) screenSelection.style.display = "block";

            // 2. Fetch and render Screens
            const venues = await window.AppAPI.fetchVenues(this.state.cityId);
            const grid = document.getElementById("venues-grid-container");
            if (!grid) return;

            if (venues.length === 0) {
                grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No themed screens found in SR Nagar yet.</p>`;
                return;
            }

            const timingsMap = {
                "v1": ["09.00 to 12.00", "12.30 to 03.30", "04.00 to 07.00", "07.30 to 10.30", "11.00 to 01.00"],
                "v2": ["09.15 to 12.15", "12.45 to 03.45", "04.15 to 07.15", "07.45 to 10.45", "11.00 to 01.00"],
                "v3": ["09.30 to 12.30", "01.00 to 04.00", "04.20 to 07.20", "07.45 to 10.45", "11.00 to 01.00"],
                "v4": ["09.15 to 12.15", "12.45 to 03.45", "04.15 to 07.15", "07.40 to 10.40", "11.00 to 01.00"]
            };

            grid.innerHTML = venues.map(v => `
                <div class="glass-card venue-select-card ${this.state.venueId === v.id ? 'selected' : ''}" data-id="${v.id}" data-name="${v.name}" data-price="${v.price}">
                    <img src="${v.image}" class="venue-select-img" alt="${v.name}" onerror="this.src='https://images.unsplash.com/photo-1595769816263-9b910be24d5f?auto=format&fit=crop&w=600&q=80'">
                    <div class="venue-select-info">
                        <h4 class="venue-select-name">${v.name}</h4>
                        <div class="venue-select-meta">
                            <span>👥 Max: ${v.capacity} guests</span>
                            <span>⭐ ${v.rating} / 5</span>
                        </div>
                        <p class="service-description" style="font-size: 0.85rem; line-height: 1.4; margin-bottom: 10px; flex-grow: 1;">
                            ${v.description}
                        </p>
                        
                        <div class="screen-timings-preview" style="margin-bottom: 12px; font-size: 0.8rem; border-top: 1px dashed var(--border-color); padding-top: 8px;">
                            <strong style="color: var(--gold-primary); display: block; margin-bottom: 6px;">⏰ Daily Timings:</strong>
                            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                                ${(timingsMap[v.id] || []).map(t => `<span style="background: rgba(255,255,255,0.06); padding: 3px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); font-weight: 500;">${t}</span>`).join('')}
                            </div>
                        </div>

                        <div style="margin-bottom: 15px;">
                            <span class="slots-available-badge">✨ 5 Slots Available Daily</span>
                            <span class="dates-available-badge">📅 All Dates Available</span>
                        </div>

                    </div>
                </div>
            `).join('');

            grid.querySelectorAll(".venue-select-card").forEach(card => {
                card.addEventListener("click", () => {
                    grid.querySelectorAll(".venue-select-card").forEach(c => c.classList.remove("selected"));
                    card.classList.add("selected");

                    this.state.venueId = card.getAttribute("data-id");
                    this.state.venueName = card.getAttribute("data-name");
                    this.state.venuePrice = parseInt(card.getAttribute("data-price"), 10);

                    // Update person count buttons for screen capacity
                    this.updateGuestButtons();

                    // Reset date slots
                    this.state.date = "";
                    this.state.slotId = "";
                    this.state.slotTime = "";

                    // Display kitchen notice, calendar & slots
                    const datetimeContainer = document.getElementById("datetime-selection-container");
                    if (datetimeContainer) {
                        datetimeContainer.style.display = "block";
                        datetimeContainer.style.animation = "fadeIn 0.4s ease-out";
                    }

                    this.calendarDate = new Date();
                    this.renderCalendar();
                    this.renderSlots(); // Displays "select date" prompt

                    // Smoothly scroll to the datetime container
                    datetimeContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
            });

            // If venue is already selected in state, make sure datetime elements are open
            if (this.state.venueId) {
                const datetimeContainer = document.getElementById("datetime-selection-container");
                if (datetimeContainer) datetimeContainer.style.display = "block";
                this.updateGuestButtons();
                this.renderCalendar();
                this.renderSlots();
            }
        } catch (err) {
            window.AppMain.showToast("Failed to load screens.", "error");
        } finally {
            window.AppMain.showLoader(false);
        }
    }

    // ----------------------------------------------------
    // STEP 3: DATETIME CALENDAR & SLOTS
    // ----------------------------------------------------
    initStep3Datetime() {
        this.calendarDate = new Date();
        this.renderCalendar();
        this.renderSlots(); // Shows empty state or prompt
    }

    renderCalendar() {
        const grid = document.getElementById("calendar-grid-days");
        const selectMonth = document.getElementById("calendar-select-month");
        const selectYear = document.getElementById("calendar-select-year");
        if (!grid) return;

        grid.innerHTML = "";

        const year = this.calendarDate.getFullYear();
        const month = this.calendarDate.getMonth();

        if (selectMonth && selectYear) {
            selectMonth.value = month;
            selectYear.value = year;
        }

        // Disable prev-month button if it's the current month/year or in the past
        const prevMonthBtn = document.getElementById("calendar-prev-month");
        if (prevMonthBtn) {
            const today = new Date();
            const isCurrentMonthOrPast = (year < today.getFullYear()) || (year === today.getFullYear() && month <= today.getMonth());
            prevMonthBtn.disabled = isCurrentMonthOrPast;
            prevMonthBtn.style.opacity = isCurrentMonthOrPast ? "0.3" : "1";
            prevMonthBtn.style.pointerEvents = isCurrentMonthOrPast ? "none" : "auto";
        }

        // First day of month
        const firstDay = new Date(year, month, 1).getDay();
        // Number of days in month
        const totalDays = new Date(year, month + 1, 0).getDate();

        // Empty cells for preceding days
        for (let i = 0; i < firstDay; i++) {
            const cell = document.createElement("div");
            cell.className = "calendar-cell empty";
            grid.appendChild(cell);
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let day = 1; day <= totalDays; day++) {
            const cellDate = new Date(year, month, day);
            const cell = document.createElement("div");
            cell.className = "calendar-cell";
            cell.textContent = day;

            // Format to YYYY-MM-DD for visual reference
            const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            // Format to DD/MM/YYYY for data state representation
            const dateDMY = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;

            // Highlight today
            if (cellDate.getTime() === today.getTime()) {
                cell.classList.add("today");
            }

            // Disable past dates
            if (cellDate < today) {
                cell.classList.add("disabled");
            } else {
                if (this.state.date === dateDMY) {
                    cell.classList.add("selected");
                }

                cell.addEventListener("click", () => {
                    grid.querySelectorAll(".calendar-cell").forEach(c => c.classList.remove("selected"));
                    cell.classList.add("selected");

                    this.state.date = dateDMY;
                    this.state.slotId = "";
                    this.state.slotTime = "";

                    this.loadTimeSlots(dateDMY);
                });
            }
            grid.appendChild(cell);
        }
    }

    renderTimeSlotsList(slots, dateString) {
        const listContainer = document.getElementById("slots-grid-container");
        if (!listContainer) return;

        // Filter out past slots if date is today
        const today = new Date();
        const todayString = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
        const isToday = dateString === todayString;
        const now = new Date();

        const parseTimeString = (timeStr, baseDate) => {
            const parts = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
            if (!parts) return null;
            let hours = parseInt(parts[1], 10);
            const minutes = parseInt(parts[2], 10);
            const ampm = parts[3].toUpperCase();

            if (ampm === "PM" && hours < 12) hours += 12;
            if (ampm === "AM" && hours === 12) hours = 0;

            const d = new Date(baseDate);
            d.setHours(hours, minutes, 0, 0);
            return d;
        };

        let availableSlots = slots;
        if (isToday) {
            availableSlots = slots.map(s => {
                const startTimeStr = s.time.split(" - ")[0];
                const slotStartTime = parseTimeString(startTimeStr, today);
                if (slotStartTime && slotStartTime < now) {
                    return { ...s, isPast: true };
                }
                return s;
            });
        }

        if (availableSlots.length === 0) {
            listContainer.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 20px 0;">No available slots left for today. Please select another date.</p>`;
            return;
        }

        listContainer.innerHTML = availableSlots.map(s => {
            const isUnavailable = s.isBooked || s.isPast;
            const btnClass = isUnavailable ? 'booked' : (this.state.slotId === s.id ? 'selected' : '');
            const badgeText = s.isPast ? 'Passed' : (s.isBooked ? 'Booked' : 'Available');

            return `
                <button class="slot-btn ${btnClass}" data-id="${s.id}" data-time="${s.time}" ${isUnavailable ? 'disabled' : ''}>
                    <span>${s.time}</span>
                    <span class="slot-status-badge">${badgeText}</span>
                </button>
            `;
        }).join('');

        listContainer.querySelectorAll(".slot-btn:not(.booked)").forEach(btn => {
            btn.addEventListener("click", () => {
                listContainer.querySelectorAll(".slot-btn").forEach(b => b.classList.remove("selected"));
                btn.classList.add("selected");

                this.state.slotId = btn.getAttribute("data-id");
                this.state.slotTime = btn.getAttribute("data-time");

                // Show booking type selection after slot is chosen
                const bookingTypeContainer = document.getElementById("booking-type-container");
                if (bookingTypeContainer) {
                    bookingTypeContainer.style.display = "block";
                    bookingTypeContainer.style.animation = "fadeIn 0.4s ease-out";
                    // Scroll into view for better UX
                    bookingTypeContainer.scrollIntoView({ behavior: "smooth", block: "start" });

                    // Booking Type selection listeners
                    const standardBtn = document.getElementById("booking-type-standard");
                    const comboBtn = document.getElementById("booking-type-combo");
                    if (standardBtn) {
                        standardBtn.addEventListener("click", () => {
                            this.state.bookingType = "standard";
                            // Hide combo packages and custom details
                            const comboContainer = document.getElementById("combo-packages-selection-container");
                            if (comboContainer) comboContainer.style.display = "none";
                            const customDetails = document.getElementById("combo-custom-details-container");
                            if (customDetails) customDetails.style.display = "none";
                            // Show standard details inputs
                            const standardDetails = document.getElementById("standard-details-container");
                            if (standardDetails) standardDetails.style.display = "block";
                            // Hide combo details if visible
                            if (customDetails) customDetails.style.display = "none";
                            setTimeout(() => { if (typeof this.checkStep2Completion === 'function') this.checkStep2Completion(); }, 300);
                        });
                    }
                    if (comboBtn) {
                        comboBtn.addEventListener("click", () => {
                            this.state.bookingType = "combo";
                            const standardDetails = document.getElementById("standard-details-container");
                            if (standardDetails) standardDetails.style.display = "none";
                            const comboContainer = document.getElementById("combo-packages-selection-container");
                            if (comboContainer) comboContainer.style.display = "block";
                            // Ensure custom details hidden until a package is selected
                            const customDetails = document.getElementById("combo-custom-details-container");
                            if (customDetails) customDetails.style.display = "none";
                        });
                    }
                    // Combo package selection listeners
                    const comboCards = document.querySelectorAll(".combo-card");
                    comboCards.forEach(card => {
                        card.addEventListener("click", () => {
                            // Mark selected
                            comboCards.forEach(c => c.classList.remove("selected"));
                            card.classList.add("selected");
                            // Store selected combo id and price
                            this.state.bookingComboId = card.getAttribute("data-combo-id");
                            this.state.bookingComboPrice = parseInt(card.getAttribute("data-price"), 10);
                            // Show custom details inputs
                            const customDetails = document.getElementById("combo-custom-details-container");
                            if (customDetails) customDetails.style.display = "block";
                            setTimeout(() => this.checkStep2Completion(), 300);
                        });
                    });
                }
            });
        });
    }

    async loadTimeSlots(dateString) {
        const listContainer = document.getElementById("slots-grid-container");
        if (!listContainer) return;

        listContainer.innerHTML = `<div class="spinner" style="width: 30px; height: 30px; margin: 20px auto;"></div>`;

        // Expose render function for background/instant updates
        window.updateSlotsUI = (slots) => {
            this.renderTimeSlotsList(slots, dateString);
        };

        try {
            const slots = await window.AppAPI.fetchSlotsAvailability(this.state.venueId, dateString);
            this.renderTimeSlotsList(slots, dateString);
        } catch (err) {
            listContainer.innerHTML = `
                <p style="color: var(--danger); text-align: center; font-size: 0.9rem; padding: 20px 0; line-height: 1.4;">
                    ${err.message || "Failed to load slots."}<br>
                    <span style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-top: 8px;">Please click the date again to retry.</span>
                </p>
            `;
        }
    }

    renderSlots() {
        const listContainer = document.getElementById("slots-grid-container");
        if (!listContainer) return;

        if (!this.state.date) {
            listContainer.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 40px 0;">Please select a date from the calendar to view available time slots.</p>`;
        } else {
            this.loadTimeSlots(this.state.date);
        }
    }

    // ----------------------------------------------------
    // STEP 4: ADD-ONS SELECT
    // ----------------------------------------------------
    async loadStep3Addons() {
        window.AppMain.showLoader(true);
        try {
            let addons = [];
            try {
                addons = await window.AppAPI.fetchAddons();
            } catch (apiErr) {
                console.warn("API fetchAddons failed, using local fallback:", apiErr);
            }

            if (!addons || addons.length === 0) {
                addons = [
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
                ];
            }

            const grid = document.getElementById("addons-grid-container");
            if (!grid) return;

            grid.innerHTML = addons.map(a => {
                const isSelected = this.state.addons.some(selected => selected.id === a.id);
                const isImageIcon = a.icon && (a.icon.includes("/") || a.icon.includes("."));
                const imgHtml = isImageIcon
                    ? `<img class="addon-img" src="${a.icon}" alt="${a.name}" style="width: 100%; height: 100%; object-fit: cover;">`
                    : `<div class="addon-img" style="display:flex; align-items:center; justify-content:center; font-size:2.2rem; background:rgba(255,255,255,0.03); height:100%">${a.icon}</div>`;
                return `
                    <div class="glass-card addon-card ${isSelected ? 'selected' : ''}" data-id="${a.id}" data-name="${a.name}" data-price="${a.price}">
                        <div class="addon-checkbox"></div>
                        <div class="addon-img-wrapper">
                            ${imgHtml}
                        </div>
                        <h5 class="addon-name">${a.name}</h5>
                        <div style="font-weight:700; color:var(--gold-primary); text-align:center; font-size:0.95rem; margin-bottom:5px;">₹${a.price}</div>
                        <p class="service-description" style="font-size:0.75rem; text-align:center; line-height:1.3; height:32px; overflow:hidden; margin-bottom:10px;">${a.description}</p>
                    </div>
                `;
            }).join('');

            grid.querySelectorAll(".addon-card").forEach(card => {
                card.addEventListener("click", () => {
                    const id = card.getAttribute("data-id");
                    const name = card.getAttribute("data-name");
                    const price = parseInt(card.getAttribute("data-price"), 10);

                    const isSelected = card.classList.contains("selected");

                    if (isSelected) {
                        card.classList.remove("selected");
                        this.state.addons = this.state.addons.filter(a => a.id !== id);
                    } else {
                        // Mutually exclusive photography options
                        if (id === "a2_80" || id === "a2_40") {
                            const otherId = id === "a2_80" ? "a2_40" : "a2_80";
                            const otherCard = grid.querySelector(`.addon-card[data-id="${otherId}"]`);
                            if (otherCard && otherCard.classList.contains("selected")) {
                                otherCard.classList.remove("selected");
                                this.state.addons = this.state.addons.filter(a => a.id !== otherId);
                            }
                        }
                        card.classList.add("selected");
                        this.state.addons.push({ id, name, price });
                    }
                    this.recalculatePrices();
                });
            });
        } catch (err) {
            window.AppMain.showToast("Failed to load add-ons.", "error");
        } finally {
            window.AppMain.showLoader(false);
        }
    }

    recalculatePrices() {
        let subtotal = 0;
        // Add combo price if a combo is selected
        if (this.state.bookingComboPrice) {
            subtotal += this.state.bookingComboPrice;
        }
        // Add standard booking price based on person count
        if (this.state.personCount) {
            const priceMap = {
                1: 1200, 2: 1200, 3: 1200, 4: 1200,
                5: 1450, 6: 1700, 7: 1950, 8: 2200,
                9: 2450, 10: 2700, 11: 2950, 12: 3200,
                13: 3450, 14: 3700, 15: 3950, 16: 4200,
                17: 4450, 18: 4700, 19: 4950, 20: 5200
            };
            subtotal += priceMap[this.state.personCount] || 0;
        }
        // Add decoration price for standard booking
        if (this.state.bookingType === 'standard' && this.state.decorationPrice > 0) {
            subtotal += this.state.decorationPrice;
        }
        // Add addons
        this.state.addons.forEach(a => {
            subtotal += a.price;
        });
        this.state.subtotal = subtotal;
        // Recalculate discount if coupon applied
        if (this.state.couponCode) {
            // Apply it silently
            const coupons = window.AppDB.getCoupons();
            const cp = coupons.find(c => c.code.toUpperCase() === this.state.couponCode.toUpperCase());
            if (cp && subtotal >= cp.minPurchase) {
                this.state.discount = Math.round((subtotal * (cp.discountPercent / 100)) * 100) / 100;
            } else {
                this.state.couponCode = "";
                this.state.discount = 0;
            }
        } else {
            this.state.discount = 0;
        }
        this.state.total = Math.round((this.state.subtotal - this.state.discount) * 100) / 100;
        this.updatePriceUI();
    }

    updatePriceUI() {
        // Hide price elements to comply with "remove prices" request
        const subEl = document.getElementById("summary-subtotal");
        const discEl = document.getElementById("summary-discount");
        const totEl = document.getElementById("summary-total");
        const discRow = document.getElementById("summary-discount-row");
        const priceCard = document.querySelector('.price-summary-card');
        if (subEl) subEl.textContent = "";
        if (discEl) discEl.textContent = "";
        if (totEl) totEl.textContent = "";
        if (discRow) discRow.style.display = "none";
        if (priceCard) priceCard.style.display = "none";
    }

    async applyCouponCode(code) {
        const applyBtn = document.getElementById("apply-coupon-btn");
        if (applyBtn) applyBtn.disabled = true;

        try {
            const coupon = await window.AppAPI.validateCoupon(code, this.state.subtotal);
            this.state.couponCode = coupon.code;
            this.recalculatePrices();
            window.AppMain.showToast(`Coupon "${coupon.code}" applied successfully! Saved ${coupon.discountPercent}%`, "success");
        } catch (err) {
            window.AppMain.showToast(err.message, "error");
            this.state.couponCode = "";
            this.state.discount = 0;
            this.recalculatePrices();
        } finally {
            if (applyBtn) applyBtn.disabled = false;
        }
    }

    // ----------------------------------------------------
    // STEP 5: CUSTOMER DETAILS FORM
    // ----------------------------------------------------
    loadStep4Summary() {
        const container = document.getElementById("selected-venue-summary-card");
        if (!container) return;

        const addonsText = this.state.addons.length > 0
            ? this.state.addons.map(a => `<li>${a.name}</li>`).join('')
            : '<li style="list-style:none; color:var(--text-muted);">None selected</li>';

        container.innerHTML = `
            <h4 class="venue-select-name" style="border-bottom:1px solid var(--border-color); padding-bottom:12px; margin-bottom:15px;">Booking Details</h4>
            <div style="font-size:0.9rem; line-height:1.8;">
                <p>📍 <strong>City:</strong> ${this.state.cityName}</p>
                <p>🎬 <strong>Venue:</strong> ${this.state.venueName}</p>
                <p>📅 <strong>Date:</strong> ${this.state.date}</p>
                <p>🕒 <strong>Slot:</strong> ${this.state.slotTime}</p>
                <div style="margin-top:15px;">
                    <strong>🎁 Add-ons:</strong>
                    <ul style="padding-left:20px; margin-top:5px; font-size:0.85rem;">
                        ${addonsText}
                    </ul>
                </div>
            </div>
        `;

        const custNameInput = document.getElementById("cust-name");
        if (custNameInput && this.state.yourName) {
            custNameInput.value = this.state.yourName;
        }

        this.recalculatePrices();
    }

    validateCustomerDetailsForm() {
        const name = document.getElementById("cust-name").value.trim();
        const nickname = document.getElementById("cust-nickname").value.trim();
        const phone = document.getElementById("cust-phone").value.trim();
        const email = document.getElementById("cust-email").value.trim();
        const occasion = document.getElementById("cust-occasion").value;
        const notes = document.getElementById("cust-notes").value.trim();

        if (!name) {
            window.AppMain.showToast("Full Name is required!", "error");
            return false;
        }
        if (!nickname) {
            window.AppMain.showToast("Nickname for LED letter/Screen is required!", "error");
            return false;
        }
        if (!phone || phone.length < 10) {
            window.AppMain.showToast("Please enter a valid 10-digit Phone Number!", "error");
            return false;
        }
        if (!email || !email.includes("@")) {
            window.AppMain.showToast("Please enter a valid Email Address!", "error");
            return false;
        }
        if (!occasion) {
            window.AppMain.showToast("Please select an Occasion Type!", "error");
            return false;
        }

        // Save form state
        this.state.customerName = name;
        this.state.ledNickName = nickname;
        this.state.customerPhone = phone;
        this.state.customerEmail = email;
        this.state.occasion = occasion;
        this.state.specialInstructions = notes;

        return true;
    }

    loadStep5PaymentDetails() {
        const container = document.getElementById("payment-cost-breakdown");
        if (!container) return;

        this.recalculatePrices(); // Ensure prices are up to date

        let addonRows = this.state.addons.map(a => `
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <span>${a.name}</span>
                <span>₹${a.price}</span>
            </div>
        `).join('');

        let comboRow = "";
        if (this.state.bookingComboPrice) {
            comboRow = `
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <span>Combo Package</span>
                <span>₹${this.state.bookingComboPrice}</span>
            </div>`;
        }

        let basePriceText = this.state.bookingType === "standard" ? `Base Package (${this.state.personCount} Person${this.state.personCount > 1 ? 's' : ''})` : `Venue Base Price`;
        const decorRow = (this.state.bookingType === 'standard' && this.state.standardDecor) ? `
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <span>🎀 Decoration (${this.state.standardDecorLabel || 'Theme'})</span>
                <span>₹${this.state.decorationPrice}</span>
            </div>` : '';

        container.innerHTML = `
            <h4 style="border-bottom:1px dashed var(--border-color); padding-bottom:8px; margin-bottom:10px; color:var(--text-color); font-size:1rem;">Cost Breakdown</h4>
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <span>${basePriceText}</span>
                <span>₹${(this.state.bookingType === "standard" && this.state.personCount ? this.getPriceForPersons(this.state.personCount) : 0)}</span>
            </div>
            ${decorRow}
            ${comboRow}
            ${addonRows}
            ${this.state.discount > 0 ? `
            <div style="display:flex; justify-content:space-between; margin-bottom:5px; color:#10b981;">
                <span>Discount Applied</span>
                <span>- ₹${this.state.discount}</span>
            </div>` : ''}
            <div style="border-top:1px dashed var(--border-color); margin-top:10px; padding-top:10px; display:flex; justify-content:space-between; font-weight:bold; font-size:1.1rem; color:var(--text-color);">
                <span>Total Amount</span>
                <span>₹${this.state.total}</span>
            </div>
        `;
    }

    updateGuestButtons() {
        if (!this.state.venueId) return;
        const venues = window.AppDB.getVenues();
        const venue = venues.find(v => v.id === this.state.venueId);
        if (!venue) return;

        document.querySelectorAll('.person-count-btn').forEach(btn => {
            const count = parseInt(btn.getAttribute('data-count'), 10);
            if (count > venue.capacity) {
                btn.disabled = true;
                btn.style.opacity = '0.3';
                btn.style.cursor = 'not-allowed';
                btn.style.pointerEvents = 'none';

                // If this button was selected, deselect it and reset price calculation
                if (this.state.personCount === count) {
                    this.state.personCount = null;
                    btn.style.border = '1px solid var(--border-color)';
                    btn.style.background = 'var(--glass-bg)';
                    btn.style.color = '';
                    this.recalculatePrices();
                }
            } else {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
                btn.style.pointerEvents = 'auto';
            }
        });
    }

    getPriceForPersons(count) {
        const priceMap = {
            1: 1200, 2: 1200, 3: 1200, 4: 1200,
            5: 1450, 6: 1700, 7: 1950, 8: 2200,
            9: 2450, 10: 2700, 11: 2950, 12: 3200,
            13: 3450, 14: 3700, 15: 3950, 16: 4200,
            17: 4450, 18: 4700, 19: 4950, 20: 5200
        };
        return priceMap[count] || 0;
    }

    // ----------------------------------------------------
    // STEP 6: PAYMENT TRANSACTION UPLOAD
    // ----------------------------------------------------
    handleScreenshotSelect(file) {
        const preview = document.getElementById("screenshot-preview");
        const previewImg = document.getElementById("screenshot-preview-img");

        if (!file) {
            window.AppMain.showToast("No file selected. Please try again.", "error");
            return;
        }

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"];
        if (!allowedTypes.includes(file.type) && !file.name.match(/\.(jpe?g|png|gif|webp|heic|heif)$/i)) {
            window.AppMain.showToast("Invalid file type. Please upload a JPG, PNG, or WebP image.", "error");
            return;
        }

        // Validate file size (max 15MB)
        if (file.size > 15 * 1024 * 1024) {
            window.AppMain.showToast("File too large. Maximum allowed size is 15MB.", "error");
            return;
        }

        if (!preview || !previewImg) {
            window.AppMain.showToast("Upload area not ready. Please try again.", "error");
            return;
        }

        const reader = new FileReader();

        reader.onerror = () => {
            window.AppMain.showToast("Failed to read the file. Please try a different image.", "error");
        };

        reader.onload = (e) => {
            if (!e.target || !e.target.result) {
                window.AppMain.showToast("Could not read image data. Please try again.", "error");
                return;
            }

            const img = new Image();

            img.onerror = () => {
                // If canvas compression fails (e.g. HEIC on some browsers), try using the raw data URL
                try {
                    const rawBase64 = e.target.result;
                    previewImg.src = rawBase64;
                    preview.style.display = "block";
                    this.state.paymentScreenshot = rawBase64;
                    window.AppMain.showToast("Screenshot uploaded successfully!", "success");
                    setTimeout(() => this.handleNavigation(1), 500);
                } catch (fallbackErr) {
                    window.AppMain.showToast("Could not process this image format. Please use JPG or PNG.", "error");
                }
            };

            img.onload = () => {
                try {
                    const canvas = document.createElement("canvas");
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height = Math.round(height * MAX_WIDTH / width);
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width = Math.round(width * MAX_HEIGHT / height);
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    if (!ctx) throw new Error("Canvas context unavailable");
                    ctx.drawImage(img, 0, 0, width, height);

                    // Get compressed base64 (jpeg, 0.7 quality)
                    const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);

                    previewImg.src = compressedBase64;
                    preview.style.display = "block";
                    this.state.paymentScreenshot = compressedBase64;
                    window.AppMain.showToast("Screenshot uploaded successfully!", "success");

                    // Auto-transition to complete booking confirmation
                    setTimeout(() => this.handleNavigation(1), 500);
                } catch (canvasErr) {
                    // Fallback: use raw base64 if compression fails
                    const rawBase64 = e.target.result;
                    previewImg.src = rawBase64;
                    preview.style.display = "block";
                    this.state.paymentScreenshot = rawBase64;
                    window.AppMain.showToast("Screenshot uploaded (original quality).", "success");
                    setTimeout(() => this.handleNavigation(1), 500);
                }
            };

            img.src = e.target.result;
        };

        reader.readAsDataURL(file);
    }

    // ----------------------------------------------------
    // STEP 7: FINAL SUBMISSION & RECEIPT
    // ----------------------------------------------------
    async submitFinalBooking() {
        window.AppMain.showLoader(true);
        try {
            const response = await window.AppAPI.createBooking(this.state);
            this.state.id = response.id;

            // Transition to confirmation screen
            this.currentStep = 6;
            this.updateStepper();
            this.showStepView(6);

            // Populate Confirmation details
            document.getElementById("confirm-booking-id").textContent = response.id;
            document.getElementById("confirm-cust-name").textContent = response.customerName;
            const nickEl = document.getElementById("confirm-nick-name");
            if (nickEl) nickEl.textContent = this.state.ledNickName || "N/A";
            document.getElementById("confirm-cust-phone").textContent = response.customerPhone;
            document.getElementById("confirm-cust-email").textContent = response.customerEmail;
            document.getElementById("confirm-venue-name").textContent = response.venueName;
            document.getElementById("confirm-date").textContent = response.date;
            document.getElementById("confirm-slot").textContent = response.slotTime;
            // Price hidden per requirement

            window.AppMain.showToast("Congratulations! Your celebration booking is submitted for approval.", "success");

            // Hook up Download PDF Receipt (Pending Admin Approval first)
            const downloadBtn = document.getElementById("download-receipt-pdf-btn");
            if (downloadBtn) {
                downloadBtn.disabled = true;
                downloadBtn.innerHTML = "⌛ Under payment check-in process.";
                downloadBtn.style.opacity = "0.6";
                downloadBtn.style.cursor = "not-allowed";

                // Clear any old click listeners
                const newBtn = downloadBtn.cloneNode(true);
                downloadBtn.parentNode.replaceChild(newBtn, downloadBtn);

                // Start polling database for booking status
                if (this.approvalPollInterval) {
                    clearInterval(this.approvalPollInterval);
                }

                this.approvalPollInterval = setInterval(async () => {
                    try {
                        const booking = await window.AppAPI.trackBooking(response.id, response.customerPhone);
                        if (booking && booking.status === "approved") {
                            clearInterval(this.approvalPollInterval);
                            this.approvalPollInterval = null;

                            // Enable button
                            const activeBtn = document.getElementById("download-receipt-pdf-btn");
                            if (activeBtn) {
                                activeBtn.disabled = false;
                                activeBtn.innerHTML = "🖨️ Download PDF Receipt";
                                activeBtn.style.opacity = "1";
                                activeBtn.style.cursor = "pointer";

                                // Hook up the actual download listener
                                const finalBtn = activeBtn.cloneNode(true);
                                activeBtn.parentNode.replaceChild(finalBtn, activeBtn);
                                finalBtn.addEventListener("click", () => {
                                    window.AppExports.downloadReceiptPDF(booking);
                                    setTimeout(() => {
                                        const phone = booking.customerPhone.replace(/[^0-9]/g, '');
                                        const phoneWithCountry = phone.startsWith("91") && phone.length > 10 ? phone : `91${phone}`;
                                        const message = encodeURIComponent(`*A to Z Celebrations - Booking Confirmed!* \n\nHi ${booking.customerName},\n\nYour booking receipt is ready! \n\n*Booking ID:* ${booking.id}\n*Date:* ${booking.date}\n*Slot:* ${booking.slotTime}\n\nWe look forward to hosting you!`);
                                        window.open(`https://wa.me/${phoneWithCountry}?text=${message}`, '_blank');
                                    }, 1500); // Give it a slight delay so PDF downloads first
                                });
                            }
                            window.AppMain.showToast("Your booking has been approved! Receipt is ready for download.", "success");
                        } else if (booking && (booking.status === "rejected" || booking.status === "cancelled")) {
                            clearInterval(this.approvalPollInterval);
                            this.approvalPollInterval = null;

                            const activeBtn = document.getElementById("download-receipt-pdf-btn");
                            if (activeBtn) {
                                activeBtn.disabled = true;
                                activeBtn.innerHTML = `❌ Booking ${booking.status.toUpperCase()}`;
                                activeBtn.style.opacity = "0.6";
                                activeBtn.style.cursor = "not-allowed";
                            }
                            window.AppMain.showToast(`Your booking was ${booking.status}.`, "error");
                        }
                    } catch (e) {
                        console.error("Polling error:", e);
                    }
                }, 3000);
            }

            // Hook up Back to Home buttons
            const homeBtn = document.getElementById("confirm-home-btn");
            if (homeBtn) {
                homeBtn.addEventListener("click", () => {
                    this.resetWizard();
                    window.AppMain.navigate("home");
                });
            }
        } catch (err) {
            window.AppMain.showToast("Failed to complete booking. " + err.message, "error");
            if (err.message && (err.message.includes("already booked") || err.message.includes("slot"))) {
                setTimeout(() => {
                    this.currentStep = 2;
                    this.updateStepper();
                    this.showStepView(2);
                    this.loadStep2Venues(); // Refresh views and availability
                }, 1500);
            }
        } finally {
            window.AppMain.showLoader(false);
        }
    }
}

window.AppBookingWizard = new BookingWizard();
