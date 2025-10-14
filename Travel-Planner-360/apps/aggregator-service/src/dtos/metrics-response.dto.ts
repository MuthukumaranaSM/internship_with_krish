export class MetricsResponseDto {
    v1Traffic: number;
    v2Traffic: number;
    totalTraffic: number;
    v2AdoptionRate: number;
    // We define this as a string, not the BreakerState enum
    weatherBreakerState: string; 
}