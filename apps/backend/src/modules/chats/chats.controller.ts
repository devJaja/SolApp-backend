import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ChatsService } from './chats.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { SendTipDto } from './dto/send-tip.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  // DEBUG ENDPOINT - UNPROTECTED (for testing only)
  @Get('debug/:id')
  async getChatDebug(@Param('id') id: string) {
    return this.chatsService.getChatDebug(id);
  }

  // Protected endpoints below
  @UseGuards(JwtAuthGuard)
  @Post()
  async createChat(@Request() req, @Body() createChatDto: CreateChatDto) {
    return this.chatsService.createChat(req.user.userId, createChatDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getChats(@Request() req) {
    console.log('[ChatsController.getChats] User ID from token:', req.user.userId);
    console.log('[ChatsController.getChats] Full user object:', JSON.stringify(req.user));
    return this.chatsService.getChats(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getChat(@Request() req, @Param('id') id: string) {
    console.log('[ChatsController.getChat] User ID from token:', req.user.userId);
    console.log('[ChatsController.getChat] Chat ID:', id);
    return this.chatsService.getChat(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/messages')
  async getMessages(
    @Request() req,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatsService.getMessages(
      id,
      req.user.userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/messages')
  async sendMessage(
    @Request() req,
    @Param('id') id: string,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    return this.chatsService.sendMessage(id, req.user.userId, sendMessageDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/tip')
  async sendTip(@Request() req, @Param('id') id: string, @Body() sendTipDto: SendTipDto) {
    return this.chatsService.sendTip(id, req.user.userId, sendTipDto);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/read')
  async markAsRead(@Request() req, @Param('id') id: string) {
    return this.chatsService.markAsRead(id, req.user.userId);
  }
}
