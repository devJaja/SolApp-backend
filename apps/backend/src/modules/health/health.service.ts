import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { SolanaService } from '../solana/solana.service';
import { EmailService } from '../email/email.service';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @InjectConnection() private readonly mongoConnection: Connection,
    private readonly solanaService: SolanaService,
    private readonly emailService: EmailService,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * Basic health check
   */
  async checkHealth() {
    const startTime = Date.now();

    try {
      // Check MongoDB
      const dbStatus = this.mongoConnection.readyState === 1 ? 'healthy' : 'unhealthy';

      // Check Solana (simple check)
      let solanaStatus = 'healthy';
      try {
        await this.solanaService.getBalance('11111111111111111111111111111111'); // System program
      } catch (error) {
        solanaStatus = 'unhealthy';
      }

      // Check Email (Resend)
      let emailStatus = 'healthy';
      try {
        // Check if Resend API key is configured
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
          emailStatus = 'unhealthy';
        }
      } catch (error) {
        emailStatus = 'unhealthy';
      }

      // Check Upload (Cloudinary)
      let uploadStatus = 'healthy';
      try {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
        if (!cloudName || !uploadPreset) {
          uploadStatus = 'unhealthy';
        }
      } catch (error) {
        uploadStatus = 'unhealthy';
      }

      const responseTime = Date.now() - startTime;
      const isHealthy = dbStatus === 'healthy' && solanaStatus === 'healthy' && emailStatus === 'healthy' && uploadStatus === 'healthy';

      return {
        status: isHealthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        responseTime: `${responseTime}ms`,
        services: {
          database: dbStatus,
          solana: solanaStatus,
          email: emailStatus,
          upload: uploadStatus,
        },
      };
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * Detailed health check with more information
   */
  async checkDetailedHealth() {
    const startTime = Date.now();

    try {
      // MongoDB details
      const dbHealth = {
        status: this.mongoConnection.readyState === 1 ? 'connected' : 'disconnected',
        readyState: this.mongoConnection.readyState,
        host: this.mongoConnection.host,
        name: this.mongoConnection.name,
      };

      // Solana details
      let solanaHealth: any = {
        status: 'unknown',
        network: process.env.SOLANA_NETWORK || 'devnet',
        rpcUrl: process.env.SOLANA_RPC_URL,
      };

      try {
        const version = await this.solanaService['connection'].getVersion();
        const slot = await this.solanaService['connection'].getSlot();
        
        solanaHealth = {
          ...solanaHealth,
          status: 'connected',
          version: version['solana-core'],
          currentSlot: slot,
        };
      } catch (error) {
        solanaHealth.status = 'error';
        solanaHealth.error = error.message;
      }

      // Email (Resend) details
      let emailHealth: any = {
        status: 'unknown',
        provider: 'Resend',
        fromEmail: 'SolApp <noreply@ourhopevillage.com>',
      };

      try {
        const apiKey = process.env.RESEND_API_KEY;
        if (apiKey) {
          emailHealth.status = 'configured';
          emailHealth.apiKeySet = true;
        } else {
          emailHealth.status = 'error';
          emailHealth.error = 'RESEND_API_KEY not configured';
        }
      } catch (error) {
        emailHealth.status = 'error';
        emailHealth.error = error.message;
      }

      // Upload (Cloudinary) details
      let uploadHealth: any = {
        status: 'unknown',
        provider: 'Cloudinary',
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      };

      try {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
        
        if (cloudName && uploadPreset) {
          uploadHealth.status = 'configured';
          uploadHealth.uploadPreset = uploadPreset;
          uploadHealth.apiUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
        } else {
          uploadHealth.status = 'error';
          uploadHealth.error = 'Cloudinary credentials not configured';
        }
      } catch (error) {
        uploadHealth.status = 'error';
        uploadHealth.error = error.message;
      }

      // System info
      const systemInfo = {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memory: {
          total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
          used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
          external: `${Math.round(process.memoryUsage().external / 1024 / 1024)}MB`,
        },
        cpu: process.cpuUsage(),
      };

      const responseTime = Date.now() - startTime;
      const isHealthy = dbHealth.status === 'connected' && solanaHealth.status === 'connected' && emailHealth.status === 'configured' && uploadHealth.status === 'configured';

      return {
        status: isHealthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        environment: process.env.NODE_ENV || 'development',
        services: {
          database: dbHealth,
          solana: solanaHealth,
          email: emailHealth,
          upload: uploadHealth,
        },
        system: systemInfo,
      };
    } catch (error) {
      this.logger.error('Detailed health check failed:', error);
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }
}
