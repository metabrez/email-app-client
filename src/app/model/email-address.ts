export interface EmailAddress {
  address: string;
  name?: string;
}

export interface RecipientModel {
  emailAddress: EmailAddress;
}

export interface BodyModel {
  contentType: 'Html' | 'Text';
  content: string;
}

export interface MessageModel {
  subject: string;
  body: BodyModel;
  toRecipients: RecipientModel[];
  ccRecipients?: RecipientModel[];
  bccRecipients?: RecipientModel[];
}

export interface MailRequest {
  message: MessageModel;
  preferredProtocol: 'MSGRAPH' | 'SMTP';
  requestPixelTracking: boolean;
  saveToSentItems: boolean;
  trackingID?: string;
}

export interface MailResponse {
  status: string;
  message: string;
  messageId: string | null;
}

export interface EmailTrackingEntity {
  trackingId: string;
  recipientEmail: string;
  batchId: string;
  sentTimestamp: string;
  openCount: number;
  firstOpenTimestamp: string | null;
  lastOpenTimestamp: string | null;
  clientUserAgent: string | null;
  clientBrowser: string | null;
  clientDevice: string | null;
  clientIpAddress: string | null;
  clientCity: string | null;
  clientCountry: string | null;
}
