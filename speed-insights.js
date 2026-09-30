/**
 * Vercel Speed Insights initialization
 * Loads the Speed Insights tracking script for performance monitoring
 */
(function() {
  // Initialize the Speed Insights queue
  window.si = window.si || function() {
    (window.siq = window.siq || []).push(arguments);
  };
  
  // Create and inject the script
  const script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/speed-insights/script.js';
  
  // Append to head
  if (document.head) {
    document.head.appendChild(script);
  } else {
    // If head is not ready, wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        document.head.appendChild(script);
      });
    } else {
      document.head.appendChild(script);
    }
  }
})();
