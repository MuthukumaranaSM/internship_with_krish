import { Injectable, OnModuleInit, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config'; 
import { Weather } from './weather.entity'; 
import { WeatherResponseDto } from './dtos/weather-response.dto'; 

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger('WeatherService');

  //  Define runtime variables to hold the current simulation state
  private currentDelayMs: number;
  private currentFailRate: number;
  
  constructor(
    @InjectRepository(Weather)
    private weatherRepository: Repository<Weather>,
    // Inject ConfigService into the service
    private readonly configService: ConfigService, 
  ) {}

  //Initialize simulation settings from .env on startup
  async onModuleInit() {
    // Read initial settings from the ConfigService (loaded from .env)
    this.currentDelayMs = this.configService.get<number>('WEATHER_DELAY_MS') || 0;
    this.currentFailRate = this.configService.get<number>('WEATHER_FAIL_RATE') || 0;
    
    this.logger.log(`Initial Simulation Config: Delay=${this.currentDelayMs}ms, FailRate=${this.currentFailRate}`);
    
    if ((await this.weatherRepository.count()) === 0) {
      await this.weatherRepository.save([
        // 7-day forecast for BKK
        { destination: 'BKK', date: '2025-12-10', tempMin: 24, tempMax: 32, condition: 'Sunny' },
        { destination: 'BKK', date: '2025-12-11', tempMin: 23, tempMax: 31, condition: 'Partly Cloudy' },
        // Forecast for DXB
        { destination: 'DXB', date: '2025-12-10', tempMin: 18, tempMax: 28, condition: 'Clear Sky' },
        { destination: 'DXB', date: '2025-12-11', tempMin: 17, tempMax: 27, condition: 'Clear Sky' },
      ]);
      this.logger.log('Database seeded with initial weather data.');
    }
  }
  
  // Public method used by the Controller to update settings dynamically
  public setSimulationConfig(delay: number, failRate: number) {
    this.currentDelayMs = delay;
    this.currentFailRate = failRate;
    this.logger.warn(`RUNTIME CONFIG UPDATE: Delay set to ${delay}ms, Fail Rate set to ${failRate}`);
  }

  // The primary method called by the Controller (Contains simulation logic)
  async getSimulatedForecast(destination: string): Promise<WeatherResponseDto> {
    
    // 1. SIMULATE LATENCY: Reads from dynamic internal variable
    if (this.currentDelayMs > 0) {
      this.logger.log(`Simulating delay of ${this.currentDelayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, this.currentDelayMs));
    }

    // 2. SIMULATE FAILURE: Reads from dynamic internal variable
    if (Math.random() < this.currentFailRate) {
      this.logger.error(`FAILURE TRIGGERED: Fail Rate was ${this.currentFailRate}`);
      // Throw an HTTP exception (503) that the Aggregator will see and react to
      throw new HttpException('Weather Service Unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
    
    // If simulation passed, call the actual database fetch function
    return this.findForecast(destination); 
  }

  // This is the clean function that only does the database query
  async findForecast(destination: string): Promise<WeatherResponseDto> {
    
    const forecast = await this.weatherRepository.find({
        where: { destination: destination } 
    });
    
    // Format the data to match the Response DTO
    return { 
        forecast: forecast.map(f => ({
            date: f.date, 
            tempMin: f.tempMin, 
            tempMax: f.tempMax, 
            condition: f.condition
        }))
    };
  }
}