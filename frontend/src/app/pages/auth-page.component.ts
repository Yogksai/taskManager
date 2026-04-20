import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-auth-page',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.scss'
})
export class AuthPageComponent {
  mode = signal<'login' | 'register'>('login');
  loading = signal(false);
  infoMessage = signal('');
  errorMessage = signal('');

  readonly loginForm;
  readonly registerForm;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    this.loginForm = this.fb.nonNullable.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(4)]]
    });

    this.registerForm = this.fb.nonNullable.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  setMode(mode: 'login' | 'register'): void {
    this.mode.set(mode);
    this.errorMessage.set('');
    this.infoMessage.set('');
  }

  onLogin(): void {
    if (this.loginForm.invalid || this.loading()) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.infoMessage.set('');

    this.authService.login(this.loginForm.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/dashboard');
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(this.getAuthErrorMessage(error, 'login'));
      }
    });
  }

  onRegister(): void {
    if (this.registerForm.invalid || this.loading()) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.infoMessage.set('');

    const payload = this.registerForm.getRawValue();

    this.authService.register(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.setMode('login');
        this.infoMessage.set('Account created. Log in with your new credentials.');
        this.loginForm.patchValue({ username: payload.username, password: '' });
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(this.getAuthErrorMessage(error, 'register'));
      }
    });
  }

  isInvalid(controlName: string, form: 'login' | 'register'): boolean {
    const activeForm = form === 'login' ? this.loginForm : this.registerForm;
    const control = activeForm.controls[controlName as keyof typeof activeForm.controls];
    return Boolean(control && control.invalid && (control.touched || control.dirty));
  }

  private getAuthErrorMessage(error: HttpErrorResponse, mode: 'login' | 'register'): string {
    if (error.status === 0) {
      return 'Cannot reach backend. Start API server on http://localhost:8000 and try again.';
    }

    const apiMessage = this.parseApiError(error.error);
    if (apiMessage) {
      return apiMessage;
    }

    if (mode === 'login') {
      return 'Login failed. Check username/password and try again.';
    }

    return 'Could not create account. Username or email may already be used.';
  }

  private parseApiError(payload: unknown): string | null {
    if (!payload) {
      return null;
    }

    if (typeof payload === 'string') {
      return payload;
    }

    if (typeof payload !== 'object') {
      return null;
    }

    const response = payload as Record<string, unknown>;
    const preferredOrder = ['username', 'email', 'password', 'detail', 'non_field_errors'];
    const messages: string[] = [];
    const consumed = new Set<string>();

    const appendMessage = (field: string, value: unknown): void => {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string') {
            messages.push(this.formatFieldMessage(field, item));
          }
        }
        return;
      }

      if (typeof value === 'string') {
        messages.push(this.formatFieldMessage(field, value));
      }
    };

    for (const field of preferredOrder) {
      if (field in response) {
        appendMessage(field, response[field]);
        consumed.add(field);
      }
    }

    for (const [field, value] of Object.entries(response)) {
      if (!consumed.has(field)) {
        appendMessage(field, value);
      }
    }

    return messages.length > 0 ? messages.join(' ') : null;
  }

  private formatFieldMessage(field: string, message: string): string {
    if (field === 'detail' || field === 'non_field_errors') {
      return message;
    }

    return `${field}: ${message}`;
  }
}