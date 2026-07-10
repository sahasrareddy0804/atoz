/* HERO SECTION */
.hero {
    height: 100vh;
    min-height: 600px;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
}

.hero-slider {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
}

.hero-slide {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    transition: opacity 1s ease-in-out;
    background-size: cover;
    background-position: center;
}

.hero-slide.active {
    opacity: 1;
}

.hero-slide::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 0%, rgba(247, 246, 251, 0.85) 80%, rgba(247, 246, 251, 1) 100%);
}

.hero-content {
    position: relative;
    z-index: 2;
    max-width: 750px;
    margin-top: 80px;
    animation: slideUp 1s ease-out;
}

.hero-title {
    font-size: 4rem;
    font-weight: 800;
    line-height: 1.1;
    margin-bottom: 24px;
}

.hero-description {
    font-size: 1.2rem;
    color: var(--text-secondary);
    margin-bottom: 36px;
}

/* SERVICES SECTION */
.services-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 30px;
}

.service-card {
    position: relative;
    overflow: hidden;
    border-radius: var(--radius-md);
    height: 420px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 30px;
    border: 1px solid var(--glass-border);
}

.service-card-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
    transition: transform var(--transition-slow);
    z-index: 1;
}

.service-card:hover .service-card-bg {
    transform: scale(1.1);
}

.service-card::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(to top, rgba(247, 246, 251, 0.92) 0%, rgba(247, 246, 251, 0.4) 50%, rgba(247, 246, 251, 0.1) 100%);
    z-index: 2;
    transition: var(--transition-normal);
}

.service-card:hover::after {
    background: linear-gradient(to top, rgba(247, 246, 251, 0.96) 0%, rgba(247, 246, 251, 0.6) 60%, rgba(247, 246, 251, 0.2) 100%);
}

.service-card-content {
    position: relative;
    z-index: 3;
}

.service-icon-box {
    width: 50px;
    height: 50px;
    background: rgba(124, 58, 237, 0.08);
    border: 1px solid var(--gold-primary);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    color: var(--gold-primary);
    transition: var(--transition-normal);
}

.service-card:hover .service-icon-box {
    background: var(--gold-primary);
    color: #ffffff;
    box-shadow: 0 0 15px var(--gold-primary);
}

.service-title {
    font-size: 1.5rem;
    margin-bottom: 12px;
}

.service-description {
    font-size: 0.95rem;
    color: var(--text-secondary);
    margin-bottom: 20px;
    opacity: 0.85;
}

.service-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--gold-primary);
}

.service-link svg {
    transition: transform var(--transition-fast);
}

.service-card:hover .service-link svg {
    transform: translateX(5px);
}

/* GALLERY / PHOTOS SLIDER */
.gallery-section {
    background: var(--bg-surface);
}

.gallery-container {
    position: relative;
    overflow: hidden;
    width: 100%;
    padding: 20px 0;
}

.gallery-track {
    display: flex;
    gap: 20px;
    transition: transform var(--transition-slow);
}

.gallery-item {
    flex: 0 0 350px;
    height: 250px;
    border-radius: var(--radius-md);
    overflow: hidden;
    border: 1px solid var(--glass-border);
    position: relative;
    cursor: pointer;
}

.gallery-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform var(--transition-normal);
}

.gallery-item:hover .gallery-img {
    transform: scale(1.08);
}

.gallery-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(124, 58, 237, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: var(--transition-normal);
}

.gallery-item:hover .gallery-overlay {
    opacity: 1;
}

.gallery-overlay svg {
    color: var(--gold-primary);
    transform: scale(0.8);
    transition: var(--transition-normal);
}

.gallery-item:hover .gallery-overlay svg {
    transform: scale(1);
}

.gallery-controls {
    display: flex;
    justify-content: center;
    gap: 15px;
    margin-top: 30px;
}

.gallery-control-btn {
    width: 45px;
    height: 45px;
    border-radius: 50%;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-primary);
    transition: var(--transition-fast);
}

.gallery-control-btn:hover {
    border-color: var(--gold-primary);
    color: var(--gold-primary);
    background: rgba(124, 58, 237, 0.05);
}

/* CUSTOMER TESTIMONIALS */
.testimonials-slider {
    position: relative;
    max-width: 800px;
    margin: 0 auto;
    overflow: hidden;
    min-height: 280px;
}

