import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { Task } from '../core/models';
import { TaskService } from '../core/task.service';

@Component({
  selector: 'app-calendar-page',
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './calendar-page.component.html',
  styleUrl: './calendar-page.component.scss'
})
export class CalendarPageComponent {
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly tasks = signal<Task[]>([]);
  readonly selectedDate = signal(this.getTodayIsoDate());

  readonly tasksWithDeadline = computed(() =>
    this.tasks()
      .filter((task) => Boolean(task.due_date))
      .sort((left, right) => {
        const leftDate = `${left.due_date ?? ''} ${left.due_time ?? '99:99:99'}`;
        const rightDate = `${right.due_date ?? ''} ${right.due_time ?? '99:99:99'}`;
        return leftDate.localeCompare(rightDate);
      })
  );

  readonly tasksForSelectedDate = computed(() =>
    this.tasksWithDeadline().filter((task) => task.due_date === this.selectedDate())
  );

  readonly unscheduledTasks = computed(() =>
    this.tasks().filter((task) => !task.due_date && !task.due_time)
  );

  constructor(
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
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Could not load calendar data. Please refresh.');
      }
    });
  }

  setToday(): void {
    this.selectedDate.set(this.getTodayIsoDate());
  }

  onDateChange(value: string): void {
    this.selectedDate.set(value);
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      this.router.navigateByUrl('/auth');
    });
  }

  taskTrackBy(_: number, task: Task): number {
    return task.id;
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

  formatTime(time: string | null): string {
    if (!time) {
      return 'No time';
    }

    return time.slice(0, 5);
  }

  private getTodayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
