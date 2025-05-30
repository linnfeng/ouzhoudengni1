// Global variables
const pages = document.querySelectorAll('.page');
const book = document.getElementById('flipBook');
const pageIndicator = document.querySelector('.page-indicator .current-page');
const totalPagesIndicator = document.querySelector('.page-indicator .total-pages');
const cityNavSpans = document.querySelectorAll('.nav-cities .city-nav');

let currentPageIndex = 0;
const totalBookPages = pages.length; // Correctly refers to the number of actual pages in the book
let isFlipping = false;
let soundEnabled = false; // Default to off or load from user preference

// City sound mapping
const cityAudioMap = {
    rome: new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'),
    tuscany: new Audio('https://www.soundjay.com/nature/sounds/wind.wav'),
    florence: new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-01.wav'),
    venice: new Audio('https://www.soundjay.com/nature/sounds/water-lapping.wav'),
    milan: new Audio('https://www.soundjay.com/human/sounds/coffee-shop-ambience.wav'),
    lucerne: new Audio('https://www.soundjay.com/nature/sounds/lake-waves.wav'),
    jungfrau: new Audio('https://www.soundjay.com/nature/sounds/wind-howling.wav'),
    murren: new Audio('https://www.soundjay.com/nature/sounds/cow-bell.wav'),
    geneva: new Audio('https://www.soundjay.com/nature/sounds/gentle-breeze.wav'),
    paris: new Audio('https://www.soundjay.com/nature/sounds/water-river.wav'),
    summary: new Audio('https://www.soundjay.com/human/sounds/heartbeat.wav')
};
let currentAmbientSound = null;


// Initialize application
function initializeApp() {
    initializePages();
    setupEventListeners();
    updatePageIndicator();
    updateActiveCityNav();
    // setupIntersectionObserver(); // Keep if used for other animations
    // setupScrollToSections(); // Keep if used
    preloadImages(); // Preload background images
}

// Setup initial page states
function initializePages() {
    pages.forEach((page, index) => {
        page.style.transition = 'none'; // No animation during setup
        if (index === 0) {
            page.classList.add('active');
            page.classList.remove('turned', 'slide-in-right', 'slide-out-left', 'slide-in-left', 'slide-out-right');
            page.style.transform = 'translateX(0%)';
            page.style.zIndex = 2;
        } else {
            page.classList.add('turned');
            page.classList.remove('active', 'slide-in-right', 'slide-out-left', 'slide-in-left', 'slide-out-right');
            page.style.transform = 'translateX(100%)'; // Start off-screen to the right
            page.style.zIndex = 1;
        }
        // Force reflow to apply styles before re-enabling transitions
        page.offsetHeight;
        page.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    });
}

// Setup event listeners
function setupEventListeners() {
    document.addEventListener('keydown', handleKeyboardNavigation);

    const soundToggle = document.getElementById('soundToggle');
    if (soundToggle) {
        soundToggle.addEventListener('click', toggleMasterSound);
    }

    pages.forEach(page => {
        const soundBtn = page.querySelector('.sound-btn');
        if (soundBtn) {
            soundBtn.addEventListener('click', function() {
                const soundKey = this.getAttribute('data-sound');
                playAmbientSound(soundKey, this);
            });
        }
    });

    cityNavSpans.forEach((span, index) => {
        span.addEventListener('click', () => {
            if (index === 0) { // Home button
                document.getElementById('hero').scrollIntoView({
                    behavior: 'smooth'
                });
            } else { // City page
                const targetPageIndex = index - 1; // Adjust for 0-based page index
                if (targetPageIndex === currentPageIndex) return; // Already on this page

                // Determine direction for goToPage
                const isNext = targetPageIndex > currentPageIndex;
                goToPage(targetPageIndex, isNext);
            }
        });
    });

    // Touch/swipe support for mobile
    let startX = 0;
    let startY = 0;
    let startTime = 0;

    const bookContainer = document.querySelector('.book-container');
    if (bookContainer) {
        bookContainer.addEventListener('touchstart', function(e) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            startTime = Date.now();
        }, {
            passive: true
        });

        bookContainer.addEventListener('touchend', function(e) {
            if (!e.changedTouches || isFlipping) return;

            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            const timeDiff = Date.now() - startTime;

            // Check if it's a horizontal swipe (not vertical scroll)
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50 && timeDiff < 500) {
                if (deltaX > 0) {
                    // Swipe right - go to previous page
                    prevPage();
                } else {
                    // Swipe left - go to next page
                    nextPage();
                }
                e.preventDefault();
            }
        }, {
            passive: false
        });
    }
}

