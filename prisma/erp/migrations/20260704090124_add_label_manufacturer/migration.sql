-- CreateTable
CREATE TABLE "LabelManufacturer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "companyPhone" TEXT,
    "companyAddress" TEXT,
    "originCountry" TEXT,
    "brandNameZh" TEXT,
    "brandNameEn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabelManufacturer_pkey" PRIMARY KEY ("id")
);
