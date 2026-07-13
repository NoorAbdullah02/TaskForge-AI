import dotenv from 'dotenv';

dotenv.config({ quiet: true });

export const env = {
  PORT: process.env.PORT || 4000,
  DB_URL: process.env.DB_URL || 'mongodb://localhost:27017/myapp',
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:4000',
  JWT_SECRET: process.env.JWT_SECRET || 'default_jwt_secret_key',
  BREVO_API_KEY: process.env.BREVO_API_KEY || '',
  EMAIL_FROM: process.env.EMAIL_FROM || '',
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY || '',
  IMAGEKIT_PUBLIC_KEY: process.env.IMAGEKIT_PUBLIC_KEY || '',
  IMAGEKIT_PRIVATE_KEY: process.env.IMAGEKIT_PRIVATE_KEY || '',
  IMAGEKIT_URL_ENDPOINT: process.env.IMAGEKIT_URL_ENDPOINT || '',
  BKASH_MERCHANT_NUMBER: process.env.BKASH_MERCHANT_NUMBER || '01748269350',
  NAGAD_MERCHANT_NUMBER: process.env.NAGAD_MERCHANT_NUMBER || '01748269350',
};