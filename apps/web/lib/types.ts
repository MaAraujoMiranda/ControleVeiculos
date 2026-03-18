export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ListResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface Configuration {
  id: number;
  allowMultipleVehiclesPerClient: boolean;
  sessionDurationDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface HealthResponse {
  name: string;
  status: string;
  version: string;
  database: {
    configured: boolean;
    status: string;
  };
  timestamp: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "OPERATOR" | "VIEWER";
  lastLoginAt: string | null;
}

export interface AuthSession {
  sessionId: string;
  expiresAt: string;
  user: AuthUser;
}

export interface ClientOption {
  id: string;
  name: string;
  cpf: string;
  phone: string;
}

export interface VehicleOption {
  id: string;
  clientId: string;
  plate: string;
  brandModel: string | null;
}

export interface ClientRecord {
  id: string;
  name: string;
  phone: string;
  cpf: string;
  photoUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  vehicles: VehicleOption[];
  _count: {
    registrations: number;
    vehicles: number;
  };
}

export interface VehicleRecord {
  id: string;
  clientId: string;
  plate: string;
  brandModel: string | null;
  color: string | null;
  category: string | null;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  client: ClientOption;
  _count?: {
    registrations: number;
  };
  registrations?: RegistrationRecord[];
}

export interface RegistrationRecord {
  id: string;
  clientId: string;
  vehicleId: string;
  cardNumber: string | null;
  trSl: string | null;
  status: "ACTIVE" | "INACTIVE" | "BLOCKED";
  observations: string | null;
  createdAt: string;
  updatedAt: string;
  client: ClientOption;
  vehicle: VehicleOption;
}

export interface ClientPayload {
  name: string;
  phone: string;
  cpf: string;
  photoUrl?: string;
  notes?: string;
}

export interface VehiclePayload {
  clientId: string;
  plate: string;
  brandModel?: string;
  color?: string;
  category?: string;
  photoUrl?: string;
}

export interface RegistrationPayload {
  clientId: string;
  vehicleId: string;
  cardNumber?: string;
  trSl?: string;
  status?: "ACTIVE" | "INACTIVE" | "BLOCKED";
  observations?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}
