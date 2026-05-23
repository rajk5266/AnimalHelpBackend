import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const signToken = (id: string) => {
    return jwt.sign({ id }, env.JWT_SECRET as jwt.Secret, {
        expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
};

export const signRefreshToken = (id: string) => {
    return jwt.sign({ id }, env.JWT_REFRESH_SECRET as jwt.Secret, {
        expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
};
