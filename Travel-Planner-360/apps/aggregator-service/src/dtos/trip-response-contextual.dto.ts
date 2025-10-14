//for the Branching endpoint
export class TripResponseContextualDto {
    flights?: any;
    hotels?: any;
    events?: any;
    degraded?: boolean;
    context: string; // To show the decision logic worked
}