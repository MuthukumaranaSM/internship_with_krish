
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './event.entity'; 
import { EventsSearchResponseDto } from './dtos/event-response.dto'; 

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger('EventService');
  
  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
  ) {}

  async onModuleInit() {
    if ((await this.eventRepository.count()) === 0) {
      await this.eventRepository.save([
        // Data for Coastal Destinations (BKK, MLE) - Should be retrieved
        { name: 'Beach Festival', date: '2025-12-20', category: 'Music', destination: 'BKK' },
        { name: 'Full Moon Party', date: '2025-12-15', category: 'Nightlife', destination: 'MLE' },
        
        // Data for Inland Destinations (KTM) - Should NOT be requested by the Aggregator
        { name: 'Mountain Trek Expo', date: '2025-12-25', category: 'Sports', destination: 'KTM' },
      ]);
      this.logger.log('Database seeded with initial event data.');
    }
  }

  // Find events method exposed to the controller
  async findEvents(destination: string, date: string): Promise<EventsSearchResponseDto> {
    const events = await this.eventRepository.find({
        where: { destination: destination } // Simple filter by destination
    });
    
    this.logger.debug(`Found ${events.length} events for ${destination}`);

    // Format the data to match the Response DTO
    return { 
        events: events.map(e => ({
            id: e.id, 
            name: e.name, 
            date: e.date, 
            category: e.category
        }))
    };
  }
}