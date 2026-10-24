const API_BASE = '/api';

export class ApiError extends Error {
  statusCode: number;
  data: any;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retries = 3,
  retryDelay = 500
): Promise<T> {
  const token = localStorage.getItem('saylani_hcm_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // If backend is still starting up (502 / 503 / 504 from Vite proxy)
      if ([502, 503, 504].includes(response.status) && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        continue;
      }

      // Handle PDF or blob downloads
      if (response.headers.get('content-type')?.includes('application/pdf')) {
        return (await response.blob()) as unknown as T;
      }

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new ApiError(
          json.message || 'An error occurred while communicating with the server.',
          response.status,
          json
        );
      }

      return json.data !== undefined ? json.data : json;
    } catch (err: any) {
      if (attempt < retries && (err.name === 'TypeError' || err.message?.includes('fetch'))) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        continue;
      }
      throw err;
    }
  }

  throw new Error('Server connection timed out.');
}

export const downloadPayslipPdf = async (payslipId: string, filename: string): Promise<void> => {
  const token = localStorage.getItem('saylani_hcm_token');
  const response = await fetch(`/api/payroll/payslip/${payslipId}/pdf`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to generate payslip PDF.');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
