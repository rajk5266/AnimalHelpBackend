export function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export function sendFakeSms(phone: string, otp: string) {
    console.log(`📲 OTP for ${phone}: ${otp}`);
}
