import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { Subtask, Task, TaskStatus } from '../core/models';
import { TaskService } from '../core/task.service';

type TaskFilter = 'all' | TaskStatus;
type SubtaskForm = FormGroup<{
  description: FormControl<string>;
}>;

@Component({
  selector: 'app-dashboard-page',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, RouterLinkActive],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss'
})
export class DashboardPageComponent {
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly filter = signal<TaskFilter>('all');
  readonly tasks = signal<Task[]>([]);
  readonly errorMessage = signal('');

  newTaskDescription = '';
  newTaskStatus: TaskStatus = 'new';
  newTaskDueDate = '';
  newTaskDueTime = '';
  readonly subtaskForms = new Map<number, SubtaskForm>();

  readonly visibleTasks = computed(() => {
    const activeFilter = this.filter();
    const all = this.tasks();
    if (activeFilter === 'all') {
      return all;
    }

    return all.filter((task) => task.status === activeFilter);
  });

  readonly stats = computed(() => {
    const all = this.tasks();
    const completed = all.filter((task) => task.status === 'completed').length;
    const inProgress = all.filter((task) => task.status === 'in_progress').length;
    const open = all.filter((task) => task.status === 'new').length;

    return {
      total: all.length,
      completed,
      inProgress,
      open
    };
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly taskService: TaskService,
    readonly authService: AuthService,
    private readonly router: Router
  ) {
    this.fetchTasks();
  }

  fetchTasks(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.taskService.getTasks().subscribe({
      next: (tasks) => {
        this.loading.set(false);
        this.tasks.set(tasks);
        this.ensureSubtaskForms(tasks);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Failed to load tasks. Please refresh.');
      }
    });
  }

  setFilter(filter: TaskFilter): void {
    this.filter.set(filter);
  }

  createTask(): void {
    const description = this.newTaskDescription.trim();
    if (description.length < 3 || this.busy()) {
      this.errorMessage.set('Task description must be at least 3 characters.');
      return;
    }

    this.busy.set(true);
    this.errorMessage.set('');

    this.taskService
      .createTask({
        description,
        status: this.newTaskStatus,
        due_date: this.newTaskDueDate || null,
        due_time: this.newTaskDueTime || null
      })
      .subscribe({
      next: () => {
        this.busy.set(false);
        this.newTaskDescription = '';
        this.newTaskStatus = 'new';
        this.newTaskDueDate = '';
        this.newTaskDueTime = '';
        this.fetchTasks();
      },
      error: () => {
        this.busy.set(false);
        this.errorMessage.set('Could not create task.');
      }
    });
  }

  updateTaskStatus(task: Task, status: TaskStatus): void {
    if (task.status === status || this.busy()) {
      return;
    }

    this.busy.set(true);

    this.taskService.updateTask(task.id, { status }).subscribe({
      next: () => {
        this.busy.set(false);
        this.fetchTasks();
      },
      error: () => {
        this.busy.set(false);
        this.errorMessage.set('Could not update task status.');
      }
    });
  }

  removeTask(taskId: number): void {
    if (this.busy()) {
      return;
    }

    this.busy.set(true);

    this.taskService.deleteTask(taskId).subscribe({
      next: () => {
        this.busy.set(false);
        this.fetchTasks();
      },
      error: () => {
        this.busy.set(false);
        this.errorMessage.set('Could not delete task.');
      }
    });
  }

  createSubtask(task: Task): void {
    const form = this.getSubtaskForm(task.id);
    if (form.invalid || this.busy()) {
      form.markAllAsTouched();
      return;
    }

    this.busy.set(true);

    this.taskService
      .createSubtask({
        task_id: task.id,
        description: form.controls.description.value,
        status: 'new'
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          form.reset({ description: '' });
          this.fetchTasks();
        },
        error: () => {
          this.busy.set(false);
          this.errorMessage.set('Could not add subtask.');
        }
      });
  }

  updateSubtaskStatus(subtask: Subtask, status: TaskStatus): void {
    if (subtask.status === status || this.busy()) {
      return;
    }

    this.busy.set(true);

    this.taskService.updateSubtask(subtask.id, { status }).subscribe({
      next: () => {
        this.busy.set(false);
        this.fetchTasks();
      },
      error: () => {
        this.busy.set(false);
        this.errorMessage.set('Could not update subtask status.');
      }
    });
  }

  removeSubtask(subtaskId: number): void {
    if (this.busy()) {
      return;
    }

    this.busy.set(true);

    this.taskService.deleteSubtask(subtaskId).subscribe({
      next: () => {
        this.busy.set(false);
        this.fetchTasks();
      },
      error: () => {
        this.busy.set(false);
        this.errorMessage.set('Could not delete subtask.');
      }
    });
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      this.router.navigateByUrl('/auth');
    });
  }

  taskTrackBy(_: number, task: Task): number {
    return task.id;
  }

  subtaskTrackBy(_: number, subtask: Subtask): number {
    return subtask.id;
  }

  humanizeStatus(status: string): string {
    if (status === 'in_progress') {
      return 'In Progress';
    }

    if (status === 'completed') {
      return 'Completed';
    }

    return 'New';
  }

  formatDeadline(task: Task): string {
    if (!task.due_date && !task.due_time) {
      return 'No deadline';
    }

    const datePart = task.due_date
      ? new Date(task.due_date).toLocaleDateString(undefined, {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })
      : '';

    const timePart = task.due_time ? task.due_time.slice(0, 5) : '';

    if (datePart && timePart) {
      return `${datePart}, ${timePart}`;
    }

    return datePart || timePart;
  }

  private ensureSubtaskForms(tasks: Task[]): void {
    for (const task of tasks) {
      if (!this.subtaskForms.has(task.id)) {
        this.subtaskForms.set(task.id, this.buildSubtaskForm());
      }
    }
  }

  getSubtaskForm(taskId: number): SubtaskForm {
    const form = this.subtaskForms.get(taskId);
    if (form) {
      return form;
    }

    const created = this.buildSubtaskForm();
    this.subtaskForms.set(taskId, created);
    return created;
  }

  private buildSubtaskForm(): SubtaskForm {
    return this.fb.nonNullable.group({
      description: ['', [Validators.required, Validators.minLength(2)]]
    });
  }
}