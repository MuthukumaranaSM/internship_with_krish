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
    private failureCount: number = 0;
    private probeFailureCount: number = 0; 
    private successCount: number = 0;
    private lastFailureTime: number = 0; 
    
    // Configuration constraints from assignment
    private readonly maxFailures = 10;
    private readonly cooldownPeriod = 30000;
    private readonly halfOpenProbeCount = 5;
    private readonly maxProbeFailures = 4; // Max failures allowed in HALF-OPEN

    private readonly logger = new Logger('CircuitBreaker');

    // NOTE: Returning BreakerState is fine if you are comfortable with the TS4053 fix.
    public getState(): BreakerState { 
        return this.state;
    }

    // 1. State Transition Logic
    private checkStateTransition() {
        const currentTime = Date.now();

        if (this.state === BreakerState.CLOSED) {
            // Rule: If failure count hits 10, trip to OPEN
            if (this.failureCount >= this.maxFailures) {
                this.state = BreakerState.OPEN;
                this.lastFailureTime = currentTime;
                this.logger.error(`STATE CHANGE: CLOSED -> OPEN. Threshold met (${this.failureCount} failures).`);
            }
        } 
        
        else if (this.state === BreakerState.OPEN) {
            // Rule: If cooldown period is over, move to HALF-OPEN
            if (currentTime > this.lastFailureTime + this.cooldownPeriod) {
                this.state = BreakerState.HALF_OPEN;
                this.successCount = 0; 
                this.probeFailureCount = 0; // Reset probe failures when entering HALF-OPEN
                this.logger.warn('STATE CHANGE: OPEN -> HALF-OPEN. Cooldown elapsed. Probing starts.');
            }
        } 
        
        else if (this.state === BreakerState.HALF_OPEN) {
            // Rule: If success count hits 5, move back to CLOSED
            if (this.successCount >= this.halfOpenProbeCount) {
                this.state = BreakerState.CLOSED;
                this.failureCount = 0;
                this.probeFailureCount = 0; // Reset when healing is complete
                this.logger.log('STATE CHANGE: HALF-OPEN -> CLOSED. Service restored.');
            }
        }
    }

    private recordSuccess() {
        if (this.state === BreakerState.CLOSED) {
            this.failureCount = Math.max(0, this.failureCount - 1);
            // ENHANCED LOGGING: Shows decay
            this.logger.debug(`[CLOSED Success] Failures decayed to: ${this.failureCount}/${this.maxFailures}`);
        } else if (this.state === BreakerState.HALF_OPEN) {
            this.successCount++;
            // ENHANCED LOGGING: Shows current successful probes
            this.logger.log(`[Probe Success] Count: ${this.successCount}/${this.halfOpenProbeCount} successful probes.`); 
            this.checkStateTransition(); 
        }
    }

    private recordFailure() {
        if (this.state === BreakerState.CLOSED) {
            this.failureCount++;
            // ENHANCED LOGGING: Shows count toward trip
            this.logger.error(`[CLOSED Failure] Count: ${this.failureCount}/${this.maxFailures} failures recorded.`);
            this.checkStateTransition(); 
        } else if (this.state === BreakerState.HALF_OPEN) {
            
            this.probeFailureCount++;
            // ENHANCED LOGGING: Shows probe failure count toward immediate trip
            this.logger.warn(`[Probe Failure] Count: ${this.probeFailureCount}/${this.maxProbeFailures} failures recorded in HALF-OPEN.`); 

            // Rule: Flip back to OPEN ONLY if probe failure threshold is hit
            if (this.probeFailureCount >= this.maxProbeFailures) { 
                this.state = BreakerState.OPEN;
                this.lastFailureTime = Date.now();
                this.logger.error(`STATE CHANGE: HALF-OPEN -> OPEN. Probe failure limit (${this.maxProbeFailures}) reached. Resetting cooldown.`);
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