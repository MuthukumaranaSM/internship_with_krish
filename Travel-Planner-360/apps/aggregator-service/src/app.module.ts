// apps/aggregator-service/src/app.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TripChainOrchestrator } from './orchestrators/trip-chain.orchestrator';
import { CircuitBreaker } from './circuit-breaker/circuit-breaker.service';    

@Module({
  imports: [
    // Register HttpModule for making external API calls
    HttpModule.register({}), 
  ],
  controllers: [AppController],
  providers: [
    AppService,
    TripChainOrchestrator,
    CircuitBreaker,
   ],
})
export class AppModule {}