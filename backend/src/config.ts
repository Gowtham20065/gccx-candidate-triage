import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from root or backend
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_PATH: process.env.DATABASE_PATH 
    ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
    : path.resolve(__dirname, '../../data/candidates.db'),
  CANDIDATES_JSON_PATH: process.env.CANDIDATES_JSON_PATH
    ? path.resolve(process.cwd(), process.env.CANDIDATES_JSON_PATH)
    : path.resolve(__dirname, '../../data/candidates.json'),
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};
