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
    // Prevent mobile address bar show/hide from recalculating scroll positions and causing jerks
    if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.config({
            ignoreMobileResize: true,
            autoRefreshEvents: "visibilitychange,DOMContentLoaded,load"
        });
    }

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
    // 05. DIRECT PAGE OPENING & HERO DISPLAY (Preloader Removed)
    // =========================================================================
    if (loader) loader.remove();
    if (lenis) lenis.start();
    initScrollAnimations();

    // Directly reveal hero elements immediately on load
    gsap.set('#hero-img', { clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" });
    gsap.set('#hero-img .img-parallax', { scale: 1 });
    gsap.set('.s-hero .word', { y: '0%' });
    gsap.set('.s-hero .gs-fade', { opacity: 1, y: 0 });

    // =========================================================================
    // 06. CORE SCROLL ANIMATIONS FUNCTION
    // =========================================================================
    function initScrollAnimations() {
        
        // A. Highlight words reveal (if present)
        if (document.querySelector('.hl-word')) {
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
        }

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

        // C. Manual Horizontal Touch-To-Slide & Drag Slider
        initManualHorizontalSlider();

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
                gsap.fromTo(fades, { opacity: 0, y: 24 }, {
                    scrollTrigger: { 
                        trigger: sec, 
                        start: "top 88%", 
                        toggleActions: "play none none none", 
                        once: true 
                    },
                    opacity: 1, 
                    y: 0, 
                    duration: 0.9, 
                    stagger: 0.08, 
                    ease: "power2.out"
                });
            }

            const imgMasks = sec.querySelectorAll('.img-mask:not(#hero-img):not(.hz-img):not(.archive-grid .img-mask)');
            imgMasks.forEach(mask => {
                gsap.to(mask, {
                    scrollTrigger: { 
                        trigger: mask, 
                        start: "top 85%", 
                        toggleActions: "play none none none",
                        once: true
                    },
                    clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)", 
                    duration: 1.4, 
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
        
        // H. Dynamic Theme Color Shifting (Desktop Only when Marquee is active)
        const darkThemeTrigger = document.querySelector("#theme-trigger-dark");
        if (darkThemeTrigger && window.innerWidth > 768) {
            ScrollTrigger.create({
                trigger: darkThemeTrigger, 
                start: "top 50%", 
                end: "bottom 50%",
                onEnter: () => {
                    document.body.classList.remove('theme-light');
                    document.body.classList.add('theme-dark');
                },
                onLeave: () => {
                    document.body.classList.remove('theme-dark');
                    document.body.classList.add('theme-light');
                },
                onEnterBack: () => {
                    document.body.classList.remove('theme-light');
                    document.body.classList.add('theme-dark');
                },
                onLeaveBack: () => {
                    document.body.classList.remove('theme-dark');
                    document.body.classList.add('theme-light');
                }
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
                // If user was dragging on the horizontal track, do not open preview modal
                if (el.closest('.horiz-track') && window.isDraggingHoriz) {
                    return;
                }
                e.preventDefault();
                const src = img.currentSrc || img.src;
                const alt = img.alt || '';
                openImagePreview(src, alt);
            });
        });
    }

    initImagePreviewLightbox();

    // =========================================================================
    // 07B. MANUAL HORIZONTAL TOUCH-TO-SLIDE & DRAG CONTROLLER
    // =========================================================================
    function initManualHorizontalSlider() {
        const track = document.getElementById('horizTrack') || document.querySelector('.horiz-track');
        if (!track) return;

        let isDown = false;
        let startX = 0;
        let startScrollLeft = 0;
        let lastX = 0;
        let lastTime = 0;
        let velocity = 0;
        let rafId = null;
        let isDragging = false;
        let totalDelta = 0;

        window.isDraggingHoriz = false;

        function stopMomentum() {
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        }

        function snapToNearestCard() {
            const panels = track.querySelectorAll('.h-panel');
            if (!panels.length) return;

            const trackRect = track.getBoundingClientRect();
            const trackCenter = trackRect.left + trackRect.width / 2;

            let closestPanel = null;
            let closestDistance = Infinity;

            panels.forEach(panel => {
                const rect = panel.getBoundingClientRect();
                const panelCenter = rect.left + rect.width / 2;
                const dist = Math.abs(panelCenter - trackCenter);
                if (dist < closestDistance) {
                    closestDistance = dist;
                    closestPanel = panel;
                }
            });

            if (closestPanel) {
                const targetLeft = closestPanel.offsetLeft - (track.clientWidth - closestPanel.offsetWidth) / 2;
                track.scrollTo({
                    left: Math.max(0, targetLeft),
                    behavior: 'smooth'
                });
            }
        }

        function startMomentum() {
            stopMomentum();

            // If drag had very low velocity, snap gently to nearest card
            if (Math.abs(velocity) < 0.12) {
                track.classList.remove('is-dragging');
                snapToNearestCard();
                setTimeout(() => {
                    window.isDraggingHoriz = false;
                }, 80);
                return;
            }

            const friction = 0.94;
            let currentVel = velocity * 15;
            const maxScroll = track.scrollWidth - track.clientWidth;

            function momentumStep() {
                currentVel *= friction;

                if (Math.abs(currentVel) > 0.4) {
                    track.scrollLeft -= currentVel;

                    if (track.scrollLeft <= 0 || track.scrollLeft >= maxScroll) {
                        currentVel = 0;
                    } else {
                        rafId = requestAnimationFrame(momentumStep);
                        return;
                    }
                }

                track.classList.remove('is-dragging');
                snapToNearestCard();
                setTimeout(() => {
                    window.isDraggingHoriz = false;
                }, 80);
            }

            rafId = requestAnimationFrame(momentumStep);
        }

        // Universal Pointer event handlers (Mouse, Touch, Stylus)
        track.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;

            stopMomentum();
            isDown = true;
            isDragging = false;
            window.isDraggingHoriz = false;
            totalDelta = 0;

            startX = e.clientX;
            lastX = e.clientX;
            lastTime = performance.now();
            startScrollLeft = track.scrollLeft;
            velocity = 0;

            try {
                track.setPointerCapture(e.pointerId);
            } catch (err) {}
        });

        track.addEventListener('pointermove', (e) => {
            if (!isDown) return;

            const currentX = e.clientX;
            const now = performance.now();
            const deltaX = currentX - lastX;
            const dt = Math.max(now - lastTime, 1);

            totalDelta += Math.abs(currentX - startX);

            if (totalDelta > 6 && !isDragging) {
                isDragging = true;
                window.isDraggingHoriz = true;
                track.classList.add('is-dragging');
            }

            if (isDragging) {
                e.preventDefault();

                // Compute smoothed instantaneous velocity
                const instantVel = deltaX / dt;
                velocity = velocity * 0.35 + instantVel * 0.65;

                // Smooth direct drag movement
                const walk = (currentX - startX) * 1.2;
                track.scrollLeft = startScrollLeft - walk;
            }

            lastX = currentX;
            lastTime = now;
        });

        const handlePointerEnd = (e) => {
            if (!isDown) return;
            isDown = false;

            try {
                if (track.hasPointerCapture(e.pointerId)) {
                    track.releasePointerCapture(e.pointerId);
                }
            } catch (err) {}

            if (isDragging) {
                startMomentum();
            } else {
                track.classList.remove('is-dragging');
                window.isDraggingHoriz = false;
            }
        };

        track.addEventListener('pointerup', handlePointerEnd);
        track.addEventListener('pointercancel', handlePointerEnd);

        // Prevent browser native image ghost dragging
        track.querySelectorAll('img').forEach(img => {
            img.addEventListener('dragstart', (e) => e.preventDefault());
        });

        // Navigation arrow buttons with fluid stepping
        const prevBtn = document.getElementById('horizPrevBtn');
        const nextBtn = document.getElementById('horizNextBtn');

        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                stopMomentum();
                const step = track.querySelector('.h-panel')?.offsetWidth || 400;
                const gap = parseInt(window.getComputedStyle(track).gap) || 24;
                track.scrollBy({ left: -(step + gap), behavior: 'smooth' });
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                stopMomentum();
                const step = track.querySelector('.h-panel')?.offsetWidth || 400;
                const gap = parseInt(window.getComputedStyle(track).gap) || 24;
                track.scrollBy({ left: (step + gap), behavior: 'smooth' });
            });
        }
    }

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
    // 08. CONTACT FORM SUBMISSION HANDLER (Real AJAX Delivery via FormSubmit)
    // =========================================================================
    window.handleContactSubmit = async function(e) {
        e.preventDefault();
        const form = e.target;
        const feedback = document.getElementById('formFeedback');
        const submitBtn = form.querySelector('.form-submit-btn');
        const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '<span>Send Consultation Request</span>';

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.75';
            submitBtn.innerHTML = '<span>Sending Request...</span>';
        }

        if (feedback) {
            feedback.style.display = 'none';
            feedback.className = 'form-feedback';
        }

        const formData = {
            name: form.name ? form.name.value.trim() : '',
            phone: form.phone ? form.phone.value.trim() : '',
            email: form.email ? form.email.value.trim() : '',
            service: form.service ? form.service.value : '',
            message: form.message ? form.message.value.trim() : '',
            _subject: `New Consultation Request from ${form.name ? form.name.value.trim() : 'Website Client'} - Superline`
        };

        try {
            const response = await fetch("https://formsubmit.co/ajax/superlinelecandreno@gmail.com", {
                method: "POST",
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok && (result.success === "true" || result.success === true)) {
                if (feedback) {
                    feedback.style.display = 'block';
                    feedback.className = 'form-feedback is-success';
                    feedback.innerHTML = '<strong>Request Sent Successfully!</strong> Your consultation request has been received. Our master specialists will contact you within 24 hours.';
                }
                form.reset();
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = '1';
                    submitBtn.innerHTML = '<span>Request Sent Successfully ✓</span>';
                    setTimeout(() => {
                        submitBtn.innerHTML = originalBtnHtml;
                    }, 5000);
                }
            } else {
                throw new Error(result.message || 'Submission failed');
            }
        } catch (err) {
            console.warn('Form submission notice:', err);
            if (feedback) {
                feedback.style.display = 'block';
                feedback.className = 'form-feedback is-success';
                feedback.innerHTML = `<strong>Consultation Request Received!</strong> If not sent automatically, you may also <a href="mailto:superlinelecandreno@gmail.com?cc=info@superlineelectricalandrenovation.ca&subject=Consultation%20Request%20from%20${encodeURIComponent(formData.name)}&body=Name:%20${encodeURIComponent(formData.name)}%0D%0APhone:%20${encodeURIComponent(formData.phone)}%0D%0AEmail:%20${encodeURIComponent(formData.email)}%0D%0AService:%20${encodeURIComponent(formData.service)}%0D%0A%0D%0AMessage:%0D%0A${encodeURIComponent(formData.message)}" style="color: var(--accent); font-weight: 600; text-decoration: underline;">click here to email us directly</a>.`;
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.innerHTML = originalBtnHtml;
            }
        }
    };

    let resizeTimer;
    let lastKnownWidth = window.innerWidth;
    window.addEventListener("resize", () => {
        // Prevent mobile address bar show/collapse from triggering ScrollTrigger refresh and jumping
        if (window.innerWidth === lastKnownWidth) return;
        lastKnownWidth = window.innerWidth;
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

    let savedScrollY = 0;
    let isMobileNavOpen = false;

    function openMobileNav() {
        if (!mobileDrawer || isMobileNavOpen) return;
        isMobileNavOpen = true;

        savedScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;

        // Ensure theme class is light
        document.body.classList.remove('theme-dark');
        document.body.classList.add('theme-light');

        // Robust mobile scroll locking on html and body
        document.documentElement.classList.add('mobile-nav-open');
        document.body.classList.add('mobile-nav-open');
        document.body.style.top = `-${savedScrollY}px`;

        mobileDrawer.classList.add('is-open');
        mobileDrawer.setAttribute('aria-hidden', 'false');
        if (mobileToggle) mobileToggle.setAttribute('aria-expanded', 'true');
        if (window.lenis) window.lenis.stop();
    }

    function closeMobileNav(targetSelector) {
        if (!mobileDrawer || !isMobileNavOpen) return;
        isMobileNavOpen = false;

        mobileDrawer.classList.remove('is-open');
        mobileDrawer.setAttribute('aria-hidden', 'true');
        if (mobileToggle) mobileToggle.setAttribute('aria-expanded', 'false');

        // Remove mobile scroll locking
        document.documentElement.classList.remove('mobile-nav-open');
        document.body.classList.remove('mobile-nav-open');
        document.body.style.top = '';

        // Guarantee body stays theme-light on mobile
        document.body.classList.remove('theme-dark');
        document.body.classList.add('theme-light');

        if (window.lenis) window.lenis.start();

        if (targetSelector && typeof targetSelector === 'string') {
            // Smoothly navigate to clicked section
            if (targetSelector === '#' || targetSelector === '#home' || targetSelector === '#top') {
                if (window.lenis) {
                    window.lenis.scrollTo(0, { duration: 0.8 });
                } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            } else {
                const targetEl = document.querySelector(targetSelector);
                if (targetEl) {
                    if (window.lenis) {
                        window.lenis.scrollTo(targetEl, { offset: -40, duration: 0.8 });
                    } else {
                        targetEl.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            }
        } else {
            // Restore previous scroll position
            window.scrollTo(0, savedScrollY);
        }
    }

    if (mobileToggle) {
        mobileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isMobileNavOpen) {
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
        mobileBackdrop.addEventListener('click', () => closeMobileNav());
    }

    // Touchmove isolation: prevent underlying page touch drag while drawer is open
    if (mobileDrawer) {
        mobileDrawer.addEventListener('touchmove', (e) => {
            if (!e.target.closest('.mobile-nav-inner')) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    mobileLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                closeMobileNav(href);
            } else {
                closeMobileNav();
            }
        });
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isMobileNavOpen) {
            closeMobileNav();
        }
    });
});

