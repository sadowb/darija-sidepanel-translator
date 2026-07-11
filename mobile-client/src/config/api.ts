export const apiConfig = {
  baseUrl: (process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, ""),
  username: process.env.EXPO_PUBLIC_API_USERNAME || "",
  password: process.env.EXPO_PUBLIC_API_PASSWORD || "",
};
