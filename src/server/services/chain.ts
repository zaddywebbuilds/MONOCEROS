import "server-only";

import { tronAddressToHex } from "@/lib/base58";

/**
 * Deposit verification against the public blockchain.
 *
 * Two fake payments reached approval before this existed: one with typed
 * gibberish, one with a real transaction copied off a block explorer that was
 * eighteen months old, on the wrong chain, and paid to a stranger. Both were
 * approved by a human in under a minute. This is the check that makes that
 * impossible to do by accident.
 *
 * It answers one question — did the amount claimed actually arrive in OUR
 * wallet, recently, on the network the investor said — and it answers it from
 * public endpoints that need no API key and cost nothing.
 *
 * It never approves anything by itself. It returns a verdict; the caller
 * decides, and a human can still overrule.
 */

/** ERC-20/TRC-20 `transfer(address,uint256)`. */
const TRANSFER_SELECTOR = "a9059cbb";

/** Accepted stablecoin contracts on BNB Smart Chain. */
const ACCEPTED_BEP20 = new Set([
  "0x55d398326f99059ff775485246999027b3197955", // USDT (Tether)
  "0xe9e7cea3dedca5984780bafc599bd69add087d56", // BSC-USD / BUSD (Binance)
  "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", // USDC
  "0xc5f0f7b66764f6ec8c8dff7ba683102295e16409", // FDUSD (First Digital)
]);

const USDT_TRC20_HEX = "a614f803b6fd780986a42c78ec9c7f77e6ded13c"; // TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t

const BSC_RPC = "https://bsc-dataseed.binance.org";
const TRON_API = "https://api.trongrid.io";

const REQUEST_TIMEOUT_MS = 12_000;

/** How old a transaction may be and still count as payment for this order. */
const MAX_AGE_DAYS = 14;

export type VerificationVerdict =
  | "VERIFIED"
  | "WRONG_RECIPIENT"
  | "WRONG_ASSET"
  | "AMOUNT_SHORT"
  | "TOO_OLD"
  | "FAILED_ON_CHAIN"
  | "NOT_FOUND"
  | "UNSUPPORTED_NETWORK"
  | "UNAVAILABLE";

export interface VerificationResult {
  verdict: VerificationVerdict;
  /** Safe to show an administrator; never contains a key or an endpoint. */
  detail: string;
  amount?: string;
  from?: string;
  to?: string;
  occurredAt?: Date;
}

export interface VerifyDepositInput {
  network: string;
  transactionHash: string;
  expectedAmount: string | number;
  /** The company address the investor was shown, as stored on the payment. */
  walletAddress: string;
}

async function rpc(url: string, body: unknown): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/**
 * Pulls the recipient and amount out of a `transfer` call.
 *
 * Exported for testing: this is the part that decides who was actually paid,
 * and it is worth pinning down against real transaction data.
 */
export function parseTransferInput(
  input: string,
): { to: string; amount: bigint } | null {
  const data = input.startsWith("0x") ? input.slice(2) : input;
  if (!data.toLowerCase().startsWith(TRANSFER_SELECTOR)) return null;

  const body = data.slice(8);
  if (body.length < 128) return null;

  // Both arguments are 32-byte words; an address occupies the low 20 bytes.
  const to = body.slice(24, 64).toLowerCase();
  const amount = BigInt(`0x${body.slice(64, 128)}`);
  return { to, amount };
}

/** Units to a decimal string, without floating point anywhere near it. */
export function formatUnits(amount: bigint, decimals: number): string {
  const base = 10n ** BigInt(decimals);
  const whole = amount / base;
  const fraction = (amount % base).toString().padStart(decimals, "0").slice(0, 2);
  return `${whole}.${fraction}`;
}

function shortfall(actual: bigint, expected: bigint, decimals: number): boolean {
  // A cent of tolerance: exchanges round, and refusing $999.999999 helps nobody.
  const tolerance = 10n ** BigInt(decimals) / 100n;
  return actual + tolerance < expected;
}

function tooOld(occurredAt: Date, now: Date): boolean {
  return now.getTime() - occurredAt.getTime() > MAX_AGE_DAYS * 86_400_000;
}

async function verifyBep20(
  input: VerifyDepositInput,
  now: Date,
): Promise<VerificationResult> {
  const expected = BigInt(Math.round(Number(input.expectedAmount) * 1e6)) * 10n ** 12n; // 18dp

  const txResponse = (await rpc(BSC_RPC, {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_getTransactionByHash",
    params: [input.transactionHash],
  })) as { result?: Record<string, string> | null };

  const tx = txResponse.result;
  if (!tx) {
    return {
      verdict: "NOT_FOUND",
      detail: "No transaction with that hash exists on BNB Smart Chain.",
    };
  }

  if (!ACCEPTED_BEP20.has((tx.to ?? "").toLowerCase())) {
    return {
      verdict: "WRONG_ASSET",
      detail: "That transaction is not a USD stablecoin transfer on BNB Smart Chain.",
    };
  }

  const receiptResponse = (await rpc(BSC_RPC, {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_getTransactionReceipt",
    params: [input.transactionHash],
  })) as { result?: { status?: string; blockNumber?: string } | null };

  if (receiptResponse.result?.status !== "0x1") {
    return { verdict: "FAILED_ON_CHAIN", detail: "That transfer failed on chain." };
  }

  const transfer = parseTransferInput(tx.input ?? "");
  if (!transfer) {
    return { verdict: "WRONG_ASSET", detail: "That transaction is not a token transfer." };
  }

  const ours = input.walletAddress.replace(/^0x/i, "").toLowerCase();
  if (transfer.to !== ours) {
    return {
      verdict: "WRONG_RECIPIENT",
      detail: "The funds went to a different address, not the company wallet.",
      to: `0x${transfer.to}`,
      amount: formatUnits(transfer.amount, 18),
    };
  }

  const blockResponse = (await rpc(BSC_RPC, {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_getBlockByNumber",
    params: [receiptResponse.result.blockNumber, false],
  })) as { result?: { timestamp?: string } | null };

  const occurredAt = blockResponse.result?.timestamp
    ? new Date(Number(BigInt(blockResponse.result.timestamp)) * 1000)
    : undefined;

  const amount = formatUnits(transfer.amount, 18);
  const from = tx.from;

  if (occurredAt && tooOld(occurredAt, now)) {
    return {
      verdict: "TOO_OLD",
      detail: `That transfer is from ${occurredAt.toISOString().slice(0, 10)}, too old to be this payment.`,
      amount,
      from,
      occurredAt,
    };
  }

  if (shortfall(transfer.amount, expected, 18)) {
    return {
      verdict: "AMOUNT_SHORT",
      detail: `Only ${amount} USD arrived, less than the amount due.`,
      amount,
      from,
      occurredAt,
    };
  }

  return {
    verdict: "VERIFIED",
    detail: `${amount} USD received on BNB Smart Chain.`,
    amount,
    from,
    to: input.walletAddress,
    occurredAt,
  };
}

