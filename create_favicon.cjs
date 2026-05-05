const fs = require('fs');
const path = require('path');

// Create a clean SVG meditation icon for favicon
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <!-- Background circle -->
  <circle cx="32" cy="32" r="32" fill="#EDE9FE"/>
  <!-- Head -->
  <circle cx="32" cy="14" r="6" fill="#7C3AED"/>
  <!-- Body torso -->
  <path d="M24 24 Q32 20 40 24 L38 36 Q32 40 26 36 Z" fill="#8B5CF6"/>
  <!-- Left leg -->
  <path d="M26 36 Q18 40 14 44 Q18 46 26 42 Z" fill="#8B5CF6"/>
  <!-- Right leg -->
  <path d="M38 36 Q46 40 50 44 Q46 46 38 42 Z" fill="#8B5CF6"/>
  <!-- Left arm/hand resting -->
  <circle cx="18" cy="40" r="4" fill="#A78BFA"/>
  <!-- Right arm/hand resting -->
  <circle cx="46" cy="40" r="4" fill="#A78BFA"/>
  <!-- Aura circles for meditation effect -->
  <circle cx="32" cy="14" r="8" stroke="#C4B5FD" stroke-width="1.5" fill="none" opacity="0.5"/>
</svg>`;

fs.writeFileSync('public/favicon.svg', svg);

// Also create a simple favicon.ico replacement by writing the SVG as the html link
console.log('SVG favicon written');
