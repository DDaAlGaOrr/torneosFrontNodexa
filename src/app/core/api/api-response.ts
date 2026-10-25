/** Envoltorio estándar de la API: { status: 'ok', data } */
export interface ApiResponse<T> {
  status: string;
  data: T;
}

export interface MessageResponse {
  message: string;
}
