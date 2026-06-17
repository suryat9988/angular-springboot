import { AbstractControl, ValidationErrors } from '@angular/forms';

const ZIP_PATTERN = /^\d{5}(?:-\d{4})?$/;
const CITY_PATTERN = /^[A-Za-z][A-Za-z\s.'-]{1,58}$/;

export interface TimeOption {
  value: string;
  label: string;
}

export const TIME_OPTIONS: TimeOption[] = buildTimeOptions();

export function cityOrZipcodeValidator(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value.trim() : '';
  if (!value) {
    return null;
  }

  if (ZIP_PATTERN.test(value) || CITY_PATTERN.test(value)) {
    return null;
  }

  return { cityOrZip: true };
}

export function combineDateAndTime(date: Date | null, time: string): string | null {
  if (!date || !time) {
    return null;
  }

  const [hours, minutes] = time.split(':').map((part) => Number(part));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return toDateTimeLocal(combined);
}

export function resolveDateTimeForSave(date: Date | null, time: string): string {
  const combined = combineDateAndTime(date, time);
  if (combined) {
    return combined;
  }

  if (date) {
    const withDefaultTime = new Date(date);
    withDefaultTime.setHours(19, 0, 0, 0);
    return toDateTimeLocal(withDefaultTime);
  }

  if (time) {
    const [hours, minutes] = time.split(':').map((part) => Number(part));
    const upcoming = new Date();
    upcoming.setDate(upcoming.getDate() + 7);
    upcoming.setHours(hours, minutes, 0, 0);
    return toDateTimeLocal(upcoming);
  }

  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 7);
  fallback.setHours(19, 0, 0, 0);
  return toDateTimeLocal(fallback);
}

export function splitDateTimeLocal(value: string): { date: Date | null; time: string } {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { date: null, time: '' };
  }

  const date = new Date(parsed);
  date.setHours(0, 0, 0, 0);

  return {
    date,
    time: `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
  };
}

function buildTimeOptions(): TimeOption[] {
  const options: TimeOption[] = [];

  for (let hour = 6; hour <= 23; hour++) {
    for (const minute of [0, 30]) {
      if (hour === 23 && minute === 30) {
        break;
      }

      options.push({
        value: `${pad(hour)}:${pad(minute)}`,
        label: formatTimeLabel(hour, minute)
      });
    }
  }

  return options;
}

function formatTimeLabel(hour: number, minute: number): string {
  const meridiem = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${pad(minute)} ${meridiem}`;
}

function toDateTimeLocal(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}
