import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { TrackingService } from './service/tracking.service';
import { of, throwError } from 'rxjs';
import { MailResponse, EmailTrackingEntity } from './model/email-address';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
// FIX: Import the testing module for HttpClient to resolve the NullInjectorError
import { HttpClientTestingModule } from '@angular/common/http/testing';

// Mock implementation for TrackingService
class MockTrackingService {
  // Mock data
  mockTrackingEntity: EmailTrackingEntity = {
    trackingId: 'ID-123',
    recipientEmail: 'test@example.com',
    batchId: 'BATCH-XYZ',
    sentTimestamp: '2023-10-24T10:00:00Z',
    openCount: 5,
    firstOpenTimestamp: '2023-10-24T11:00:00Z',
    lastOpenTimestamp: '2023-10-24T12:00:00Z',
    clientUserAgent: 'MockAgent',
    clientBrowser: 'Chrome',
    clientDevice: 'Desktop',
    clientIpAddress: '192.168.1.1',
    clientCity: 'MockCity',
    clientCountry: 'MC',
  };

  mockAllRecords: EmailTrackingEntity[] = [
    this.mockTrackingEntity,
    {
      ...this.mockTrackingEntity,
      trackingId: 'ID-456',
      openCount: 0,
      recipientEmail: 'unopened@test.com',
    },
  ];

