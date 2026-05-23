import { z } from 'zod';

export const createUserSchema = z.object({
    email: z
        .string()
        .trim()
        .email('Invalid email address'),

    password: z
        .string()
        .trim()
        .min(8, 'Password should have minimum 8 characters'),

    name: z
        .string()
        .trim()
        .min(1, 'Name is required'),
});

export const updateUserSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, 'Name is required')
        .optional(),

    password: z
        .string()
        .trim()
        .min(8, 'Password should have minimum 8 characters')
        .optional(),
});

export const loginUserSchema = z.object({
    email: z
        .string()
        .trim()
        .email('Invalid email address'),

    password: z
        .string()
        .trim()
        .min(8, 'Password should have minimum 8 characters'),
});

export const verifyEmailSchema = z.object({
    token: z.string().min(1, 'Token is required'),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Token is required'),
    password: z
        .string()
        .trim()
        .min(8, 'Password should have minimum 8 characters'),
});
