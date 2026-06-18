import { Injectable } from '@angular/core';

export const WEATHER_NOTE_PREFIX = 'Weather forecast:';

interface GeoResult {
  latitude: number;
  longitude: number;
  name: string;
}

interface HourlyForecast {
  time: string[];
  temperature_2m: number[];
  precipitation_probability: number[];
  weathercode: number[];
}

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  async getWeatherNote(location: string, dateTime: Date): Promise<string | null> {
    const trimmedLocation = location.trim();
    if (!trimmedLocation || Number.isNaN(dateTime.getTime())) {
      return null;
    }

    const coords = await this.geocode(trimmedLocation);
    if (!coords) {
      return null;
    }

    const daysAhead = Math.ceil((dateTime.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysAhead > 16) {
      return `${WEATHER_NOTE_PREFIX} Forecast is not available yet for dates more than 16 days out. Check again closer to your date in ${coords.name}.`;
    }

    if (daysAhead < 0) {
      return null;
    }

    const forecast = await this.fetchHourlyForecast(coords.latitude, coords.longitude, dateTime);
    if (!forecast) {
      return null;
    }

    const hourIndex = this.closestHourIndex(forecast.time, dateTime);
    const tempF = this.celsiusToFahrenheit(forecast.temperature_2m[hourIndex]);
    const rainChance = forecast.precipitation_probability[hourIndex] ?? 0;
    const condition = this.describeWeatherCode(forecast.weathercode[hourIndex]);
    const timeLabel = this.formatHourLabel(dateTime);

    return `${WEATHER_NOTE_PREFIX} ${condition}, ${tempF}°F, ${rainChance}% chance of rain around ${timeLabel} in ${coords.name}.`;
  }

  stripWeatherNote(notes: string): string {
    return notes
      .split('\n\n')
      .filter((block) => !block.trim().startsWith(WEATHER_NOTE_PREFIX))
      .join('\n\n')
      .trim();
  }

  private async geocode(location: string): Promise<GeoResult | null> {
    const isZip = /^\d{5}(?:-\d{4})?$/.test(location);
    const query = isZip ? location.slice(0, 5) : location;
    const params = new URLSearchParams({
      name: query,
      count: '1',
      language: 'en',
      format: 'json'
    });

    if (isZip) {
      params.set('countryCode', 'US');
    }

    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      results?: Array<{ latitude: number; longitude: number; name: string; admin1?: string }>;
    };

    const match = data.results?.[0];
    if (!match) {
      return null;
    }

    const label = match.admin1 ? `${match.name}, ${match.admin1}` : match.name;
    return {
      latitude: match.latitude,
      longitude: match.longitude,
      name: label
    };
  }

  private async fetchHourlyForecast(
    latitude: number,
    longitude: number,
    dateTime: Date
  ): Promise<HourlyForecast | null> {
    const dateKey = this.toDateKey(dateTime);
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      hourly: 'temperature_2m,precipitation_probability,weathercode',
      timezone: 'auto',
      start_date: dateKey,
      end_date: dateKey
    });

    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { hourly?: HourlyForecast };
    return data.hourly ?? null;
  }

  private closestHourIndex(times: string[], dateTime: Date): number {
    const targetMinutes = dateTime.getHours() * 60 + dateTime.getMinutes();
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    times.forEach((entry, index) => {
      const parsed = new Date(entry);
      const minutes = parsed.getHours() * 60 + parsed.getMinutes();
      const distance = Math.abs(minutes - targetMinutes);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    return bestIndex;
  }

  private describeWeatherCode(code: number): string {
    if (code === 0) {
      return 'Clear skies';
    }

    if (code <= 3) {
      return 'Partly cloudy';
    }

    if (code <= 48) {
      return 'Foggy';
    }

    if (code <= 57) {
      return 'Drizzle';
    }

    if (code <= 67) {
      return 'Rainy';
    }

    if (code <= 77) {
      return 'Snowy';
    }

    if (code <= 82) {
      return 'Rain showers';
    }

    if (code <= 86) {
      return 'Snow showers';
    }

    if (code <= 99) {
      return 'Thunderstorms';
    }

    return 'Mixed conditions';
  }

  private celsiusToFahrenheit(value: number): number {
    return Math.round((value * 9) / 5 + 32);
  }

  private formatHourLabel(dateTime: Date): string {
    return dateTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  private toDateKey(dateTime: Date): string {
    const year = dateTime.getFullYear();
    const month = String(dateTime.getMonth() + 1).padStart(2, '0');
    const day = String(dateTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
