import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Hotel } from './hotel.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database:'hotel.sqlite',
      entities: [Hotel],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([Hotel]),
  ],
  
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
