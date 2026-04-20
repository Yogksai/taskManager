import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { Task } from '../core/models';
import { TaskService } from '../core/task.service';

interface WeekDay {
  iso: string;
  dayName: string;
  dayNumber: string;
  date: Date;
}

interface CalendarEvent {
  id: number;
  title: string;
  status: string;
  dayIso: string;
  top: number;
  height: number;
  startLabel: string;
  endLabel: string;
}

const CALENDAR_START_HOUR = 7;
const CALENDAR_END_HOUR = 22;
const HOUR_HEIGHT = 54;

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
  readonly weekAnchor = signal(this.startOfWeek(new Date()));

  readonly timeLabels = computed(() => {
    const labels: string[] = [];
    for (let hour = CALENDAR_START_HOUR; hour <= CALENDAR_END_HOUR; hour += 1) {
      labels.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return labels;
  });

  readonly weekDays = computed(() => {
    const first = this.weekAnchor();
    const days: WeekDay[] = [];

    for (let offset = 0; offset < 7; offset += 1) {
      const date = new Date(first);
      date.setDate(first.getDate() + offset);

      days.push({
        iso: this.toIsoDate(date),
        dayName: date.toLocaleDateString(undefined, { weekday: 'short' }),
        dayNumber: date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }),
        date
      });
    }

    return days;
  });

  readonly weekLabel = computed(() => {
    const days = this.weekDays();
    const first = days[0]?.date;
    const last = days[6]?.date;

    if (!first || !last) {
      return '';
    }

    const firstLabel = first.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
    const lastLabel = last.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
    return `${firstLabel} - ${lastLabel}`;
  });

  readonly timedEvents = computed(() => {
    const weekSet = new Set(this.weekDays().map((day) => day.iso));
    const events: CalendarEvent[] = [];

    for (const task of this.tasks()) {
      if (!task.start_date || !task.start_time || !task.due_date || !task.due_time) {
        continue;
      }

      if (task.start_date !== task.due_date) {
        continue;
      }

      if (!weekSet.has(task.start_date)) {
        continue;
      }

      const startMinutes = this.timeToMinutes(task.start_time);
      const endMinutes = this.timeToMinutes(task.due_time);

      if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
        continue;
      }

      const dayStart = CALENDAR_START_HOUR * 60;
      const dayEnd = CALENDAR_END_HOUR * 60;

      const clippedStart = Math.max(startMinutes, dayStart);
      const clippedEnd = Math.min(endMinutes, dayEnd);

      if (clippedEnd <= clippedStart) {
        continue;
      }

      events.push({
        id: task.id,
        title: task.description,
        status: task.status,
        dayIso: task.start_date,
        top: ((clippedStart - dayStart) / 60) * HOUR_HEIGHT,
        height: Math.max(((clippedEnd - clippedStart) / 60) * HOUR_HEIGHT, 26),
        startLabel: task.start_time.slice(0, 5),
        endLabel: task.due_time.slice(0, 5)
      });
    }

    return events;
  });

  readonly eventsByDay = computed(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    for (const day of this.weekDays()) {
      grouped[day.iso] = [];
    }

    for (const event of this.timedEvents()) {
      if (!grouped[event.dayIso]) {
        grouped[event.dayIso] = [];
      }

      grouped[event.dayIso].push(event);
    }

    for (const dayIso of Object.keys(grouped)) {
      grouped[dayIso].sort((left, right) => left.top - right.top);
    }

    return grouped;
  });

  readonly nearbyTasks = computed(() => {
    const renderedIds = new Set(this.timedEvents().map((event) => event.id));

    return this.tasks()
      .filter((task) => {
        if (renderedIds.has(task.id)) {
          return false;
        }

        if (!task.start_date && !task.due_date) {
          return true;
        }

        return this.isInCurrentWeek(task.start_date) || this.isInCurrentWeek(task.due_date);
      })
      .sort((left, right) => this.taskSortKey(left).localeCompare(this.taskSortKey(right)));
  });

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

  moveWeek(offset: number): void {
    const anchor = new Date(this.weekAnchor());
    anchor.setDate(anchor.getDate() + offset * 7);
    this.weekAnchor.set(this.startOfWeek(anchor));
  }

  setToday(): void {
    this.weekAnchor.set(this.startOfWeek(new Date()));
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      this.router.navigateByUrl('/auth');
    });
  }

  taskTrackBy(_: number, task: Task): number {
    return task.id;
  }

  eventTrackBy(_: number, event: CalendarEvent): number {
    return event.id;
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

  eventsForDay(dayIso: string): CalendarEvent[] {
    return this.eventsByDay()[dayIso] ?? [];
  }

  taskScheduleLabel(task: Task): string {
    const startDate = task.start_date ?? 'No start date';
    const startTime = this.formatTime(task.start_time);
    const dueDate = task.due_date ?? 'No deadline date';
    const dueTime = this.formatTime(task.due_time);
    return `${startDate} ${startTime} -> ${dueDate} ${dueTime}`;
  }

  eventStatusClass(status: string): string {
    if (status === 'completed') {
      return 'status-completed';
    }

    if (status === 'in_progress') {
      return 'status-progress';
    }

    return 'status-new';
  }

  private taskSortKey(task: Task): string {
    return `${task.start_date ?? '9999-12-31'} ${task.start_time ?? '99:99:99'} ${task.id}`;
  }

  private isInCurrentWeek(dateIso: string | null): boolean {
    if (!dateIso) {
      return false;
    }

    return this.weekDays().some((day) => day.iso === dateIso);
  }

  private timeToMinutes(value: string): number | null {
    const [hourPart, minutePart] = value.split(':');
    const hours = Number.parseInt(hourPart, 10);
    const minutes = Number.parseInt(minutePart, 10);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return null;
    }

    return hours * 60 + minutes;
  }

  private startOfWeek(date: Date): Date {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);

    const day = copy.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    copy.setDate(copy.getDate() + mondayOffset);
    return copy;
  }

  private toIsoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
