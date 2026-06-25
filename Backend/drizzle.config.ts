import { defineConfig } from 'drizzle-kit';
import { env } from './src/config/env';



export default defineConfig({
    schema: './src/db/schema.ts',
    dialect: 'postgresql',
    dbCredentials:{
        url: env.DB_URL,
    }
}) 