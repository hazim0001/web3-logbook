import SunCalc from "suncalc2";

export interface NightTimeResult {
  nightTime: number;
  method: "manual" | "calculated" | "estimated";
  calculatedAt: string;
  details?: {
    departureInNight: boolean;
    arrivalInNight: boolean;
    sunsetAtDeparture?: string;
    sunriseAtDeparture?: string;
    sunsetAtArrival?: string;
    sunriseAtArrival?: string;
  };
}

export class NightTimeCalculator {
  static calculate(
    departureTime: string,
    arrivalTime: string,
    departureLat: number,
    departureLon: number,
    arrivalLat: number,
    arrivalLon: number,
    totalFlightTime: number
  ): NightTimeResult {
    try {
      const departureDate = new Date(departureTime);
      const arrivalDate = new Date(arrivalTime);

      const departureSunTimes = SunCalc.getTimes(departureDate, departureLat, departureLon);
      const arrivalSunTimes = SunCalc.getTimes(arrivalDate, arrivalLat, arrivalLon);

      const departureInNight = this.isNightTime(
        departureDate,
        departureSunTimes.sunset,
        departureSunTimes.sunrise
      );
      const arrivalInNight = this.isNightTime(
        arrivalDate,
        arrivalSunTimes.sunset,
        arrivalSunTimes.sunrise
      );

      let nightTime = 0;

      if (departureInNight && arrivalInNight) {
        nightTime = totalFlightTime;
      } else if (departureInNight && !arrivalInNight) {
        nightTime = totalFlightTime * 0.5;
      } else if (!departureInNight && arrivalInNight) {
        nightTime = totalFlightTime * 0.5;
      } else {
        const durationMs = arrivalDate.getTime() - departureDate.getTime();
        const durationHours = durationMs / (1000 * 60 * 60);

        if (durationHours > 12) {
          nightTime = Math.min(totalFlightTime * 0.4, 8);
        }
      }

      const roundedNightTime = Math.round(nightTime * 10) / 10;

      return {
        nightTime: roundedNightTime,
        method: "calculated",
        calculatedAt: new Date().toISOString(),
        details: {
          departureInNight,
          arrivalInNight,
          sunsetAtDeparture: departureSunTimes.sunset?.toISOString(),
          sunriseAtDeparture: departureSunTimes.sunrise?.toISOString(),
          sunsetAtArrival: arrivalSunTimes.sunset?.toISOString(),
          sunriseAtArrival: arrivalSunTimes.sunrise?.toISOString(),
        },
      };
    } catch (error) {
      console.error("Night time calculation error:", error);
      return {
        nightTime: 0,
        method: "estimated",
        calculatedAt: new Date().toISOString(),
      };
    }
  }

  private static isNightTime(time: Date, sunset: Date, sunrise: Date): boolean {
    const timeMs = time.getTime();
    const sunsetMs = sunset.getTime();
    const sunriseMs = sunrise.getTime();

    if (Number.isNaN(sunsetMs) || Number.isNaN(sunriseMs)) {
      return false;
    }

    if (sunriseMs < sunsetMs) {
      return timeMs >= sunsetMs || timeMs <= sunriseMs;
    }

    return timeMs >= sunsetMs && timeMs <= sunriseMs;
  }

  static estimateFromLocalTime(
    departureLocalTime: string,
    arrivalLocalTime: string,
    totalFlightTime: number
  ): NightTimeResult {
    const depHour = parseInt(departureLocalTime.substring(0, 2), 10);
    const arrHour = parseInt(arrivalLocalTime.substring(0, 2), 10);

    const departureNight = depHour >= 18 || depHour < 6;
    const arrivalNight = arrHour >= 18 || arrHour < 6;

    let nightTime = 0;

    if (departureNight && arrivalNight) {
      nightTime = totalFlightTime;
    } else if (departureNight || arrivalNight) {
      nightTime = totalFlightTime * 0.5;
    }

    const roundedNightTime = Math.round(nightTime * 10) / 10;

    return {
      nightTime: roundedNightTime,
      method: "estimated",
      calculatedAt: new Date().toISOString(),
    };
  }
}

export default NightTimeCalculator;
