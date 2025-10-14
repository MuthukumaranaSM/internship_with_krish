// apps/weather-service/src/app.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Weather } from './weather.entity'; 
import { WeatherResponseDto } from './dtos/weather-response.dto'; 
import {ConfigService} from '@nestjs/config';


@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger('WeatherService');
  
  constructor(
    @InjectRepository(Weather)
    private weatherRepository: Repository<Weather>,
  ) {}

  async onModuleInit() {
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

  // Find forecast method exposed to the controller
  async findForecast(destination: string): Promise<WeatherResponseDto> {
    // Note: The assignment asks for a 7-day forecast for the destination, 
    // so we ignore the exact date query parameter for simplicity here.
    
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