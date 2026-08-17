-- CreateEnum
CREATE TYPE "MarketingConsentStatus" AS ENUM ('OPTED_IN', 'OPTED_OUT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CampaignObjective" AS ENUM ('AWARENESS', 'ENGAGEMENT', 'SALES', 'RETENTION', 'REACTIVATION', 'INFORMATIONAL');

-- CreateEnum
CREATE TYPE "MarketingChannel" AS ENUM ('WHATSAPP');

-- CreateEnum
CREATE TYPE "MessageLanguage" AS ENUM ('ENGLISH', 'URDU', 'ROMAN_URDU');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('NEW_ARRIVAL', 'VIP', 'INACTIVE_CUSTOMER', 'BIRTHDAY', 'ANNIVERSARY', 'FESTIVAL', 'SPECIAL_OFFER', 'NEW_COLLECTION', 'GOLD_RATE_UPDATE', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'OPTED_OUT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FollowUpPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AutomationTrigger" AS ENUM ('CUSTOMER_INACTIVE', 'BIRTHDAY_UPCOMING', 'ANNIVERSARY_UPCOMING');

-- CreateEnum
CREATE TYPE "AutomationAction" AS ENUM ('CREATE_FOLLOW_UP_TASK', 'CREATE_CAMPAIGN_DRAFT');

-- CreateEnum
CREATE TYPE "AutomationStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'DISABLED');

-- CreateEnum
CREATE TYPE "ContentPlatform" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('NEW_ARRIVAL', 'PRODUCT_SPOTLIGHT', 'EDUCATIONAL', 'GOLD_KNOWLEDGE', 'JEWELRY_CARE', 'FESTIVAL', 'BEHIND_THE_SCENES', 'CUSTOMER_APPRECIATION');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'APPROVED', 'PUBLISHED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'AI_RECOMMENDATION_GENERATED';
ALTER TYPE "AuditAction" ADD VALUE 'AI_CONTENT_GENERATED';
ALTER TYPE "AuditAction" ADD VALUE 'CAMPAIGN_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'CAMPAIGN_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'CAMPAIGN_LAUNCHED';
ALTER TYPE "AuditAction" ADD VALUE 'CAMPAIGN_PAUSED';
ALTER TYPE "AuditAction" ADD VALUE 'CAMPAIGN_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE 'MESSAGE_QUEUED';
ALTER TYPE "AuditAction" ADD VALUE 'MESSAGE_SENT';
ALTER TYPE "AuditAction" ADD VALUE 'CUSTOMER_OPTED_IN';
ALTER TYPE "AuditAction" ADD VALUE 'CUSTOMER_OPTED_OUT';
ALTER TYPE "AuditAction" ADD VALUE 'AUTOMATION_ENABLED';
ALTER TYPE "AuditAction" ADD VALUE 'AUTOMATION_DISABLED';
ALTER TYPE "AuditAction" ADD VALUE 'AI_ASSISTANT_QUERY';
ALTER TYPE "AuditAction" ADD VALUE 'FOLLOW_UP_TASK_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'FOLLOW_UP_TASK_COMPLETED';

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "consentDate" TIMESTAMP(3),
ADD COLUMN     "consentSource" TEXT,
ADD COLUMN     "marketingConsent" "MarketingConsentStatus" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "optOutDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "objective" "CampaignObjective" NOT NULL,
    "campaignType" "CampaignType" NOT NULL,
    "audienceFilters" JSONB,
    "channel" "MarketingChannel" NOT NULL DEFAULT 'WHATSAPP',
    "language" "MessageLanguage" NOT NULL DEFAULT 'ENGLISH',
    "productId" UUID,
    "offer" TEXT,
    "messageTemplate" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "launchedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "channel" "MarketingChannel" NOT NULL,
    "message" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'QUEUED',
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),

    CONSTRAINT "campaign_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_audience_exclusions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "reason" TEXT,
    "excludedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_audience_exclusions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_up_tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customerId" UUID NOT NULL,
    "assignedToId" UUID,
    "reason" TEXT NOT NULL,
    "priority" "FollowUpPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" DATE,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_up_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "trigger" "AutomationTrigger" NOT NULL,
    "conditions" JSONB NOT NULL,
    "action" "AutomationAction" NOT NULL,
    "actionConfig" JSONB,
    "status" "AutomationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" UUID NOT NULL,
    "approvedById" UUID,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_drafts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inventoryItemId" UUID,
    "platform" "ContentPlatform" NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "callToAction" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" UUID NOT NULL,
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "estimatedCost" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "userId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE INDEX "campaigns_campaignType_idx" ON "campaigns"("campaignType");

-- CreateIndex
CREATE INDEX "campaigns_createdAt_idx" ON "campaigns"("createdAt");

-- CreateIndex
CREATE INDEX "campaign_messages_campaignId_status_idx" ON "campaign_messages"("campaignId", "status");

-- CreateIndex
CREATE INDEX "campaign_messages_customerId_createdAt_idx" ON "campaign_messages"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "campaign_messages_status_idx" ON "campaign_messages"("status");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_audience_exclusions_campaignId_customerId_key" ON "campaign_audience_exclusions"("campaignId", "customerId");

-- CreateIndex
CREATE INDEX "follow_up_tasks_status_idx" ON "follow_up_tasks"("status");

-- CreateIndex
CREATE INDEX "follow_up_tasks_customerId_idx" ON "follow_up_tasks"("customerId");

-- CreateIndex
CREATE INDEX "follow_up_tasks_dueDate_idx" ON "follow_up_tasks"("dueDate");

-- CreateIndex
CREATE INDEX "automation_rules_status_idx" ON "automation_rules"("status");

-- CreateIndex
CREATE INDEX "content_drafts_status_idx" ON "content_drafts"("status");

-- CreateIndex
CREATE INDEX "content_drafts_platform_idx" ON "content_drafts"("platform");

-- CreateIndex
CREATE INDEX "ai_usage_logs_createdAt_idx" ON "ai_usage_logs"("createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_logs_userId_idx" ON "ai_usage_logs"("userId");

-- CreateIndex
CREATE INDEX "customers_marketingConsent_idx" ON "customers"("marketingConsent");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_productId_fkey" FOREIGN KEY ("productId") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_messages" ADD CONSTRAINT "campaign_messages_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_messages" ADD CONSTRAINT "campaign_messages_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_audience_exclusions" ADD CONSTRAINT "campaign_audience_exclusions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_audience_exclusions" ADD CONSTRAINT "campaign_audience_exclusions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_audience_exclusions" ADD CONSTRAINT "campaign_audience_exclusions_excludedById_fkey" FOREIGN KEY ("excludedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_tasks" ADD CONSTRAINT "follow_up_tasks_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_tasks" ADD CONSTRAINT "follow_up_tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_tasks" ADD CONSTRAINT "follow_up_tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_drafts" ADD CONSTRAINT "content_drafts_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_drafts" ADD CONSTRAINT "content_drafts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_drafts" ADD CONSTRAINT "content_drafts_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

