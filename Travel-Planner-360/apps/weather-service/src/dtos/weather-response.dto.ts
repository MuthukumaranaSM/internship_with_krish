export class ForecastDetailsDto {
    date: string;
    tempMin: number;
    tempMax: number;
    condition: string;
}

export class WeatherResponseDto {
    forecast: ForecastDetailsDto[];
}
