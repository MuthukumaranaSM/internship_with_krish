import { Controller, Get, Query } from '@nestjs/common';
import { TripSearchDto } from './dtos/trip-search.dto';
import { AppService } from './app.service';
import { TripResponseV1Dto } from './dtos/trip-response-v1.dto';
import { TripChainOrchestrator } from './orchestrators/trip-chain.orchestrator';
import { TripResponseV2Dto } from './dtos/trip-response-v2.dto'
import { TripResponseContextualDto } from './dtos/trip-response-contextual.dto'; 
import { MetricsResponseDto } from './dtos/metrics-response.dto';

@Controller() 
export class AppController {
  constructor(
    private readonly appService: AppService, // Used for Scatter-Gather & Branching logic
    private readonly tripChainOrchestrator: TripChainOrchestrator, // Used for Chaining logic
  ) {}

  //SCATTER-GATHER ENDPOINT
  @Get('v1/trips/search') 
  // Explicitly setting the return type to the imported DTO class
  async searchV1(@Query() query: TripSearchDto): Promise<TripResponseV1Dto> {
    // Delegates the parallel call logic to the AppService
    return this.appService.scatterGatherSearchV1(query);
  }

  //PART A.2: CHAINING ENDPOINT
  @Get('v1/trips/cheapest-route') 
  async cheapestRoute(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('date') date: string,
  ) {
    // Delegates the sequential orchestration logic to the dedicated Orchestrator class
    return this.tripChainOrchestrator.findCheapestTrip(from, to, date);
  }

  // BRANCHING ENDPOINT
  @Get('v1/trips/contextual')
  // ACTION: Explicitly set the return type to the imported Contextual DTO class
  async contextualSearch(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('date') date: string,
  ): Promise<TripResponseContextualDto> { 
    
    // Creates a DTO instance from the query parameters
    const query: TripSearchDto = { from, to, date }; 
    
    // Delegates the conditional fan-out logic to the AppService
    return this.appService.contextualSearch(query);
  }

  // STRANGLER V2 ENDPOINT
  @Get('/v2/trips/search') 
	async searchV2(@Query() query: TripSearchDto): Promise<TripResponseV2Dto> {
		// Delegates the parallel call logic for Flights + Hotels + Weather
		return this.appService.scatterGatherSearchV2(query);
	}

  //metrics endpoint
  @Get('metrics') 
    // ACTION: Set the explicit return type to the DTO class
    getMetrics(): MetricsResponseDto { 
        return this.appService.getTrafficMetrics();
  }
}
