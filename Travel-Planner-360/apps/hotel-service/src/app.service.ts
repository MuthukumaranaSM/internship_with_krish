import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm'; // Import FindManyOptions
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
        // Data for BKK (matches Flight CMB->BKK)
        { hotelId: 'H001', name: 'Luxury Plaza', rating: 4.8, pricePerNight: 150.00, destination: 'BKK', lateCheckIn: true }, // Good Late Check-in Option
        { hotelId: 'H002', name: 'Budget Inn', rating: 3.5, pricePerNight: 65.00, destination: 'BKK', lateCheckIn: false }, // Cheap, no late check-in
        
        // Data for DXB (matches Flight CMB->DXB)
        { hotelId: 'H010', name: 'Desert Oasis', rating: 5.0, pricePerNight: 350.00, destination: 'DXB', lateCheckIn: true }, // Good Late Check-in Option
        { hotelId: 'H011', name: 'Downtown Hostel', rating: 2.9, pricePerNight: 45.00, destination: 'DXB', lateCheckIn: false },
        
        // Add data for other cities (KTM, MLE)
        { hotelId: 'H020', name: 'Beach Hut', rating: 4.0, pricePerNight: 200.00, destination: 'MLE', lateCheckIn: true },
        { hotelId: 'H030', name: 'Mountain View', rating: 3.8, pricePerNight: 80.00, destination: 'KTM', lateCheckIn: false },
      ]);
      this.logger.log('Database seeded with initial hotel data.');
    }
  }

  // Find hotels method updated for Chaining logic
  async findHotels(destination: string, date: string, checkInTime?: string): Promise<HotelSearchResponseDto> {
    
    // Default TypeORM options: filter by destination and sort by price
    const defaultOptions: FindManyOptions<Hotel> = {
        where: { destination: destination },
        order: { pricePerNight: 'ASC' }
    };
    
    let hotels: Hotel[] = [];

    // --- LOGIC FOR STEP 2 OF THE ORCHESTRATED CHAIN ---
    // Rule: If the flight arrival time (checkInTime) is after 18:00 (6 PM),
    // we must prioritize or only return hotels with lateCheckIn set to true.
    if (checkInTime && checkInTime > '18:00') { 
        this.logger.log(`Arrival time ${checkInTime} is late. Filtering for late check-in hotels.`);
        
        // Query only hotels that explicitly allow late check-in
        hotels = await this.hotelRepository.find({
            where: { destination: destination, lateCheckIn: true },
            order: { pricePerNight: 'ASC' }
        });

        if (hotels.length > 0) {
            // If we found late check-in hotels, return only the cheapest one
            return { 
                hotels: hotels.slice(0, 1).map(h => ({
                    id: h.hotelId, 
                    name: h.name, 
                    rating: h.rating, 
                    pricePerNight: h.pricePerNight 
                }))
            };
        }
        
        // Fallthrough: If late check-in is required but no hotel meets it, 
        // we'll return the standard message. We skip the next block 
        // and rely on the main error handler or return an empty array below.
    }

    // --- STANDARD SEARCH (Used for Scatter-Gather or when chain requirement is not met) ---
    if (hotels.length === 0) {
        // Run standard query if filtering didn't return any preferred hotel
        hotels = await this.hotelRepository.find(defaultOptions); 
    }

    this.logger.debug(`Found ${hotels.length} hotels for ${destination}`);

    // Format the data to match the Response DTO
    return { 
        hotels: hotels.map(h => ({
            id: h.hotelId, 
            name: h.name, 
            rating: h.rating, 
            pricePerNight: h.pricePerNight 
        }))
    };
  }
}
