/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Travel Recommendation Website JavaScript
 * File: travel_recommendation.js
 * 
 * Handles:
 * 1. Fetching destination data from travel_recommendation.json
 * 2. Case-insensitive search supporting beach, beaches, temple, temples, country, countries
 * 3. Rendering recommendation cards in CSS grid with image, place name, and description
 * 4. Image error handling with fallback
 * 5. Reset button clearing input and results
 * 6. Multi-section navigation (Home, About Us, Contact Us) with search control toggling
 * 7. Contact form validation and confirmation
 */

// Global variable to hold loaded destination data
let travelData = null;

// Fallback image data URI in case external image fails to load
const FALLBACK_IMAGE_URL =
  'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22500%22%20viewBox%3D%220%200%20800%20500%22%3E%3Crect%20fill%3D%22%23334155%22%20width%3D%22800%22%20height%3D%22500%22%2F%3E%3Cpath%20d%3D%22M400%20210c-22.1%200-40%2017.9-40%2040s17.9%2040%2040%2040%2040-17.9%2040-40-17.9-40-40-40zm-90%20120l50-65%2035%2045%2050-70%2065%2090H310z%22%20fill%3D%22%2394a3b8%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22380%22%20font-family%3D%22sans-serif%22%20font-size%3D%2220%22%20fill%3D%22%23cbd5e1%22%20text-anchor%3D%22middle%22%3EDestination%20Photo%20Unavailable%3C%2Ftext%3E%3C%2Fsvg%3E';

/**
 * Fetch travel recommendation data from travel_recommendation.json
 */
