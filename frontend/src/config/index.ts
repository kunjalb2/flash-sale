export const config = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
    wsUrl: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws",
  },
  stripe: {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  },
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || "SeatFlow",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  },
  session: {
    checkInterval: Number(process.env.NEXT_PUBLIC_SESSION_CHECK_INTERVAL) || 300000,
  },
  features: {
    analytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true",
    errorTracking: process.env.NEXT_PUBLIC_ENABLE_ERROR_TRACKING === "true",
  },
} as const;

export type Config = typeof config;
