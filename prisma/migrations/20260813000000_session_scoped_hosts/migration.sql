-- Hosts are a capability of a session roster entry, not a community role.
ALTER TABLE "SessionPlayer" ADD COLUMN "isHost" BOOLEAN NOT NULL DEFAULT false;

-- The legacy CommunityPlayer.isHost flag was never used for authorization.
ALTER TABLE "CommunityPlayer" DROP COLUMN IF EXISTS "isHost";

-- Remove the old community-wide host role. Existing hosts become guests;
-- assignments must be recreated per session through the host endpoint.
CREATE TYPE "PlayerRoles_new" AS ENUM ('guest', 'player', 'admin', 'owner');
ALTER TABLE "CommunityPlayer" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "CommunityPlayer"
  ALTER COLUMN "role" TYPE "PlayerRoles_new"
  USING (CASE WHEN "role"::text = 'host' THEN 'guest' ELSE "role"::text END)::"PlayerRoles_new";
DROP TYPE "PlayerRoles";
ALTER TYPE "PlayerRoles_new" RENAME TO "PlayerRoles";
ALTER TABLE "CommunityPlayer" ALTER COLUMN "role" SET DEFAULT 'player'::"PlayerRoles";
