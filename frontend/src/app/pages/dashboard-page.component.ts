import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, computed, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { Subtask, Task, TaskImage, TaskStatus } from '../core/models';
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
export class DashboardPageComponent implements OnDestroy {
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly messiMode = signal(false);
  readonly uploadingTaskImageId = signal<number | null>(null);
  readonly previewImageSrc = signal<string | null>(null);
  readonly filter = signal<TaskFilter>('all');
  readonly tasks = signal<Task[]>([]);
  readonly errorMessage = signal('');

  newTaskDescription = '';
  newTaskStatus: TaskStatus = 'new';
  newTaskStartDate = '';
  newTaskStartTime = '';
  newTaskDueDate = '';
  newTaskDueTime = '';
  readonly selectedTaskImageFiles = new Map<number, File>();
  readonly subtaskForms = new Map<number, SubtaskForm>();
  private bodyOverflow = '';
  private bodyPaddingRight = '';
  private bodyLockApplied = false;

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
        this.syncSelectedTaskImageFiles(tasks);
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

    if (this.newTaskStartTime && !this.newTaskStartDate) {
      this.errorMessage.set('Choose start date when start time is set.');
      return;
    }

    if (this.newTaskDueTime && !this.newTaskDueDate) {
      this.errorMessage.set('Choose deadline date when deadline time is set.');
      return;
    }

    if (this.newTaskStartDate && this.newTaskDueDate) {
      const startStamp = `${this.newTaskStartDate} ${this.newTaskStartTime || '00:00:00'}`;
      const dueStamp = `${this.newTaskDueDate} ${this.newTaskDueTime || '23:59:59'}`;

      if (startStamp > dueStamp) {
        this.errorMessage.set('Start must be earlier than deadline.');
        return;
      }
    }

    this.busy.set(true);
    this.errorMessage.set('');

    this.taskService
      .createTask({
        description,
        status: this.newTaskStatus,
        start_date: this.newTaskStartDate || null,
        start_time: this.newTaskStartTime || null,
        due_date: this.newTaskDueDate || null,
        due_time: this.newTaskDueTime || null
      })
      .subscribe({
      next: () => {
        this.busy.set(false);
        this.newTaskDescription = '';
        this.newTaskStatus = 'new';
        this.newTaskStartDate = '';
        this.newTaskStartTime = '';
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
        this.selectedTaskImageFiles.delete(taskId);
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

  toggleMessiMode(): void {
    this.messiMode.update((enabled) => !enabled);
  }

  onTaskImageSelected(taskId: number, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;

    if (!file) {
      this.selectedTaskImageFiles.delete(taskId);
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('Please choose an image file.');
      this.selectedTaskImageFiles.delete(taskId);
      if (input) {
        input.value = '';
      }
      return;
    }

    this.errorMessage.set('');
    this.selectedTaskImageFiles.set(taskId, file);
  }

  uploadTaskImage(task: Task): void {
    if (this.busy() || this.uploadingTaskImageId() !== null) {
      return;
    }

    const file = this.selectedTaskImageFiles.get(task.id);
    if (!file) {
      this.errorMessage.set('Choose an image before uploading.');
      return;
    }

    this.uploadingTaskImageId.set(task.id);
    this.errorMessage.set('');

    this.taskService.uploadTaskImage(task.id, file).subscribe({
      next: () => {
        this.uploadingTaskImageId.set(null);
        this.selectedTaskImageFiles.delete(task.id);
        this.fetchTasks();
      },
      error: () => {
        this.uploadingTaskImageId.set(null);
        this.errorMessage.set('Could not upload task image. Verify task image endpoint on backend.');
      }
    });
  }

  isUploadingImage(taskId: number): boolean {
    return this.uploadingTaskImageId() === taskId;
  }

  selectedImageName(taskId: number): string {
    return this.selectedTaskImageFiles.get(taskId)?.name ?? 'No image selected';
  }

  imageDataUri(image: TaskImage): string {
    const base64 = image.image_base64;
    if (!base64) {
      return '';
    }

    if (base64.startsWith('data:image/')) {
      return base64;
    }

    return `data:image/jpeg;base64,${base64}`;
  }

  openTaskImagePreview(image: TaskImage): void {
    const src = this.imageDataUri(image);
    if (!src) {
      return;
    }

    this.previewImageSrc.set(src);
    this.lockBodyScroll();
  }

  closeImagePreview(): void {
    this.previewImageSrc.set(null);
    this.unlockBodyScroll();
  }

  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    if (this.previewImageSrc()) {
      this.closeImagePreview();
    }
  }

  ngOnDestroy(): void {
    this.unlockBodyScroll();
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
    if (!task.start_date && !task.start_time && !task.due_date && !task.due_time) {
      return 'No schedule';
    }

    const formatDate = (value: string | null): string =>
      value
        ? new Date(value).toLocaleDateString(undefined, {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })
        : '';

    const formatTime = (value: string | null): string => (value ? value.slice(0, 5) : '');

    const startDate = formatDate(task.start_date);
    const startTime = formatTime(task.start_time);
    const dueDate = formatDate(task.due_date);
    const dueTime = formatTime(task.due_time);

    const startLabel = `${startDate}${startDate && startTime ? ', ' : ''}${startTime}`.trim();
    const dueLabel = `${dueDate}${dueDate && dueTime ? ', ' : ''}${dueTime}`.trim();

    if (startLabel && dueLabel) {
      return `${startLabel} -> ${dueLabel}`;
    }

    if (startLabel) {
      return `Start: ${startLabel}`;
    }

    return `Deadline: ${dueLabel}`;
  }

  private ensureSubtaskForms(tasks: Task[]): void {
    for (const task of tasks) {
      if (!this.subtaskForms.has(task.id)) {
        this.subtaskForms.set(task.id, this.buildSubtaskForm());
      }
    }
  }

  private lockBodyScroll(): void {
    if (this.bodyLockApplied) {
      return;
    }

    this.bodyOverflow = document.body.style.overflow;
    this.bodyPaddingRight = document.body.style.paddingRight;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    document.body.style.overflow = 'hidden';
    this.bodyLockApplied = true;
  }

  private unlockBodyScroll(): void {
    if (!this.bodyLockApplied) {
      return;
    }

    document.body.style.overflow = this.bodyOverflow;
    document.body.style.paddingRight = this.bodyPaddingRight;
    this.bodyLockApplied = false;
  }

  private syncSelectedTaskImageFiles(tasks: Task[]): void {
    const allowedIds = new Set(tasks.map((task) => task.id));
    for (const taskId of this.selectedTaskImageFiles.keys()) {
      if (!allowedIds.has(taskId)) {
        this.selectedTaskImageFiles.delete(taskId);
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