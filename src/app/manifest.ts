import type { MetadataRoute } from "next";

/** The app's dark background (--background in the dark theme), also behind the icons. */
const DARK = "#0f1113";

/**
 * How phones install the app ("Adicionar à tela inicial"). Without it, Android put the
 * small favicon on a white tile and stretched it on the launch screen.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "HabitHub",
    short_name: "HabitHub",
    description: "Seus hábitos numa grade, um quadradinho por dia.",
    lang: "pt-BR",
    // Signed-in people land on their dashboard; the others are sent to sign in.
    start_url: "/painel",
    scope: "/",
    display: "standalone",
    background_color: DARK,
    theme_color: DARK,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Cropped by Android to the launcher's shape: the mark is smaller, so it survives.
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