// Navigate to a specific page
function goToPage(pageIndex, isNext) {
    if (isFlipping || pageIndex < 0 || pageIndex >= totalBookPages || pageIndex === currentPageIndex) {
        isFlipping = false;
        return;
    }
    isFlipping = true;

    const currentPageElement = pages[currentPageIndex];
    const nextPageElement = pages[pageIndex];

    // Clear any existing animation classes
    pages.forEach(page => {
        page.classList.remove('slide-in-right', 'slide-out-left', 'slide-in-left', 'slide-out-right');
    });

    if (isNext) { // Sliding to next page (left to right flow)
        // Current page slides out to the left
        currentPageElement.classList.remove('active');
        currentPageElement.classList.add('turned', 'slide-out-left');
        currentPageElement.style.transform = 'translateX(-100%)';
        currentPageElement.style.zIndex = 1;

        // Next page slides in from the right
        nextPageElement.classList.remove('turned');
        nextPageElement.classList.add('active', 'slide-in-right');
        nextPageElement.style.transform = 'translateX(0%)';
        nextPageElement.style.zIndex = 2;

    } else { // Sliding to previous page (right to left flow)
        // Current page slides out to the right
        currentPageElement.classList.remove('active');
        currentPageElement.classList.add('turned', 'slide-out-right');
        currentPageElement.style.transform = 'translateX(100%)';
        currentPageElement.style.zIndex = 1;

        // Previous page slides in from the left
        nextPageElement.classList.remove('turned');
        nextPageElement.classList.add('active', 'slide-in-left');
        nextPageElement.style.transform = 'translateX(0%)';
        nextPageElement.style.zIndex = 2;
    }

    const oldPageIndex = currentPageIndex;
    currentPageIndex = pageIndex;

    setTimeout(() => {
        isFlipping = false;

        // Clean up classes after animation
        pages.forEach(page => {
            page.classList.remove('slide-in-right', 'slide-out-left', 'slide-in-left', 'slide-out-right');
        });

        // Ensure correct final states
        pages[oldPageIndex].classList.remove('active');
        pages[oldPageIndex].classList.add('turned');

        pages[currentPageIndex].classList.remove('turned');
        pages[currentPageIndex].classList.add('active');

        // Set final positions
        pages.forEach((page, idx) => {
            if (idx === currentPageIndex) {
                page.style.transform = 'translateX(0%)';
                page.style.zIndex = 2;
            } else if (idx < currentPageIndex) {
                page.style.transform = 'translateX(-100%)'; // Pages to the left
                page.style.zIndex = 1;
            } else {
                page.style.transform = 'translateX(100%)'; // Pages to the right
                page.style.zIndex = 1;
            }
        });

        updatePageIndicator();
        updateActiveCityNav();

        const soundKey = pages[currentPageIndex].getAttribute('data-city');
        const soundButton = pages[currentPageIndex].querySelector('.sound-btn');
        if (soundEnabled && soundKey && cityAudioMap[soundKey]) {
            playAmbientSound(soundKey, soundButton, true);
        } else {
            stopCurrentAmbientSound();
        }

    }, 600); // Match CSS transition time (0.6s)
}

// Navigation functions
function nextPage() {
    if (currentPageIndex < totalBookPages - 1) {
        goToPage(currentPageIndex + 1, true);
    }
}

function prevPage() {
    if (currentPageIndex > 0) {
        goToPage(currentPageIndex - 1, false);
    }
}

