
export type AppStage = 'INTRO' | 'LETTER' | 'MAIN' | 'WISHING';

export interface WishResponse {
  message: string;
  magicalNote: string;
}

export interface ActiveWish {
  id: number;
  text: string;
  aiResponse?: WishResponse;
}

export const THEME = {
  emerald: "#0A4D2E",
  gold: "#D4AF37",
  festiveRed: "#FF3131",
  wishCore: "#FFB6C1",
  bg: "#020202",
  star: "#FFF9E3"
};
