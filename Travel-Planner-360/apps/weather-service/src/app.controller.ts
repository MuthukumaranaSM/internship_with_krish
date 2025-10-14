import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service'; 
import { ConfigService } from '@nestjs/config'; 

@Controller('weather')
export class AppController {

  private delay: number = 0;
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService, 
  ) {}

  @Get()
  async find(
    @Query('destination') destination: string,
    @Query('date') date: string,
  ) {
    
    // --- 1. SIMULATE LATENCY (Delay) ---
    // ACTION: Read value using configService.get()
    // Reads WEATHER_DELAY_MS from .env file (defaults to '0' if not found)
    const delay = this.configService.get<number>('WEATHER_DELAY_MS') || 0; 
    console.log("weather service delay",delay);
    
    if (delay > 0) {
      // Pause the request processing for that duration.
      await new Promise(resolve => setTimeout(resolve, delay));
      console.log("delay happens");
    }

    // --- 2. SIMULATE FAILURE (Error Rate) ---
    // ACTION: Read value using configService.get()
    // Reads WEATHER_FAIL_RATE from .env file (defaults to '0' if not found)
    const failRate = this.configService.get<number>('WEATHER_FAIL_RATE') || 0;
    
    if (Math.random() < failRate) {
      // Throw a 503 error to simulate service degradation
      throw new HttpException('Weather Service Unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }

    // If no failure, proceed with normal logic
    // NOTE: The 'date' parameter is accepted via @Query but ignored here for simplicity.
    return this.appService.findForecast(destination); 
  }
}