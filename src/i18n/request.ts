import { getRequestConfig } from "next-intl/server";

// The product is Portuguese-only for now; adding English means adding messages/en.json.
export const LOCALE = "pt-BR";

export default getRequestConfig(async () => ({
  locale: LOCALE,
  // Calendar dates are formatted as UTC midnight, so this keeps them from shifting.
  timeZone: "UTC",
  messages: (await import(`../../messages/${LOCALE}.json`)).default,
}));
