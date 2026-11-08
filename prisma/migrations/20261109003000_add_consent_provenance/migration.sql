ALTER TABLE "Enquiry"
ADD COLUMN "privacyConsentSource" TEXT,
ADD COLUMN "privacyConsentVersion" TEXT,
ADD COLUMN "privacyConsentWithdrawnAt" TIMESTAMP(3),
ADD COLUMN "whatsappConsentSource" TEXT,
ADD COLUMN "whatsappConsentVersion" TEXT,
ADD COLUMN "whatsappConsentWithdrawnAt" TIMESTAMP(3);
