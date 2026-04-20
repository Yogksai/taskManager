import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from './api.constants';
import {
  Subtask,
  SubtaskCreatePayload,
  SubtaskUpdatePayload,
  Task,
  TaskPayload
} from './models';

@Injectable({ providedIn: 'root' })
export class TaskService {
  constructor(private readonly http: HttpClient) {}

  getTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(`${API_BASE_URL}/tasks/`);
  }

  createTask(payload: TaskPayload): Observable<Task> {
    return this.http.post<Task>(`${API_BASE_URL}/tasks/`, payload);
  }

  updateTask(taskId: number, payload: Partial<TaskPayload>): Observable<Task> {
    return this.http.patch<Task>(`${API_BASE_URL}/tasks/${taskId}/`, payload);
  }

  deleteTask(taskId: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/tasks/${taskId}/`);
  }

  createSubtask(payload: SubtaskCreatePayload): Observable<Subtask> {
    return this.http.post<Subtask>(`${API_BASE_URL}/subtasks/`, payload);
  }

  updateSubtask(subtaskId: number, payload: SubtaskUpdatePayload): Observable<Subtask> {
    return this.http.patch<Subtask>(`${API_BASE_URL}/subtasks/${subtaskId}/`, payload);
  }

  deleteSubtask(subtaskId: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/subtasks/${subtaskId}/`);
  }
}