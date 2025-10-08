import AsyncStorage from "@react-native-async-storage/async-storage";
import AirportSeeder from "./airportSeeder";

const AIRPORT_SETUP_KEY = "airport_database_seeded";

export async function shouldShowAirportSetup(): Promise<boolean> {
  try {
    const seeded = await AsyncStorage.getItem(AIRPORT_SETUP_KEY);
    if (seeded === "true") {
      const count = await AirportSeeder.getAirportCount();
      return count === 0;
    }
    return true;
  } catch (error) {
    console.error("Error checking airport setup:", error);
    return true;
  }
}
