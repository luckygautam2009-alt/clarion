require('dotenv').config();

const required = ['PORT'];
required.forEach((key) => {
  if (!process.env[key]) {
    console.warn(`[config] Warning: ${key} not set in .env`);
  }
});

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins,
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiApiKeyBackup: process.env.GEMINI_API_KEY_BACKUP || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
};
