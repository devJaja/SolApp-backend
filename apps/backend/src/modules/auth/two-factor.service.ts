import { Injectable } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class TwoFactorService {
  /**
   * Generate a new 2FA secret
   */
  generateSecret(email: string): { secret: string; otpauthUrl: string } {
    const secret = speakeasy.generateSecret({
      name: `Solcial (${email})`,
      issuer: 'Solcial',
      length: 32,
    });

    return {
      secret: secret.base32 as string,
      otpauthUrl: secret.otpauth_url as string,
    };
  }

  /**
   * Generate QR code from otpauth URL
   */
  async generateQRCode(otpauthUrl: string): Promise<string> {
    try {
      const qrCode = await QRCode.toDataURL(otpauthUrl);
      return qrCode;
    } catch (error) {
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Verify TOTP code
   */
  verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps before/after for clock skew
    });
  }

  /**
   * Generate recovery codes
   */
  generateRecoveryCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Hash recovery codes for storage
   */
  async hashRecoveryCodes(codes: string[]): Promise<string[]> {
    const hashedCodes = await Promise.all(
      codes.map((code) => bcrypt.hash(code, 10))
    );
    return hashedCodes;
  }

  /**
   * Verify recovery code against hashed codes
   */
  async verifyRecoveryCode(
    code: string,
    hashedCodes: string[]
  ): Promise<{ valid: boolean; index: number }> {
    for (let i = 0; i < hashedCodes.length; i++) {
      const isValid = await bcrypt.compare(code.toUpperCase(), hashedCodes[i]);
      if (isValid) {
        return { valid: true, index: i };
      }
    }
    return { valid: false, index: -1 };
  }

  /**
   * Encrypt secret for storage
   */
  encryptSecret(secret: string, encryptionKey: string): string {
    // Use a fixed IV for simplicity (in production, use random IV and store it)
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const iv = Buffer.alloc(16, 0); // Fixed IV
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * Decrypt secret from storage
   */
  decryptSecret(encryptedSecret: string, encryptionKey: string): string {
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const iv = Buffer.alloc(16, 0); // Same fixed IV
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedSecret, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Generate temporary login token
   */
  generateTempToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
