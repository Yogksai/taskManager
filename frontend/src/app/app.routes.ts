import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';
import { AuthPageComponent } from './pages/auth-page.component';
import { CalendarPageComponent } from './pages/calendar-page.component';
import { DashboardPageComponent } from './pages/dashboard-page.component';

export const routes: Routes = [
	{
		path: 'auth',
		canActivate: [guestGuard],
		component: AuthPageComponent
	},
	{
		path: 'dashboard',
		canActivate: [authGuard],
		component: DashboardPageComponent
	},
	{
		path: 'calendar',
		canActivate: [authGuard],
		component: CalendarPageComponent
	},
	{
		path: '',
		pathMatch: 'full',
		redirectTo: 'dashboard'
	},
	{
		path: '**',
		redirectTo: 'dashboard'
	}
];
