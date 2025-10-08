import { Airport } from "../services/database";

export function localTimeToUTC(
  date: string,
  localTime: string,
  timezone: string
): string {
  try {
    const hours = parseInt(localTime.substring(0, 2), 10);
    const minutes = parseInt(localTime.substring(2, 4), 10);

    const dateTimeString = `${date}T${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:00`;

    const localDate = new Date(dateTimeString);
    const offset = getTimezoneOffset(timezone, localDate);

    const utcTimestamp = new Date(localDate.getTime() - offset * 60000);
    return utcTimestamp.toISOString();
  } catch (error) {
    console.error("Error converting local time to UTC:", error);
    return new Date(
      `${date}T${localTime.substring(0, 2)}:${localTime.substring(2, 4)}:00Z`
    ).toISOString();
  }
}

export function utcToLocalTime(utcTimestamp: string, timezone: string): string {
  try {
    const date = new Date(utcTimestamp);
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
    const minute = parts.find((part) => part.type === "minute")?.value ?? "00";

    return `${hour}${minute}`;
  } catch (error) {
    console.error("Error converting UTC to local time:", error);
    const date = new Date(utcTimestamp);
    return `${date.getUTCHours().toString().padStart(2, "0")}${date
      .getUTCMinutes()
      .toString()
      .padStart(2, "0")}`;
  }
}

function getTimezoneOffset(timezone: string, date: Date): number {
  try {
    const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
    const tzDate = new Date(date.toLocaleString("en-US", { timeZone: timezone }));

    return (tzDate.getTime() - utcDate.getTime()) / 60000;
  } catch (error) {
    console.error("Error getting timezone offset:", error);
    return 0;
  }
}

export function getTimezoneAbbreviation(timezone: string, date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "short",
    });

    const parts = formatter.formatToParts(date);
    const tzName = parts.find((part) => part.type === "timeZoneName")?.value;

    return tzName ?? timezone.split("/")[1] ?? "UTC";
  } catch (error) {
    return timezone.split("/")[1] ?? "UTC";
  }
}

export function formatTimeWithTimezone(localTime: string, timezone?: string): string {
  if (!localTime) {
    return "";
  }

  const hours = localTime.substring(0, 2);
  const minutes = localTime.substring(2, 4);
  const timeStr = `${hours}:${minutes}`;

  if (!timezone) {
    return timeStr;
  }

  const tzAbbr = getTimezoneAbbreviation(timezone);
  return `${timeStr} ${tzAbbr}`;
}

export function calculateFlightDuration(departureUtc: string, arrivalUtc: string): number {
  const departure = new Date(departureUtc);
  const arrival = new Date(arrivalUtc);

  const durationMs = arrival.getTime() - departure.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);

  return Math.round(durationHours * 100) / 100;
}

export function isValidTimeFormat(time: string): boolean {
  if (!time || time.length !== 4) {
    return false;
  }

  const hours = parseInt(time.substring(0, 2), 10);
  const minutes = parseInt(time.substring(2, 4), 10);

  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

export function decimalToHoursMinutes(decimal: number): { hours: number; minutes: number } {
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);

  return { hours, minutes };
}

export function hoursMinutesToDecimal(hours: number, minutes: number): number {
  return hours + minutes / 60;
}

export function getAirportTimezoneInfo(airport: Airport): {
  timezone: string;
  abbreviation: string;
  offset: string;
} {
  const timezone = airport.timezone ?? "UTC";
  const abbreviation = getTimezoneAbbreviation(timezone);

  const date = new Date();
  const offsetMinutes = getTimezoneOffset(timezone, date);
  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
  const offsetMins = Math.abs(offsetMinutes) % 60;
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const offset = `${sign}${offsetHours.toString().padStart(2, "0")}:${offsetMins
    .toString()
    .padStart(2, "0")}`;

  return { timezone, abbreviation, offset };
}

export function parseTimeInput(input: string): string | null {
  if (!input) {
    return null;
  }

  const numbers = input.replace(/\D/g, "");

  if (numbers.length === 0) {
    return null;
  }

  if (numbers.length === 1 || numbers.length === 2) {
    const hours = parseInt(numbers, 10);
    if (hours >= 0 && hours <= 23) {
      return `${hours.toString().padStart(2, "0")}00`;
    }
  } else if (numbers.length === 3) {
    const hours = parseInt(numbers.substring(0, 1), 10);
    const minutes = parseInt(numbers.substring(1, 3), 10);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${hours.toString().padStart(2, "0")}${minutes.toString().padStart(2, "0")}`;
    }
  } else {
    const hours = parseInt(numbers.substring(0, 2), 10);
    const minutes = parseInt(numbers.substring(2, 4), 10);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${hours.toString().padStart(2, "0")}${minutes.toString().padStart(2, "0")}`;
    }
  }

  return null;
}

export function formatTime(time: string): string {
  if (!time || time.length !== 4) {
    return time;
  }

  return `${time.substring(0, 2)}:${time.substring(2, 4)}`;
}
