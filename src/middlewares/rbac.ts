// @ts-nocheck — legacy RBAC using Mongoose models (not used in active routes)
import { Request, Response, NextFunction } from 'express';
import ApiError from '../utils/apiError';
import { UserRole } from '../models/User';

export const restrictTo = (...roles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new ApiError(403, 'You do not have permission to perform this action'));
        }
        next();
    };
};
