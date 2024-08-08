-- CreateTable
CREATE TABLE "Screener" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "isConditional" BOOLEAN NOT NULL,
    "isLeverage" BOOLEAN NOT NULL
);
