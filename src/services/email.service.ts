// src/services/email.service.ts
import nodemailer from "nodemailer";
import { env } from "../config/env.js";

/**
 * Create a nodemailer transport
 */
const createTransport = async () => {
    if (env.EMAIL_SMTP_HOST && env.EMAIL_SMTP_USER && env.EMAIL_SMTP_PASSWORD) {
        // Use configured SMTP transport (Google SMTP in your case)
        return nodemailer.createTransport({
            host: env.EMAIL_SMTP_HOST,
            port: Number(process.env.EMAIL_SMTP_PORT) || 587,
            auth: {
                user: env.EMAIL_SMTP_USER,
                pass: env.EMAIL_SMTP_PASSWORD,
            },
        });
    } else {
        // Development fallback: use ethereal test account
        const testAccount = await nodemailer.createTestAccount();
        console.log({ testAccount });
        const transport = nodemailer.createTransport({
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
            secure: testAccount.smtp.secure,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });

        return transport;
    }
};

/**
 * Send an email
 */
export const sendEmail = async (
    to: string,
    subject: string,
    text: string,
    html: string
): Promise<void> => {
    const transport = await createTransport();
    const msg = {
        from: env.EMAIL_SENDER,
        to,
        subject,
        text,
        html,
    };

    // send mail
    const info = await transport.sendMail(msg);

    console.log("Email sent: %s", info.messageId);

    // If in development, you can log the preview URL
    if (process.env.NODE_ENV !== "production") {
        console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
    }
};

/**
 * Send verification email
 */
export const sendVerificationEmail = async (
    subject: string = "Verify your email address",
    to: string,
    verificationUrl: string
): Promise<void> => {
    const text = `Dear user,
  
Please verify your email by clicking on the following link: ${verificationUrl}
  
If you did not create an account, please ignore this email.
  
Thanks,
The Team`;

    const html = `<div>
<p>Dear user,</p>
<p>Please verify your email by clicking on the following link:</p>
<p><a href="${verificationUrl}">Verify Email</a></p>
<p>If you did not create an account, please ignore this email.</p>
<p>Thanks,<br>The Team</p>
</div>`;

    await sendEmail(to, subject, text, html);
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (
    subject: string = "Password Reset Request",
    to: string,
    resetURL: string
): Promise<void> => {
    const text = `Dear user,
  
You requested a password reset. Please click on the following link to reset your password: ${resetURL}
  
This link will expire in 1 hour.
  
If you did not request a password reset, please ignore this email.
  
Thanks,
The Team`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Password Reset</title>
  <style>
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background-color: #f4f4f7;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 1px solid #eaeaea;
    }
    .header h1 {
      margin: 0;
      color: #4A90E2;
    }
    .content {
      padding: 20px 0;
      font-size: 16px;
      line-height: 1.6;
    }
    .button {
      display: inline-block;
      margin: 20px 0;
      padding: 12px 24px;
      background-color: #4A90E2;
      color: #ffffff;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
    }
    .footer {
      margin-top: 30px;
      font-size: 14px;
      color: #888888;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset</h1>
    </div>
    <div class="content">
      <p>Dear user,</p>
      <p>You requested a password reset. Please click on the following link to reset your password:</p>
      <p style="text-align: center;">
        <a href="${resetURL}" class="button">Reset Your Password</a>
      </p>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request a password reset, please ignore this email.</p>
      <p>Thanks,<br>The Team</p>
    </div>
    <div class="footer">
      &copy; 2025 Your Company Name. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

    await sendEmail(to, subject, text, html);
};

/**
 * Send OTP email
 */
export const sendOTPEmail = async (
    to: string,
    otp: string
): Promise<void> => {
    const subject = "Your Verification Code";
    const text = `Dear user,\n\nYour verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this, please ignore this email.\n\nThanks,\nThe Team`;
    
    const html = `<div>
<p>Dear user,</p>
<p>Your verification code is: <strong>${otp}</strong></p>
<p>This code will expire in 10 minutes.</p>
<p>If you did not request this, please ignore this email.</p>
<p>Thanks,<br>The Team</p>
</div>`;

    await sendEmail(to, subject, text, html);
};