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
};
