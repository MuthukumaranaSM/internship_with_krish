
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Event } from './event.entity'; 

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'events.sqlite', 
      entities: [Event],
      synchronize: true, 
    }),
    TypeOrmModule.forFeature([Event]), 
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}