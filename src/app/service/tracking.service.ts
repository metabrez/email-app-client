import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  EmailTrackingEntity,
  MailRequest,
  MailResponse,
} from '../model/email-address';

@Injectable({
  providedIn: 'root',
})
export class TrackingService {
  constructor() {}

  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/mail'; // Base URL for the Java controller

  /**
   * Constructs the mail request payload and sends the email via the backend API.
   * @param recipientEmail The recipient's email address.
   * @param subject The email subject.
   * @param content The email body HTML content. <--- Now this will be the user's input
   * @param protocol The preferred sending protocol.
   * @returns Observable of the MailResponse.
   */
  sendEmail(
    recipientEmail: string,
    subject: string,
    content: string, // REMOVED 'body: string,' and kept 'content: string'
    protocol: 'MSGRAPH' | 'SMTP'
  ): Observable<MailResponse> {
    // We need to inject the tracking pixel into the content sent by the user
    // The content from the component needs to be wrapped or appended with the tracking pixel
    const trackingPixelHtml = '<img src="cid:pixel" />';
    const finalContent = `<html><body>${content}${trackingPixelHtml}</body></html>`;

    const emailRequest: MailRequest = {
      message: {
        subject: subject,
        body: { contentType: 'Html', content: finalContent }, // Use finalContent
        toRecipients: [{ emailAddress: { address: recipientEmail, name: '' } }],
      },
      preferredProtocol: protocol,
      requestPixelTracking: true,
      saveToSentItems: true,
    };

    return this.http.post<MailResponse>(`${this.apiUrl}/send`, emailRequest);
  }

  /**
   * Fetches the tracking status for a specific individual tracking ID.
   * @param trackingId The unique tracking ID.
   * @returns Observable of the EmailTrackingEntity.
   */
  getTrackingStatus(trackingId: string): Observable<EmailTrackingEntity> {
    return this.http.get<EmailTrackingEntity>(
      `${this.apiUrl}/track/status/${trackingId}`
    );
  }

  /**
   * NEW: Fetches all email tracking records from the backend.
   * Assumes the backend returns an array of EmailTrackingEntity.
   * @returns Observable of an array of EmailTrackingEntity.
   */
  getAllTrackingStatus(): Observable<EmailTrackingEntity[]> {
    return this.http.get<EmailTrackingEntity[]>(
      `${this.apiUrl}/track/all` // Assuming a standard 'track/all' endpoint
    );
  }

  /**
   * Utility to format ISO timestamps. Moved to service/component for accessibility.
   */
  public formatTimestamp(timestamp: string | null | undefined): string | null {
    if (!timestamp) return null;
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  }
}
