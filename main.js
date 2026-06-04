// A to Z Celebrations - MAIN APP INTERACTIVES & SPA ROUTER (js/main.js)

class MainApplication {
    constructor() {
        this.activePage = "home";
        this.heroSlidesInterval = null;
        this.currentHeroSlide = 0;
        this.testimonialInterval = null;
        this.currentTestimonial = 0;
    }

    init() {
        this.bindGlobalEvents();
        this.initSPARouting();
        this.initStickyHeader();
        this.initMobileMenu();
        this.initWhatsAppWidget();
        this.initHeroSlider();
        this.initTestimonialsSlider();
        this.initGallerySlider();
    }

    // ----------------------------------------------------
    // GLOBAL UI HANDLERS
    // ----------------------------------------------------
    bindGlobalEvents() {
        // Quick "Book Now" CTA buttons trigger booking page
        document.querySelectorAll(".book-now-cta").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                this.navigate("booking");
            });
        });

        // Top nav link clicks
        document.querySelectorAll(".nav-link[data-page]").forEach(link => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                const page = link.getAttribute("data-page");
                this.navigate(page);
                
                // Close mobile drawer on link click
                const navLinks = document.querySelector(".nav-links");
                if (navLinks) navLinks.classList.remove("active");
            });
        });
    }

    // ----------------------------------------------------
    // STICKY HEADER & SCROLLS
    // ----------------------------------------------------
    initStickyHeader() {
        const header = document.querySelector("header");
        window.addEventListener("scroll", () => {
            if (window.scrollY > 50) {
                header.classList.add("scrolled");
            } else {
                header.classList.remove("scrolled");
            }
        });
    }

    // ----------------------------------------------------
    // MOBILE NAVIGATION DRAWER
    // ----------------------------------------------------
    initMobileMenu() {
        const toggle = document.querySelector(".mobile-menu-toggle");
        const nav = document.querySelector(".nav-links");
        
        if (toggle && nav) {
            toggle.addEventListener("click", () => {
                nav.classList.toggle("active");
            });
        }
    }

    // ----------------------------------------------------
    // FLOATING WHATSAPP CHAT WIDGET
    // ----------------------------------------------------
    initWhatsAppWidget() {
        const btn = document.getElementById("whatsapp-btn");
        const chatBox = document.getElementById("whatsapp-chat-box");
        
        if (btn && chatBox) {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const isShowing = chatBox.style.display === "flex";
                chatBox.style.display = isShowing ? "none" : "flex";
            });

            // Close chat when clicking outside
            document.addEventListener("click", () => {
                chatBox.style.display = "none";
            });

            chatBox.addEventListener("click", (e) => {
                e.stopPropagation(); // prevent closing when interacting inside chatbox
            });
            
            // Redirect button click
            const sendBtn = document.getElementById("whatsapp-send-redirect");
            if (sendBtn) {
                sendBtn.addEventListener("click", () => {
                    const text = encodeURIComponent("Hello A to Z Celebrations! I would like to enquire about private theatre and birthday decorations packages.");
                    window.open(`https://wa.me/918123496627?text=${text}`, "_blank");
                });
            }
        }
    }

    // ----------------------------------------------------
    // IMAGE HERO SLIDER CAROUSEL
    // ----------------------------------------------------
    initHeroSlider() {
        const slides = document.querySelectorAll(".hero-slide");
        if (slides.length === 0) return;

        // Auto rotate slides
        this.heroSlidesInterval = setInterval(() => {
            slides[this.currentHeroSlide].classList.remove("active");
            this.currentHeroSlide = (this.currentHeroSlide + 1) % slides.length;
            slides[this.currentHeroSlide].classList.add("active");
        }, 5000);
    }

    // ----------------------------------------------------
    // GALLERY HORIZONTAL SCROLL SLIDER
    // ----------------------------------------------------
    initGallerySlider() {
        const track = document.getElementById("gallery-track-slider");
        const prev = document.getElementById("gallery-prev");
        const next = document.getElementById("gallery-next");
        
        if (!track || !prev || !next) return;
        
        let scrollAmount = 0;
        const stepWidth = 370; // width + gap
        
        next.addEventListener("click", () => {
            const maxScroll = track.scrollWidth - track.clientWidth;
            if (scrollAmount < maxScroll) {
                scrollAmount += stepWidth;
                track.style.transform = `translateX(-${scrollAmount}px)`;
            }
        });
        
        prev.addEventListener("click", () => {
            if (scrollAmount > 0) {
                scrollAmount -= stepWidth;
                if (scrollAmount < 0) scrollAmount = 0;
                track.style.transform = `translateX(-${scrollAmount}px)`;
            }
        });
    }

    // ----------------------------------------------------
    // CUSTOMER TESTIMONIALS SLIDER
    // ----------------------------------------------------
    initTestimonialsSlider() {
        const slides = document.querySelectorAll(".testimonial-slide");
        if (slides.length === 0) return;
        
        this.testimonialInterval = setInterval(() => {
            slides[this.currentTestimonial].classList.remove("active");
            this.currentTestimonial = (this.currentTestimonial + 1) % slides.length;
            slides[this.currentTestimonial].classList.add("active");
        }, 6000);
    }

    // ----------------------------------------------------
    // SINGLE PAGE APPLICATION ROUTING SYSTEM
    // ----------------------------------------------------
    initSPARouting() {
        // Read URL hash on load
        const hash = window.location.hash.replace("#", "");
        if (["home", "booking"].includes(hash)) {
            this.navigate(hash);
        } else {
            this.navigate("home");
        }

        // Handle browser Back/Forward hash changes
        window.addEventListener("hashchange", () => {
            const currentHash = window.location.hash.replace("#", "");
            if (["home", "booking"].includes(currentHash)) {
                this.navigate(currentHash, false);
            }
        });
    }

    navigate(pageName, updateHash = true) {
        this.activePage = pageName;
        
        if (updateHash) {
            window.location.hash = `#${pageName}`;
        }
        
        // Hide all major app sections
        document.querySelectorAll(".app-section").forEach(s => s.style.display = "none");
        
        const header = document.querySelector("header");
        const footer = document.querySelector("footer");
        const whatsapp = document.querySelector(".whatsapp-widget");

        if (header) header.style.display = "block";
        if (footer) footer.style.display = "block";
        if (whatsapp) whatsapp.style.display = "block";
        
        // Highlight current active header link
        document.querySelectorAll(".nav-link").forEach(link => {
            link.classList.remove("active");
            if (link.getAttribute("data-page") === pageName) {
                link.classList.add("active");
            }
        });

        if (pageName === "home") {
            const homeSec = document.getElementById("home-section");
            if (homeSec) homeSec.style.display = "block";
        }
        
        if (pageName === "booking") {
            const bookSec = document.getElementById("booking-section");
            if (bookSec) bookSec.style.display = "block";
            
            // Initialize booking flow
            window.AppBookingWizard.init();
        }
        
        // Scroll smoothly to top on navigation transition
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ----------------------------------------------------
    // TOAST NOTIFICATIONS MANAGER
    // ----------------------------------------------------
    showToast(message, type = "success") {
        const container = document.getElementById("toast-container");
        if (!container) return;
        
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        
        // Select custom styled emoji matching type
        let icon = "✓";
        if (type === "error") icon = "✗";
        if (type === "info") icon = "ℹ";
        if (type === "warning") icon = "⚠";
        
        toast.innerHTML = `
            <span style="font-weight: bold; font-size: 1.1rem;">${icon}</span>
            <span style="font-size: 0.9rem; font-weight: 500;">${message}</span>
        `;
        
        container.appendChild(toast);
        
        // Trigger auto animation exit
        setTimeout(() => {
            toast.classList.add("fade-out");
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }

    // ----------------------------------------------------
    // DYNAMIC PAGE LOADING SPINNERS
    // ----------------------------------------------------
    showLoader(show) {
        const loader = document.getElementById("app-loader");
        if (loader) {
            if (show) {
                loader.style.opacity = "1";
                loader.style.display = "flex";
            } else {
                loader.style.opacity = "0";
                setTimeout(() => loader.style.display = "none", 400);
            }
        }
    }

    // ----------------------------------------------------
    // TRACK BOOKING FEATURE
    // ----------------------------------------------------
    openTrackBookingModal() {
        document.getElementById("track-booking-id").value = "";
        document.getElementById("track-phone").value = "";
        document.getElementById("track-booking-result-area").style.display = "none";
        document.getElementById("modal-track-booking").style.display = "flex";
    }

    async submitTrackBooking() {
        const id = document.getElementById("track-booking-id").value.trim();
        const phone = document.getElementById("track-phone").value.trim();
        if (!id || !phone) {
            this.showToast("Please enter both Booking ID and Phone Number.", "error");
            return;
        }

        this.showLoader(true);
        try {
            const b = await window.AppAPI.trackBooking(id, phone);
            
            const resultArea = document.getElementById("track-booking-result-area");
            const detailsDiv = document.getElementById("track-booking-details");
            const cancelBtn = document.getElementById("btn-customer-cancel");
            const downloadBtn = document.getElementById("btn-customer-download-receipt");
            
            detailsDiv.innerHTML = `
                <p><strong>Status:</strong> <span style="text-transform:uppercase; font-weight:bold; color: ${b.status === 'approved' ? '#10b981' : b.status === 'pending' ? '#f59e0b' : '#ef4444'}">${b.status}</span></p>
                <p><strong>Venue:</strong> ${b.venueName}</p>
                <p><strong>Date & Time:</strong> ${b.date} | ${b.slotTime}</p>
                <p><strong>Total Amount:</strong> ₹${b.total}</p>
            `;
            
            if (b.status === "pending" || b.status === "approved") {
                cancelBtn.style.display = "block";
                cancelBtn.onclick = () => this.executeCustomerCancel(id, phone);
            } else {
                cancelBtn.style.display = "none";
            }
            
            if (downloadBtn) {
                if (b.status === "approved") {
                    downloadBtn.style.display = "block";
                    // Clear old event listener by cloning
                    const newDownloadBtn = downloadBtn.cloneNode(true);
                    downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);
                    newDownloadBtn.addEventListener("click", () => {
                        if (window.AppExports && window.AppExports.downloadReceiptPDF) {
                            window.AppExports.downloadReceiptPDF(b);
                        } else {
                            this.showToast("Export engine not loaded yet.", "warning");
                        }
                    });
                } else {
                    downloadBtn.style.display = "none";
                }
            }
            
            resultArea.style.display = "block";
        } catch(err) {
            this.showToast(err.message, "error");
            document.getElementById("track-booking-result-area").style.display = "none";
        } finally {
            this.showLoader(false);
        }
    }

    async executeCustomerCancel(id, phone) {
        if (!confirm("Are you sure you want to completely cancel this booking? This action cannot be undone, and your slot will be released.")) {
            return;
        }
        
        this.showLoader(true);
        try {
            await window.AppAPI.cancelCustomerBooking(id, phone);
            this.showToast("Your booking has been cancelled successfully.", "success");
            
            // Refresh view
            this.submitTrackBooking();
        } catch(err) {
            this.showToast(err.message, "error");
        } finally {
            this.showLoader(false);
        }
    }
}

// Auto Boot
document.addEventListener("DOMContentLoaded", () => {
    window.AppMain = new MainApplication();
    window.AppMain.init();
});
