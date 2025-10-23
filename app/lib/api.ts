// A custom error class for API responses
export class ApiError extends Error {
  public readonly status: number;
  public readonly data: any;

  constructor(message: string, status: number, data: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

// Our fetch wrapper
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const url = `${apiUrl}/api/v1/${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      data.message || "An API error occurred",
      response.status,
      data
    );
  }

  return data.data;
}