.testimonial-slide {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    opacity: 0;
    transition: opacity var(--transition-normal);
    text-align: center;
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.testimonial-slide.active {
    position: relative;
    opacity: 1;
}

.quote-icon {
    color: rgba(124, 58, 237, 0.15);
    margin-bottom: 20px;
}

.testimonial-rating {
    display: flex;
    gap: 4px;
    margin-bottom: 15px;
}

.testimonial-rating svg {
    fill: var(--gold-primary);
    color: var(--gold-primary);
    width: 18px;
    height: 18px;
}

.testimonial-text {
    font-size: 1.25rem;
    font-style: italic;
    color: var(--text-primary);
    margin-bottom: 24px;
    line-height: 1.5;
}

.testimonial-author {
    font-family: var(--font-heading);
    font-size: 1.15rem;
    font-weight: 600;
}

.testimonial-role {
    font-size: 0.85rem;
    color: var(--gold-primary);
}

/* CONTACT & MAP SECTION */
.contact-section {
    background: var(--bg-surface);
}

.contact-grid {
    display: grid;
    grid-template-columns: 1fr 1.2fr;
    gap: 50px;
    align-items: center;
}

.contact-info-cards {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.contact-info-card {
    display: flex;
    align-items: flex-start;
    gap: 20px;
    padding: 24px;
}

.contact-icon-wrapper {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: rgba(124, 58, 237, 0.08);
    border: 1px solid var(--gold-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--gold-primary);
    flex-shrink: 0;
}

.contact-card-title {
    font-size: 1.1rem;
    margin-bottom: 4px;
}

.contact-card-value {
    color: var(--text-secondary);
    font-size: 0.95rem;
}

.map-wrapper {
    width: 100%;
    height: 400px;
    border-radius: var(--radius-md);
    overflow: hidden;
    border: 1px solid var(--glass-border);
    position: relative;
}

.map-wrapper iframe {
    width: 100%;
    height: 100%;
    border: 0;
}

/* FOOTER */
footer {
    background: #eeedf5;
    border-top: 1px solid var(--border-color);
    padding: 70px 0 30px 0;
}

.footer-grid {
    display: grid;
    grid-template-columns: 1.5fr 1fr 1fr 1.2fr;
    gap: 40px;
    margin-bottom: 50px;
}

.footer-brand p {
    font-size: 0.95rem;
    margin-top: 20px;
    color: var(--text-secondary);
}

.footer-title {
    font-size: 1.2rem;
    margin-bottom: 24px;
    position: relative;
    padding-bottom: 8px;
}

.footer-title::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 35px;
    height: 2px;
    background: var(--gold-primary);
}

.footer-links {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.footer-link {
    font-size: 0.9rem;
    color: var(--text-secondary);
}

.footer-link:hover {
    color: var(--gold-primary);
    transform: translateX(4px);
}

.social-links {
    display: flex;
    gap: 12px;
    margin-top: 10px;
}

.social-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(124, 58, 237, 0.04);
    border: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    transition: var(--transition-fast);
}

.social-btn:hover {
    background: var(--gold-primary);
    color: #ffffff;
    border-color: var(--gold-primary);
    transform: translateY(-3px);
}

.footer-bottom {
    border-top: 1px solid var(--border-color);
    padding-top: 30px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
    color: var(--text-muted);
}

.footer-bottom-links {
    display: flex;
    gap: 20px;
}

.footer-bottom-link:hover {
    color: var(--text-secondary);
}

/* RESPONSIVE LAYOUTS */
@media (max-width: 1024px) {
    .hero-title {
        font-size: 3rem;
    }
    
    .contact-grid {
        grid-template-columns: 1fr;
        gap: 40px;
    }
    
    .footer-grid {
        grid-template-columns: 1fr 1fr;
        gap: 30px;
    }
}

@media (max-width: 576px) {
    .hero-title {
        font-size: 2.2rem;
    }
    
    .hero-description {
        font-size: 1rem;
    }
    
    .footer-grid {
        grid-template-columns: 1fr;
    }
    
    .footer-bottom {
        flex-direction: column;
        gap: 15px;
        text-align: center;
    }
    
    .footer-bottom-links {
        justify-content: center;
    }

    /* Enhance Touch Targets */
    .gallery-control-btn, .social-btn {
        width: 48px !important;
        height: 48px !important;
        font-size: 1.2rem;
    }
    
    .gallery-item {
        min-width: 280px;
        height: 350px;
    }
}
