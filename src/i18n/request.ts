import { getRequestConfig } from "next-intl/server";

/** The server always renders English; `LangProvider` swaps the dictionary in the browser. */
export default getRequestConfig(async () => ({
  locale: "en",
  messages: (await import("./messages/en.json")).default,
}));
