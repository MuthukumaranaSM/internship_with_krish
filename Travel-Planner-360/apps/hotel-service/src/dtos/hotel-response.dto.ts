// apps/hotel-service/src/dtos/hotel-response.dto.ts

export class HotelDetailsDto {
    id: string; 
    name: string;
    rating: number;
    pricePerNight: number;
}

export class HotelSearchResponseDto {
    hotels: HotelDetailsDto[];
}