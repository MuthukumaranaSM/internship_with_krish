// apps/aggregator-service/src/orchestrators/trip-chain.orchestrator.ts

import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { AppService } from '../app.service'; // Imports the refactored service
import { TripSearchDto } from '../dtos/trip-search.dto';

// Interface to define the expected response structure from the flight service
// Note: This matches the FlightService's own response contract structure
interface FlightContract {
    flights: { id: string, departTime: string, arriveTime: string, price: number }[];
}

@Injectable()
export class TripChainOrchestrator {
  private readonly logger = new Logger('TripChainOrchestrator');

  // Inject the main AppService (which holds the HTTP client wrappers)
  constructor(private readonly appService: AppService) {}

  /**
   * Implements the Step 1 -> Step 2 sequential logic for finding the cheapest trip.
   */
  async findCheapestTrip(from: string, to: string, date: string): Promise<any> {
    this.logger.log(`[Chain] Starting orchestration for ${from}-${to}.`);

    let chosenFlight: any;
    let chosenHotel: any;
    
    // --- STEP 1: Find the Cheapest Flight (Call 1) ---
    try {
        // 1. Fetch ALL flights for the route
        const flightData: FlightContract = await this.appService.fetchFlights({ from, to, date } as TripSearchDto);

        if (!flightData.flights || flightData.flights.length === 0) {
            // Stop the chain if no data is found (critical failure)
            throw new InternalServerErrorException('No flights found for this route. Cannot continue chain.');
        }

        // 2. Intermediate Processing: Identify the CHEAPEST flight
        chosenFlight = flightData.flights.reduce((min, f) => 
            f.price < min.price ? f : min
        , flightData.flights[0]); // Start reduction with the first flight

        this.logger.debug(`Cheapest flight found: ${chosenFlight.id}. Arrival: ${chosenFlight.arriveTime}`);

    } catch (error) {
        // If AppService wrapper threw an error (timeout or 500), the chain fails.
        throw new InternalServerErrorException(`Chain Failure at Step 1 (Flights): ${error.message || 'Unknown error'}`);
    }
    
    // --- STEP 2: Query Hotel with Chained Arrival Time (Call 2) ---
    try {
        const arrivalTime = chosenFlight.arriveTime;
        
        // 1. Call the Hotel service, passing the required chained data (arrivalTime)
        // NOTE: Uses the renamed service method from our refactoring plan
        const hotelData = await this.appService.fetchHotelsForChain(
            to, // destination
            arrivalTime // checkInTime parameter
        );
        
        if (!hotelData.hotels || hotelData.hotels.length === 0) {
             throw new InternalServerErrorException('No suitable hotel found for late check-in.');
        }

        // 2. Select the final hotel (the service should have already filtered for the best one)
        chosenHotel = hotelData.hotels[0]; 
        this.logger.debug(`Hotel chosen: ${chosenHotel.name}`);

    } catch (error) {
        throw new InternalServerErrorException(`Chain Failure at Step 2 (Hotels): ${error.message || 'Unknown error'}`);
    }

    // --- FINAL STEP: Return the Orchestrated Result ---
    return { 
        flight: chosenFlight, 
        hotel: chosenHotel,
        orchestrated: true // Optional flag for clarity in the output
    };
  }
}