async function verifyTrc20(
  input: VerifyDepositInput,
  now: Date,
): Promise<VerificationResult> {
  const expected = BigInt(Math.round(Number(input.expectedAmount) * 1e6)); // 6dp

  const ours = tronAddressToHex(input.walletAddress);
  if (!ours) {
    return {
      verdict: "UNAVAILABLE",
      detail: "The company Tron address could not be read for comparison.",
    };
  }

  const hash = input.transactionHash.replace(/^0x/i, "");

  const tx = (await rpc(`${TRON_API}/wallet/gettransactionbyid`, { value: hash })) as {
    txID?: string;
    raw_data?: {
      timestamp?: number;
      contract?: { type?: string; parameter?: { value?: Record<string, string> } }[];
    };
    ret?: { contractRet?: string }[];
  };

  if (!tx?.txID) {
    return { verdict: "NOT_FOUND", detail: "No transaction with that hash exists on Tron." };
  }

  if (tx.ret?.[0]?.contractRet && tx.ret[0].contractRet !== "SUCCESS") {
    return { verdict: "FAILED_ON_CHAIN", detail: "That transfer failed on chain." };
  }

  const contract = tx.raw_data?.contract?.[0];
  const value = contract?.parameter?.value;
  if (contract?.type !== "TriggerSmartContract" || !value?.data) {
    return { verdict: "WRONG_ASSET", detail: "That transaction is not a token transfer." };
  }

  if ((value.contract_address ?? "").toLowerCase().replace(/^41/, "") !== USDT_TRC20_HEX) {
    return { verdict: "WRONG_ASSET", detail: "That transaction is not a USDT transfer on Tron." };
  }

  const transfer = parseTransferInput(value.data);
  if (!transfer) {
    return { verdict: "WRONG_ASSET", detail: "That transaction is not a token transfer." };
  }

  const amount = formatUnits(transfer.amount, 6);
  const occurredAt = tx.raw_data?.timestamp ? new Date(tx.raw_data.timestamp) : undefined;

  if (transfer.to !== ours) {
    return {
      verdict: "WRONG_RECIPIENT",
      detail: "The funds went to a different address, not the company wallet.",
      amount,
      occurredAt,
    };
  }

  if (occurredAt && tooOld(occurredAt, now)) {
    return {
      verdict: "TOO_OLD",
      detail: `That transfer is from ${occurredAt.toISOString().slice(0, 10)}, too old to be this payment.`,
      amount,
      occurredAt,
    };
  }

  if (shortfall(transfer.amount, expected, 6)) {
    return {
      verdict: "AMOUNT_SHORT",
      detail: `Only ${amount} USDT arrived, less than the amount due.`,
      amount,
      occurredAt,
    };
  }

  return {
    verdict: "VERIFIED",
    detail: `${amount} USDT received on Tron.`,
    amount,
    to: input.walletAddress,
    occurredAt,
  };
}

export async function verifyDeposit(
  input: VerifyDepositInput,
  now: Date = new Date(),
): Promise<VerificationResult> {
  const network = input.network.toUpperCase();

  try {
    if (network === "BEP20") return await verifyBep20(input, now);
    if (network === "TRC20") return await verifyTrc20(input, now);

    return {
      verdict: "UNSUPPORTED_NETWORK",
      detail: `Automatic checking is not available for ${network}; this payment needs a manual decision.`,
    };
  } catch (error) {
    // A provider being down must never look like a bad payment. The caller
    // holds it for a human instead of rejecting somebody who paid correctly.
    // eslint-disable-next-line no-console
    console.error("[chain] verification unavailable:", error);
    return {
      verdict: "UNAVAILABLE",
      detail: "The blockchain could not be reached, so this payment was not checked automatically.",
    };
  }
}

/** Public explorer link for a transaction, or null for an unknown network. */
export function explorerUrl(network: string, hash: string): string | null {
  const clean = hash.trim();
  switch (network.toUpperCase()) {
    case "TRC20":
      return `https://tronscan.org/#/transaction/${clean.replace(/^0x/i, "")}`;
    case "BEP20":
      return `https://bscscan.com/tx/${clean}`;
    case "ERC20":
      return `https://etherscan.io/tx/${clean}`;
    case "POLYGON":
      return `https://polygonscan.com/tx/${clean}`;
    case "SOLANA":
      return `https://solscan.io/tx/${clean}`;
    default:
      return null;
  }
}
