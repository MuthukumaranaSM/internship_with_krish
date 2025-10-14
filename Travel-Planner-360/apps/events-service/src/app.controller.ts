// apps/events-service/src/app.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service'; 

@Controller('events')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async find(
    @Query('destination') destination: string,
    @Query('date') date: string,
  ) {
    return this.appService.findEvents(destination, date);
  }
}