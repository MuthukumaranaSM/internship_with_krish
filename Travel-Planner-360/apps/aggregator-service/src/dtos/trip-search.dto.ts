import { IsNotEmpty, IsString, Length } from 'class-validator';

export class TripSearchDto {
    
  
    @IsNotEmpty({ message: 'Departure city (from) is required.' })
    @IsString()
    @Length(3, 3, { message: 'Departure city code must be 3 letters (IATA code).' })
    from: string;

    @IsNotEmpty({ message: 'Arrival city (to) is required.' })
    @IsString()
    @Length(3, 3, { message: 'Arrival city code must be 3 letters (IATA code).' })
    to: string;

    @IsNotEmpty({ message: 'Travel date is required.' })
    @IsString()
    
    date: string; 
}