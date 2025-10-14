export class FlightQueryDto {
  // Input from the Aggregator (e.g., CMB)
  from: string; 
  // Input from the Aggregator (e.g., BKK)
  to: string;
  // Input from the Aggregator (e.g., 2025-12-10)
  date: string;
}