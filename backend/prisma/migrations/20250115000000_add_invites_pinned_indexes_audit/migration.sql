-- CreateTable
CREATE TABLE "invites" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trip_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" DATETIME,
    CONSTRAINT "invites_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "invites_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "invites_token_hash_key" ON "invites"("token_hash");

-- CreateIndex
CREATE INDEX "invites_trip_id_token_hash_idx" ON "invites"("trip_id", "token_hash");

-- AlterTable: ItineraryItem add created_at
ALTER TABLE "ItineraryItem" ADD COLUMN "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: Announcement add pinned (SQLite stores boolean as 0/1)
ALTER TABLE "Announcement" ADD COLUMN "pinned" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex: trip_members (trip_id, role)
CREATE INDEX "trip_members_trip_id_role_idx" ON "trip_members"("trip_id", "role");

-- CreateIndex: Comment (trip_id, entity_type, entity_id)
CREATE INDEX "Comment_trip_id_entity_type_entity_id_idx" ON "Comment"("trip_id", "entity_type", "entity_id");

-- CreateIndex: Notification (user_id, read_at)
CREATE INDEX "Notification_user_id_read_at_idx" ON "Notification"("user_id", "read_at");

-- CreateTable: audit_logs
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trip_id" TEXT,
    "actor_user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "metadata" TEXT DEFAULT '{}',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
