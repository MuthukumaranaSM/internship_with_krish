import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { AppService } from '../app.service'; 
import { TripSearchDto } from '../dtos/trip-search.dto';

// Interface to define the expected response structure from the flight service
interface FlightContract {
    flights: { id: string, departTime: string, arriveTime: string, price: number }[];
}

@Injectable()
export class TripChainOrchestrator {
  private readonly logger = new Logger('TripChainOrchestrator');

  constructor(private readonly appService: AppService) {}

  async findCheapestTrip(from: string, to: string, date: string): Promise<any> {
    this.logger.log(`[Chain] Starting orchestration for ${from}-${to}.`);

    let chosenFlight: any = null; 
    let chosenHotel: any = null;
    let reasonForFailure: string | null = null; 

    // --- STEP 1: Find the Cheapest Flight (Call 1) ---
    try {
        const flightData: FlightContract = await this.appService.fetchFlights({ from, to, date } as TripSearchDto);

        if (!flightData.flights || flightData.flights.length === 0) {
            this.logger.warn('Chain stopped: No flights found for this route. Returning HTTP 200 OK with empty result.');
            
            // ACTION: Graceful EXIT (HTTP 200 OK) if flight data is missing.
            // We return immediately, skipping the rest of the chain.
            return { flight: null, hotel: null, orchestrated: false, reason: "No flights available for the requested route." }; 
        }

        // 2. Intermediate Processing: Identify the CHEAPEST flight
        chosenFlight = flightData.flights.reduce((min, f) => 
            f.price < min.price ? f : min
        , flightData.flights[0]);

        this.logger.debug(`Cheapest flight found: ${chosenFlight.id}. Arrival: ${chosenFlight.arriveTime}`);

    } catch (error) {
        // ACTION: This ONLY catches network/server crashes (true 500)
        throw new InternalServerErrorException(`Chain Failure at Step 1 (Flights): Network or Server Error. Details: ${error.message}`);
    }
    
    // --- STEP 2: Query Hotel with Chained Arrival Time (Call 2) ---
    try {
        const arrivalTime = chosenFlight.arriveTime;
        
        const hotelData = await this.appService.fetchHotelsForChain(to, arrivalTime);
        
        // ACTION: FIX - If hotels are not found, we DO NOT throw 500.
        if (!hotelData.hotels || hotelData.hotels.length === 0) {
             this.logger.warn('Chain completed successfully, but no suitable hotel found.');
             // Do nothing: chosenHotel remains null, and we continue to the final return (200 OK).
             reasonForFailure = "Flight found, but no suitable hotel matching criteria was found.";
        } else {
             // ACTION: Select the prioritized hotel 
             chosenHotel = hotelData.hotels[0]; 
        }

    } catch (error) {
        // ACTION: ONLY throw 500 if the network call fails.
        throw new InternalServerErrorException(`Chain Failure at Step 2 (Hotels): Network or Server Error. Details: ${error.message}`);
    }

    // --- FINAL STEP: Return the Orchestrated Result (HTTP 200 OK) ---
    // Status is 200 OK, even if hotel is null.
    return { 
        flight: chosenFlight, 
        hotel: chosenHotel, 
        orchestrated: true, 
        reason: reasonForFailure || "Chain completed successfully."
    };
  }
}
