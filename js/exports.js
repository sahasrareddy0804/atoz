// A to Z Celebrations - DOCUMENT GENERATION & EXPORT ENGINE (js/exports.js)

const EXPORTS = {
    // ----------------------------------------------------
    // CUSTOMER PDF RECEIPT GENERATION
    // ----------------------------------------------------
    downloadReceiptPDF(booking) {
        if (!window.jspdf || !window.jspdf.jsPDF || !window.jspdf.jsPDF.API.autoTable) {
            window.AppMain.showToast("Loading PDF engine...", "warning");
            this.loadJsPDF(() => this.downloadReceiptPDF(booking));
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Set Title (Left Aligned with Large top margin)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(26, 82, 118); // Modern blue tone
        doc.text("A2Z Private Theater - Booking Details", 15, 30);

        // Helper to extract specific cake addon if it exists
        let cakeReq = "None";
        let otherAddons = [];
        if (booking.addons && booking.addons.length > 0) {
            booking.addons.forEach(a => {
                if (a.name.toLowerCase().includes("cake")) {
                    cakeReq = a.name;
                } else {
                    otherAddons.push(a.name);
                }
            });
        }
        
        let addonReq = otherAddons.length > 0 ? otherAddons.join(", ") : "None";

        // Format date to dd/mm/yyyy
        let formattedDate = booking.date;
        if (formattedDate && formattedDate.includes("-")) {
            const [year, month, day] = formattedDate.split("-");
            formattedDate = `${day}/${month}/${year}`;
        }

        // Format booked-on date
        let bookedOnDate = "N/A";
        if (booking.createdAt) {
            bookedOnDate = new Date(booking.createdAt).toLocaleString();
        }

        // Table Data mapping exactly to the specification order
        const tableData = [
            ["Theater / Screen / Address", `${booking.venueName || "N/A"}\n194a, 4th cross, Kalyan Nagar Chowrasta, Vengal Rao Nagar Rd,\nKalyan Nagar Phase 1, Hyderabad, Telangana 500045`],
            ["Booked on", bookedOnDate],
            ["Name", booking.customerName || "N/A"],
            ["Email", booking.customerEmail || "N/A"],
            ["Phone", booking.customerPhone || "N/A"],
            ["Event Date", formattedDate || "N/A"],
            ["Timing", booking.slotTime || "N/A"],
            ["Decoration Requirement", booking.occasion || "N/A"],
            ["Booking Type", (() => {
                if (booking.bookingType === "standard") {
                    return "Standard";
                } else if (booking.bookingType === "combo") {
                    const comboMap = {
                        "couple-combo": "Together Combo",
                        "min-5-combo": "Mini Combo",
                        "party-combo": "Party Pack",
                        "family-combo": "Family Combo"
                    };
                    return `Combo (${comboMap[booking.bookingComboId] || "Combo package"})`;
                }
                return "Standard";
            })()],
            ["Cake Requirement", cakeReq],
            ["Add-on Requirement", addonReq],
            ["Nick Name", booking.ledNickName || "N/A"],
            ["Number Of People", (() => {
                if (booking.bookingType === "standard") {
                    return booking.personCount ? booking.personCount.toString() : "Not specified";
                } else if (booking.bookingType === "combo") {
                    const comboMap = {
                        "couple-combo": "2",
                        "min-5-combo": "5",
                        "party-combo": "8",
                        "family-combo": "10"
                    };
                    return comboMap[booking.bookingComboId] || "Combo package";
                }
                return "Not specified";
            })()],
            ["Total Amount", booking.total ? `Rs. ${booking.total}` : "Rs. 0"],
            ["Paid Amount", "Rs. 500"],
            ["Balance Amount", booking.total ? `Rs. ${booking.total - 500}` : "Rs. 0"],
            ["Payment Status", booking.status === "approved" ? "Booked" : (booking.status || "Pending")],
            ["Booking ID", booking.id || "N/A"],
            ["Payment ID", booking.paymentId || "N/A"]
        ];

        doc.autoTable({
            startY: 40,
            head: [['Field', 'Details']],
            body: tableData,
            theme: 'striped', // clean striped rows (white and very light gray)
            headStyles: {
                fillColor: [26, 82, 118], // Custom Blue Table Header Background
                textColor: [255, 255, 255], // White
                fontStyle: 'bold',
                fontSize: 9.5,
                cellPadding: 3.5
            },
            bodyStyles: {
                textColor: [50, 50, 50],
                fontSize: 8.5,
                cellPadding: 3.2,
                fontStyle: 'normal'
            },
            columnStyles: {
                0: { cellWidth: 55, fontStyle: 'bold', textColor: [30, 30, 30] },
                1: { cellWidth: 'auto' }
            },
            alternateRowStyles: {
                fillColor: [248, 249, 250] // Very light gray alternating rows
            },
            margin: { left: 15, right: 15, top: 40, bottom: 20 },
            styles: {
                overflow: 'linebreak',
                lineWidth: 0 // Remove heavy borders between rows
            }
        });

        // Save PDF
        doc.save(`A2Z_Booking_${booking.id}.pdf`);
    },

    // ----------------------------------------------------
    // ADMIN PDF CONSOLIDATED REPORT
    // ----------------------------------------------------
    downloadBookingsPDF(bookings) {
        if (!window.jspdf) {
            window.AppMain.showToast("jsPDF library not loaded.", "error");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        // Header Background
        doc.setFillColor(7, 7, 9);
        doc.rect(0, 0, 297, 30, 'F');
        doc.setFillColor(212, 175, 55);
        doc.rect(0, 30, 297, 2, 'F');

        // Brand Name
        doc.setFont("playfair", "bold");
        doc.setFontSize(18);
        doc.setTextColor(212, 175, 55);
        doc.text("A to Z Celebrations - Admin Panel", 20, 18);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(255,255,255);
        doc.text("Bookings Summary Report", 20, 25);

        doc.setTextColor(7, 7, 9);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 220, 42);

        // Table Header
        doc.setFillColor(15, 15, 19);
        doc.rect(15, 48, 267, 8, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        
        doc.text("Booking ID", 18, 53);
        doc.text("Customer Name", 50, 53);
        doc.text("Venue", 88, 53);
        doc.text("Date & Slot", 132, 53);
        doc.text("Occasion", 182, 53);
        doc.text("Amount (Rs)", 222, 53);
        doc.text("Status", 258, 53);

        let y = 62;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(50, 50, 50);

        bookings.forEach((b, idx) => {
            // Zebra striping
            if (idx % 2 === 1) {
                doc.setFillColor(245, 245, 245);
                doc.rect(15, y - 4, 267, 6.5, 'F');
            }

            doc.text(b.id, 18, y);
            doc.text(b.customerName, 50, y);
            doc.text(b.venueName, 88, y);
            doc.text(`${b.date} (${b.slotId.toUpperCase()})`, 132, y);
            doc.text(b.occasion, 182, y);
            doc.text(b.total.toFixed(2), 222, y);
            doc.text(b.status.toUpperCase(), 258, y);

            y += 6.5;

            // Page break handling
            if (y > 185) {
                doc.addPage();
                // Redraw table header
                doc.setFillColor(15, 15, 19);
                doc.rect(15, 15, 267, 8, 'F');
                doc.setFont("helvetica", "bold");
                doc.setTextColor(255, 255, 255);
                doc.text("Booking ID", 18, 20);
                doc.text("Customer Name", 50, 20);
                doc.text("Venue", 88, 20);
                doc.text("Date & Slot", 132, 20);
                doc.text("Occasion", 182, 20);
                doc.text("Amount (Rs)", 222, 20);
                doc.text("Status", 258, 20);
                
                y = 28;
                doc.setFont("helvetica", "normal");
                doc.setTextColor(50, 50, 50);
            }
        });

        // Save PDF
        doc.save(`A2Z_Bookings_Report_${Date.now()}.pdf`);
    },

    // ----------------------------------------------------
    // ADMIN EXCEL / CSV EXPORT
    // ----------------------------------------------------
    downloadBookingsExcel(bookings) {
        // Create CSV Content
        const headers = ["Booking ID", "Customer Name", "Phone", "Email", "City", "Venue", "Booking Date", "Time Slot", "Occasion", "Add-ons Selection", "Subtotal (INR)", "Discount (INR)", "Total Amount (INR)", "Coupon Applied", "Special Notes", "Booking Status", "Created Timestamp"];
        
        const rows = bookings.map(b => {
            const addonsList = b.addons.map(a => `${a.name}(Rs.${a.price})`).join(' | ');
            const sanitizedInstructions = b.specialInstructions ? b.specialInstructions.replace(/"/g, '""') : "";
            
            return [
                b.id,
                b.customerName,
                `'${b.customerPhone}`, // Prefix with single quote to prevent scientific notation in Excel
                b.customerEmail,
                b.cityName,
                b.venueName,
                b.date,
                b.slotTime,
                b.occasion,
                `"${addonsList}"`,
                b.subtotal,
                b.discount,
                b.total,
                b.couponCode || "None",
                `"${sanitizedInstructions}"`,
                b.status.toUpperCase(),
                b.createdAt
            ];
        });

        const csvContent = "\uFEFF" // UTF-8 BOM indicator for Excel to correctly read unicode characters
            + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
            
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        
        if (navigator.msSaveBlob) { // IE 10+
            navigator.msSaveBlob(blob, `A2Z_Bookings_Excel_${Date.now()}.csv`);
        } else {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `A2Z_Bookings_Excel_${Date.now()}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        
        window.AppMain.showToast("CSV report compiled and downloaded successfully!", "success");
    },

    // Helper: Dynamic jsPDF injector if not present
    loadJsPDF(onload) {
        if (window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API.autoTable) {
            onload(); return;
        }
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        script.onload = () => {
            const plugin = document.createElement('script');
            plugin.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js";
            plugin.onload = onload;
            document.head.appendChild(plugin);
        };
        document.head.appendChild(script);
    }
};

window.AppExports = EXPORTS;
