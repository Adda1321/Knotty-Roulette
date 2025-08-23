// WordPress Backend Configuration
// Update these values with your actual WordPress site details

export const WORDPRESS_CONFIG = {
  // Your WordPress site URL (without trailing slash)
  SITE_URL: 'https://www.knottytimes.com',
  
  // AJAX endpoint - automatically generated from SITE_URL
  get AJAX_URL() {
    return `${this.SITE_URL}/wp-admin/admin-ajax.php`;
  },
  
  // WordPress nonce for AJAX requests
  // This should be dynamically generated in a real implementation
  NONCE: 'placeholder-nonce', // Temporary placeholder
  
  // Plugin action names
  ACTIONS: {
    GET_CHALLENGES: 'krt_fetch_challenges', // Fixed: matches backend endpoint
    LOG_RESPONSE: 'krt_vote', // Fixed: matches backend endpoint
  },
  
  // API timeout in milliseconds
  TIMEOUT: 10000,
  
  // Retry attempts for failed requests
  MAX_RETRIES: 3,
};

// Development/Production environment detection
export const isDevelopment = __DEV__;

// Logging configuration
export const LOGGING_CONFIG = {
  ENABLED: isDevelopment,
  LEVEL: isDevelopment ? 'debug' : 'error',
}; 