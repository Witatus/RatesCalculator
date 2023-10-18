-- CreateTable
CREATE TABLE "Credit" (
    "id" SERIAL NOT NULL,
    "remainingValue" DOUBLE PRECISION NOT NULL,
    "newInstallmentValue" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Credit_pkey" PRIMARY KEY ("id")
);
