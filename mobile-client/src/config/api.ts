export const apiConfig = {
  baseUrl: (process.env.EXPO_PUBLIC_API_URL || "https://darija-sidepanel-translator-production.up.railway.app").replace(/\/$/, ""),
  username: process.env.EXPO_PUBLIC_API_USERNAME || "translator",
  password: process.env.EXPO_PUBLIC_API_PASSWORD || "Black",
};
