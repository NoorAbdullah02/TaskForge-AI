import dotenv from 'dotenv';

dotenv.config({ quiet: true });

export const env = {
  PORT: process.env.PORT || 4000,
  DB_URL: process.env.DB_URL || 'mongodb://localhost:27017/myapp',
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  JWT_SECRET: process.env.JWT_SECRET || 'default_jwt_secret_key',
  BREVO_API_KEY: process.env.BREVO_API_KEY || '',
  EMAIL_FROM: process.env.EMAIL_FROM || '',
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || '',
};