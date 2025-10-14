
export class EventDetailsDto {
    id: number; 
    name: string;
    date: string;
    category: string;
}

export class EventsSearchResponseDto {
    events: EventDetailsDto[];
}