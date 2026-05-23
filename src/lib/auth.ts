import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP, organization } from "better-auth/plugins";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { db } from "../db/db.js";
import { env } from "../config/env.js";
import * as schema from "../db/schema.js";
import { sendOTPEmail } from "../services/email.service.js";
import { eq } from "drizzle-orm";

export const auth = betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.CLIENT_URL, env.ADMIN_CLIENT_URL, env.ORG_CLIENT_URL],

    database: drizzleAdapter(db, {
        provider: "pg",
        usePlural: false,
        schema: {
            user: schema.user,
            session: schema.session,
            account: schema.account,
            verification: schema.verification,
            organization: schema.organization,
            member: schema.member,
            invitation: schema.invitation,
        },
    }),

    emailAndPassword: {
        enabled: true,
        autoSignIn: true,
        requireEmailVerification: true,
    },

    plugins: [
        emailOTP({
            async sendVerificationOTP({ email, otp }) {
                await sendOTPEmail(email, otp);
            },
        }),

        organization({
            // Block creation if user already owns an org
            async allowedToCreateOrganization(user: { id: string }, allowedToCreateOrganization: boolean) {
                const existing = await db.query.organization.findFirst({
                    where: eq(schema.organization.ownerId, user.id),
                });
                return !existing;
            },

            schema: {
                organization: {
                    additionalFields: {
                        verified: {
                            type: "boolean",
                            defaultValue: false,
                            input: false,     // client cannot set this
                            required: true,
                        },
                        verificationStatus: {
                            type: "string",
                            defaultValue: "pending",
                            input: false,
                            required: false,
                        },
                        ownerId: {
                            type: "string",
                            input: false,
                            required: false,
                        },
                        phone: {
                            type: "string",
                            input: true,
                            required: false,
                        },
                        address: {
                            type: "string",
                            input: true,
                            required: false,
                        },
                        website: {
                            type: "string",
                            input: true,
                            required: false,
                        },
                        description: {
                            type: "string",
                            input: true,
                            required: false,
                        },
                        latitude: {
                            type: "number",
                            input: true,
                            required: false,
                        },
                        longitude: {
                            type: "number",
                            input: true,
                            required: false,
                        },
                    },
                },
            },

            organizationHooks: {
                beforeCreateOrganization: async ({ organization, user }) => {
                    return {
                        data: {
                            ...organization,
                            ownerId: user.id,
                            verified: false,
                            verificationStatus: "pending",
                            metadata: {
                                ...organization.metadata,
                                submittedAt: new Date().toISOString(),
                            },
                        },
                    };
                },
            },
        }),
    ],

    // Block all org actions for unverified orgs
    hooks: {
        before: createAuthMiddleware(async (ctx) => {
            const protectedOrgPaths = [
                "/organization/update",
                "/organization/delete",
                "/organization/create-invitation",
                "/organization/cancel-invitation",
                "/organization/update-member-role",
                "/organization/remove-member",
                "/organization/create-team",
                "/organization/update-team",
                "/organization/remove-team",
                "/organization/add-team-member",
                "/organization/remove-team-member",
                "/organization/leave",
            ];

            if (!protectedOrgPaths.includes(ctx.path)) return;

            // ctx.body contains the request body — orgId is passed by the client
            const orgId = ctx.body?.organizationId as string | undefined;
            if (!orgId) return;

            const org = await db.query.organization.findFirst({
                where: eq(schema.organization.id, orgId),
            });

            if (!org) {
                throw new APIError("NOT_FOUND", { message: "Organization not found" });
            }

            if (!org.verified) {
                throw new APIError("FORBIDDEN", {
                    message: "Your organization is pending verification. Please wait for admin approval.",
                } as any);
            }
        }),
    },

    advanced: {
        defaultCookieAttributes: {
            httpOnly: true,
            secure: env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
        },
    },
});