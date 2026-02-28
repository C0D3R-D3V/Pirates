class PirateVoyageSystem {
    constructor() {
        this.audioEnabled = false;
        this.drunkMode = false;
        this.currentPage = 'chart-room';
        this.selectedVoyage = null;
        this.selectedSeat = null;
        this.bookingData = {};
        this.shipsRendered = false;
        this.seatsRendered = false;
        this.onPageChange = null;
        this._cursorRaf = null;
        this._lanternRaf = null;
        this._mouseX = 0;
        this._mouseY = 0;

        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }

        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.setupCustomCursor();
        this.setupGlobalEffects();
        this.setupIntroSequence();
        this.setupAudioSystem();
        this.setupDrunkMode();
        this.setupNavigation();
        this.setupChartRoom();
        this.setupShipManifest();
        this.setupBelowDeck();
        this.setupContract();
        this.setupSuccess();
        this.setupEasterEggs();
        this.loadSavedData();
        console.log("⚓ System ready! Savvy?");
    }

    showToast(message, type = 'success') {
        document.querySelectorAll('.pirate-toast').forEach(t => t.remove());

        const toast = document.createElement('div');
        toast.className = `pirate-toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${type === 'error' ? '☠️' : '⚓'}</span>
            <span class="toast-message">${message}</span>
        `;
        document.body.appendChild(toast);

        gsap.fromTo(toast, 
            { x: 100, opacity: 0 }, 
            { x: 0, opacity: 1, duration: 0.4, ease: 'back.out(1.5)' }
        );

        setTimeout(() => {
            if (document.body.contains(toast)) {
                gsap.to(toast, {
                    x: 100, opacity: 0, duration: 0.4, ease: 'power2.in',
                    onComplete: () => toast.remove()
                });
            }
        }, 2000);
    }

    setupCustomCursor() {
        const cursor = document.querySelector('.custom-cursor');
        if (!cursor) return;

        let mouseX = 0, mouseY = 0;
        let currentRotation = 0;
        let targetRotation = 0;
        let lastHovering = false;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            this._mouseX = e.clientX;
            this._mouseY = e.clientY;
            const vx = e.movementX || 0;
            const vy = e.movementY || 0;
            const v = Math.sqrt(vx * vx + vy * vy);
            if (v > 0) targetRotation += Math.min(v * 0.3, 6);
        }, { passive: true });

        let idleSway = 0;
        const idleInterval = setInterval(() => {
            idleSway = Math.sin(Date.now() * 0.0008) * 1.5;
        }, 80);

        const animate = () => {
            currentRotation += (targetRotation + idleSway - currentRotation) * 0.08;
            cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%) rotate(${currentRotation}deg)`;
            this._cursorRaf = requestAnimationFrame(animate);
        };

        this._cursorRaf = requestAnimationFrame(animate);

        document.addEventListener('mousedown', () => {
            cursor.classList.add('clicking');
            targetRotation += 120;
            gsap.to(cursor.querySelector('.cursor-image'), {
                scale: 1.25, duration: 0.15, ease: 'back.out(1.5)', overwrite: true
            });
        });

        document.addEventListener('mouseup', () => {
            cursor.classList.remove('clicking');
            gsap.to(cursor.querySelector('.cursor-image'), {
                scale: 1, duration: 0.25, ease: 'elastic.out(1, 0.5)', overwrite: true
            });
        });

        document.addEventListener('mouseover', (e) => {
            const isInteractive = !!e.target.closest(
                'button, a, input, select, textarea, .ship-card, .seat.available, .seat.selected, .filter-btn, .compass-item, [data-interactive]'
            );
            if (isInteractive !== lastHovering) {
                lastHovering = isInteractive;
                cursor.classList.toggle('hovering', isInteractive);
                if (isInteractive) targetRotation += 30;
            }
        }, { passive: true });

        this.onPageChange = () => {
            lastHovering = false;
            cursor.classList.remove('hovering');
        };

        window.addEventListener('unload', () => {
            cancelAnimationFrame(this._cursorRaf);
            clearInterval(idleInterval);
        }, { once: true });
    }

    setupGlobalEffects() {
        this.setupGrainOverlay();
        this.setupParticles();
        this.setupCameraSway();
        this.setupLanternLight();
    }

    setupGrainOverlay() {
        const canvas = document.getElementById('grain-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        const offscreen = document.createElement('canvas');
        offscreen.width = Math.ceil(window.innerWidth / 2);
        offscreen.height = Math.ceil(window.innerHeight / 2);
        const offCtx = offscreen.getContext('2d');

        const drawGrain = () => {
            const w = offscreen.width;
            const h = offscreen.height;
            const imageData = offCtx.createImageData(w, h);
            const buffer = new Uint32Array(imageData.data.buffer);
            for (let i = 0; i < buffer.length; i++) {
                if (Math.random() < 0.04) {
                    const v = (Math.random() * 180) | 0;
                    buffer[i] = (0xff << 24) | (v << 16) | (v << 8) | v;
                }
            }
            offCtx.putImageData(imageData, 0, 0);
            ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
        };
        setInterval(drawGrain, 100);

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                resize();
                offscreen.width = Math.ceil(window.innerWidth / 2);
                offscreen.height = Math.ceil(window.innerHeight / 2);
            }, 200);
        }, { passive: true });
    }

    setupParticles() {
        const canvas = document.getElementById('particles-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = Array.from({ length: 35 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2.5 + 0.5,
            speedY: Math.random() * 0.4 + 0.15,
            speedX: (Math.random() - 0.5) * 0.25,
            opacity: Math.random() * 0.4 + 0.15
        }));

        const animateParticles = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.y += p.speedY;
                p.x += p.speedX;
                if (p.y > canvas.height) p.y = 0;
                if (p.x > canvas.width) p.x = 0;
                if (p.x < 0) p.x = canvas.width;
                ctx.fillStyle = `rgba(244, 228, 188, ${p.opacity})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            requestAnimationFrame(animateParticles);
        };
        animateParticles();

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }, 200);
        }, { passive: true });
    }

    setupCameraSway() {
        gsap.to('#mainContent', {
            x: '+=2', y: '+=1.5', duration: 7, ease: 'sine.inOut', repeat: -1, yoyo: true
        });
    }

    setupLanternLight() {
        const lantern = document.getElementById('lanternLight');
        if (!lantern) return;
        let lx = 0, ly = 0;
        const animateLantern = () => {
            const tx = this._mouseX - 90;
            const ty = this._mouseY - 90;
            lx += (tx - lx) * 0.1;
            ly += (ty - ly) * 0.1;
            lantern.style.transform = `translate3d(${lx}px, ${ly}px, 0)`;
            this._lanternRaf = requestAnimationFrame(animateLantern);
        };
        this._lanternRaf = requestAnimationFrame(animateLantern);
        window.addEventListener('unload', () => {
            cancelAnimationFrame(this._lanternRaf);
        }, { once: true });
    }

    setupIntroSequence() {
        const intro = document.getElementById('introScene');
        if (!intro) return;
        const compass = intro.querySelector('.intro-compass');
        const loadingText = intro.querySelector('.loading-text');
        const thunder = document.getElementById('thunderSound');
        const texts = [
            "Consulting the stars...", "Checking the winds...", "Drinking rum...",
            "Finding the rum...", "Where's the rum?"
        ];
        let textIndex = 0;
        const textInterval = setInterval(() => {
            textIndex = (textIndex + 1) % texts.length;
            gsap.to(loadingText, {
                opacity: 0, duration: 0.3, onComplete: () => {
                    loadingText.textContent = texts[textIndex];
                    gsap.to(loadingText, { opacity: 1, duration: 0.3 });
                }
            });
        }, 1500);

        const tl = gsap.timeline({
            onComplete: () => {
                clearInterval(textInterval);
                intro.addEventListener('transitionend', () => {
                    intro.style.display = 'none';
                }, { once: true });
                intro.classList.add('hidden');
                this.playSound('oceanAmbience', true);
            }
        });

        tl.to(compass, { scale: 1, opacity: 1, duration: 1, ease: 'back.out' })
            .to(compass, { rotation: 720, duration: 2, ease: 'power2.inOut' }, '+=0.5')
            .to(compass, { rotation: 735, duration: 0.5, ease: 'elastic.out' })
            .to({}, {
                duration: 0.5, onStart: () => {
                    if (thunder) thunder.play().catch(() => { });
                    this.flashScreen();
                }
            })
            .to(intro, { opacity: 0, duration: 0.8, ease: 'power2.inOut' }, '+=0.3');
    }

    flashScreen() {
        const flash = document.createElement('div');
        flash.style.cssText = `position: fixed; top:0; left:0; width:100%; height:100%; background: white; z-index:10001; pointer-events:none; opacity:1;`;
        document.body.appendChild(flash);
        gsap.to(flash, { opacity: 0, duration: 0.5, onComplete: () => flash.remove() });
    }

    setupAudioSystem() {
        const toggle = document.getElementById('audioToggle');
        if (!toggle) return;
        toggle.addEventListener('click', () => {
            this.audioEnabled = !this.audioEnabled;
            toggle.classList.toggle('muted', !this.audioEnabled);
            if (this.audioEnabled) {
                this.playSound('oceanAmbience', true);
            } else {
                this.stopAllSounds();
            }
            this.playSound('coinClick');
        });
    }

    playSound(soundId, loop = false) {
        if (!this.audioEnabled) return;
        const audio = document.getElementById(soundId);
        if (audio) {
            audio.loop = loop;
            audio.play().catch(() => { });
        }
    }

    stopAllSounds() {
        document.querySelectorAll('audio').forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
    }

    setupDrunkMode() {
        const toggle = document.getElementById('drunkToggle');
        if (!toggle) return;
        toggle.addEventListener('click', () => {
            this.drunkMode = !this.drunkMode;
            document.body.classList.toggle('drunk-mode', this.drunkMode);
            if (this.drunkMode) {
                this.playSound('rumSound');
                this.playSound('distantLaughter');
                this.showRandomQuote();
            }
            gsap.to(toggle, {
                rotation: this.drunkMode ? 360 : 0, duration: 0.5, ease: 'back.out'
            });
        });
    }

    showRandomQuote() {
        const quote = JACK_QUOTES[Math.floor(Math.random() * JACK_QUOTES.length)];
        const quoteEl = document.createElement('div');
        quoteEl.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(5,13,26,0.96); color: var(--gold); padding: 30px 40px; border: 2px solid rgba(255,215,0,0.7); border-radius: 15px; font-family: 'Pirata One', cursive; font-size: 1.5rem; text-align: center; z-index: 10001; max-width: 500px; pointer-events: none; box-shadow: 0 20px 60px rgba(0,0,0,0.9), 0 0 30px rgba(255,215,0,0.15); text-shadow: 0 0 15px rgba(255,215,0,0.4);`;
        quoteEl.textContent = `"${quote}"`;
        document.body.appendChild(quoteEl);
        gsap.fromTo(quoteEl,
            { scale: 0, rotation: -8, opacity: 0 },
            { scale: 1, rotation: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' }
        );
        setTimeout(() => {
            gsap.to(quoteEl, {
                scale: 0, rotation: 8, opacity: 0, duration: 0.4, ease: 'back.in',
                onComplete: () => quoteEl.remove()
            });
        }, 3200);
    }

    setupNavigation() {
        const compassNav = document.getElementById('compassNav');
        if (!compassNav) return;
        compassNav.addEventListener('click', (e) => {
            const item = e.target.closest('.compass-item');
            if (!item) return;
            e.preventDefault();
            const target = item.getAttribute('href').slice(1);
            this.navigateToPage(target);
            this.playSound('parchmentRustle');
        });
    }

    navigateToPage(pageId) {
        const pages = document.querySelectorAll('.page');
        const currentActivePage = document.querySelector('.page.active');
        const targetPage = document.getElementById(pageId);
        if (!targetPage || targetPage === currentActivePage) return;

        this.playSound('woodCreak');
        const wipe = document.createElement('div');
        wipe.style.cssText = `position: fixed; top:0; left:-120%; width:120%; height:100%; background: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.5) 20%, #000 50%, rgba(0,0,0,0.5) 80%, transparent 100%); z-index: 9999; pointer-events: all;`;
        document.body.appendChild(wipe);

        if (currentActivePage) {
            gsap.to(currentActivePage.querySelectorAll('.content-wrapper > *'), {
                y: -40, opacity: 0, duration: 0.35, stagger: 0.04, ease: 'power2.in'
            });
        }

        gsap.to(wipe, {
            left: '100%', duration: 1.1, ease: 'power2.inOut', onComplete: () => wipe.remove()
        });

        setTimeout(() => {
            window.scrollTo(0, 0);
            pages.forEach(p => p.classList.remove('active'));
            targetPage.classList.add('active');
            this.currentPage = pageId;

            if (pageId === 'ship-manifest' && !this.shipsRendered) {
                this.renderShips();
                this.shipsRendered = true;
            }
            if (pageId === 'below-deck' && !this.seatsRendered) {
                this.renderSeats();
                this.seatsRendered = true;
            }
            if (pageId === 'success') {
                this.displayTicket();
            }

            this.animatePageEntry(pageId);
            if (this.onPageChange) {
                this.onPageChange();
            }
        }, 480);
    }

    animatePageEntry(pageId) {
        const page = document.getElementById(pageId);
        const elements = page.querySelectorAll('.content-wrapper > *');
        
        gsap.fromTo(elements,
            { y: 60, opacity: 0, rotationX: -15, scale: 0.95 },
            { y: 0, opacity: 1, rotationX: 0, scale: 1, duration: 0.9, stagger: 0.12, ease: 'power3.out', clearProps: 'transform,opacity' }
        );

        if (pageId === 'ship-manifest') {
            setTimeout(() => {
                const cards = page.querySelectorAll('.ship-card');
                gsap.fromTo(cards,
                    { y: 120, opacity: 0, rotationY: -35, scale: 0.85 },
                    { y: 0, opacity: 1, rotationY: 0, scale: 1, duration: 0.9, stagger: 0.1, ease: 'elastic.out(1, 0.6)', clearProps: 'all' }
                );
            }, 280);
        }

        if (pageId === 'below-deck') {
            setTimeout(() => {
                const seats = page.querySelectorAll('.seat');
                gsap.fromTo(seats,
                    { opacity: 0 },
                    { opacity: 1, duration: 0.6, stagger: { amount: 1.0, from: 'random' }, ease: 'power1.inOut', clearProps: 'opacity' }
                );
            }, 450);
        }
    }

    setupChartRoom() {
        const form = document.getElementById('searchForm');
        if (!form) return;
        const button = form.querySelector('.chart-button');
        const map = document.querySelector('.parallax-map');
        if (map) {
            let mapTick = false;
            document.addEventListener('mousemove', (e) => {
                if (!mapTick) {
                    requestAnimationFrame(() => {
                        const x = (e.clientX / window.innerWidth - 0.5) * 40;
                        const y = (e.clientY / window.innerHeight - 0.5) * 40;
                        gsap.to(map, { x, y, duration: 0.8, ease: 'power1.out', overwrite: true });
                        mapTick = false;
                    });
                    mapTick = true;
                }
            }, { passive: true });
        }

        if (button) {
            button.addEventListener('mouseenter', () => {
                this.playSound('coinClick');
            });
        }

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            this.bookingData = {
                from: formData.get('from'),
                to: formData.get('to'),
                moonPhase: formData.get('moonPhase'),
                crew: parseInt(formData.get('crew'), 10) || 1,
                seats: []
            };
            this.playSound('rumSound');
            this.saveData();
            this.navigateToPage('ship-manifest');
        });
    }

    setupShipManifest() {
        this.renderShips();
        this.setupShipFilters();
        this.setupDustParticles();
    }

    renderShips(filter = 'all') {
        const container = document.getElementById('shipsContainer');
        if (!container) return;
        container.innerHTML = '';
        const ships = filter === 'all' ? VOYAGES : VOYAGES.filter(s => s.type === filter);
        const frag = document.createDocumentFragment();
        ships.forEach((ship, index) => {
            const card = this.createShipCard(ship);
            frag.appendChild(card);
            gsap.fromTo(card,
                { y: 80, opacity: 0, rotationX: -30 },
                { y: 0, opacity: 1, rotationX: 0, duration: 0.7, delay: index * 0.08, ease: 'back.out(1.2)' }
            );
        });
        container.appendChild(frag);
    }

    createShipCard(ship) {
        const card = document.createElement('div');
        card.className = 'ship-card';
        card.innerHTML = `
            <div class="ship-card-inner">
                <div class="ship-card-front">
                    <div class="wanted-header">Wanted</div>
                    <img src="${ship.image}" alt="${ship.name}" class="ship-image" loading="lazy">
                    <h3 class="ship-name">${ship.name}</h3>
                    <div class="ship-price">${ship.price}</div>
                </div>
                <div class="ship-card-back">
                    <div class="ship-stats">
                        <div class="stat-item">
                            <span class="stat-label">Speed:</span>
                            <span class="stat-value">${ship.speed}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Safety:</span>
                            <span class="stat-value">${ship.safety}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Capacity:</span>
                            <span class="stat-value">${ship.capacity} souls</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Description:</span>
                            <span class="stat-value">${ship.description}</span>
                        </div>
                    </div>
                    <div class="captain-name">Captain: ${ship.captain}</div>
                    <button class="book-ship-btn" data-ship-id="${ship.id}">
                        Book This Ship
                    </button>
                </div>
            </div>
        `;
        card.addEventListener('click', (e) => {
            if (e.target.closest('.book-ship-btn')) return;
            card.classList.toggle('flipped');
            this.playSound('parchmentRustle');
        });
        card.querySelector('.book-ship-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectShip(ship);
        });
        return card;
    }

    setupShipFilters() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        const panel = document.querySelector('.filter-panel');
        if (!panel) return;
        panel.addEventListener('click', (e) => {
            const btn = e.target.closest('.filter-btn');
            if (!btn) return;
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.getAttribute('data-filter');
            this.renderShips(filter);
            this.playSound('parchmentRustle');
        });
    }

    selectShip(ship) {
        this.selectedVoyage = ship;
        this.bookingData.ship = ship;
        this.saveData();
        this.playSound('swordUnsheath');
        this.navigateToPage('below-deck');
    }

    setupDustParticles() {
        const canvas = document.getElementById('dust-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth || 800;
        canvas.height = canvas.offsetHeight || 600;

        const particles = Array.from({ length: 25 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 1.5 + 0.5,
            speedY: Math.random() * 0.25 + 0.08,
            speedX: (Math.random() - 0.5) * 0.15
        }));

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.y += p.speedY;
                p.x += p.speedX;
                if (p.y > canvas.height) p.y = 0;
                if (p.x > canvas.width) p.x = 0;
                if (p.x < 0) p.x = canvas.width;
                ctx.fillStyle = 'rgba(139, 69, 19, 0.35)';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            requestAnimationFrame(animate);
        };
        animate();
    }

    setupBelowDeck() {
        this.renderSeats();
        const proceedBtn = document.getElementById('proceedToContract');
        if (!proceedBtn) return;
        proceedBtn.addEventListener('click', () => {
            const currentSeats = this.bookingData.seats ? this.bookingData.seats.length : 0;
            const crewLimit = this.bookingData.crew || 1;

            if (currentSeats === 0) {
                this.showToast("Ye need to assign a berth for at least one crew member!", "error");
                return;
            }
            if (currentSeats < crewLimit) {
                this.showToast(`Warning: Only ${currentSeats} of ${crewLimit} crew have berths! Proceeding anyway...`, "error");
            }
            this.navigateToPage('contract');
        });
    }

    renderSeats() {
        const svg = document.getElementById('shipDiagram');
        if (!svg) return;

        svg.querySelectorAll('.seat, .seat-mark, .section-label, .section-bg, .price-label').forEach(el => el.remove());

        const svgNS = 'http://www.w3.org/2000/svg';
        const sections = [
            { name: 'Hammocks',          x: 400, y: 300, rows: 5, cols: 6, price: 'Cheap',     color: '#2e8b57' },
            { name: 'Officers Quarters', x: 400, y: 600, rows: 3, cols: 4, price: 'Moderate',  color: '#4a90e2' },
            { name: 'Captain Cabin',     x: 400, y: 950, rows: 2, cols: 3, price: 'Expensive', color: '#9b59b6' }
        ];

        let defs = svg.querySelector('defs');
        if (!defs) {
            defs = document.createElementNS(svgNS, 'defs');
            svg.insertBefore(defs, svg.firstChild);
        }
        if (!defs.querySelector('#textGlow')) {
            const filter = document.createElementNS(svgNS, 'filter');
            filter.setAttribute('id', 'textGlow');
            filter.innerHTML = `<feGaussianBlur stdDeviation="2" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>`;
            defs.appendChild(filter);
        }

        sections.forEach((section) => {
            const bgWidth  = section.cols * 50 + 20;
            const bgHeight = section.rows * 40 + 20;

            const sectionBg = document.createElementNS(svgNS, 'rect');
            sectionBg.setAttribute('x', section.x - bgWidth / 2);
            sectionBg.setAttribute('y', section.y - 50);
            sectionBg.setAttribute('width', bgWidth);
            sectionBg.setAttribute('height', bgHeight);
            sectionBg.setAttribute('fill', 'rgba(0,0,0,0.22)');
            sectionBg.setAttribute('stroke', section.color);
            sectionBg.setAttribute('stroke-width', '2');
            sectionBg.setAttribute('rx', '10');
            sectionBg.setAttribute('pointer-events', 'none');
            sectionBg.classList.add('section-bg');
            svg.appendChild(sectionBg);

            const label = document.createElementNS(svgNS, 'text');
            label.setAttribute('x', section.x);
            label.setAttribute('y', section.y - 60);
            label.setAttribute('fill', '#ffd700');
            label.setAttribute('font-family', 'Rye, cursive');
            label.setAttribute('font-size', '22');
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('filter', 'url(#textGlow)');
            label.setAttribute('pointer-events', 'none');
            label.classList.add('section-label');
            label.textContent = section.name;
            svg.appendChild(label);

            const priceLabel = document.createElementNS(svgNS, 'text');
            priceLabel.setAttribute('x', section.x);
            priceLabel.setAttribute('y', section.y - 36);
            priceLabel.setAttribute('fill', '#e8d4a4');
            priceLabel.setAttribute('font-family', 'Cedarville Cursive, cursive');
            priceLabel.setAttribute('font-size', '13');
            priceLabel.setAttribute('text-anchor', 'middle');
            priceLabel.setAttribute('opacity', '0.8');
            priceLabel.setAttribute('pointer-events', 'none');
            priceLabel.classList.add('price-label');
            priceLabel.textContent = `(${section.price})`;
            svg.appendChild(priceLabel);

            const startX = section.x - (section.cols * 50) / 2 + 25;
            const startY = section.y;

            for (let row = 0; row < section.rows; row++) {
                for (let col = 0; col < section.cols; col++) {
                    const seatX  = startX + col * 50;
                    const seatY  = startY + row * 40;
                    const isTaken = Math.random() < 0.28;
                    const seatId  = `${section.name}-${row}-${col}`;

                    let isSelected = false;
                    if (this.bookingData.seats && Array.isArray(this.bookingData.seats)) {
                        isSelected = this.bookingData.seats.some(s => s.id === seatId);
                    }

                    const seat = document.createElementNS(svgNS, 'circle');
                    seat.setAttribute('cx', seatX);
                    seat.setAttribute('cy', seatY);
                    seat.setAttribute('r', 20); 
                    seat.classList.add('seat');
                    seat.setAttribute('pointer-events', 'all');

                    if (isSelected) {
                        seat.classList.add('selected');
                    } else {
                        seat.classList.add(isTaken ? 'taken' : 'available');
                    }

                    seat.setAttribute('data-seat-id', seatId);
                    seat.setAttribute('data-section', section.name);
                    seat.setAttribute('data-taken', isTaken ? '1' : '0');

                    seat.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (seat.getAttribute('data-taken') === '1') return;
                        this.selectSeat(seat, seatId, section.name);
                    });

                    seat.addEventListener('mousemove', (e) => {
                        const isTakenAttr = seat.getAttribute('data-taken') === '1';
                        this.showSeatTooltip(e, isTakenAttr, section.name, seat);
                    });

                    seat.addEventListener('mouseleave', () => {
                        this.hideSeatTooltip();
                    });

                    svg.appendChild(seat);

                    if (isSelected) {
                        this.drawSeatMark(seat, false);
                    }

                    const seatNum = document.createElementNS(svgNS, 'text');
                    seatNum.setAttribute('x', seatX);
                    seatNum.setAttribute('y', seatY + 4);
                    seatNum.setAttribute('fill', isTaken ? '#aaa' : '#fff');
                    seatNum.setAttribute('font-family', 'monospace');
                    seatNum.setAttribute('font-size', '10');
                    seatNum.setAttribute('font-weight', 'bold');
                    seatNum.setAttribute('text-anchor', 'middle');
                    seatNum.setAttribute('pointer-events', 'none');
                    seatNum.textContent = `${row * section.cols + col + 1}`;
                    svg.appendChild(seatNum);
                }
            }
        });
    }

    selectSeat(seat, seatId, section) {
        if (!this.bookingData.seats) {
            this.bookingData.seats = [];
        }

        const idx      = this.bookingData.seats.findIndex(s => s.id === seatId);
        const maxCrew  = this.bookingData.crew || 1;

        if (idx !== -1) {
            this.bookingData.seats.splice(idx, 1);
            seat.classList.remove('selected');
            seat.classList.add('available');
            document.querySelectorAll(`.seat-mark[data-for-seat="${seatId}"]`).forEach(m => m.remove());
            this.playSound('parchmentRustle');
            this.showToast("Berth abandoned!", "success");

        } else {
            if (this.bookingData.seats.length >= maxCrew) {
                const seatToRemove = this.bookingData.seats.shift();
                const oldSeatEl = document.querySelector(`.seat[data-seat-id="${seatToRemove.id}"]`);
                if (oldSeatEl) {
                    oldSeatEl.classList.remove('selected');
                    oldSeatEl.classList.add('available');
                    document.querySelectorAll(`.seat-mark[data-for-seat="${seatToRemove.id}"]`).forEach(m => m.remove());
                }
                this.showToast(`Swapped berth! Max crew is ${maxCrew}.`, "success");
            } else {
                this.showToast("Seat selection successful!", "success");
            }
            
            this.bookingData.seats.push({ id: seatId, section });
            seat.classList.remove('available');
            seat.classList.add('selected');
            this.playSound('daggerSound');
            this.drawSeatMark(seat, true);
        }
        this.saveData();
    }

    drawSeatMark(seat, animate = true) {
        const svgNS = 'http://www.w3.org/2000/svg';
        const cx     = parseFloat(seat.getAttribute('cx'));
        const cy     = parseFloat(seat.getAttribute('cy'));
        const seatId = seat.getAttribute('data-seat-id');

        const makeXLine = (x1, y1, x2, y2) => {
            const line = document.createElementNS(svgNS, 'line');
            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', x2);
            line.setAttribute('y2', y2);
            line.setAttribute('stroke', '#ff3333');
            line.setAttribute('stroke-width', '3');
            line.setAttribute('stroke-linecap', 'round');
            line.setAttribute('pointer-events', 'none');
            line.classList.add('seat-mark');
            line.setAttribute('data-for-seat', seatId);
            return line;
        };

        const line1 = makeXLine(cx - 12, cy - 12, cx + 12, cy + 12);
        const line2 = makeXLine(cx + 12, cy - 12, cx - 12, cy + 12);

        const parent = seat.parentNode;
        if (parent) {
            parent.appendChild(line1);
            parent.appendChild(line2);
        }

        if (animate) {
            gsap.fromTo([line1, line2],
                { opacity: 0 },
                { opacity: 1, duration: 0.2, ease: 'power2.out' }
            );
        }
    }

    showSeatTooltip(e, isTaken, sectionName, seat) {
        let tooltip = document.querySelector('.seat-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'seat-tooltip';
            document.body.appendChild(tooltip);
        }

        const isSelected = seat.classList.contains('selected');

        if (isTaken) {
            if (!seat.dataset.pirateName) {
                seat.dataset.pirateName = PIRATE_NAMES[Math.floor(Math.random() * PIRATE_NAMES.length)];
            }
            tooltip.innerHTML = `<strong style="color:#ffd700">Occupied!</strong><br>${seat.dataset.pirateName} claimed this spot`;
        } else if (isSelected) {
            tooltip.innerHTML = `<strong style="color:#ff4444">Yer Choice</strong><br>${sectionName}<br><em style="font-size:0.85em;opacity:0.75">"X marks the spot!"</em>`;
        } else {
            if (!seat.dataset.tip) {
                seat.dataset.tip = SEAT_TOOLTIPS[Math.floor(Math.random() * SEAT_TOOLTIPS.length)];
            }
            tooltip.innerHTML = `<strong style="color:#2ecc71">Available</strong><br>${sectionName}<br><em style="font-size:0.85em;opacity:0.75">"${seat.dataset.tip}"</em>`;
        }

        const w = tooltip.offsetWidth;
        const h = tooltip.offsetHeight;
        let left = e.clientX - w / 2;
        let top  = e.clientY - h - 18;

        if (left < 8) left = 8;
        if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
        if (top < 8) top = e.clientY + 18;

        tooltip.style.left = left + 'px';
        tooltip.style.top  = top + 'px';
        tooltip.style.opacity = '1';
    }

    hideSeatTooltip() {
        const tooltips = document.querySelectorAll('.seat-tooltip');
        tooltips.forEach(t => t.remove());
    }

    setupContract() {
        const form = document.getElementById('contractForm');
        if (!form) return;
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            this.bookingData.name = formData.get('name');
            this.bookingData.oath = formData.get('oath');
            this.playSound('parchmentRustle');
            this.animateInkSpread();
            setTimeout(() => {
                this.saveData();
                this.navigateToPage('success');
            }, 2000);
        });
    }

    animateInkSpread() {
        const parchment = document.querySelector('.parchment-contract');
        if (!parchment) return;
        const overlay = document.createElement('div');
        overlay.style.cssText = `position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(138, 3, 3, 0.25); border-radius: 20px; pointer-events: none; z-index: 50;`;
        parchment.appendChild(overlay);
        overlay.classList.add('ink-spreading');
        setTimeout(() => overlay.remove(), 2000);
    }

    setupSuccess() {
        const downloadBtn  = document.getElementById('downloadTicket');
        const newVoyageBtn = document.getElementById('newVoyage');
        downloadBtn?.addEventListener('click', () => this.downloadTicket());
        newVoyageBtn?.addEventListener('click', () => {
            this.resetBooking();
            this.navigateToPage('chart-room');
        });
    }

    displayTicket() {
        const container = document.getElementById('ticketDetails');
        if (!container) return;
        const data = this.bookingData;
        let seatsDisplay = 'None selected';
        if (data.seats && data.seats.length > 0) {
            const seatIds = data.seats.map(s => s.id).join(', ');
            seatsDisplay = `${seatIds} (${data.seats[0].section})`;
        } else if (data.seat) {
            seatsDisplay = `${data.seat.id} (${data.seat.section})`;
        }
        container.innerHTML = `
            <div class="ticket-item">
                <span class="ticket-label">Passenger:</span>
                <span>${data.name || 'Unknown Pirate'}</span>
            </div>
            <div class="ticket-item">
                <span class="ticket-label">Ship:</span>
                <span>${data.ship ? data.ship.name : 'Ghost Ship'}</span>
            </div>
            <div class="ticket-item">
                <span class="ticket-label">From:</span>
                <span>${data.from || 'Unknown'}</span>
            </div>
            <div class="ticket-item">
                <span class="ticket-label">To:</span>
                <span>${data.to || 'Davy Jones Locker'}</span>
            </div>
            <div class="ticket-item">
                <span class="ticket-label">Berth(s):</span>
                <span>${seatsDisplay}</span>
            </div>
            <div class="ticket-item">
                <span class="ticket-label">Crew Size:</span>
                <span>${data.crew || 1} souls</span>
            </div>
            <div class="ticket-item">
                <span class="ticket-label">Price:</span>
                <span>${data.ship ? data.ship.price : 'Your Soul'}</span>
            </div>
        `;
    }

    downloadTicket() {
        this.showToast("Ticket downloaded! Yer ready to sail.", "success");
        this.playSound('coinClick');
    }

    setupEasterEggs() {
        this.setupSeagull();
        this.setupRandomThunder();
        this.setupKonamiCode();
    }

    setupSeagull() {
        const seagull = document.getElementById('seagull');
        if (!seagull) return;
        const flySeagull = () => {
            const y = Math.random() * 200 + 50;
            seagull.style.top  = y + 'px';
            seagull.style.left = '-100px';
            gsap.to(seagull, { opacity: 1, duration: 0.4 });
            gsap.to(seagull, {
                x: window.innerWidth + 200, duration: 12, ease: 'none',
                onComplete: () => {
                    gsap.to(seagull, { opacity: 0, duration: 0.4, onComplete: () => {
                        seagull.style.transform = '';
                        gsap.set(seagull, { x: 0 });
                    }});
                }
            });
        };
        setInterval(() => {
            if (Math.random() < 0.5) flySeagull();
        }, 45000);
    }

    setupRandomThunder() {
        const flash = () => {
            const flashEl = document.createElement('div');
            flashEl.style.cssText = `position: fixed; top:0; left:0; width:100%; height:100%; background: white; opacity: 0; z-index: 9996; pointer-events: none;`;
            document.body.appendChild(flashEl);
            gsap.to(flashEl, {
                opacity: 0.25, duration: 0.08, yoyo: true, repeat: 1,
                onComplete: () => {
                    flashEl.remove();
                    this.playSound('thunderSound');
                }
            });
        };
        setInterval(() => {
            if (Math.random() < 0.3) flash();
        }, 120000);
    }

    setupKonamiCode() {
        const code = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
        let pos = 0;
        document.addEventListener('keydown', (e) => {
            if (e.key === code[pos]) {
                pos++;
                if (pos === code.length) {
                    this.activateSecretMode();
                    pos = 0;
                }
            } else {
                pos = 0;
            }
        });
    }

    activateSecretMode() {
        this.showToast("🏴‍☠️ YE'VE FOUND THE SECRET! All ships are now FREE! 🏴‍☠️", "success");
        VOYAGES.forEach(ship => {
            ship.price = '0 pieces of eight (FREE!)';
            ship.priceValue = 0;
        });
        this.renderShips();
    }

    saveData() {
        try {
            localStorage.setItem('pirateBooking', JSON.stringify(this.bookingData));
        } catch (e) { }
    }

    loadSavedData() {
        try {
            const saved = localStorage.getItem('pirateBooking');
            if (saved) {
                this.bookingData = JSON.parse(saved);
                if (this.bookingData.seat && !this.bookingData.seats) {
                    this.bookingData.seats = [this.bookingData.seat];
                    delete this.bookingData.seat;
                }
                if (this.currentPage === 'success') {
                    this.displayTicket();
                }
            }
        } catch (e) { }
    }

    resetBooking() {
        this.bookingData  = { seats: [] };
        this.selectedVoyage = null;
        this.selectedSeat   = null;
        this.seatsRendered  = false;
        try { localStorage.removeItem('pirateBooking'); } catch (e) {}

        const searchForm = document.getElementById('searchForm');
        if (searchForm) searchForm.reset();

        const contractForm = document.getElementById('contractForm');
        if (contractForm) contractForm.reset();
    }
}

const pirateSystem = new PirateVoyageSystem();

function navigateToPage(pageId) {
    if (pirateSystem) pirateSystem.navigateToPage(pageId);
}