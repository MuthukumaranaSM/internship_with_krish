import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

// Define the three states
enum BreakerState {
    CLOSED = 'CLOSED',
    OPEN = 'OPEN',
    HALF_OPEN = 'HALF_OPEN',
}

@Injectable()
export class CircuitBreaker {
    private state: BreakerState = BreakerState.CLOSED;
    
    //(Boolean: True=Failure, False=Success)
    private failureHistory: boolean[] = []; 
    
    private probeFailureCount: number = 0; 
    private successCount: number = 0;
    private lastFailureTime: number = 0; 
    

    private readonly maxRequests = 20;         
    private readonly failureRateThreshold = 0.5; 
    private readonly cooldownPeriod = 30000;
    private readonly halfOpenProbeCount = 5; 
    private readonly maxProbeFailures = 4;

    private readonly logger = new Logger('CircuitBreaker');

    // calculate the current precise failure rate over the window
    private calculateFailureRate(): number {
        // check window size is full
        if (this.failureHistory.length < this.maxRequests) {
            return 0; // Return 0% if we don't have enough data yet
        }
        // Count how many 'true' values (failures) are in the last 20 requests
        const totalFailures = this.failureHistory.filter(isFailure => isFailure).length;
        
        return totalFailures / this.maxRequests; // return decimal value
    }


    public getState(): BreakerState { 
        return this.state;
    }

    // 1. State Transition Logic
    private checkStateTransition() {
        const currentTime = Date.now();

        if (this.state === BreakerState.CLOSED) {
            const currentRate = this.calculateFailureRate();

            // Rule: If the window is full AND the rate is >= 50%
            if (this.failureHistory.length === this.maxRequests && currentRate >= this.failureRateThreshold) {
                this.state = BreakerState.OPEN;
                this.lastFailureTime = currentTime;
                this.logger.error(`STATE CHANGE: CLOSED -> OPEN. Failure Rate (${(currentRate * 100).toFixed(0)}%) met threshold.`);
                // ACTION: Clear history upon tripping for clean restart later
                this.failureHistory = []; 
            }
        } 
        
        else if (this.state === BreakerState.OPEN) {
            if (currentTime > this.lastFailureTime + this.cooldownPeriod) {
                this.state = BreakerState.HALF_OPEN;
                this.successCount = 0; 
                this.probeFailureCount = 0; 
                this.logger.warn('STATE CHANGE: OPEN -> HALF-OPEN. Cooldown elapsed. Probing starts.');
            }
        } 
        
        else if (this.state === BreakerState.HALF_OPEN) {
            if (this.successCount >= this.halfOpenProbeCount) {
                this.state = BreakerState.CLOSED;
                this.failureHistory = []; // Clear history upon healing
                this.logger.log('STATE CHANGE: HALF-OPEN -> CLOSED. Service restored.');
            }
        }
    }

    private updateFailureHistory(isFailure: boolean) {
        if (this.failureHistory.length >= this.maxRequests) {
            this.failureHistory.shift(); // Remove oldest request
        }
        this.failureHistory.push(isFailure); // Add new request result
    }


    private recordSuccess() {
        if (this.state === BreakerState.CLOSED) {
            // ACTION: Record success (false) in history array
            this.updateFailureHistory(false);
            this.logger.debug(`[CLOSED Success] History size: ${this.failureHistory.length}. Rate: ${(this.calculateFailureRate() * 100).toFixed(0)}%`); 
            this.checkStateTransition(); // Check if rate causes trip
        } else if (this.state === BreakerState.HALF_OPEN) {
            this.successCount++;
            this.logger.log(`[Probe Success] Count: ${this.successCount}/${this.halfOpenProbeCount} successful probes.`); 
            this.checkStateTransition(); 
        }
    }

    private recordFailure() {
        if (this.state === BreakerState.CLOSED) {
            // ACTION: Record failure (true) in history array
            this.updateFailureHistory(true);
            this.logger.debug(`[CLOSED Failure] History size: ${this.failureHistory.length}. Rate: ${(this.calculateFailureRate() * 100).toFixed(0)}%`);
            this.checkStateTransition(); 
        } else if (this.state === BreakerState.HALF_OPEN) {
            
            this.probeFailureCount++;
            this.logger.debug(`[Probe Failure] Count: ${this.probeFailureCount}/${this.maxProbeFailures} failures recorded in HALF-OPEN.`); 

            // Rule: Flip back to OPEN ONLY if probe failure threshold is hit
            if (this.probeFailureCount >= this.maxProbeFailures) { 
                this.state = BreakerState.OPEN;
                this.lastFailureTime = Date.now();
                this.logger.error(`STATE CHANGE: HALF-OPEN -> OPEN. Probe failure limit (${this.maxProbeFailures}) reached. Resetting cooldown.`);
                // Note: No need to clear history here, as history is checked only in CLOSED.
            } else {
                 // Remain in HALF-OPEN and continue probing
            }
        }
    }

    // The Execution Wrapper 
    async execute<T>(serviceFn: () => Promise<T>, fallbackFn: () => T): Promise<T> {
        this.checkStateTransition();

        // --- 1. OPEN STATE CHECK (Fail Fast) ---
        if (this.state === BreakerState.OPEN) {
            this.logger.debug(`[Breaker: ${this.state}] Request rejected instantly.`);
            return fallbackFn(); 
        }

        // --- 2. EXECUTE SERVICE CALL ---
        try {
            const result = await serviceFn();
            this.recordSuccess();
            this.logger.debug(`[Breaker: ${this.state}] Request succeeded.`);
            return result;
            
        } catch (error) {
            // --- 3. FAILURE HANDLING ---
            this.recordFailure();
            this.logger.debug(`[Breaker: ${this.state}] Request failed.`);
            
            // Return fallback on failure, regardless of the new state.
            return fallbackFn(); 
        }
    }
}