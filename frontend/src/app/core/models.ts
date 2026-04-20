export type TaskStatus = 'new' | 'in_progress' | 'completed';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  email: string;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

export interface TaskImage {
  id: number;
  image_base64: string | null;
}

export interface Subtask {
  id: number;
  description: string;
  status: string;
}

export interface Task {
  id: number;
  description: string;
  status: TaskStatus;
  due_date: string | null;
  due_time: string | null;
  created_at: string;
  owner: number;
  owner_name: string;
  subtasks: Subtask[];
  images: TaskImage[];
}

export interface TaskPayload {
  description: string;
  status: TaskStatus;
  due_date?: string | null;
  due_time?: string | null;
}

export interface SubtaskCreatePayload {
  task_id: number;
  description: string;
  status: TaskStatus;
}

export interface SubtaskUpdatePayload {
  description?: string;
  status?: TaskStatus;
}