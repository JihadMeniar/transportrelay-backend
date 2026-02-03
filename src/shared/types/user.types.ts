/**
 * User types - synchronized with frontend expectations
 */

export interface UserStats {
  published: number;
  accepted: number;
  rating: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  department: string | null;
  role: 'driver' | 'admin';
  isActive: boolean;
  stats: UserStats;
  createdAt: Date;
  updatedAt: Date;
}

// User without sensitive information (for public profiles)
export interface PublicUser {
  id: string;
  name: string;
  stats: UserStats;
  createdAt: Date;
}

// DTO for creating a user
export interface CreateUserDTO {
  email: string;
  password: string;
  name: string;
  phone?: string;
  department?: string;
}

// DTO for updating user profile
export interface UpdateUserDTO {
  name?: string;
  phone?: string;
  department?: string;
}

// DTO for updating password
export interface UpdatePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

// Database row interface (matches PostgreSQL schema)
export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  phone: string | null;
  department: string | null;
  role: string;
  is_active: boolean;
  stats_published: number;
  stats_accepted: number;
  rating: number;
  created_at: Date;
  updated_at: Date;
}

// Helper to convert UserRow to User
export function userRowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    department: row.department,
    role: row.role as 'driver' | 'admin',
    isActive: row.is_active,
    stats: {
      published: row.stats_published,
      accepted: row.stats_accepted,
      rating: parseFloat(row.rating.toString()),
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Helper to remove sensitive data
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    stats: user.stats,
    createdAt: user.createdAt,
  };
}
