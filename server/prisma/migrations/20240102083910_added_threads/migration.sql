/*
  Warnings:

  - You are about to drop the `workspace_chats` table. If the table is not empty, all the data it contains will be lost.

*/

-- CreateTable
CREATE TABLE "thread_chats" (
                              "id" SERIAL NOT NULL,
                              "workspace_id" INTEGER NOT NULL,
                              "thread_id" INTEGER NOT NULL,
                              "prompt" TEXT NOT NULL,
                              "response" TEXT NOT NULL,
                              "include" BOOLEAN NOT NULL DEFAULT true,
                              "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                              "last_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

                              CONSTRAINT "thread_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "threads" (
                         "id" SERIAL NOT NULL,
                         "name" TEXT NOT NULL,
                         "workspace_id" INTEGER NOT NULL,
                         "user_id" INTEGER,

                         CONSTRAINT "threads_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "thread_chats" ADD CONSTRAINT "thread_chats_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threads" ADD CONSTRAINT "threads_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threads" ADD CONSTRAINT "threads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Moved data from workspace_chats to thread_chats
INSERT INTO "threads" ("workspace_id", "user_id", "name") SELECT DISTINCT "workspaceId", "user_id", 'Default' from "workspace_chats";

INSERT INTO "thread_chats" ("id", "workspace_id", "thread_id", "prompt", "response", "include", "created_at", "last_updated_at")
SELECT wc."id", wc."workspaceId", t."id", wc."prompt", wc."response", wc."include", wc."createdAt", wc."lastUpdatedAt"
FROM "workspace_chats" wc
       JOIN "threads" t ON wc."workspaceId" = t."workspace_id" AND
                           (wc."user_id" = t."user_id" OR (wc."user_id" IS NULL AND t."user_id" IS NULL));

-- DropForeignKey
ALTER TABLE "workspace_chats" DROP CONSTRAINT "workspace_chats_user_id_fkey";

-- DropTable
DROP TABLE "workspace_chats";
