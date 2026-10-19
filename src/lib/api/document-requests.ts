import { apiRequest } from "./client";

export type DocumentRequestType = "admission_letter" | "attestation";

export type DocumentRequestInput = {
  request_type: DocumentRequestType;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  membership_number: string;
  programme: string;
  addressee: string;
  purpose: string;
};

export type DocumentRequestReceipt = {
  id: string;
  request_type: DocumentRequestType;
  status: "new" | "in_progress" | "completed" | "declined";
  created_at: string;
};

export const submitDocumentRequest = (data: DocumentRequestInput) =>
  apiRequest<DocumentRequestReceipt>("/document-requests/", { method: "POST", body: JSON.stringify(data) });
