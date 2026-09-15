import { Inter, IBM_Plex_Sans_Arabic } from "next/font/google";

export const fontEn = Inter({
  subsets: ["latin"],
  variable: "--font-en",
  display: "swap",
});

export const fontAr = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ar",
  display: "swap",
});
