/**
 * Ride types - synchronized with frontend
 * Frontend path: taxirelay/src/shared/types/ride.ts
 */

export interface RideDocument {
  id: string;
  rideId?: number;
  name: string;
  uri: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date;
}

export type RideStatus = 'available' | 'accepted' | 'published' | 'completed' | 'cancelled';
export type CourseType = 'normal' | 'medical';
export type MedicalType = 'hospitalisation' | 'consultation' | null;
export type DocumentsVisibility = 'hidden' | 'visible';

export interface Ride {
  id: number;
  zone: string;
  department: string;
  distance: string;
  exactDistance: string;
  publishedAt: Date;
  status: RideStatus;
  courseType: CourseType;
  medicalType: MedicalType;

  // Scheduling information
  scheduledDate: string | null; // Format: YYYY-MM-DD
  departureTime: string | null; // Format: HH:MM
  arrivalTime: string | null; // Format: HH:MM

  // Client information (sensitive - masked for unauthorized users)
  clientName: string;
  clientPhone: string;
  pickup: string;
  destination: string;

  documentsVisibility: DocumentsVisibility;
  documents: RideDocument[];

  // Relationships
  publishedBy: string; // User ID (UUID)
  acceptedBy?: string; // User ID (UUID)
  acceptedAt?: Date;
  completedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// DTO for creating a new ride
export interface CreateRideDTO {
  zone: string;
  department: string;
  distance: string;
  courseType: CourseType;
  medicalType: MedicalType;
  clientName: string;
  clientPhone: string;
  pickup: string;
  destination: string;
  // Scheduling (required)
  scheduledDate: string; // Format: YYYY-MM-DD
  departureTime: string; // Format: HH:MM
  arrivalTime: string; // Format: HH:MM
}

// DTO for updating ride status
export interface UpdateRideStatusDTO {
  status: 'completed' | 'cancelled';
}

// Filters for querying rides
export interface RideFilters {
  department?: string;
  status?: RideStatus;
  courseType?: CourseType;
  scheduledDate?: string; // Filter by specific date
  fromDate?: string; // Filter from this date
  toDate?: string; // Filter until this date
  page?: number;
  limit?: number;
}

// Paginated response
export interface PaginatedRides {
  rides: Ride[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Database row interface (matches PostgreSQL schema)
export interface RideRow {
  id: number;
  zone: string;
  department: string;
  distance: string;
  exact_distance: string;
  published_at: Date;
  status: string;
  course_type: string;
  medical_type: string | null;
  // Scheduling fields
  scheduled_date: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  // Client info
  client_name: string;
  client_phone: string;
  pickup: string;
  destination: string;
  documents_visibility: string;
  published_by: string;
  accepted_by: string | null;
  accepted_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
