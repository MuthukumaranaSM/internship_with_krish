import { TripResponseV1Dto } from './trip-response-v1.dto';

// V2 is additive: it extends the V1 response, making it backward compatible
export class TripResponseV2Dto extends TripResponseV1Dto {
    weather?: any; // The new, optional field
}