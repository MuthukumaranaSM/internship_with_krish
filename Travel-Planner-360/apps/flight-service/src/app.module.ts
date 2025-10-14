import { Module } from '@nestjs/common';
import {TypeOrmModule } from '@nestjs/typeorm'
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Flight } from './flight.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type : 'sqlite',
      database: 'flight.sqlite',
      entities: [Flight],
      synchronize: true, //by using this we can auto create tables
    }),
    TypeOrmModule.forFeature([Flight]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