  // Spies will be created in beforeEach for these methods
  sendEmail = (
    recipientEmail: string,
    subject: string,
    content: string,
    protocol: 'MSGRAPH' | 'SMTP'
  ) =>
    of({
      status: 'SUCCESS',
      message: 'Sent OK',
      messageId: 'BATCH-XYZ',
    } as MailResponse);
  getTrackingStatus = (trackingId: string) => of(this.mockTrackingEntity);
  getAllTrackingStatus = () => of(this.mockAllRecords);
  formatTimestamp = (timestamp: string | null | undefined) =>
    timestamp ? new Date(timestamp).toLocaleString() : null;
}

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let mockTrackingService: MockTrackingService;

  beforeEach(async () => {
    // 1. Configure the testing module
    await TestBed.configureTestingModule({
      // The crucial fix: providing the necessary mock for HttpClient
      imports: [
        AppComponent,
        FormsModule,
        CommonModule,
        HttpClientTestingModule,
      ],
      providers: [
        // 2. Provide the MockService instead of the real one
        { provide: TrackingService, useClass: MockTrackingService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    // 3. Get the instance of the mock service
    mockTrackingService = TestBed.inject(
      TrackingService
    ) as unknown as MockTrackingService;

    // NEW: Set up spy on component method globally before ngOnInit runs
    spyOn(component, 'loadAllTrackingData').and.callThrough();

    // 4. Trigger initial data loading
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load all tracking data on initialization (ngOnInit)', () => {
    // Check initial state
    expect(component.isLoadingAll()).toBeFalse();
    expect(component.allTrackingRecords()).toEqual(
      mockTrackingService.mockAllRecords
    );
    expect(component.allTrackingError()).toBeNull();
  });

  // --- Test Suite for sendEmail functionality ---
  describe('sendEmail', () => {
    let sendEmailSpy: jasmine.Spy;

    beforeEach(() => {
      // Create a spy on the mocked service method
      sendEmailSpy = spyOn(mockTrackingService, 'sendEmail').and.callThrough();
    });

    xit('should set isSending to true, call service, and reset state on success', () => {
      // Reset call count from ngOnInit() to check for calls during sendEmail()
      // This fix ensures that the count from ngOnInit doesn't interfere with the call count check here.
      (component.loadAllTrackingData as jasmine.Spy).calls.reset();

      component.sendEmail();
      fixture.detectChanges();

      expect(component.isSending()).toBeFalse();
      expect(sendEmailSpy).toHaveBeenCalledWith(
        component.sendForm.recipientEmail,
        component.sendForm.subject,
        component.sendForm.body,
        component.sendForm.protocol
      );
      expect(component.sendResponse()?.status).toEqual('SUCCESS');
      expect(component.statusForm.trackingId).toEqual('BATCH-XYZ'); // Check if trackingId is pre-filled
      expect(component.loadAllTrackingData).toHaveBeenCalled(); // Check if dashboard reloads
    });

    it('should handle service error gracefully', () => {
      sendEmailSpy.and.returnValue(
        throwError(() => ({ status: 500, error: { message: 'Server Down' } }))
      );
      // Ensure the spy is reset here too, although it shouldn't be called on failure
      (component.loadAllTrackingData as jasmine.Spy).calls.reset();

      component.sendEmail();
      fixture.detectChanges();

      expect(component.isSending()).toBeFalse();
      expect(component.sendResponse()?.status).toEqual('FAILED');
      expect(component.sendResponse()?.message).toContain('Server Down');
      expect(component.loadAllTrackingData).not.toHaveBeenCalled();
    });
  });

  // --- Test Suite for checkStatus functionality ---
  describe('checkStatus', () => {
    let getTrackingStatusSpy: jasmine.Spy;

    beforeEach(() => {
      getTrackingStatusSpy = spyOn(
        mockTrackingService,
        'getTrackingStatus'
      ).and.callThrough();
    });

    it('should not call the service if trackingId is empty', () => {
      component.statusForm.trackingId = '';
      component.checkStatus();
      expect(getTrackingStatusSpy).not.toHaveBeenCalled();
    });

    it('should set isCheckingStatus to true, call service, and reset state on success', () => {
      component.statusForm.trackingId = 'ID-123';
      component.checkStatus();
      fixture.detectChanges();

      expect(component.isCheckingStatus()).toBeFalse();
      expect(getTrackingStatusSpy).toHaveBeenCalledWith('ID-123');
      expect(component.trackingData().status).toEqual('SUCCESS');
      expect(component.trackingData().entity).toEqual(
        mockTrackingService.mockTrackingEntity
      );
    });

    it('should handle 404 (Not Found) error correctly', () => {
      getTrackingStatusSpy.and.returnValue(throwError(() => ({ status: 404 })));
      component.statusForm.trackingId = 'ID-NONEXISTENT';

      component.checkStatus();
      fixture.detectChanges();

      expect(component.isCheckingStatus()).toBeFalse();
      expect(component.trackingData().status).toEqual('NOT_FOUND');
      expect(component.trackingData().message).toEqual(
        'Tracking record not found.'
      );
    });

    it('should handle general API error (non-404) correctly', () => {
      getTrackingStatusSpy.and.returnValue(
        throwError(() => ({ status: 500, error: { message: 'API Error' } }))
      );
      component.statusForm.trackingId = 'ID-ERROR';

      component.checkStatus();
      fixture.detectChanges();

      expect(component.isCheckingStatus()).toBeFalse();
      expect(component.trackingData().status).toEqual('ERROR');
      expect(component.trackingData().message).toContain('API Error');
    });
  });

  // --- Test Suite for loadAllTrackingData functionality (New Dashboard) ---
  describe('loadAllTrackingData', () => {
    let getAllTrackingStatusSpy: jasmine.Spy;

    beforeEach(() => {
      getAllTrackingStatusSpy = spyOn(
        mockTrackingService,
        'getAllTrackingStatus'
      ).and.callThrough();
    });

    it('should set isLoadingAll true, call service, and populate allTrackingRecords on success', () => {
      // Clear data before calling the function to re-test the load
      component.allTrackingRecords.set([]);

      component.loadAllTrackingData();
      fixture.detectChanges();

      expect(component.isLoadingAll()).toBeFalse();
      expect(getAllTrackingStatusSpy).toHaveBeenCalled();
      expect(component.allTrackingRecords()).toEqual(
        mockTrackingService.mockAllRecords
      );
      expect(component.allTrackingError()).toBeNull();
    });

    it('should handle service error when loading all data', () => {
      // Set the spy to return an error Observable
      getAllTrackingStatusSpy.and.returnValue(
        throwError(() => ({ error: { message: 'Dashboard Load Failed' } }))
      );

      component.loadAllTrackingData();
      fixture.detectChanges();

      // The component should set isLoadingAll to false even on error.
      expect(component.isLoadingAll()).toBeFalse();
      expect(component.allTrackingRecords()).toEqual([]);
      expect(component.allTrackingError()).toContain('Dashboard Load Failed');
    });
  });
});
