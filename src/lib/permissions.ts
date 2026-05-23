import { createAccessControl } from 'better-auth/plugins/access';
import {
    defaultStatements,
    adminAc,
    userAc,
} from 'better-auth/plugins/admin/access';

export const statement = {
    ...defaultStatements
};
// Create access control instance
export const ac = createAccessControl(statement);

// Define roles and permissions
export const admin = ac.newRole({
    ...adminAc.statements,
});

export const user = ac.newRole({

    ...userAc.statements,
});