import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async join(@Body('email') email: string) {
    return this.waitlistService.addToWaitlist(email);
  }

  @Get('count')
  async getCount() {
    return this.waitlistService.getCount();
  }
}
