import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TrackingService } from './service/tracking.service';
import { MailResponse, EmailTrackingEntity } from './model/email-address';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { TrackingDetailsComponent } from './details/tracking-details/tracking-details.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterOutlet,
    FormsModule,
    HttpClientModule,
    TrackingDetailsComponent,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  ngOnInit(): void {
    this.loadAllTrackingData();
  }
  public trackingService = inject(TrackingService); // Inject the service

  // Hardcoded email content structure
  private emailContent =
    '<html><body>This is a test email body. Open the pixel below to trigger tracking:<img src="cid:pixel" /></body></html>';

  // --- Send Email State ---
  public sendForm = {
    recipientEmail: 'test@example.com',
    subject: 'Test Email with Tracking',
    body: 'Email body is checking',
    protocol: 'SMTP' as 'MSGRAPH' | 'SMTP',
  };
  public isSending = signal(false);
  public sendResponse = signal<MailResponse | null>(null);

  // --- Check Status State ---
  public statusForm = {
    trackingId: '',
  };
  public isCheckingStatus = signal(false);
  public trackingData = signal<{
    status: 'IDLE' | 'SUCCESS' | 'NOT_FOUND' | 'ERROR';
    message: string;
    entity: EmailTrackingEntity | null;
  }>({
    status: 'IDLE',
    message: '',
    entity: null,
  });

  // --- Admin Dashboard State (NEW) ---
  public isLoadingAll = signal(false);
  public allTrackingRecords = signal<EmailTrackingEntity[]>([]);
  public allTrackingError = signal<string | null>(null);
  // --- API CALLS ---

  sendEmail() {
    this.isSending.set(true);
    this.sendResponse.set(null);

    this.trackingService
      .sendEmail(
        this.sendForm.recipientEmail,
        this.sendForm.subject,
        this.sendForm.body,
        this.sendForm.protocol
      )
      .subscribe({
        next: (response) => {
          this.sendResponse.set(response);
          if (response.messageId) {
            // Suggest the user copy the ID for status tracking (it will be batch ID, but still useful)
            this.statusForm.trackingId = response.messageId;
          }
        },
        error: (error) => {
          this.sendResponse.set({
            status: 'FAILED',
            message: error.error?.message || 'A network or API error occurred.',
            messageId: null,
          });
        },
      })
      .add(() => this.isSending.set(false));
  }

  checkStatus() {
    if (!this.statusForm.trackingId) return;

    this.isCheckingStatus.set(true);
    this.trackingData.set({ status: 'IDLE', message: '', entity: null });

    this.trackingService
      .getTrackingStatus(this.statusForm.trackingId)
      .subscribe({
        next: (entity) => {
          this.trackingData.set({
            status: 'SUCCESS',
            message: 'Record found.',
            entity: entity,
          });
        },
        error: (error) => {
          if (error.status === 404) {
            this.trackingData.set({
              status: 'NOT_FOUND',
              message: 'Tracking record not found.',
              entity: null,
            });
          } else {
            this.trackingData.set({
              status: 'ERROR',
              message:
                error.error?.message ||
                'Could not connect to API or server error.',
              entity: null,
            });
          }
        },
      })
      .add(() => this.isCheckingStatus.set(false));
  }

  /**
   * NEW: Loads all tracking records for the admin dashboard.
   */
  loadAllTrackingData() {
    this.isLoadingAll.set(true);
    this.allTrackingError.set(null);
    this.allTrackingRecords.set([]);

    this.trackingService
      .getAllTrackingStatus()
      .subscribe({
        next: (entities) => {
          this.allTrackingRecords.set(entities);
        },
        error: (error) => {
          // Error handling logic
          this.allTrackingError.set(
            error.error?.message || 'Failed to fetch all records from the API.'
          );
        },
        // IMPORTANT FIX: The .add() block runs regardless of success or error,
        // ensuring the loading flag is reset.
      })
      .add(() => {
        this.isLoadingAll.set(false);
      });
  }
}
