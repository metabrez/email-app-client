import { Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { TrackingDetailsComponent } from './details/tracking-details/tracking-details.component';
import { SendEmailComponent } from './send-email/send-email.component';

export const routes: Routes = [
  { path: '', component: AppComponent },
  { path: 'send', component: SendEmailComponent },
  { path: 'details', component: TrackingDetailsComponent },
];
