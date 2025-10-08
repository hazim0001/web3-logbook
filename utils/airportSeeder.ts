import * as FileSystem from "expo-file-system";
import database, { Airport } from "../services/database";

const mockAirports = require("../assets/mockAirports.json") as Array<
  Omit<Airport, "id">
>;

interface OurAirportsCSVRow {
  id: string;
  ident: string;
  type: string;
  name: string;
  latitude_deg: string;
  longitude_deg: string;
  elevation_ft: string;
  continent: string;
  iso_country: string;
  iso_region: string;
  municipality: string;
  gps_code: string;
  iata_code: string;
  local_code: string;
  home_link: string;
  wikipedia_link: string;
  keywords: string;
}

const AIRPORT_TIMEZONES: Record<string, string> = {
  OMDB: "Asia/Dubai",
  OMDW: "Asia/Dubai",
  OMSJ: "Asia/Dubai",
  OMAA: "Asia/Muscat",
  OTHH: "Asia/Qatar",
  OBBI: "Asia/Bahrain",
  OKBK: "Asia/Kuwait",
  OEJN: "Asia/Riyadh",
  OERK: "Asia/Riyadh",
  OEDF: "Asia/Riyadh",
  EGLL: "Europe/London",
  EGKK: "Europe/London",
  EHAM: "Europe/Amsterdam",
  EDDF: "Europe/Berlin",
  LFPG: "Europe/Paris",
  LEMD: "Europe/Madrid",
  LIRF: "Europe/Rome",
  LSZH: "Europe/Zurich",
  VHHH: "Asia/Hong_Kong",
  RJTT: "Asia/Tokyo",
  WSSS: "Asia/Singapore",
  ZBAA: "Asia/Shanghai",
  VIDP: "Asia/Kolkata",
  VTBS: "Asia/Bangkok",
  KJFK: "America/New_York",
  KLAX: "America/Los_Angeles",
  KORD: "America/Chicago",
  KATL: "America/New_York",
  CYYZ: "America/Toronto",
};

export class AirportSeeder {
  private static readonly CSV_URL =
    "https://davidmegginson.github.io/ourairports-data/airports.csv";

  private static readonly CACHE_FILE = `${FileSystem.documentDirectory}airports_cache.csv`;

  static async seedAirports(options: {
    forceDownload?: boolean;
    onProgress?: (status: string) => void;
  } = {}): Promise<void> {
    const { forceDownload = false, onProgress } = options;

    try {
      if (__DEV__ && !forceDownload) {
        onProgress?.("Loading development airport dataset...");
        await database.bulkInsertAirports(
          mockAirports as Array<Omit<Airport, "id">>
        );
        onProgress?.("Airport database ready!");
        return;
      }

      onProgress?.("Checking for cached airport data...");

      const cacheInfo = await FileSystem.getInfoAsync(this.CACHE_FILE);
      let csvContent: string;

      if (!forceDownload && cacheInfo.exists) {
        onProgress?.("Loading from cache...");
        csvContent = await FileSystem.readAsStringAsync(this.CACHE_FILE);
      } else {
        onProgress?.("Downloading airport database (~10MB)...");
        const downloadResult = await FileSystem.downloadAsync(
          this.CSV_URL,
          this.CACHE_FILE
        );

        if (downloadResult.status !== 200) {
          throw new Error(`Download failed with status ${downloadResult.status}`);
        }

        csvContent = await FileSystem.readAsStringAsync(this.CACHE_FILE);
      }

      onProgress?.("Parsing airport data...");
      const airports = this.parseCSV(csvContent);

      onProgress?.(`Importing ${airports.length} airports...`);
      await database.bulkInsertAirports(airports);

      onProgress?.("Airport database ready!");
    } catch (error) {
      console.error("Failed to seed airports:", error);
      throw error;
    }
  }

  private static parseCSV(csvContent: string): Omit<Airport, "id">[] {
    const lines = csvContent.split("\n");
    const headers = lines[0]
      .split(",")
      .map((header) => header.replace(/"/g, "").trim());

    const airports: Omit<Airport, "id">[] = [];

    for (let i = 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line.trim()) {
        continue;
      }

      const values = this.parseCSVLine(line);
      if (values.length < headers.length) {
        continue;
      }

      const row = headers.reduce((acc, header, index) => {
        acc[header] = values[index] || "";
        return acc;
      }, {} as Record<string, string>) as OurAirportsCSVRow;

      const type = row.type;
      const iataCode = row.iata_code?.trim();
      const icaoCode = row.ident?.trim();

      if (!icaoCode || icaoCode.length !== 4) {
        continue;
      }

      const includeAirport =
        type === "large_airport" ||
        type === "medium_airport" ||
        (type === "small_airport" && iataCode && iataCode.length === 3);

      if (!includeAirport) {
        continue;
      }

      const latitude = parseFloat(row.latitude_deg);
      const longitude = parseFloat(row.longitude_deg);

      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        continue;
      }

      airports.push({
        icaoCode,
        iataCode: iataCode || undefined,
        name: row.name || "Unknown Airport",
        city: row.municipality || undefined,
        country: row.iso_country || undefined,
        latitude,
        longitude,
        timezone: this.guessTimezone(icaoCode, latitude, longitude),
        elevationFt: row.elevation_ft ? parseInt(row.elevation_ft, 10) : undefined,
        type: type || undefined,
        active: true,
      });
    }

    return airports;
  }

  private static parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];

      if (char === '"') {
        const nextChar = line[i + 1];
        if (nextChar === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values.map((value) => value.replace(/^"|"$/g, ""));
  }

  private static guessTimezone(icao: string, lat: number, lon: number): string {
    if (AIRPORT_TIMEZONES[icao]) {
      return AIRPORT_TIMEZONES[icao];
    }

    const offset = Math.round(lon / 15);
    if (lat > 60) {
      return "Europe/London";
    }
    if (offset >= 3 && offset <= 4) {
      return "Asia/Dubai";
    }
    if (offset >= 0 && offset <= 2) {
      return "Europe/London";
    }
    if (offset >= 7 && offset <= 9) {
      return "Asia/Singapore";
    }
    if (offset <= -4 && offset >= -9) {
      return "America/New_York";
    }

    return "UTC";
  }

  static async getAirportCount(): Promise<number> {
    return database.getAirportCount();
  }
}

export default AirportSeeder;
