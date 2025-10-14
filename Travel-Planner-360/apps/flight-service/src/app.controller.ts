import { Controller, Get, Query} from '@nestjs/common';
import { AppService } from './app.service';
import { FlightQueryDto } from './dtos/flight-query.dto';

@Controller('flights')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async find(
    // We use basic string typing for the Query parameters
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('date') date: string,
  ) {
    // Call the service method
    return this.appService.findFlights(from, to, date);
  }
}