async function loadTravelData() {
  try {
    const response = await fetch('travel_recommendation.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    travelData = await response.json();
    console.log('travel_recommendation.json loaded successfully:', travelData);
    return travelData;
  } catch (err) {
    console.error('Error fetching travel_recommendation.json:', err);
    return null;
  }
}

/**
 * Compute local time if valid IANA timeZone is provided
 */
function getDestinationLocalTime(timeZone) {
  if (!timeZone) return null;
  try {
    const options = {
      timeZone: timeZone,
      hour12: true,
      hour: 'numeric',
      minute: 'numeric',
      timeZoneName: 'short'
    };
    return new Intl.DateTimeFormat([], options).format(new Date());
  } catch (err) {
    console.warn(`Timezone '${timeZone}' not supported:`, err);
    return null;
  }
}

/**
 * Execute keyword search on user click or Enter
 */
function performSearch() {
  const searchInput = document.getElementById('searchInput');
  const resultsPanel = document.getElementById('resultsPanel');
  const resultsContainer = document.getElementById('resultsContainer');
  const resultsCountBadge = document.getElementById('resultsCount');

  if (!searchInput || !resultsContainer || !resultsPanel) return;

  const rawQuery = searchInput.value.trim();
  const query = rawQuery.toLowerCase();

  // If query is empty, reset results
  if (!query) {
    resetSearch();
    return;
  }

  // Ensure data is loaded
  if (!travelData) {
    console.warn('Data not ready yet. Retrying load...');
    loadTravelData().then(() => performSearch());
    return;
  }

  let results = [];

  // Keyword matching: beach / beaches
  if (query === 'beach' || query === 'beaches') {
    if (Array.isArray(travelData.beaches)) {
      results = travelData.beaches;
    }
  }
  // Keyword matching: temple / temples
  else if (query === 'temple' || query === 'temples') {
    if (Array.isArray(travelData.temples)) {
      results = travelData.temples;
    }
  }
  // Keyword matching: country / countries
  else if (query === 'country' || query === 'countries') {
    if (Array.isArray(travelData.countries)) {
      travelData.countries.forEach(country => {
        if (Array.isArray(country.cities)) {
          results.push(...country.cities);
        }
      });
    }
  }
  // Match specific country name or city name
  else {
    if (Array.isArray(travelData.countries)) {
      travelData.countries.forEach(country => {
        if (country.name && country.name.toLowerCase().includes(query)) {
          if (Array.isArray(country.cities)) {
            results.push(...country.cities);
          }
        } else if (Array.isArray(country.cities)) {
          country.cities.forEach(city => {
            if (
              (city.name && city.name.toLowerCase().includes(query)) ||
              (city.description && city.description.toLowerCase().includes(query))
            ) {
              results.push(city);
            }
          });
        }
      });
    }

    if (Array.isArray(travelData.temples)) {
      travelData.temples.forEach(temple => {
        if (
          (temple.name && temple.name.toLowerCase().includes(query)) ||
          (temple.description && temple.description.toLowerCase().includes(query))
        ) {
          results.push(temple);
        }
      });
    }

    if (Array.isArray(travelData.beaches)) {
      travelData.beaches.forEach(beach => {
        if (
          (beach.name && beach.name.toLowerCase().includes(query)) ||
          (beach.description && beach.description.toLowerCase().includes(query))
        ) {
          results.push(beach);
        }
      });
    }
  }

  // Deduplicate results
  const uniqueResults = [];
  const seenNames = new Set();
  results.forEach(item => {
    if (item && item.name && !seenNames.has(item.name)) {
      seenNames.add(item.name);
      uniqueResults.push(item);
    }
  });

  renderResults(uniqueResults, rawQuery);
}

/**
 * Render recommendation cards in CSS grid
 */
function renderResults(destinations, query) {
  const resultsPanel = document.getElementById('resultsPanel');
  const resultsContainer = document.getElementById('resultsContainer');
  const resultsCountBadge = document.getElementById('resultsCount');

  if (!resultsPanel || !resultsContainer) return;

  resultsContainer.innerHTML = '';
  resultsPanel.classList.add('active');

  if (resultsCountBadge) {
    resultsCountBadge.textContent = `${destinations.length} found`;
  }

  // Friendly message when no matches are found
  if (destinations.length === 0) {
    resultsContainer.innerHTML = `
      <div class="not-found-message" style="grid-column: 1 / -1;">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
        <h3>No matching recommendations found</h3>
        <p>We couldn't find any destinations matching "<strong>${escapeHtml(query)}</strong>".</p>
        <p style="font-size: 0.85rem; color: #94a3b8;">Try searching for: <strong>beach</strong>, <strong>temple</strong>, or <strong>country</strong>.</p>
      </div>
    `;
    return;
  }

  // Render at least two cards
  destinations.forEach(item => {
    const card = document.createElement('article');
    card.className = 'destination-card';

    const localTime = getDestinationLocalTime(item.timeZone);
    const timeHtml = localTime
      ? `<div class="card-time" title="Current Local Time in ${escapeHtml(item.name)}">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>Local Time: ${escapeHtml(localTime)}</span>
         </div>`
      : '';

    card.innerHTML = `
      <div class="card-img-container">
        <img 
          src="${escapeHtml(item.imageUrl)}" 
          alt="${escapeHtml(item.name)}" 
          class="card-img" 
          loading="lazy"
          onerror="this.onerror=null; this.src='${FALLBACK_IMAGE_URL}';"
        />
      </div>
      <div class="card-body">
        <h3 class="card-title">${escapeHtml(item.name)}</h3>
        <p class="card-description">${escapeHtml(item.description)}</p>
        ${timeHtml}
        <div class="card-action">
          <button class="card-btn" type="button" onclick="visitDestination('${escapeHtml(item.name)}')">
            Visit Destination
          </button>
        </div>
      </div>
    `;

    resultsContainer.appendChild(card);
  });
}

/**
 * Handle destination card action
 */
function visitDestination(name) {
  alert(`Thank you for choosing ${name}! Reach out via Contact Us to arrange customized bookings and travel itineraries.`);
}

/**
 * Reset button: clears search input, empties results, returns home to initial state
 */
function resetSearch() {
  const searchInput = document.getElementById('searchInput');
  const resultsPanel = document.getElementById('resultsPanel');
  const resultsContainer = document.getElementById('resultsContainer');

  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
  }

  if (resultsContainer) {
    resultsContainer.innerHTML = '';
  }

  if (resultsPanel) {
    resultsPanel.classList.remove('active');
  }

  console.log('Search reset: Home page returned to initial state.');
}

/**
 * Quick search suggestion trigger
 */
function quickSearch(keyword) {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = keyword;
    navigateToSection('home');
    performSearch();
  }
}

/**
 * Focus search input from Hero CTA
 */
function focusSearchInput() {
  navigateToSection('home');
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.focus();
  }
}

/**
 * Navigation handler: Switches between Home, About Us, and Contact Us
 * Shows search controls on Home only; hides search controls on About Us and Contact Us
 */
