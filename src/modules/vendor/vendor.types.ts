/*
|--------------------------------------------------------------------------
| Create Vendor Application
|--------------------------------------------------------------------------
*/

export interface CreateVendorApplication {
  eventId: string;

  businessName: string;

  category: string;

  contactName: string;

  email: string;

  phone: string;

  description: string;

  boothSize?: string;

  message?: string;

  // Future Vendor Account
  vendorId?: string | null;
}

/*
|--------------------------------------------------------------------------
| Vendor Application Summary
|--------------------------------------------------------------------------
*/

export interface VendorApplicationSummary {
  id: string;

  eventId: string;

  vendorId?: string | null;

  businessName: string;

  category: string;

  contactName: string;

  email: string;

  phone: string;

  description: string;

  boothSize?: string | null;

  message?: string | null;

  status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED";

  reviewedAt?: Date | null;

  approvedAt?: Date | null;

  rejectedAt?: Date | null;

  createdAt: Date;
}

/*
|--------------------------------------------------------------------------
| Vendor Application Events
|--------------------------------------------------------------------------
*/

export interface VendorApplicationCreatedEvent {
  eventId: string;

  application: VendorApplicationSummary;
}

export interface VendorApplicationUpdatedEvent {
  eventId: string;

  application: VendorApplicationSummary;
}