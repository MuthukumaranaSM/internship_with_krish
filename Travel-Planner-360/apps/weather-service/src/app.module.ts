import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config'; 
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Weather } from './weather.entity'; 


@Module({
  imports: [
  
    // 1. Configuration Module Setup (Reads simulation flags from .env)
    ConfigModule.forRoot({
      isGlobal: true, // Allows ConfigService to be injected anywhere
      envFilePath: '.env', // Looks for the file in the project root
    }),

    
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'weather.sqlite', // Unique file for this service
      entities: [Weather],
      synchronize: true, // Auto-creates/updates the table (for development)
      logging: false,
    }),
    
    // 3. Entity Registration (Makes the Repository available for injection in AppService)
    TypeOrmModule.forFeature([Weather]), 
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}