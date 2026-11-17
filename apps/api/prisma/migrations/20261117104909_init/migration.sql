-- CreateEnum
CREATE TYPE "Market" AS ENUM ('stocks', 'memes');

-- CreateEnum
CREATE TYPE "DecisionKind" AS ENUM ('buy', 'sell', 'pass');

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "sealer" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "runtime" TEXT,
    "model" TEXT,
    "market" "Market" NOT NULL DEFAULT 'memes',
    "avatarA" TEXT NOT NULL,
    "avatarB" TEXT NOT NULL,
    "boundBlock" BIGINT NOT NULL,
    "boundAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "hideWallet" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SealBatch" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "root" TEXT NOT NULL,
    "firstSeq" BIGINT NOT NULL,
    "count" INTEGER NOT NULL,
    "block" BIGINT NOT NULL,
    "tx" TEXT NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "relayed" BOOLEAN NOT NULL DEFAULT false,
    "ts" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SealBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "seq" BIGINT NOT NULL,
    "leaf" TEXT NOT NULL,
    "batchId" TEXT,
    "kind" "DecisionKind",
    "assetSymbol" TEXT,
    "assetAddress" TEXT,
    "ts" TIMESTAMP(3),
    "late" BOOLEAN NOT NULL DEFAULT false,
    "autoCaptured" BOOLEAN NOT NULL DEFAULT false,
    "revealed" BOOLEAN NOT NULL DEFAULT false,
    "revealedAt" TIMESTAMP(3),
    "record" JSONB,
    "salt" TEXT,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "block" BIGINT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "tokenIn" TEXT NOT NULL,
    "tokenOut" TEXT NOT NULL,
    "amountIn" DECIMAL(78,0) NOT NULL,
    "amountOut" DECIMAL(78,0) NOT NULL,
    "usdValue" DECIMAL(20,2) NOT NULL,
    "decisionId" TEXT,
    "sealed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "block" BIGINT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "amount" DECIMAL(78,0) NOT NULL,
    "usdValue" DECIMAL(20,2) NOT NULL,
    "direction" TEXT NOT NULL,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenList" (
    "address" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,

    CONSTRAINT "TokenList_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "Price" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "block" BIGINT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "usd" DECIMAL(38,18) NOT NULL,

    CONSTRAINT "Price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquitySnapshot" (
    "agentId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "equityUsd" DECIMAL(20,2) NOT NULL,
    "netFlowUsd" DECIMAL(20,2) NOT NULL,
    "twrIndex" DECIMAL(30,12) NOT NULL,

    CONSTRAINT "EquitySnapshot_pkey" PRIMARY KEY ("agentId","day")
);

-- CreateTable
CREATE TABLE "RoundTrip" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "realizedUsd" DECIMAL(20,2),

    CONSTRAINT "RoundTrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricCache" (
    "agentId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "ret" DOUBLE PRECISION NOT NULL,
    "pnl" DOUBLE PRECISION NOT NULL,
    "winRate" DOUBLE PRECISION,
    "maxDrawdown" DOUBLE PRECISION NOT NULL,
    "trades" INTEGER NOT NULL,
    "sealCoverage" DOUBLE PRECISION NOT NULL,
    "trustScore" INTEGER,
    "rank" INTEGER,
    "eligible" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricCache_pkey" PRIMARY KEY ("agentId","period")
);

-- CreateTable
CREATE TABLE "Heartbeat" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "queue" INTEGER NOT NULL,
    "lastSealBlock" BIGINT,

    CONSTRAINT "Heartbeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramLink" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "calls" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndexerCursor" (
    "stream" TEXT NOT NULL,
    "block" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndexerCursor_pkey" PRIMARY KEY ("stream")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_wallet_key" ON "Agent"("wallet");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_slug_key" ON "Agent"("slug");

-- CreateIndex
CREATE INDEX "SealBatch_block_idx" ON "SealBatch"("block");

-- CreateIndex
CREATE INDEX "SealBatch_root_idx" ON "SealBatch"("root");

-- CreateIndex
CREATE UNIQUE INDEX "SealBatch_agentId_firstSeq_key" ON "SealBatch"("agentId", "firstSeq");

-- CreateIndex
CREATE UNIQUE INDEX "Decision_leaf_key" ON "Decision"("leaf");

-- CreateIndex
CREATE INDEX "Decision_agentId_ts_idx" ON "Decision"("agentId", "ts");

-- CreateIndex
CREATE UNIQUE INDEX "Decision_agentId_seq_key" ON "Decision"("agentId", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "Trade_txHash_key" ON "Trade"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "Trade_decisionId_key" ON "Trade"("decisionId");

-- CreateIndex
CREATE INDEX "Trade_agentId_block_idx" ON "Trade"("agentId", "block");

-- CreateIndex
CREATE INDEX "Transfer_agentId_ts_idx" ON "Transfer"("agentId", "ts");

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_txHash_logIndex_key" ON "Transfer"("txHash", "logIndex");

-- CreateIndex
CREATE INDEX "Price_token_ts_idx" ON "Price"("token", "ts");

-- CreateIndex
CREATE INDEX "RoundTrip_agentId_closedAt_idx" ON "RoundTrip"("agentId", "closedAt");

-- CreateIndex
CREATE INDEX "Heartbeat_agentId_ts_idx" ON "Heartbeat"("agentId", "ts");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLink_agentId_chatId_key" ON "TelegramLink"("agentId", "chatId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- AddForeignKey
ALTER TABLE "SealBatch" ADD CONSTRAINT "SealBatch_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "SealBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquitySnapshot" ADD CONSTRAINT "EquitySnapshot_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundTrip" ADD CONSTRAINT "RoundTrip_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricCache" ADD CONSTRAINT "MetricCache_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Heartbeat" ADD CONSTRAINT "Heartbeat_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramLink" ADD CONSTRAINT "TelegramLink_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
