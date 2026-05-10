import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail = 'SolApp <noreply@ourhopevillage.com>';

  constructor() {
    const apiKey = process.env.RESEND_API_KEY || 're_5B2tWt5d_5c69W4nPqu4AwUZdRPh517P4';
    this.resend = new Resend(apiKey);
    this.logger.log('✅ Resend email service initialized with custom domain');
  }

  async sendVerificationEmail(email: string, code: string, username: string) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Verify Your Email - SolApp',
        html: this.getVerificationEmailTemplate(code, username),
      });

      if (error) {
        this.logger.error(`Failed to send verification email to ${email}:`, error);
        throw error;
      }

      this.logger.log(`✅ Verification email sent to ${email}: ${data.id}`);
      return { success: true, messageId: data.id };
    } catch (error) {
      this.logger.error(`❌ Failed to send verification email to ${email}:`, error);
      throw error;
    }
  }

  async sendWelcomeEmail(email: string, username: string, walletAddress: string) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Welcome to SolApp! 🎉',
        html: this.getWelcomeEmailTemplate(username, walletAddress),
      });

      if (error) {
        this.logger.error(`Failed to send welcome email to ${email}:`, error);
        return { success: false, error: error.message };
      }

      this.logger.log(`✅ Welcome email sent to ${email}: ${data.id}`);
      return { success: true, messageId: data.id };
    } catch (error) {
      this.logger.error(`❌ Failed to send welcome email to ${email}:`, error);
      // Don't throw - welcome email is not critical
      return { success: false, error: error.message };
    }
  }

  async sendPasswordResetEmail(email: string, resetCode: string, username: string) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Reset Your Password - SolApp',
        html: this.getPasswordResetEmailTemplate(resetCode, username),
      });

      if (error) {
        this.logger.error(`Failed to send password reset email to ${email}:`, error);
        throw error;
      }

      this.logger.log(`✅ Password reset email sent to ${email}: ${data.id}`);
      return { success: true, messageId: data.id };
    } catch (error) {
      this.logger.error(`❌ Failed to send password reset email to ${email}:`, error);
      throw error;
    }
  }

  async sendPasswordChangedEmail(email: string, username: string) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Password Changed - SolApp',
        html: this.getPasswordChangedEmailTemplate(username),
      });

      if (error) {
        this.logger.error(`Failed to send password changed email to ${email}:`, error);
        return { success: false, error: error.message };
      }

      this.logger.log(`✅ Password changed email sent to ${email}: ${data.id}`);
      return { success: true, messageId: data.id };
    } catch (error) {
      this.logger.error(`❌ Failed to send password changed email to ${email}:`, error);
      return { success: false, error: error.message };
    }
  }

  private getVerificationEmailTemplate(code: string, username: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">SolApp</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">Hi ${username}! 👋</h2>
                      <p style="color: #6b7280; margin: 0 0 24px 0; font-size: 16px; line-height: 1.5;">
                        Thanks for signing up for SolApp! To complete your registration, please verify your email address using the code below:
                      </p>
                      
                      <!-- Verification Code -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 24px 0;">
                            <div style="background-color: #f3f4f6; border: 2px dashed #9333ea; border-radius: 8px; padding: 24px; display: inline-block;">
                              <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Verification Code</p>
                              <p style="color: #9333ea; margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">${code}</p>
                            </div>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="color: #6b7280; margin: 24px 0 0 0; font-size: 14px; line-height: 1.5;">
                        This code will expire in <strong>10 minutes</strong>. If you didn't request this code, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                      <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                        © 2026 SolApp. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  private getWelcomeEmailTemplate(username: string, walletAddress: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to SolApp</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
                      <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 32px; font-weight: 600;">🎉 Welcome to SolApp!</h1>
                      <p style="color: #e9d5ff; margin: 0; font-size: 16px;">Your social payment journey starts here</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">Hi ${username}! 👋</h2>
                      <p style="color: #6b7280; margin: 0 0 24px 0; font-size: 16px; line-height: 1.5;">
                        Your account is now verified and ready to use! We've automatically created a Solana wallet for you and added 2 SOL to get you started on devnet.
                      </p>
                      
                      <!-- Wallet Info -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                        <tr>
                          <td>
                            <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">Your Wallet Address:</p>
                            <p style="color: #9333ea; margin: 0; font-size: 14px; font-family: 'Courier New', monospace; word-break: break-all;">${walletAddress}</p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Features -->
                      <h3 style="color: #1f2937; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">What you can do:</h3>
                      <ul style="color: #6b7280; margin: 0 0 24px 0; padding-left: 20px; font-size: 16px; line-height: 1.8;">
                        <li>Send and receive SOL payments instantly</li>
                        <li>Chat with friends and send payments in conversations</li>
                        <li>Scan QR codes for quick payments</li>
                        <li>Share your wallet address to receive funds</li>
                        <li>View your transaction history</li>
                      </ul>
                      
                      <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.5;">
                        Need help? Check out our Help & Support section in the app or reply to this email.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                      <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                        © 2026 SolApp. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  private getPasswordResetEmailTemplate(resetCode: string, username: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">SolApp</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">Hi ${username}! 👋</h2>
                      <p style="color: #6b7280; margin: 0 0 24px 0; font-size: 16px; line-height: 1.5;">
                        We received a request to reset your password. Use the code below to proceed:
                      </p>
                      
                      <!-- Reset Code -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 24px 0;">
                            <div style="background-color: #f3f4f6; border: 2px dashed #9333ea; border-radius: 8px; padding: 24px; display: inline-block;">
                              <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Reset Code</p>
                              <p style="color: #9333ea; margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">${resetCode}</p>
                            </div>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="color: #6b7280; margin: 24px 0 0 0; font-size: 14px; line-height: 1.5;">
                        This code will expire in <strong>10 minutes</strong>. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                      <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                        © 2026 SolApp. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  private getPasswordChangedEmailTemplate(username: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Changed</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">SolApp</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">Hi ${username}! 👋</h2>
                      <p style="color: #6b7280; margin: 0 0 24px 0; font-size: 16px; line-height: 1.5;">
                        Your password has been successfully changed. You can now sign in with your new password.
                      </p>
                      
                      <!-- Security Notice -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 16px; margin-bottom: 24px;">
                        <tr>
                          <td>
                            <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.5;">
                              <strong>Security Notice:</strong> If you didn't make this change, please contact our support team immediately.
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.5;">
                        For your security, we recommend:
                      </p>
                      <ul style="color: #6b7280; margin: 8px 0 0 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
                        <li>Using a strong, unique password</li>
                        <li>Enabling two-factor authentication</li>
                        <li>Never sharing your password with anyone</li>
                      </ul>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                      <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                        © 2026 SolApp. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }
}
