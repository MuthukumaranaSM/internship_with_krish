export class FlightDetailsDto {
    id: string; 
    departTime: string;
    arriveTime: string;
    price: number;
    date: string;
}

// This defines the final shape returned by the service
export class FlightSearchResponseDto {
    flights: FlightDetailsDto[];
}