function navigateToSection(sectionId) {
  const homeSection = document.getElementById('homeSection');
  const aboutSection = document.getElementById('aboutSection');
  const contactSection = document.getElementById('contactSection');

  const navHome = document.getElementById('navHome');
  const navAbout = document.getElementById('navAbout');
  const navContact = document.getElementById('navContact');
  const navSearchContainer = document.getElementById('navSearchContainer');

  // Deactivate all sections & nav links
  if (homeSection) homeSection.classList.remove('active');
  if (aboutSection) aboutSection.classList.remove('active');
  if (contactSection) contactSection.classList.remove('active');

  if (navHome) navHome.classList.remove('active');
  if (navAbout) navAbout.classList.remove('active');
  if (navContact) navContact.classList.remove('active');

  // Activate target section
  if (sectionId === 'about') {
    if (aboutSection) aboutSection.classList.add('active');
    if (navAbout) navAbout.classList.add('active');
    // Hide search input & buttons on About Us
    if (navSearchContainer) navSearchContainer.classList.add('hidden');
    window.location.hash = 'about';
  } else if (sectionId === 'contact') {
    if (contactSection) contactSection.classList.add('active');
    if (navContact) navContact.classList.add('active');
    // Hide search input & buttons on Contact Us
    if (navSearchContainer) navSearchContainer.classList.add('hidden');
    window.location.hash = 'contact';
  } else {
    // Default: Home
    if (homeSection) homeSection.classList.add('active');
    if (navHome) navHome.classList.add('active');
    // Show search input & buttons on Home only
    if (navSearchContainer) navSearchContainer.classList.remove('hidden');
    window.location.hash = 'home';
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Contact Us form submission with validation and confirmation
 */
function setupContactForm() {
  const contactForm = document.getElementById('contactForm');
  const feedbackEl = document.getElementById('contactFeedback');

  if (!contactForm || !feedbackEl) return;

  contactForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const messageInput = document.getElementById('message');

    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const message = messageInput ? messageInput.value.trim() : '';

    if (!name || !email || !message) {
      feedbackEl.className = 'form-feedback error';
      feedbackEl.textContent = 'Please fill out all required fields (Name, Email, and Message).';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      feedbackEl.className = 'form-feedback error';
      feedbackEl.textContent = 'Please enter a valid email address.';
      return;
    }

    // Confirmation message without pretending to send email to fake backend
    feedbackEl.className = 'form-feedback success';
    feedbackEl.innerHTML = `<strong>Thank you, ${escapeHtml(name)}!</strong> We have received your message and our team will get in touch at ${escapeHtml(email)}.`;

    contactForm.reset();
  });
}

/**
 * Utility: HTML escape to prevent XSS
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Initialize on DOMContentLoaded
 */
document.addEventListener('DOMContentLoaded', () => {
  // Load data from travel_recommendation.json
  loadTravelData();

  // Search button and input bindings
  const searchBtn = document.getElementById('searchBtn');
  const resetBtn = document.getElementById('resetBtn');
  const searchInput = document.getElementById('searchInput');
  const resultsCloseBtn = document.getElementById('resultsCloseBtn');

  if (searchBtn) {
    searchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      performSearch();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
      e.preventDefault();
      resetSearch();
    });
  }

  if (searchInput) {
    // Search only on Enter, not while typing
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        performSearch();
      }
    });
  }

  if (resultsCloseBtn) {
    resultsCloseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      resetSearch();
    });
  }

  // Navigation Links event listeners
  const navBrand = document.getElementById('navBrand');
  const navHome = document.getElementById('navHome');
  const navAbout = document.getElementById('navAbout');
  const navContact = document.getElementById('navContact');

  if (navBrand) {
    navBrand.addEventListener('click', (e) => {
      e.preventDefault();
      navigateToSection('home');
    });
  }

  if (navHome) {
    navHome.addEventListener('click', (e) => {
      e.preventDefault();
      navigateToSection('home');
    });
  }

  if (navAbout) {
    navAbout.addEventListener('click', (e) => {
      e.preventDefault();
      navigateToSection('about');
    });
  }

  if (navContact) {
    navContact.addEventListener('click', (e) => {
      e.preventDefault();
      navigateToSection('contact');
    });
  }

  // Handle initial hash routing if present (#about, #contact, #home)
  const initialHash = window.location.hash.replace('#', '');
  if (initialHash === 'about' || initialHash === 'contact') {
    navigateToSection(initialHash);
  } else {
    navigateToSection('home');
  }

  // Setup contact form validation
  setupContactForm();
});

// Expose globals for HTML inline handlers
window.performSearch = performSearch;
window.resetSearch = resetSearch;
window.quickSearch = quickSearch;
window.focusSearchInput = focusSearchInput;
window.navigateToSection = navigateToSection;
window.visitDestination = visitDestination;