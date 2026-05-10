import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserDocument } from '../../schemas/user.schema';
import { SolanaService } from '../solana/solana.service';
import { EmailService } from '../email/email.service';
import { TwoFactorService } from './two-factor.service';
import { SignupDto } from './dto/signup.dto';
import { SigninDto } from './dto/signin.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { Verify2FADto, Verify2FALoginDto } from './dto/two-factor.dto';
import { RequestPasswordResetDto, ResetPasswordDto } from './dto/password-reset.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private solanaService: SolanaService,
    private emailService: EmailService,
    private twoFactorService: TwoFactorService,
  ) {}

  /**
   * User signup with automatic wallet creation
   */
  async signup(signupDto: SignupDto) {
    const { email, username, password } = signupDto;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictException('Email already exists');
      }
      throw new ConflictException('Username already taken');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate Solana wallet
    const { publicKey, encryptedPrivateKey } =
      this.solanaService.generateWallet();

    // Generate verification code
    const verificationCode = this.generateVerificationCode();
    const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user
    const user = await this.userModel.create({
      email,
      username,
      password: hashedPassword,
      walletAddress: publicKey,
      encryptedPrivateKey,
      verificationCode,
      verificationCodeExpires,
      emailVerified: false,
    });

    // Request airdrop for new users (devnet only)
    try {
      await this.solanaService.requestAirdrop(publicKey, 2);
      this.logger.log(`Airdrop sent to new user: ${publicKey}`);
    } catch (error) {
      this.logger.warn(`Airdrop failed for ${publicKey}: ${error.message}`);
    }

    // Generate JWT token
    const token = this.generateToken(user._id.toString());

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(
        email,
        verificationCode,
        username,
      );
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email: ${error.message}`);
      // Still log to console as fallback
      this.logger.log(`Verification code for ${email}: ${verificationCode}`);
    }

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  /**
   * User signin
   */
  async signin(signinDto: SigninDto) {
    const { email, password } = signinDto;

    // Find user
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Generate temporary token for 2FA verification
      const tempToken = this.twoFactorService.generateTempToken();
      const tempLoginExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      user.tempLoginToken = tempToken;
      user.tempLoginExpires = tempLoginExpires;
      await user.save();

      return {
        requires2FA: true,
        tempToken,
        email: user.email,
      };
    }

    // Generate token
    const token = this.generateToken(user._id.toString());

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  /**
   * Verify email with code
   */
  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const { email, code } = verifyEmailDto;

    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    if (user.verificationCode !== code) {
      throw new BadRequestException('Invalid verification code');
    }

    if (new Date() > user.verificationCodeExpires) {
      throw new BadRequestException('Verification code expired');
    }

    // Mark email as verified
    user.emailVerified = true;
    user.verificationCode = null as any;
    user.verificationCodeExpires = null as any;
    await user.save();

    // Send welcome email
    try {
      await this.emailService.sendWelcomeEmail(
        user.email,
        user.username,
        user.walletAddress,
      );
      this.logger.log(`Welcome email sent to ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email: ${error.message}`);
    }

    return {
      message: 'Email verified successfully',
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Resend verification code
   */
  async resendVerificationCode(email: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Generate new code
    const verificationCode = this.generateVerificationCode();
    const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);

    user.verificationCode = verificationCode;
    user.verificationCodeExpires = verificationCodeExpires;
    await user.save();

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(
        email,
        verificationCode,
        user.username,
      );
      this.logger.log(`Verification email resent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to resend verification email: ${error.message}`);
      // Still log to console as fallback
      this.logger.log(`New verification code for ${email}: ${verificationCode}`);
    }

    return {
      message: 'Verification code sent',
    };
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Generate JWT token
   */
  private generateToken(userId: string): string {
    return this.jwtService.sign({ userId });
  }

  /**
   * Generate 6-digit verification code
   */
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Remove sensitive data from user object
   */
  private sanitizeUser(user: UserDocument) {
    return {
      id: user._id,
      email: user.email,
      username: user.username,
      name: user.name,
      bio: user.bio,
      avatar: user.avatar,
      walletAddress: user.walletAddress,
      emailVerified: user.emailVerified,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      postsCount: user.postsCount,
      createdAt: (user as any).createdAt,
    };
  }

  // ==================== Two-Factor Authentication ====================

  /**
   * Setup 2FA - Generate secret and QR code
   */
  async setup2FA(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    // Generate secret
    const { secret, otpauthUrl } = this.twoFactorService.generateSecret(user.email);

    // Generate QR code
    const qrCode = await this.twoFactorService.generateQRCode(otpauthUrl);

    // Store secret temporarily (will be saved after verification)
    const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key';
    const encryptedSecret = this.twoFactorService.encryptSecret(secret, encryptionKey);
    
    user.twoFactorSecret = encryptedSecret;
    await user.save();

    return {
      secret,
      qrCode,
    };
  }

  /**
   * Verify 2FA code and enable 2FA
   */
  async verify2FA(userId: string, verify2FADto: Verify2FADto) {
    const { code } = verify2FADto;

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException('2FA setup not initiated');
    }

    // Decrypt secret
    const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key';
    const secret = this.twoFactorService.decryptSecret(user.twoFactorSecret, encryptionKey);

    // Verify code
    const isValid = this.twoFactorService.verifyToken(secret, code);
    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    // Generate recovery codes
    const recoveryCodes = this.twoFactorService.generateRecoveryCodes(10);
    const hashedCodes = await this.twoFactorService.hashRecoveryCodes(recoveryCodes);

    // Enable 2FA
    user.twoFactorEnabled = true;
    user.recoveryCodes = hashedCodes;
    await user.save();

    this.logger.log(`2FA enabled for user: ${user.email}`);

    return {
      success: true,
      recoveryCodes, // Return plain codes to user (only time they'll see them)
    };
  }

  /**
   * Disable 2FA
   */
  async disable2FA(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null as any;
    user.recoveryCodes = [];
    await user.save();

    this.logger.log(`2FA disabled for user: ${user.email}`);

    return {
      success: true,
      message: '2FA disabled successfully',
    };
  }

  /**
   * Verify 2FA code during login
   */
  async verify2FALogin(verify2FALoginDto: Verify2FALoginDto) {
    const { email, tempToken, code, isRecoveryCode } = verify2FALoginDto;

    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify temp token
    if (user.tempLoginToken !== tempToken) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    if (new Date() > user.tempLoginExpires) {
      throw new UnauthorizedException('Session expired');
    }

    let isValid = false;

    if (isRecoveryCode) {
      // Verify recovery code
      const result = await this.twoFactorService.verifyRecoveryCode(
        code,
        user.recoveryCodes
      );
      
      if (result.valid) {
        isValid = true;
        // Remove used recovery code
        user.recoveryCodes.splice(result.index, 1);
        this.logger.log(`Recovery code used for user: ${user.email}`);
      }
    } else {
      // Verify TOTP code
      const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key';
      const secret = this.twoFactorService.decryptSecret(user.twoFactorSecret, encryptionKey);
      isValid = this.twoFactorService.verifyToken(secret, code);
    }

    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Clear temp token
    user.tempLoginToken = null as any;
    user.tempLoginExpires = null as any;
    await user.save();

    // Generate JWT token
    const token = this.generateToken(user._id.toString());

    return {
      success: true,
      user: this.sanitizeUser(user),
      token,
    };
  }

  // ==================== Password Reset ====================

  /**
   * Request password reset
   */
  async requestPasswordReset(requestPasswordResetDto: RequestPasswordResetDto) {
    const { email } = requestPasswordResetDto;

    const user = await this.userModel.findOne({ email });
    if (!user) {
      // Don't reveal if user exists
      return {
        success: true,
        message: 'If the email exists, a reset link has been sent',
      };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(resetToken, 10);
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = resetExpires;
    await user.save();

    // Send reset email
    try {
      await this.emailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        user.username,
      );
      this.logger.log(`Password reset email sent to ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send reset email: ${error.message}`);
      // Log token to console as fallback
      this.logger.log(`Reset token for ${email}: ${resetToken}`);
    }

    return {
      success: true,
      message: 'If the email exists, a reset link has been sent',
    };
  }

  /**
   * Reset password with token
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, password } = resetPasswordDto;

    // Find user with valid reset token
    const users = await this.userModel.find({
      passwordResetToken: { $exists: true, $ne: null },
      passwordResetExpires: { $gt: new Date() },
    });

    let user: UserDocument | null = null;
    for (const u of users) {
      const isValid = await bcrypt.compare(token, u.passwordResetToken);
      if (isValid) {
        user = u;
        break;
      }
    }

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    user.password = hashedPassword;
    user.passwordResetToken = null as any;
    user.passwordResetExpires = null as any;
    await user.save();

    this.logger.log(`Password reset successful for user: ${user.email}`);

    // Send confirmation email
    try {
      await this.emailService.sendPasswordChangedEmail(user.email, user.username);
    } catch (error) {
      this.logger.error(`Failed to send password changed email: ${error.message}`);
    }

    return {
      success: true,
      message: 'Password reset successfully',
    };
  }
}
