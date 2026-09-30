// Vercel Speed Insights Initialization
// This script loads and initializes Vercel Speed Insights for performance tracking
(function() {
  // Import and inject Speed Insights
  // For browser environments, we use the script injection approach
  if (typeof window !== 'undefined') {
    // Create script element to load Speed Insights
    const script = document.createElement('script');
    script.src = '/_vercel/speed-insights/script.js';
    script.defer = true;
    script.setAttribute('data-sdkn', '@vercel/speed-insights');
    script.setAttribute('data-sdkv', '2.0.0');
    
    script.onerror = function() {
      console.log('[Vercel Speed Insights] Failed to load script. Please check if any content blockers are enabled.');
    };
    
    // Inject the script into the document head
    if (document.head && !document.head.querySelector('script[src*="speed-insights"]')) {
      document.head.appendChild(script);
    }
  }
})();
