// apps/hotel-service/src/dtos/hotel-response.dto.ts

export class HotelDetailsDto {
    id: string; 
    name: string;
    rating: number;
    pricePerNight: number;
    date: string;
}

export class HotelSearchResponseDto {
    hotels: HotelDetailsDto[];
}