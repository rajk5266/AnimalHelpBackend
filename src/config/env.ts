import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3000'),
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(10),
    JWT_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_SECRET: z.string().min(10),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    BETTER_AUTH_SECRET: z.string().min(10),
    BETTER_AUTH_URL: z.string().url().default('http://localhost:3000'),
    CLIENT_URL: z.string().url().default('http://localhost:3000'),
    ADMIN_CLIENT_URL: z.string().url().default('http://localhost:3001'),
    ORG_CLIENT_URL: z.string().url().default('http://localhost:3002'),
    EMAIL_SMTP_HOST: z.string(),
    EMAIL_SMTP_PORT: z.string(),
    EMAIL_SMTP_USER: z.string(),
    EMAIL_SMTP_PASSWORD: z.string(),
    EMAIL_SENDER: z.string(),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),

    R2_ACCOUNT_ID: z.string().min(1),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_BUCKET: z.string().min(1),
    R2_PUBLIC_URL: z.string().url(),
});

const processEnv = envSchema.safeParse(process.env);

if (!processEnv.success) {
    console.error('Invalid environment variables:', JSON.stringify(processEnv.error.format(), null, 4));
    process.exit(1);
}

export const env = processEnv.data;
