import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KeepaliveService {
  private readonly logger = new Logger(KeepaliveService.name);
  private readonly apiUrl: string;
  private pingCount = 0;

  constructor(private configService: ConfigService) {
    // Get the API URL from environment or construct it
    this.apiUrl = this.configService.get<string>('API_URL') || 'https://solcial-backend.onrender.com';
    this.logger.log(`🔄 Keepalive service initialized - will ping ${this.apiUrl}/api/health`);
  }

  /**
   * Ping the health endpoint every 14 minutes to prevent Render free tier spin-down
   * Render spins down after 15 minutes of inactivity
   */
  @Cron('*/14 * * * *') // Every 14 minutes
  async pingHealthEndpoint() {
    try {
      this.pingCount++;
      const startTime = Date.now();
      
      const response = await fetch(`${this.apiUrl}/api/health`);
      const data = await response.json();
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        this.logger.log(
          `✅ Keepalive ping #${this.pingCount} successful (${responseTime}ms) - Status: ${data.status}`
        );
      } else {
        this.logger.warn(
          `⚠️ Keepalive ping #${this.pingCount} returned non-OK status: ${response.status}`
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ Keepalive ping #${this.pingCount} failed:`,
        error.message
      );
    }
  }

  /**
   * Log keepalive statistics every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  logStatistics() {
    const uptime = process.uptime();
    const uptimeHours = (uptime / 3600).toFixed(2);
    
    this.logger.log(
      `📊 Keepalive Stats - Pings: ${this.pingCount} | Uptime: ${uptimeHours}h | Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
    );
  }

  /**
   * Get keepalive statistics
   */
  getStats() {
    return {
      pingCount: this.pingCount,
      uptime: process.uptime(),
      apiUrl: this.apiUrl,
      nextPing: 'Every 14 minutes',
      status: 'active',
    };
  }
}
