export interface PaginationMeta {
  total: number;
  globalTotal?: number;
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
  company: string | null;
  clientType: string | null;
  clientModality: string | null;
  cpf: string;
  phone: string;
}

export interface VehicleOption {
  id: string;
  clientId: string;
  plate: string;
  brandModel: string | null;
  color: string | null;
  category: string | null;
  photoUrl: string | null;
}

export interface ClientRecord {
  id: string;
  name: string;
  company: string | null;
  clientType: string | null;
  clientModality: string | null;
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
  vehicle2Id: string | null;
  cardNumber: string | null;
  trSl: string | null;
  status: "ACTIVE" | "INACTIVE" | "BLOCKED";
  observations: string | null;
  declarationUrl: string | null;
  createdAt: string;
  updatedAt: string;
  client: ClientOption;
  vehicle: VehicleOption;
  vehicle2: VehicleOption | null;
}

export interface DashboardStats {
  activeClients: number;
  inactiveClients: number;
  vehicles: number;
  registrations: number;
}

export interface ClientPayload {
  name?: string;
  company?: string;
  clientType?: string;
  clientModality?: string;
  phone?: string;
  cpf?: string;
  photoUrl?: string;
  notes?: string;
}

export interface VehiclePayload {
  clientId: string;
  plate?: string;
  brandModel?: string;
  color?: string;
  category?: string;
  photoUrl?: string;
}

export interface RegistrationPayload {
  clientId: string;
  vehicleId: string;
  vehicle2Id?: string | null;
  cardNumber?: string;
  trSl?: string;
  status?: "ACTIVE" | "INACTIVE" | "BLOCKED";
  observations?: string;
  declarationUrl?: string | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  name?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface LicensePayment {
  id: string;
  status: "PENDING" | "CONFIRMED" | "OVERDUE" | "CANCELLED";
  method: "PIX" | "BOLETO";
  amount: number;
  daysAdded: number;
  pixQrCode: string | null;
  pixCopyPaste: string | null;
  boletoUrl: string | null;
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
}

export interface LicenseRecord {
  id: string;
  status: "TRIAL" | "ACTIVE" | "EXPIRED" | "SUSPENDED";
  expiresAt: string;
  daysRemaining: number;
  holderName: string | null;
  holderCpf: string | null;
  holderEmail: string | null;
  price: number;
  daysPerPayment: number;
  payments: LicensePayment[];
}

export interface CreatePaymentPayload {
  holderName: string;
  holderCpf: string;
  holderEmail: string;
  method?: "PIX" | "BOLETO";
}
