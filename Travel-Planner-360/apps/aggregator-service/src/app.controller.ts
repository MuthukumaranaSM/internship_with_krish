import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { TripSearchDto } from './dtos/trip-search.dto';
import { AppService } from './app.service';
import { TripResponseV1Dto } from './dtos/trip-response-v1.dto';
import { TripChainOrchestrator } from './orchestrators/trip-chain.orchestrator';
import { TripResponseV2Dto } from './dtos/trip-response-v2.dto';
import { TripResponseContextualDto } from './dtos/trip-response-contextual.dto'; 
import { MetricsResponseDto } from './dtos/metrics-response.dto';

// FIX: Controller base path is empty to handle both /v1/ and /v2/ fully
@Controller() 
export class AppController {
  constructor(
    private readonly appService: AppService, 
    private readonly tripChainOrchestrator: TripChainOrchestrator, 
  ) {}

  // SCATTER-GATHER ENDPOINT (V1) 
  
  @Get('v1/trips/search') 
  @UsePipes(new ValidationPipe({ transform: true })) 
  async searchV1(@Query() query: TripSearchDto): Promise<TripResponseV1Dto> {
    return this.appService.scatterGatherSearchV1(query);
  }

  // CHAINING ENDPOINT (V1) ---

  @Get('v1/trips/cheapest-route') 
  @UsePipes(new ValidationPipe({ transform: true })) 
  async cheapestRoute(
    @Query('from') from: string, 
    @Query('to') to: string, 
    @Query('date') date: string,
  ) {
    // Delegates to the Orchestrator for sequential logic
    return this.tripChainOrchestrator.findCheapestTrip(from, to, date);
  }

  // BRANCHING ENDPOINT (V1) 
  
  @Get('v1/trips/contextual')
  @UsePipes(new ValidationPipe({ transform: true })) // Enables validation
  async contextualSearch(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('date') date: string,
  ): Promise<TripResponseContextualDto> { 
    const query: TripSearchDto = { from, to, date }; 
    // Delegates the conditional fan-out logic
    return this.appService.contextualSearch(query);
  }

  // STRANGLER V2 ENDPOINT (New Feature) 

  @Get('v2/trips/search') 
  @UsePipes(new ValidationPipe({ transform: true })) // Enables validation
  async searchV2(@Query() query: TripSearchDto): Promise<TripResponseV2Dto> {
    // Delegates the parallel call logic for Flights + Hotels + Weather (protected by Breaker)
    return this.appService.scatterGatherSearchV2(query);
  }

  // METRICS ENDPOINT (Observability) 
  
  @Get('metrics') 
  getMetrics(): MetricsResponseDto { 
    // Returns V1/V2 traffic counts and Breaker status
    return this.appService.getTrafficMetrics();
  }
}
