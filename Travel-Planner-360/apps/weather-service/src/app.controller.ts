import { Controller, Get, Query, HttpException, HttpStatus, Post, Body } from '@nestjs/common';
import { AppService } from './app.service'; 
// NOTE: We no longer need ConfigService here as the logic moved to AppService

// ACTION: Define the DTO for the POST body
class SimulationConfigDto {
    delayMs: number;
    failRate: number;
}

@Controller('weather')
export class AppController {
  constructor(
    private readonly appService: AppService, 
  ) {}

  // --- STANDARD /weather ENDPOINT (CLEAN DELEGATION) ---
  @Get()
  async find(
    @Query('destination') destination: string,
    @Query('date') date: string,
  ) {
    // Delegates the ENTIRE job (simulation + data fetch) to the service layer
    return this.appService.getSimulatedForecast(destination); 
  }
  
  // --- UTILITY ENDPOINT: POST /weather/config ---
  @Post('config') 
  updateConfig(@Body() config: SimulationConfigDto) {
      
      // Basic validation (required for a public endpoint)
      if (config.delayMs < 0 || config.failRate < 0 || config.failRate > 1.0) {
          throw new HttpException('Invalid config values. FailRate must be 0.0 to 1.0.', HttpStatus.BAD_REQUEST);
      }
      
      // ACTION: Delegate the runtime update command to the service layer
      this.appService.setSimulationConfig(config.delayMs, config.failRate);
      
      return { 
          status: 'success', 
          message: 'Simulation configuration updated dynamically.' 
      };
  }
}