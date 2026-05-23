// @ts-nocheck — legacy audit log using Mongoose (not used in active routes)
import AuditLog from '../models/AuditLog';
import { IUser } from '../models/User';

export const logAudit = async (
    user: IUser,
    action: string,
    targetModel: string,
    targetId: any,
    changes?: object
) => {
    try {
        await AuditLog.create({
            actor: user._id,
            action,
            targetModel,
            targetId,
            changes,
        });
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // Silent fail so we don't block the main flow? Or should we throw?
        // For now, silent fail but log error.
    }
};
