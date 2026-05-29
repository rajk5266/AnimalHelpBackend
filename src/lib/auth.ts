import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP, organization } from "better-auth/plugins";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { db } from "../db/db.js";
import { env } from "../config/env.js";
import * as schema from "../db/schema.js";
import { sendOTPEmail, sendEmail } from "../services/email.service.js";
import { eq, and } from "drizzle-orm";

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
            async allowedToCreateOrganization(user: { id: string }) {
                const existingOwnership = await db.query.member.findFirst({
                    where: and(
                        eq(schema.member.userId, user.id),
                        eq(schema.member.role, "owner"),
                    ),
                });
                return !existingOwnership;
            },

            schema: {
                organization: {
                    additionalFields: {
                        verified: {
                            type: "boolean",
                            defaultValue: false,
                            input: false, // client cannot set this
                            required: true,
                        },
                        verificationStatus: {
                            type: "string",
                            defaultValue: "pending",
                            input: false,
                            required: false,
                        },
                        verifiedAt: {
                            type: "string",
                            input: false,
                            required: false,
                        },
                        rejectedReason: {
                            type: "string",
                            input: false,
                            required: false,
                        },
                        phone: { type: "string", input: true, required: false },
                        address: { type: "string", input: true, required: false },
                        website: { type: "string", input: true, required: false },
                        description: { type: "string", input: true, required: false },
                        latitude: { type: "number", input: true, required: false },
                        longitude: { type: "number", input: true, required: false },
                    },
                },
            },

            organizationHooks: {
                beforeCreateOrganization: async ({ organization }) => {
                    return {
                        data: {
                            ...organization,
                            verified: false,
                            verificationStatus: "pending",
                            metadata: {
                                ...organization.metadata,
                                submittedAt: new Date().toISOString(),
                            },
                        },
                    };
                },
                beforeCreateInvitation: async ({ invitation, inviter, organization }) => {

                    // Prevent inviting if org is not verified
                    if (!organization.verified) {
                        throw new APIError("FORBIDDEN", {
                            message: "Your organization is pending verification. You cannot invite members until approved.",
                        } as any);
                    }

                    const expirationDate = new Date();
                    expirationDate.setDate(expirationDate.getDate() + 7); // 7 days from now

                    return {
                        data: {
                            ...invitation,
                            expiresAt: expirationDate,
                        }
                    };
                },

                afterCreateInvitation: async ({ invitation, inviter, organization }) => {
                    const acceptUrl = `${env.ORG_CLIENT_URL}/accept-invitation?id=${invitation.id}`;
                    await sendEmail(
                        invitation.email,
                        `Invitation to join ${organization.name}`,
                        `You have been invited to join ${organization.name} on StrayHelp. Please accept by visiting: ${acceptUrl}`,
                        `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                            <h2 style="color: #047857;">Join ${organization.name}</h2>
                            <p>Hello,</p>
                            <p>You have been invited to join <strong>${organization.name}</strong> as a <strong>${invitation.role}</strong> by ${inviter.name}.</p>
                            <div style="margin: 24px 0;">
                                <a href="${acceptUrl}" style="display: inline-block; background-color: #047857; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
                            </div>
                            <p style="font-size: 12px; color: #6b7280;">If the button doesn't work, copy and paste this link into your browser:</p>
                            <p style="font-size: 12px; color: #2563eb; word-break: break-all;">${acceptUrl}</p>
                            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                            <p style="font-size: 12px; color: #9ca3af;">This invitation will expire in 7 days. If you did not expect this invitation, please ignore this email.</p>
                        </div>`
                    );
                },

                beforeAcceptInvitation: async ({ invitation, user, organization }) => {
                    // Optional: Custom validation before acceptance logic goes here
                },

                afterAcceptInvitation: async ({ invitation, member, user, organization }) => {
                    // Optional: Custom setup logic goes here
                },
            }, // Fixed ending bracket closure
        }),
    ],

    // Block all org mutations/actions for unverified orgs globally
    hooks: {
        before: createAuthMiddleware(async (ctx) => {
            const protectedOrgPaths = [
                "/organization/update",
                "/organization/delete",
                "/organization/create-invitation",
                "/organization/cancel-invitation",
                "/organization/update-member-role",
                "/organization/remove-member",
                "/organization/leave",
            ];

            if (!protectedOrgPaths.includes(ctx.path)) return;

            // Look up via explicit parameter or fallback to currently active session workspace
            const orgId = (ctx.body?.organizationId || ctx.context?.activeOrganizationId) as string | undefined;
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