import { Controller, Get ,Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('hotels')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async find(
    @Query('destination') destination: string,
    @Query('date') date: string,
    @Query('checkInTime') checkInTime?: string, 
  ) {
    return this.appService.findHotels(destination, date);
  }
}
