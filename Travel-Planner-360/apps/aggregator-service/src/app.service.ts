import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { TripSearchDto } from './dtos/trip-search.dto';
import { TripResponseV1Dto } from './dtos/trip-response-v1.dto'; 
import { TripResponseContextualDto } from './dtos/trip-response-contextual.dto'; 
import { TripResponseV2Dto } from './dtos/trip-response-v2.dto';
import { CircuitBreaker } from './circuit-breaker/circuit-breaker.service'; // Ensure this is implemented
import { MetricsResponseDto } from './dtos/metrics-response.dto';

// === GLOBAL IN-MEMORY COUNTERS (for Tracking) ===
let v1Traffic = 0;
let v2Traffic = 0;


@Injectable()
export class AppService {
    private readonly logger = new Logger('AggregatorService');
    private readonly TIMEOUT_MS = 1000;
    
    // Define service endpoints (Central Configuration)
    private readonly serviceUrls = {
        flight: 'http://localhost:3001/flights',
        hotel: 'http://localhost:3002/hotels',
        weather: 'http://localhost:3003/weather',
        events: 'http://localhost:3004/events',
    };

    private readonly coastalCities = ['BKK', 'MLE', 'SIN', 'DXB']; 
    
    private isCoastal(destination: string): boolean {
        return this.coastalCities.includes(destination.toUpperCase());
    }

    // ACTION: Inject CircuitBreaker into the constructor
    constructor(
        private readonly httpService: HttpService,
        private readonly weatherBreaker: CircuitBreaker, 
    ) {}

    // V1/V2 TRAFFIC METRICS METHOD 
    // ACTION: Set the explicit return type to the DTO class
    getTrafficMetrics(): MetricsResponseDto { 
        const totalTraffic = v1Traffic + v2Traffic;
        const v2AdoptionRate = totalTraffic > 0 
            ? parseFloat(((v2Traffic / totalTraffic) * 100).toFixed(2)) 
            : 0;

        // ACTION: Add the type cast to the return object
        return {
            v1Traffic,
            v2Traffic,
            totalTraffic,
            v2AdoptionRate, 
            weatherBreakerState: this.weatherBreaker.getState(), 
        } as MetricsResponseDto; 
    }

