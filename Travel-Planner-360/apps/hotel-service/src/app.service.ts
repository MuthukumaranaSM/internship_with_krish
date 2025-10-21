import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm'; 
import { Hotel } from './hotel.entity'; 
import { HotelSearchResponseDto } from './dtos/hotel-response.dto'; 

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger('HotelService');
 
  constructor(
   @InjectRepository(Hotel)
    private hotelRepository: Repository<Hotel>,
  ) {}

  async onModuleInit() {
   if ((await this.hotelRepository.count()) === 0) {
      await this.hotelRepository.save([
        // Data is correctly seeded with date: '2025-12-10'
        { hotelId: 'H001', name: 'Luxury Plaza', rating: 4.8, pricePerNight: 150.00, destination: 'BKK', date: '2025-12-10', lateCheckIn: true }, 
        { hotelId: 'H002', name: 'Budget Inn', rating: 3.5, pricePerNight: 65.00, destination: 'BKK', date: '2025-12-10', lateCheckIn: false }, 
        { hotelId: 'H010', name: 'Desert Oasis', rating: 5.0, pricePerNight: 350.00, destination: 'DXB', date: '2025-12-10', lateCheckIn: true }, 
        { hotelId: 'H011', name: 'Downtown Hostel', rating: 2.9, pricePerNight: 45.00, destination: 'DXB', date: '2025-12-10', lateCheckIn: false },
        { hotelId: 'H020', name: 'Beach Hut', rating: 4.0, pricePerNight: 200.00, destination: 'MLE', date: '2025-12-10', lateCheckIn: true },
        { hotelId: 'H030', name: 'Mountain View', rating: 3.8, pricePerNight: 80.00, destination: 'KTM', date: '2025-12-10', lateCheckIn: false },
    ]);
      this.logger.log('Database seeded with initial hotel data.');
    }
  }

  // Find hotels method updated for Chaining logic
  async findHotels(destination: string, date: string, checkInTime?: string): Promise<HotelSearchResponseDto> {
    
    // ACTION 1: Define the BASE filter (STANDARD OBJECT FILTERING)
    const baseWhereConditions: any = { 
        destination: destination, 
        date: date                  
    };
 
    let hotels: Hotel[] = [];

    // --- LOGIC FOR STEP 2 OF THE ORCHESTRATED CHAIN (Late Check-in Priority) ---
    if (checkInTime && checkInTime > '18:00') { 
        this.logger.log(`Arrival time ${checkInTime} is late. Filtering for late check-in hotels.`);
       
        // Query only hotels that explicitly allow late check-in AND meet the date criteria
        hotels = await this.hotelRepository.find({
            where: { ...baseWhereConditions, lateCheckIn: true }, 
            order: { pricePerNight: 'ASC' }
        });

        if (hotels.length > 0) {
            // If we found late check-in hotels, return only the cheapest one
            return { 
                hotels: hotels.slice(0, 1).map(h => ({
                    id: h.hotelId, name: h.name, rating: h.rating, 
                    pricePerNight: h.pricePerNight, date: h.date 
                }))
            };
       }
    }

    // --- ACTION 2: STANDARD SEARCH (Used for Scatter-Gather, or when chaining logic is skipped) ---
    // If the specialized query above didn't return (meaning checkInTime was early OR no late hotel was found)
    if (hotels.length === 0) {
        // Run standard query using the base filter (destination AND date)
        hotels = await this.hotelRepository.find({ 
            where: baseWhereConditions, 
            order: { pricePerNight: 'ASC' } 
        }); 
    }

    this.logger.debug(`Found ${hotels.length} hotels for ${destination} on ${date}`);

    // Format the data to match the Response DTO (includes date)
    return { 
            hotels: hotels.map(h => ({
            id: h.hotelId, name: h.name, rating: h.rating, 
            pricePerNight: h.pricePerNight, date: h.date 
}))
};
}}