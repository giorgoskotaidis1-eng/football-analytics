-- Add Auth0 identity linking fields and support SSO-only users without a local password
ALTER TABLE "User"
ADD COLUMN "auth0Id" TEXT,
ALTER COLUMN "passwordHash" DROP NOT NULL;

ALTER TABLE "Player"
ADD COLUMN "auth0Id" TEXT;

CREATE UNIQUE INDEX "User_auth0Id_key" ON "User"("auth0Id");
CREATE UNIQUE INDEX "Player_auth0Id_key" ON "Player"("auth0Id");
