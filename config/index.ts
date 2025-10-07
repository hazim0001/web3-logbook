import Constants from "expo-constants";

type EnvKey = "development" | "staging" | "production";

const ENV =
  (Constants.expoConfig?.extra?.env as EnvKey | undefined) ?? "development";

const configs: Record<EnvKey, { API_BASE_URL: string; APP_NAME: string; ENABLE_LOGS: boolean }> = {
  development: {
    API_BASE_URL: "http://localhost:3000/api/v1",
    APP_NAME: "FlightLog Dev",
    ENABLE_LOGS: true,
  },
  staging: {
    API_BASE_URL: "https://staging-api.flightlog.example.com/api/v1",
    APP_NAME: "FlightLog Staging",
    ENABLE_LOGS: true,
  },
  production: {
    API_BASE_URL: "https://api.flightlog.example.com/api/v1",
    APP_NAME: "FlightLog",
    ENABLE_LOGS: false,
  },
};

const config = configs[ENV] ?? configs.development;

export const API_BASE_URL = config.API_BASE_URL;
export const APP_NAME = config.APP_NAME;
export const ENABLE_LOGS = config.ENABLE_LOGS;

export default config;
