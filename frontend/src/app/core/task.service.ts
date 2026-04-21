import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';

import { API_BASE_URL } from './api.constants';
import {
  Subtask,
  SubtaskCreatePayload,
  SubtaskUpdatePayload,
  Task,
  TaskImage,
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

  uploadTaskImage(taskId: number, file: File): Observable<Task | TaskImage> {
    const endpoints = [
      `${API_BASE_URL}/tasks/${taskId}/images/`,
      `${API_BASE_URL}/tasks/${taskId}/image/`
    ];

    return this.tryUploadTaskImage(file, endpoints);
  }

  private tryUploadTaskImage(file: File, endpoints: string[]): Observable<Task | TaskImage> {
    const [endpoint, ...fallbacks] = endpoints;

    if (!endpoint) {
      return throwError(() => new Error('Task image upload endpoint is not configured.'));
    }

    return this.http.post<Task | TaskImage>(endpoint, this.buildTaskImageFormData(file)).pipe(
      catchError((error) => {
        if (fallbacks.length === 0) {
          return throwError(() => error);
        }

        return this.tryUploadTaskImage(file, fallbacks);
      })
    );
  }

  private buildTaskImageFormData(file: File): FormData {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('file', file);
    return formData;
  }
}