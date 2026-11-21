import { apiClient } from './apiClient';

export interface Movie {
  id: number;
  title: string;
  genre: string;
  rating: number;
  year?: number;
  releaseDate?: string;
  duration?: string;
  price?: number;
  aiPick?: boolean;
  synopsis?: string;
  suggestedSeats?: string[];
  posterUrl?: string;
  auditorium?: string;
  status?: string;
  occupancyRate?: number;
  showtimes?: string;
  rottenTomatoes?: number;
  metacritic?: number;
  imdbRating?: number;
  criticConsensus?: string;
  topCriticQuote?: string;
  reviewsCount?: number;
  trailerUrl?: string;
  director?: string;
  cast?: string;
  ageRating?: string;
}

export interface Auditorium {
  id: string;
  cinemaId?: string;
  name: string;
  format: string;
  capacity: number;
  surgeMultiplier: number;
  perk?: string;
  soundSystem?: string;
}

export interface CinemaVenue {
  id: string;
  name: string;
  shortName: string;
  neighborhood?: string;
  distance?: string;
  address?: string;
  features: string[];
  screens?: Auditorium[];
}

export const movieService = {
  getMovies: (params?: { genre?: string; status?: string; search?: string }): Promise<Movie[]> => {
    const searchParams = new URLSearchParams();
    if (params?.genre) searchParams.set('genre', params.genre);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    const qs = searchParams.toString();
    return apiClient.get<Movie[]>(`/api/v1/movies${qs ? `?${qs}` : ''}`);
  },

  getMovie: (id: number | string): Promise<Movie> =>
    apiClient.get<Movie>(`/api/v1/movies/${id}`),

  createMovie: (movie: Partial<Movie>): Promise<Movie> =>
    apiClient.post<Movie>('/api/v1/movies', movie),

  updateMovie: (id: number | string, movie: Partial<Movie>): Promise<Movie> =>
    apiClient.put<Movie>(`/api/v1/movies/${id}`, movie),

  deleteMovie: (id: number | string): Promise<void> =>
    apiClient.delete(`/api/v1/movies/${id}`),

  aiDraft: (title: string, genreHint?: string): Promise<Movie> =>
    apiClient.post<Movie>('/api/v1/movies/ai-draft', { title, genreHint }),

  getReviews: (id: number | string): Promise<any> =>
    apiClient.get<any>(`/api/v1/movies/${id}/reviews`),

  ingestCurrentYear: (year: number): Promise<Movie[]> =>
    apiClient.post<Movie[]>(`/api/v1/movies/ingest-current-year?year=${year}`),

  getAuditoriums: (): Promise<Auditorium[]> =>
    apiClient.get<Auditorium[]>('/api/v1/movies/auditoriums'),

  getCinemas: (): Promise<CinemaVenue[]> =>
    apiClient.get<CinemaVenue[]>('/api/v1/movies/cinemas'),
};
