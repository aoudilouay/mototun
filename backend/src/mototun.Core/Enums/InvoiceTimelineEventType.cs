namespace mototun.Core.Enums;

public enum InvoiceTimelineEventType
{
    InvoiceCreated = 0,
    InvoiceStatusUpdated = 1,
    CarteGriseStatusUpdated = 2,
    DossierSentToFournisseur = 3,
    DocumentUploadedByRevendeur = 4,
    DocumentUploadedByFournisseur = 5,
    DocumentIssueUpdated = 6,
    ClientMessageUpdated = 7,
    DossierEmailSent = 8,
    DocumentValidationChecklistUpdated = 9,
    DocumentValidationChecklistPublishedToClient = 10,
    StuckReminderSentToClient = 11,
    StuckReminderSentToRevendeur = 12,
    StuckReminderSentToFournisseur = 13,
    StuckEscalationTriggered = 14
}
