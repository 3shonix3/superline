/**
 * Sian Groups - Interactive Engine
 * Handles Lenis smooth scroll, GSAP animations, magnetic cursor, and scroll triggers.
 */

document.addEventListener("DOMContentLoaded", () => {
    const loader = document.querySelector('.loader');
    const hasGsap = typeof window.gsap !== 'undefined';
    const hasScrollTrigger = typeof window.ScrollTrigger !== 'undefined';

    // Graceful fallback when an external animation CDN is blocked/unavailable.
    // The content must remain usable instead of being trapped behind the loader.
    if (!hasGsap || !hasScrollTrigger) {
        if (loader) loader.remove();
        document.body.style.cursor = 'auto';
        initImagePreviewLightbox();
        initGalleryProgressiveLoading();
        return;
    }

    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    // =========================================================================
    // 01. TEXT SPLITTER UTILITY
    // =========================================================================
    document.querySelectorAll('.split-words').forEach(el => {
        const text = el.innerText;
        el.innerHTML = '';
        text.split(' ').forEach(word => {
            if (word.trim() === '') return;
            el.innerHTML += `<span class="word-wrap"><span class="word">${word}&nbsp;</span></span>`;
        });
    });

    // =========================================================================
    // 02. SMOOTH SCROLLING (Lenis for Desktop Wheels, Native 120fps on Mobile)
    // =========================================================================
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 1024);
    const lenis = (typeof window.Lenis !== 'undefined' && !isTouchDevice)
        ? new Lenis({ 
            duration: 1.2, 
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
            smoothWheel: true,
            syncTouch: false
          })
        : null;

    if (lenis) {
        window.lenis = lenis;
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => { 
            lenis.raf(time * 1000); 
        });
        gsap.ticker.lagSmoothing(500, 33);
    } else {
        window.lenis = null;
        gsap.ticker.lagSmoothing(500, 33);
    }

    // Smooth Scrolling for in-page navigation anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (!targetId) return;
            if (targetId === '#' || targetId === '#home' || targetId === '#top') {
                e.preventDefault();
                if (lenis) {
                    lenis.scrollTo(0, { duration: 1.2 });
                } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                return;
            }
            const targetEl = document.querySelector(targetId);
            if (targetEl) {
                e.preventDefault();
                if (lenis) {
                    lenis.scrollTo(targetEl, { offset: -40, duration: 1.2 });
                } else {
                    targetEl.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

    // =========================================================================
    // 03. MAGNETIC CURSOR & HOVER LOGIC
    // =========================================================================
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorRing = document.querySelector('.cursor-ring');
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX; 
        mouseY = e.clientY;
        if (cursorDot) {
            gsap.to(cursorDot, { x: mouseX, y: mouseY, duration: 0.1, ease: "power2.out" });
        }
    });

    if (cursorRing) {
        gsap.ticker.add(() => {
            ringX += (mouseX - ringX) * 0.15; 
            ringY += (mouseY - ringY) * 0.15;
            gsap.set(cursorRing, { x: ringX, y: ringY });
        });

        document.querySelectorAll('.hover-target, .hl-img').forEach(el => {
            el.addEventListener('mouseenter', () => { 
                cursorRing.classList.add('active'); 
            });
            el.addEventListener('mouseleave', () => { 
                cursorRing.classList.remove('active'); 
            });
        });
    }

    // =========================================================================
    // 04. LIQUID SVG FILTER (Hero Hover)
    // =========================================================================
    const liquidMap = document.querySelector('#liquidMap');
    const heroImgBox = document.querySelector('.hero-img-box');
    let liquidTl = null;
    if (heroImgBox && liquidMap) {
        liquidTl = gsap.timeline({ paused: true });
        liquidTl.to(liquidMap, { attr: { scale: 40 }, duration: 0.8, ease: "power2.out" })
                .to(liquidMap, { attr: { scale: 0 }, duration: 1.2, ease: "power2.inOut" });
        heroImgBox.addEventListener('mouseenter', () => liquidTl.restart());
    }

    // =========================================================================
    // 05. CINEMATIC PRELOADER
    // =========================================================================
    let progress = { val: 0 };
    const percEl = document.querySelector('.loader-perc');
    const tlLoader = gsap.timeline({ 
        onComplete: () => { 
            if (lenis) lenis.start(); 
            initScrollAnimations(); 
        } 
    });

    if (loader) {
        loader.addEventListener('click', () => {
            tlLoader.progress(1);
        });
    }

    tlLoader.to(progress, {
        val: 100, 
        duration: 1.2, 
        ease: "power2.inOut",
        onUpdate: () => {
            if (percEl) percEl.innerText = Math.round(progress.val);
            gsap.set('.loader-bar', { width: progress.val + "%" });
        }
    })
    .to('.loader', { yPercent: -100, duration: 0.8, ease: "power4.inOut", delay: 0.1 })
    .to('#hero-img', { clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)", duration: 1.4, ease: "power4.inOut" }, "-=0.6")
    .fromTo('#hero-img .img-parallax', { scale: 1.2 }, { scale: 1, duration: 1.8, ease: "power3.out" }, "-=1.4")
    .to('.s-hero .word', { y: '0%', duration: 1, stagger: 0.04, ease: "power4.out" }, "-=1.2")
    .to('.s-hero .gs-fade', { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }, "-=1.0");

    // =========================================================================
    // 06. CORE SCROLL ANIMATIONS FUNCTION
    // =========================================================================
    function initScrollAnimations() {
        
        // A. Highlight words reveal
        gsap.to('.hl-word', {
            opacity: 1, 
            stagger: 0.04,
            scrollTrigger: { 
                trigger: ".hl-container", 
                start: "top 75%", 
                end: "bottom 60%", 
                scrub: 1 
            }
        });

        // B. Cinematic Expand Section
        // B. Expand Cinematic Image (All Devices)
        const expandTrigger = document.querySelector("#expand-trigger");
        if (expandTrigger) {
            const isMobile = window.innerWidth <= 1024;
            const expandTl = gsap.timeline({
                scrollTrigger: { 
                    trigger: "#expand-trigger", 
                    start: "top top", 
                    end: isMobile ? "+=1000" : "+=1800", 
                    pin: true, 
                    pinSpacing: true, 
                    anticipatePin: 1, 
                    scrub: 1, 
                    invalidateOnRefresh: true 
                }
            });
            
            expandTl.to('.expand-container', { 
                width: '100vw', 
                height: () => window.innerHeight + 'px', 
                borderRadius: '0px', 
                ease: "power2.inOut", 
                duration: 1 
            })
            .to('#expand-img', { filter: "brightness(0.7) grayscale(0%)", duration: 1 }, "<")
            .to('.expand-text', { opacity: 1, duration: 0.3 }, "-=0.2");
        }

        // C. Horizontal Gallery Scroll (All Devices: Mobile & Desktop)
        const hTrack = document.querySelector('.horiz-track');
        const hzSection = document.querySelector('#hz-trigger');
        if (hTrack && hzSection) {
            const getScrollAmount = () => -(hTrack.scrollWidth - window.innerWidth);
            
            gsap.to(hTrack, {
                x: getScrollAmount, 
                ease: "none",
                scrollTrigger: { 
                    trigger: "#hz-trigger", 
                    start: "top top", 
                    pin: true, 
                    pinSpacing: true,
                    anticipatePin: 1,
                    scrub: 1, 
                    invalidateOnRefresh: true,
                    end: () => "+=" + (window.innerWidth <= 1024 
                        ? Math.max(window.innerHeight * 1.6, hTrack.scrollWidth - window.innerWidth) 
                        : (hTrack.scrollWidth - window.innerWidth))
                }
            });

        }

        // D. Infinite Marquee Scroll (Desktop and Tablet > 768px only)
        if (window.innerWidth > 768 && document.querySelector('.s-marquee')) {
            gsap.to('.marquee-wrap', {
                xPercent: -50, 
                ease: 'none',
                scrollTrigger: { 
                    trigger: '.s-marquee', 
                    start: "top bottom", 
                    end: "bottom top", 
                    scrub: true 
                }
            });
        }

        // E. Masonry Details Grid (Parallax Speeds)
        if (window.innerWidth > 1024) {
            gsap.utils.toArray('.grid-col').forEach(col => {
                let speed = parseFloat(col.getAttribute('data-speed')) || 1;
                gsap.to(col, {
                    y: () => -80 * speed, 
                    ease: "none",
                    scrollTrigger: { 
                        trigger: '.archive-grid', 
                        start: "top bottom", 
                        end: "bottom top", 
                        scrub: 1 
                    }
                });
            });
        }

        // F. Global Utilities (Staggers, Fades, Vertical Masks)
        document.querySelectorAll('section:not(.s-hero)').forEach(sec => {
            const words = sec.querySelectorAll('.word');
            if (words.length) {
                gsap.to(words, {
                    scrollTrigger: { 
                        trigger: sec, 
                        start: "top 80%", 
                        toggleActions: "play none none reverse" 
                    },
                    y: '0%', 
                    duration: 1.2, 
                    stagger: 0.04, 
                    ease: "power4.out"
                });
            }

            const fades = sec.querySelectorAll('.gs-fade');
            if (fades.length) {
                gsap.fromTo(fades, { opacity: 0, y: 30 }, {
                    scrollTrigger: { 
                        trigger: sec, 
                        start: "top 85%", 
                        toggleActions: "play none none reverse" 
                    },
                    opacity: 1, 
                    y: 0, 
                    duration: 1.2, 
                    stagger: 0.1, 
                    ease: "power3.out"
                });
            }

            const imgMasks = sec.querySelectorAll('.img-mask:not(#hero-img):not(.hz-img):not(.archive-grid .img-mask)');
            imgMasks.forEach(mask => {
                gsap.to(mask, {
                    scrollTrigger: { 
                        trigger: mask, 
                        start: "top 85%", 
                        toggleActions: "play none none reverse" 
                    },
                    clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)", 
                    duration: 1.6, 
                    ease: "power4.inOut"
                });
            });
        });

        // G. Universal Image Parallax (Desktop Only for 60-120fps Mobile Scrolling)
        if (window.innerWidth > 1024) {
            gsap.utils.toArray('.img-parallax').forEach(img => {
                if (img.closest('.s-expand') || img.closest('.s-horiz') || img.closest('#hz-trigger')) return; 
                gsap.to(img, {
                    yPercent: 15, 
                    ease: "none",
                    scrollTrigger: { 
                        trigger: img.parentElement, 
                        start: "top bottom", 
                        end: "bottom top", 
                        scrub: true 
                    }
                });
            });
        }
        
        // H. Dynamic Theme Color Shifting (Desktop / Tablet with Marquee Visible)
        const darkThemeTrigger = document.querySelector("#theme-trigger-dark");
        if (darkThemeTrigger && window.innerWidth > 768) {
            ScrollTrigger.create({
                trigger: darkThemeTrigger, 
                start: "top 50%", 
                end: "bottom 50%",
                onEnter: () => document.body.className = "theme-dark",
                onLeaveBack: () => document.body.className = "theme-light"
            });
        }

        const galleryTrigger = document.querySelector("#gallery");
        if (galleryTrigger) {
            ScrollTrigger.create({
                trigger: galleryTrigger, 
                start: "top 50%", 
                end: "bottom 50%",
                onEnter: () => document.body.className = "theme-light",
                onLeaveBack: () => document.body.className = "theme-dark"
            });
        }

        const contactTrigger = document.querySelector("#contact");
        if (contactTrigger) {
            ScrollTrigger.create({
                trigger: contactTrigger, 
                start: "top 50%", 
                onEnter: () => document.body.className = "theme-light",
                onLeaveBack: () => document.body.className = "theme-light"
            });
        }

        ScrollTrigger.refresh();
    }

    // =========================================================================
    // 07. FULLSCREEN IMAGE PREVIEW LIGHTBOX CONTROLLER
    // =========================================================================
    function initImagePreviewLightbox() {
        const modal = document.getElementById('imagePreviewModal');
        const modalImg = document.getElementById('modalPreviewImg');
        const modalCaption = document.getElementById('modalCaption');
        const modalCloseBtn = document.getElementById('modalCloseBtn');
        const modalBackdrop = document.getElementById('modalBackdrop');

        function openImagePreview(src, alt) {
            if (!modal || !modalImg) return;
            modalImg.src = src;
            modalImg.alt = alt || 'Preview';
            if (modalCaption) {
                modalCaption.innerText = alt || '';
                modalCaption.style.display = alt ? 'block' : 'none';
            }
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            if (typeof lenis !== 'undefined' && lenis) lenis.stop();
            if (cursorRing) {
                cursorRing.classList.remove('active');
            }
        }

        function closeImagePreview() {
            if (!modal) return;
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
            if (typeof lenis !== 'undefined' && lenis) lenis.start();
            if (cursorRing) {
                cursorRing.classList.remove('active');
            }
            setTimeout(() => {
                if (modalImg) modalImg.src = '';
            }, 400);
        }

        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeImagePreview();
            });
            modalCloseBtn.addEventListener('mouseenter', () => {
                if (cursorRing) {
                    cursorRing.classList.add('active');
                }
            });
            modalCloseBtn.addEventListener('mouseleave', () => {
                if (cursorRing) {
                    cursorRing.classList.remove('active');
                }
            });
        }

        if (modalBackdrop) {
            modalBackdrop.addEventListener('click', closeImagePreview);
        }

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.classList.contains('is-open')) {
                closeImagePreview();
            }
        });

        // Make all images interactive with click preview
        const previewContainers = document.querySelectorAll(
            '.hover-target, .img-mask, .expand-container, .hero-img-box, .h-img, .archive-grid .img-mask'
        );

        previewContainers.forEach(el => {
            const img = el.querySelector('img') || (el.tagName === 'IMG' ? el : null);
            if (!img) return;

            el.style.cursor = 'pointer';

            el.addEventListener('mouseenter', () => {
                if (cursorRing && (!modal || !modal.classList.contains('is-open'))) {
                    cursorRing.classList.add('active');
                }
            });

            el.addEventListener('mouseleave', () => {
                if (cursorRing && (!modal || !modal.classList.contains('is-open'))) {
                    cursorRing.classList.remove('active');
                }
            });

            el.addEventListener('click', (e) => {
                e.preventDefault();
                const src = img.currentSrc || img.src;
                const alt = img.alt || '';
                openImagePreview(src, alt);
            });
        });
    }

    initImagePreviewLightbox();

    // =========================================================================
    // 08. SECTION 6 GALLERY PROGRESSIVE LOADING CONTROLLER
    // =========================================================================
    function initGalleryProgressiveLoading() {
        const grid = document.querySelector('.archive-grid');
        const loadMoreBtn = document.getElementById('galleryLoadMoreBtn');
        const loadMoreWrap = document.getElementById('galleryLoadMoreWrap');
        const countBadge = document.getElementById('galleryCountBadge');
        if (!grid || !loadMoreBtn || !loadMoreWrap) return;

        const cols = Array.from(grid.querySelectorAll('.grid-col'));
        if (!cols.length) return;

        // Build round-robin ordered list of items across the 3 columns
        const colItems = cols.map(col => Array.from(col.querySelectorAll('.img-mask')));
        const maxLen = Math.max(...colItems.map(c => c.length));
        const allItems = [];

        for (let i = 0; i < maxLen; i++) {
            for (let c = 0; c < colItems.length; c++) {
                if (colItems[c][i]) {
                    allItems.push(colItems[c][i]);
                }
            }
        }

        const totalItems = allItems.length; // 33 items
        if (totalItems === 0) return;

        // Assign CSS order for flex flow on mobile
        allItems.forEach((item, idx) => {
            item.style.order = (idx + 1).toString();
        });

        // Config based on screen width:
        // Mobile (<= 768px): initial 4, step 5
        // Desktop (> 768px): initial 10, step 10
        function getBatchConfig() {
            const isMobile = window.innerWidth <= 768;
            return {
                initial: isMobile ? 4 : 10,
                step: isMobile ? 5 : 10
            };
        }

        let visibleCount = getBatchConfig().initial;

        function updateGalleryVisibility(isInitial) {
            allItems.forEach((item, index) => {
                const img = item.querySelector('img');
                if (index < visibleCount) {
                    item.classList.remove('gallery-item-hidden');
                    if (!isInitial) {
                        item.classList.add('gallery-item-revealed');
                    }
                    if (img && img.getAttribute('loading') === 'lazy') {
                        img.loading = 'eager';
                    }
                } else {
                    item.classList.add('gallery-item-hidden');
                    item.classList.remove('gallery-item-revealed');
                }
            });

            if (countBadge) {
                countBadge.innerText = Math.min(visibleCount, totalItems) + ' / ' + totalItems;
            }

            if (visibleCount >= totalItems) {
                loadMoreWrap.classList.add('is-hidden');
            } else {
                loadMoreWrap.classList.remove('is-hidden');
            }

            if (typeof ScrollTrigger !== 'undefined') {
                ScrollTrigger.refresh();
            }
        }

        // Initialize state
        updateGalleryVisibility(true);

        // Click handler
        loadMoreBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const { step } = getBatchConfig();
            visibleCount = Math.min(visibleCount + step, totalItems);
            updateGalleryVisibility(false);
        });

        // Window resize adaptation
        let prevIsMobile = window.innerWidth <= 768;
        window.addEventListener('resize', () => {
            const currentIsMobile = window.innerWidth <= 768;
            if (currentIsMobile !== prevIsMobile) {
                prevIsMobile = currentIsMobile;
                const minInitial = currentIsMobile ? 4 : 10;
                if (visibleCount < minInitial) {
                    visibleCount = minInitial;
                    updateGalleryVisibility(false);
                }
            }
        });
    }

    initGalleryProgressiveLoading();

    // =========================================================================
    // 08. CONTACT FORM SUBMISSION HANDLER
    // =========================================================================
    window.handleContactSubmit = function(e) {
        e.preventDefault();
        const form = e.target;
        const feedback = document.getElementById('formFeedback');
        const submitBtn = form.querySelector('.form-submit-btn');

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.7';
            submitBtn.innerText = 'Submitting Request...';
        }

        setTimeout(() => {
            if (feedback) {
                feedback.style.display = 'block';
                feedback.innerHTML = '<strong>Thank you!</strong> Your consultation request has been received. Our master specialists will contact you within 24 hours.';
            }
            form.reset();
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.innerHTML = '<span>Request Sent Successfully ✓</span>';
            }
        }, 600);
    };

    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 180);
    });
    window.addEventListener("orientationchange", () => {
        setTimeout(() => ScrollTrigger.refresh(), 200);
    });
    window.addEventListener("load", () => {
        ScrollTrigger.refresh();
    });

    // =========================================================================
    // 09. SECURITY & IMAGE PROTECTION (Disable Right-Click, Drag & Save)
    // =========================================================================
    document.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        return false;
    });

    document.addEventListener("dragstart", (e) => {
        if (e.target.tagName === "IMG" || e.target.closest("img")) {
            e.preventDefault();
            return false;
        }
    });

    window.addEventListener("keydown", (e) => {
        // Prevent Ctrl+S (Save), Ctrl+U (View Source), Ctrl+P (Print)
        if (
            (e.ctrlKey || e.metaKey) && 
            (e.key === 's' || e.key === 'S' || e.key === 'u' || e.key === 'U' || e.key === 'p' || e.key === 'P')
        ) {
            e.preventDefault();
            return false;
        }
    });

    // =========================================================================
    // 10. MOBILE NAVIGATION DRAWER CONTROLLER
    // =========================================================================
    const mobileToggle = document.getElementById('mobileNavToggle');
    const mobileDrawer = document.getElementById('mobileNavDrawer');
    const mobileClose = document.getElementById('mobileNavClose');
    const mobileBackdrop = document.getElementById('mobileNavBackdrop');
    const mobileLinks = document.querySelectorAll('.mobile-nav-link, #mobileNavCta');

    function openMobileNav() {
        if (!mobileDrawer) return;
        mobileDrawer.classList.add('is-open');
        mobileDrawer.setAttribute('aria-hidden', 'false');
        if (mobileToggle) mobileToggle.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
        if (window.lenis) window.lenis.stop();
    }

    function closeMobileNav() {
        if (!mobileDrawer) return;
        mobileDrawer.classList.remove('is-open');
        mobileDrawer.setAttribute('aria-hidden', 'true');
        if (mobileToggle) mobileToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        if (window.lenis) window.lenis.start();
    }

    if (mobileToggle) {
        mobileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (mobileDrawer && mobileDrawer.classList.contains('is-open')) {
                closeMobileNav();
            } else {
                openMobileNav();
            }
        });
    }

    if (mobileClose) {
        mobileClose.addEventListener('click', (e) => {
            e.stopPropagation();
            closeMobileNav();
        });
    }

    if (mobileBackdrop) {
        mobileBackdrop.addEventListener('click', closeMobileNav);
    }

    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            closeMobileNav();
        });
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileDrawer && mobileDrawer.classList.contains('is-open')) {
            closeMobileNav();
        }
    });
});

