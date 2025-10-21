import { Injectable, OnModuleInit } from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository,Equal} from 'typeorm';
import {Flight} from './flight.entity';
import { FlightSearchResponseDto } from './dtos/flight-response.dto'; 


@Injectable()
export class AppService implements OnModuleInit{
  constructor(
    @InjectRepository(Flight)
    private flightRepository: Repository<Flight>,
  ){}

//The seeding
async onModuleInit() {
    
    if ((await this.flightRepository.count()) === 0) {
      
      await this.flightRepository.save([
 { flightNumber: 'FL010', departTime: '08:00', arriveTime: '11:30', price: 380.00, origin: 'CMB', destination: 'BKK', date: '2025-12-10' },
 { flightNumber: 'FL011', departTime: '14:30', arriveTime: '18:00', price: 450.50, origin: 'CMB', destination: 'BKK', date: '2025-12-10' },
 { flightNumber: 'FL012', departTime: '22:00', arriveTime: '01:30', price: 410.00, origin: 'CMB', destination: 'BKK', date: '2025-12-10' },
 { flightNumber: 'FL020', departTime: '06:00', arriveTime: '10:00', price: 299.99, origin: 'CMB', destination: 'DXB', date: '2025-12-10' },
 { flightNumber: 'FL021', departTime: '10:00', arriveTime: '14:00', price: 350.00, origin: 'CMB', destination: 'DXB', date: '2025-12-10' },
 { flightNumber: 'FL030', departTime: '12:00', arriveTime: '19:00', price: 720.00, origin: 'CMB', destination: 'SIN', date: '2025-12-10' },
 { flightNumber: 'FL040', departTime: '18:00', arriveTime: '21:00', price: 250.00, origin: 'CMB', destination: 'KTM', date: '2025-12-10' },
 { flightNumber: 'FL041', departTime: '10:00', arriveTime: '13:00', price: 275.00, origin: 'CMB', destination: 'KTM', date: '2025-12-10' },
 { flightNumber: 'FL050', departTime: '09:30', arriveTime: '11:00', price: 315.00, origin: 'CMB', destination: 'MLE', date: '2025-12-10' },
 { flightNumber: 'FL051', departTime: '17:00', arriveTime: '18:30', price: 480.00, origin: 'CMB', destination: 'MLE', date: '2025-12-10' },
      ]);
      console.log('[Flight Service] Database seeded via OnModuleInit.');
    }}

  async findFlights(from: string, to: string, date: string): Promise<any> {
    const flights = await this.flightRepository.find({
        where: { origin: from, destination: to,date:date }
    });
  

  return { 
        flights: flights.map(f => ({
            id: f.flightNumber, 
            departTime: f.departTime, 
            arriveTime: f.arriveTime, 
            price: f.price,
            date: f.date 
        }))
    };
  }
}