    // --- UTILITY FUNCTION: Enforce Deadline ---
    private async callServiceWithTimeout(url: string, params: any, timeoutMs: number): Promise<any> {
        const timeoutError = new Error(`Service timed out [${url}]`);

        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(timeoutError), timeoutMs)
        );
        
        const requestPromise = lastValueFrom(
            this.httpService.get(url, { params })
        ).then(response => response.data)
        .catch(err => {
            // Propagate failure for Breaker/allSettled to catch
            throw new Error(`Service failed: ${err.message}`);
        }); 

        return Promise.race([requestPromise, timeoutPromise]);
    }


     // === CLIENT WRAPPER METHODS (USED BY ORCHESTRATOR & BRANCHING) ===

    /**
     * Fetches all flight results (Used by Orchestrator for Step 1     */
    async fetchFlights(query: TripSearchDto): Promise<any> {
        try {
            const data = await this.callServiceWithTimeout(
                this.serviceUrls.flight, 
                { from: query.from, to: query.to, date: query.date }, 
                2000 // Extended timeout for critical chain step
            );
            return data; 
        } catch (error) {
             this.logger.error(`[Chain Step 1] Flight fetch failed: ${error.message}`);
             throw new InternalServerErrorException(error.message); 
        }
    }

    /**
     * Fetches hotels, passing the specific arrival time for late check-in logic (Used by Orchestrator).
     */
    async fetchHotelsForChain(destination: string, arrivalTime: string): Promise<any> {
        try {
            const data = await this.callServiceWithTimeout(
                this.serviceUrls.hotel, 
                { destination, checkInTime: arrivalTime }, 
                2000 
            );
            return data;
        } catch (error) {
             this.logger.error(`[Chain Step 2] Hotel fetch failed: ${error.message}`);
             throw new InternalServerErrorException(error.message); 
        }
    }

    /**
     * Fetches events (Used conditionally by Branching logic).
     */
    async fetchEvents(destination: string, date: string): Promise<any> {
        try {
            const data = await this.callServiceWithTimeout(
                this.serviceUrls.events, 
                { destination, date }, 
                1500 
            );
            return data; 
        } catch (error) {
            this.logger.error(`Events fetch failed: ${error.message}`);
            return { events: [], error: 'Events unavailable/timeout' }; 
        }
    }

    // === PART A.1: SCATTER-GATHER IMPLEMENTATION (V1) 


    async scatterGatherSearchV1(query: TripSearchDto): Promise<TripResponseV1Dto> {
        const startTime = Date.now();
        let isDegraded = false;
        
        this.logger.log(`[V1 Search] Initiating parallel calls for ${query.to}.`);

        const flightPromise = this.callServiceWithTimeout(
            this.serviceUrls.flight, 
            { from: query.from, to: query.to, date: query.date }, 
            this.TIMEOUT_MS
        );
        
        const hotelPromise = this.callServiceWithTimeout(
            this.serviceUrls.hotel, 
            { destination: query.to, date: query.date }, 
            this.TIMEOUT_MS
        );

        const [flightResult, hotelResult] = await Promise.allSettled([
            flightPromise,
            hotelPromise,
        ]);

        const finalResponse = new TripResponseV1Dto(); 

        if (flightResult.status === 'fulfilled') {
            finalResponse.flights = flightResult.value.flights;
        } else {
            finalResponse.flights = { error: 'Flight data unavailable: Check Logs' };
            isDegraded = true;
            this.logger.error(`Flight service failed or timed out: ${flightResult.reason}`);
        }
        
        if (hotelResult.status === 'fulfilled') {
            finalResponse.hotels = hotelResult.value.hotels;
        } else {
            finalResponse.hotels = { error: 'Hotel data unavailable: Check Logs' };
            isDegraded = true;
            this.logger.error(`Hotel service failed or timed out: ${hotelResult.reason}`);
        }

        if (isDegraded) {
            finalResponse.degraded = true;
        }
        
        this.logger.log(`V1 search finished in ${Date.now() - startTime}ms. Degraded: ${isDegraded}`);
        v1Traffic++;
        
        return finalResponse;
    }

    // === PART B/C: SCATTER-GATHER IMPLEMENTATION (V2 WITH BREAKER) 
    
    async scatterGatherSearchV2(query: TripSearchDto): Promise<TripResponseV2Dto> {
        const startTime = Date.now();
        let isDegraded = false;
        
        // Log Breaker State at start of V2 search (Observability)
        this.logger.log(`[V2 Search] Initiating parallel calls for ${query.to}. Breaker State: ${this.weatherBreaker.getState()}`);

        // 1. Mandatory Promises
        const flightPromise = this.callServiceWithTimeout(
            this.serviceUrls.flight, 
            { from: query.from, to: query.to, date: query.date }, 
            this.TIMEOUT_MS
        );
        
        const hotelPromise = this.callServiceWithTimeout(
            this.serviceUrls.hotel, 
            { destination: query.to, date: query.date }, 
            this.TIMEOUT_MS
        );

        // ACTION: DEFINE WEATHER CALL AND FALLBACK (Part C) ---

        // 1. Service function to be protected (will call the flaky endpoint)
        const weatherServiceCall = () => this.callServiceWithTimeout(
            this.serviceUrls.weather, 
            { destination: query.to, date: query.date },
            this.TIMEOUT_MS // Use the strict 1000ms deadline
        );
        
        // 2. Fallback function (returns the required degraded response)
        const weatherFallback = () => {
            return { 
                forecast: [], 
                summary: "unavailable", 
                degraded: true // REQUIRED FALLBACK STRUCTURE
            };
        };

        // 3. The protected weather promise (runs through the circuit breaker)
        const weatherPromise = this.weatherBreaker.execute(
            weatherServiceCall, 
            weatherFallback
        );

        // 4. Execute and wait for ALL three to settle
        const [flightResult, hotelResult, weatherResult] = await Promise.allSettled([
            flightPromise,
            hotelPromise,
            weatherPromise,
        ]);

        const finalResponse = new TripResponseV2Dto(); 

        // 5. Process Flight Result
        if (flightResult.status === 'fulfilled') {
            finalResponse.flights = flightResult.value.flights;
        } else {
            finalResponse.flights = { error: 'Flight data unavailable: Check Logs' };
            isDegraded = true;
            this.logger.error(`Flight service failed or timed out: ${flightResult.reason}`);
        }
        
        // 6. Process Hotel Result
        if (hotelResult.status === 'fulfilled') {
            finalResponse.hotels = hotelResult.value.hotels;
        } else {
            finalResponse.hotels = { error: 'Hotel data unavailable: Check Logs' };
            isDegraded = true;
            this.logger.error(`Hotel service failed or timed out: ${hotelResult.reason}`);
        }

        // 7. Process Weather Result (Breaker/Fallback Logic)
        if (weatherResult.status === 'fulfilled') {
            // Check if the result came from the explicit fallback (Action 4.2)
            if (weatherResult.value.summary === 'unavailable') {
                finalResponse.weather = weatherResult.value; 
                isDegraded = true; 
            } else {
                finalResponse.weather = weatherResult.value.forecast; // Use actual data
            }
        } else {
            // If the promise was rejected (Breaker's unrecoverable failure), mark degraded
            finalResponse.weather = { error: 'Weather system failure (Promise Rejected)' };
            isDegraded = true;
        }

        // 8. Apply the final degradation flag and log timing
        if (isDegraded) {
            finalResponse.degraded = true;
        }
        
        this.logger.log(`V2 search finished in ${Date.now() - startTime}ms. Degraded: ${isDegraded}`);
        v2Traffic++;
        
        return finalResponse;
    }

    // PART A.3: BRANCHING IMPLEMENTATION 

    async contextualSearch(query: TripSearchDto): Promise<TripResponseContextualDto> {
        const startTime = Date.now();
        let isDegraded = false;
        let finalResponse: TripResponseContextualDto = new TripResponseContextualDto();
        finalResponse.context = 'Inland City';
        
        // 1. Define mandatory promises (Flight + Hotel)
        const promises: Promise<any>[] = [
            this.callServiceWithTimeout(this.serviceUrls.flight, { from: query.from, to: query.to, date: query.date }, this.TIMEOUT_MS),
            this.callServiceWithTimeout(this.serviceUrls.hotel, { destination: query.to, date: query.date }, this.TIMEOUT_MS),
        ];
        
        // 2. --- BRANCHING LOGIC: CONDITIONAL FAN-OUT ---
        const shouldFetchEvents = this.isCoastal(query.to);
        
        if (shouldFetchEvents) {
            this.logger.log(`[Contextual] Destination ${query.to} is coastal. Fetching events.`);
            finalResponse.context = 'Coastal City - Events Included';
            
            // ACTION: Add the Events Promise to the dynamic list
            promises.push(this.fetchEvents(query.to, query.date)); 
        } else {
            this.logger.log(`[Contextual] Destination ${query.to} is inland. Skipping events.`);
        }

        // 3. Execute and wait for ALL dynamic promises to settle (2 or 3 promises)
        const results = await Promise.allSettled(promises);
        
        // 4. Process Results 
        
        // Flight Result (Index 0 - ALWAYS present)
        const flightResult = results[0];
        if (flightResult.status === 'fulfilled') {
            finalResponse.flights = flightResult.value.flights;
        } else {
            finalResponse.flights = { error: 'Flights Unavailable' };
            isDegraded = true;
        }
        
        // Hotel Result (Index 1 - ALWAYS present)
        const hotelResult = results[1];
        if (hotelResult.status === 'fulfilled') {
            finalResponse.hotels = hotelResult.value.hotels;
        } else {
            finalResponse.hotels = { error: 'Hotels Unavailable' };
            isDegraded = true;
        }
        
        // Events Result (Index 2 - CONDITIONAL)
        if (shouldFetchEvents) {
            const eventResult = results[2];
            if (eventResult.status === 'fulfilled') {
                finalResponse.events = eventResult.value.events;
            } else {
                finalResponse.events = { error: 'Events request failed.' };
                isDegraded = true;
            }
        }

        if (isDegraded) {
            finalResponse.degraded = true;
        }
        
        this.logger.log(`Contextual search complete in ${Date.now() - startTime}ms.`);
        return finalResponse;
    }
}
