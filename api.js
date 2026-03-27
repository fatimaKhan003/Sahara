// get localhost IP address to connect to API from mobile device
import Constants from "expo-constants";

let host = null;

const debuggerHost =
  Constants.manifest?.debuggerHost || Constants.expoConfig?.hostUri || null;

if (debuggerHost) {
  host = debuggerHost.split(":").shift();
}

if (!host) {
  host = "192.168.1.100"; // fallback
}

export const API_BASE = `http://${host}:5000`;
export const OCR_BASE = `http://${host}:8000`;
