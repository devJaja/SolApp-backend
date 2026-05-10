import { Controller, Get } from '@nestjs/common';
import { KeepaliveService } from './keepalive.service';

@Controller('keepalive')
export class KeepaliveController {
  constructor(private readonly keepaliveService: KeepaliveService) {}

  @Get('stats')
  getStats() {
    return this.keepaliveService.getStats();
  }
}
