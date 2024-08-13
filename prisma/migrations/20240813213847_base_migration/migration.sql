/*
  Warnings:

  - You are about to drop the `Note` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NoteImage` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `businessId` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `browser` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `os` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `version` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Note_ownerId_updatedAt_idx";

-- DropIndex
DROP INDEX "Note_ownerId_idx";

-- DropIndex
DROP INDEX "NoteImage_noteId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Note";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "NoteImage";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" INTEGER NOT NULL,
    "colorCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isEssential" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Category_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" INTEGER NOT NULL,
    "rut" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "fantasyName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "businessId" TEXT,
    "isEssential" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Supplier_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sellingPrice" INTEGER NOT NULL,
    "cost" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "categoryId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Product_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductAnalytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "totalProfit" INTEGER NOT NULL DEFAULT 0,
    "totalSales" INTEGER NOT NULL DEFAULT 0,
    "totalReturns" INTEGER NOT NULL DEFAULT 0,
    "businessId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductAnalytics_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProductAnalytics_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceModification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "oldPrice" INTEGER NOT NULL,
    "newPrice" INTEGER NOT NULL,
    "productAnalyticsId" TEXT NOT NULL,
    "bulkPriceModificationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceModification_productAnalyticsId_fkey" FOREIGN KEY ("productAnalyticsId") REFERENCES "ProductAnalytics" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PriceModification_bulkPriceModificationId_fkey" FOREIGN KEY ("bulkPriceModificationId") REFERENCES "BulkPriceModification" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BulkPriceModification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" DATETIME,
    "revertedAt" DATETIME,
    "strategy" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "adjustmentValue" INTEGER NOT NULL,
    "affectedProductsCount" INTEGER NOT NULL,
    "executedBy" TEXT NOT NULL,
    "revertedBy" TEXT,
    "reason" TEXT,
    "previousPriceSnapshot" TEXT,
    "businessId" TEXT NOT NULL,
    CONSTRAINT "BulkPriceModification_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "profit" INTEGER NOT NULL DEFAULT 0,
    "totalDiscount" INTEGER NOT NULL,
    "directDiscount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sellerId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Order_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quantity" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "totalPrice" INTEGER NOT NULL,
    "totalDiscount" INTEGER NOT NULL,
    "profit" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "productId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    CONSTRAINT "ProductOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Discount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "applicationMethod" TEXT NOT NULL,
    "minimumQuantity" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "validFrom" DATETIME NOT NULL,
    "validUntil" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "businessId" TEXT NOT NULL,
    CONSTRAINT "Discount_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "thanksMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BusinessLogoImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "altText" TEXT,
    "contentType" TEXT NOT NULL,
    "blob" BLOB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "businessId" TEXT NOT NULL,
    CONSTRAINT "BusinessLogoImage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_DiscountToProduct" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_DiscountToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "Discount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_DiscountToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_DiscountToOrder" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_DiscountToOrder_A_fkey" FOREIGN KEY ("A") REFERENCES "Discount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_DiscountToOrder_B_fkey" FOREIGN KEY ("B") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "businessId" TEXT NOT NULL,
    CONSTRAINT "User_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "updatedAt", "username") SELECT "createdAt", "email", "id", "name", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE TABLE "new_Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expirationDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "browser" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "os" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Session" ("createdAt", "expirationDate", "id", "updatedAt", "userId") SELECT "createdAt", "expirationDate", "id", "updatedAt", "userId" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
PRAGMA foreign_key_check("User");
PRAGMA foreign_key_check("Session");
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE INDEX "Product_isDeleted_idx" ON "Product"("isDeleted");

-- CreateIndex
CREATE INDEX "Product_code_idx" ON "Product"("code");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAnalytics_productId_key" ON "ProductAnalytics"("productId");

-- CreateIndex
CREATE INDEX "ProductAnalytics_createdAt_idx" ON "ProductAnalytics"("createdAt");

-- CreateIndex
CREATE INDEX "ProductAnalytics_businessId_idx" ON "ProductAnalytics"("businessId");

-- CreateIndex
CREATE INDEX "PriceModification_productAnalyticsId_idx" ON "PriceModification"("productAnalyticsId");

-- CreateIndex
CREATE INDEX "PriceModification_bulkPriceModificationId_idx" ON "PriceModification"("bulkPriceModificationId");

-- CreateIndex
CREATE INDEX "PriceModification_createdAt_idx" ON "PriceModification"("createdAt");

-- CreateIndex
CREATE INDEX "BulkPriceModification_createdAt_idx" ON "BulkPriceModification"("createdAt");

-- CreateIndex
CREATE INDEX "BulkPriceModification_executedAt_idx" ON "BulkPriceModification"("executedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOrder_productId_orderId_key" ON "ProductOrder"("productId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessLogoImage_businessId_key" ON "BusinessLogoImage"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "_DiscountToProduct_AB_unique" ON "_DiscountToProduct"("A", "B");

-- CreateIndex
CREATE INDEX "_DiscountToProduct_B_index" ON "_DiscountToProduct"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_DiscountToOrder_AB_unique" ON "_DiscountToOrder"("A", "B");

-- CreateIndex
CREATE INDEX "_DiscountToOrder_B_index" ON "_DiscountToOrder"("B");


INSERT INTO Role VALUES('clnf2zvlw000gpcour6dyyuh6','Administrador','',1696625465540,1696625465540);
INSERT INTO Role VALUES('clnf2zvlx000hpcou5dfrbegs','Vendedor','',1696625465542,1696625465542);