function handleKeyboardNavigation(e) {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return; // Don't interfere with form input
    }
    if (e.key === 'ArrowRight') nextPage();
    if (e.key === 'ArrowLeft') prevPage();
}

// UI Update functions
function updatePageIndicator() {
    if (pageIndicator) pageIndicator.textContent = currentPageIndex + 1;
    if (totalPagesIndicator) totalPagesIndicator.textContent = totalBookPages;
}

function updateActiveCityNav() {
    cityNavSpans.forEach((span, index) => {
        // index 0 is "Home", pages are 1-indexed for nav spans
        if (index === currentPageIndex + 1) {
            span.classList.add('active');
        } else {
            span.classList.remove('active');
        }
    });
    // Special case for "Home" if no book page is active (e.g., scrolled to top)
    // This might need refinement based on how you want Home to interact with book pages
    if (!document.getElementById('book').contains(pages[currentPageIndex])) {
        cityNavSpans[0].classList.add('active');
    } else {
        cityNavSpans[0].classList.remove('active');
    }
}


// Sound functions
function toggleMasterSound() {
    soundEnabled = !soundEnabled;
    const icon = this.querySelector('i');
    if (soundEnabled) {
        icon.classList.remove('fa-volume-mute');
        icon.classList.add('fa-volume-up');
        // If a page is active and has sound, play it
        const soundKey = pages[currentPageIndex].getAttribute('data-city');
        const soundButton = pages[currentPageIndex].querySelector('.sound-btn');
        if (soundKey && cityAudioMap[soundKey]) {
            playAmbientSound(soundKey, soundButton, true);
        }
    } else {
        icon.classList.remove('fa-volume-up');
        icon.classList.add('fa-volume-mute');
        stopCurrentAmbientSound();
    }
}

function playAmbientSound(soundKey, buttonElement, autoPlay = false) {
    if (!cityAudioMap[soundKey]) return;

    stopCurrentAmbientSound(); // Stop any currently playing sound

    if (soundEnabled || !autoPlay) { // Play if master sound is on, or if manually clicked
        currentAmbientSound = cityAudioMap[soundKey];
        currentAmbientSound.loop = true;
        currentAmbientSound.play().catch(e => console.error("Error playing sound:", e));
        if (buttonElement) {
            buttonElement.querySelector('i').classList.remove('fa-play');
            buttonElement.querySelector('i').classList.add('fa-pause');
        }
    }
    // Update all other sound buttons to "play" icon
    document.querySelectorAll('.sound-btn').forEach(btn => {
        if (btn !== buttonElement) {
            btn.querySelector('i').classList.remove('fa-pause');
            btn.querySelector('i').classList.add('fa-play');
        }
    });
}

function stopCurrentAmbientSound() {
    if (currentAmbientSound) {
        currentAmbientSound.pause();
        currentAmbientSound.currentTime = 0;
        currentAmbientSound = null;
    }
    document.querySelectorAll('.sound-btn i').forEach(icon => {
        icon.classList.remove('fa-pause');
        icon.classList.add('fa-play');
    });
}

// Hero section button
function startJourney() {
    const bookSection = document.getElementById('book');
    if (bookSection) {
        bookSection.scrollIntoView({
            behavior: 'smooth'
        });
    }
    // Automatically go to the first page of the book if not already there.
    if (currentPageIndex !== 0 || !pages[0].classList.contains('active')) {
        goToPage(0, false); // Go to first page, treat as "previous" if coming from hero
    }
}


// Preload background images for smoother transitions
function preloadImages() {
    const imageUrls = [];
    pages.forEach(page => {
        const bgStyle = page.querySelector('.page-background').style.backgroundImage;
        const match = bgStyle.match(/url\("?([^\")]+)"?\)/);
        if (match && match[1]) {
            imageUrls.push(match[1]);
        }
    });

    imageUrls.forEach(url => {
        const img = new Image();
        img.src = url;
    });
}


// DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', initializeApp);