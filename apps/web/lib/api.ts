import type {
  AuthSession,
  ClientPayload,
  ClientRecord,
  Configuration,
  CreatePaymentPayload,
  HealthResponse,
  LicensePayment,
  LicenseRecord,
  LoginPayload,
  ListResponse,
  RegistrationPayload,
  RegistrationRecord,
  UpdateProfilePayload,
  VehiclePayload,
  VehicleRecord,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333/api/v1";

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details ?? null;
  }
}

function extractApiMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const message = record.message;

  if (typeof message === "string" && message.trim().length > 0) {
    return message.trim();
  }

  if (Array.isArray(message)) {
    const messages = message
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  if (typeof record.error === "string" && record.error.trim().length > 0) {
    return record.error.trim();
  }

  return null;
}

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return extractApiMessage(error.details) ?? error.message;
  }

  return "Nao foi possivel concluir a operacao.";
}

function buildUrl(path: string, query?: Record<string, string | number | undefined>) {
  const url = new URL(`${API_BASE_URL}${path}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");
  const payload = contentType?.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    const message = extractApiMessage(payload) ?? "Nao foi possivel concluir a operacao.";

    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  query?: Record<string, string | number | undefined>,
) {
  const response = await fetch(buildUrl(path, query), {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
    credentials: "include",
    ...init,
  });

  if (
    response.status === 401 &&
    path !== "/auth/login" &&
    typeof window !== "undefined"
  ) {
    window.dispatchEvent(new CustomEvent("auth:unauthorized"));
  }

  return parseResponse<T>(response);
}

export const api = {
  login(payload: LoginPayload) {
    return apiRequest<AuthSession>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getSession() {
    return apiRequest<AuthSession>("/auth/me");
  },

  logout() {
    return apiRequest<{ message: string }>("/auth/logout", {
      method: "POST",
    });
  },

  updateProfile(payload: UpdateProfilePayload) {
    return apiRequest<{ id: string; name: string; email: string; role: string }>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  getHealth() {
    return apiRequest<HealthResponse>("/health");
  },

  getConfiguration() {
    return apiRequest<Configuration>("/configuration");
  },

  updateConfiguration(payload: Partial<Configuration>) {
    return apiRequest<Configuration>("/configuration", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  getLicense() {
    return apiRequest<LicenseRecord>("/license");
  },

  createLicensePayment(payload: CreatePaymentPayload) {
    return apiRequest<LicensePayment>("/license/payment", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  syncLicensePayment(paymentId: string) {
    return apiRequest<LicenseRecord>(`/license/payment/${paymentId}/sync`, {
      method: "POST",
    });
  },

  listClients(query?: { q?: string; page?: number; pageSize?: number }) {
    return apiRequest<ListResponse<ClientRecord>>("/clients", undefined, query);
  },

  getClient(id: string) {
    return apiRequest<ClientRecord>(`/clients/${id}`);
  },

  createClient(payload: ClientPayload) {
    return apiRequest<ClientRecord>("/clients", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateClient(id: string, payload: Partial<ClientPayload>) {
    return apiRequest<ClientRecord>(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteClient(id: string) {
    return apiRequest<{ message: string }>(`/clients/${id}`, {
      method: "DELETE",
    });
  },

  listVehicles(query?: {
    q?: string;
    clientId?: string;
    page?: number;
    pageSize?: number;
  }) {
    return apiRequest<ListResponse<VehicleRecord>>("/vehicles", undefined, query);
  },

  getVehicle(id: string) {
    return apiRequest<VehicleRecord>(`/vehicles/${id}`);
  },

  createVehicle(payload: VehiclePayload) {
    return apiRequest<VehicleRecord>("/vehicles", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateVehicle(id: string, payload: Partial<VehiclePayload>) {
    return apiRequest<VehicleRecord>(`/vehicles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteVehicle(id: string) {
    return apiRequest<{ message: string }>(`/vehicles/${id}`, {
      method: "DELETE",
    });
  },

  listRegistrations(query?: {
    q?: string;
    clientId?: string;
    vehicleId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    return apiRequest<ListResponse<RegistrationRecord>>(
      "/registrations",
      undefined,
      query,
    );
  },

  getRegistration(id: string) {
    return apiRequest<RegistrationRecord>(`/registrations/${id}`);
  },

  createRegistration(payload: RegistrationPayload) {
    return apiRequest<RegistrationRecord>("/registrations", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateRegistration(id: string, payload: Partial<RegistrationPayload>) {
    return apiRequest<RegistrationRecord>(`/registrations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteRegistration(id: string) {
    return apiRequest<{ message: string }>(`/registrations/${id}`, {
      method: "DELETE",
    });
  },
};
