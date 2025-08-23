// WordPress Backend Configuration
// Updated to use the new REST API endpoints

export const WORDPRESS_CONFIG = {
  // Your WordPress site URL (without trailing slash)
  SITE_URL: 'https://www.knottytimes.com',
  
  // REST API base URL
  get REST_API_BASE() {
    return `${this.SITE_URL}/wp-json/krt/v1`;
  },
  
  // REST API endpoints
  ENDPOINTS: {
    CHALLENGES: '/challenges',
    VOTE: '/vote',
    TRACK_PLAY: '/track-play',
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