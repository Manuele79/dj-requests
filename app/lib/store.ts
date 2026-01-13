export type RequestItem = {
  id: string;
  eventCode: string;

  title: string;

  // Link condiviso dall’utente (YouTube/Spotify/Apple/Amazon/Altro)
  url: string;
  platform: "youtube" | "spotify" | "apple" | "amazon" | "other";

  // Solo se YouTube: serve per Party Mode autoplay
  youtubeVideoId: string;

  votes: number;
  createdAt: number;
  updatedAt: number;
};

export const store: { requests: RequestItem[] } = {
  requests: [],
};
