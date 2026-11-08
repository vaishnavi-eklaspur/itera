CREATE TYPE "DataRightsRequestType" AS ENUM ('CORRECTION', 'DELETION');
CREATE TYPE "DataRightsRequestStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'COMPLETED', 'REJECTED');

CREATE TABLE "DataRightsRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "enquiryId" TEXT,
    "email" TEXT NOT NULL,
    "type" "DataRightsRequestType" NOT NULL,
    "details" TEXT,
    "status" "DataRightsRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolutionNote" TEXT,
    CONSTRAINT "DataRightsRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DataRightsRequest_status_requestedAt_idx" ON "DataRightsRequest"("status", "requestedAt");
CREATE INDEX "DataRightsRequest_email_idx" ON "DataRightsRequest"("email");
ALTER TABLE "DataRightsRequest" ADD CONSTRAINT "DataRightsRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DataRightsRequest" ADD CONSTRAINT "DataRightsRequest_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DataRightsRequest" ADD CONSTRAINT "DataRightsRequest_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
