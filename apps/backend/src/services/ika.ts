/**
 * Ika dWallet Service
 *
 * Wraps the Ika gRPC network and the solapp-custody on-chain program.
 * The backend calls these functions — the mobile client never touches
 * private key material directly.
 *
 * Pre-alpha environment:
 *   gRPC    : https://pre-alpha-dev-1.ika.ika-network.net:443
 *   RPC     : https://api.devnet.solana.com
 *   Program : 87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY
 *
 * Backend setup:
 *   bun add @solana/web3.js @coral-xyz/anchor
 *   # Ika gRPC is Rust-only — compile the helper binary:
 *   # cargo build --release --bin ika-dwallet-helper
 *   #   (see programs/ika-helper/ for the thin Rust wrapper)
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  Keypair,
  SystemProgram,
} from '@solana/web3.js';
import { createHash } from 'crypto';

// ─── Constants ───────────────────────────────────────────────────────────────

export const IKA_PROGRAM_ID = new PublicKey(
  '87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY',
);

export const SOLAPP_CUSTODY_PROGRAM_ID = new PublicKey(
  process.env.SOLAPP_CUSTODY_PROGRAM_ID ?? '11111111111111111111111111111111',
);

const DEVNET_RPC = 'https://api.devnet.solana.com';
const IKA_GRPC   = 'https://pre-alpha-dev-1.ika.ika-network.net:443';

// Anchor discriminators: sha256("global:<instruction_name>")[0..8]
const DISC_REGISTER_DWALLET  = anchorDiscriminator('register_dwallet');
const DISC_APPROVE_TRANSFER  = anchorDiscriminator('approve_transfer');

// CPI authority seed — must match the Rust constant in ika-dwallet-anchor
const CPI_AUTHORITY_SEED = Buffer.from('__ika_cpi_authority');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function anchorDiscriminator(name: string): Buffer {
  return Buffer.from(
    createHash('sha256').update(`global:${name}`).digest()
  ).slice(0, 8);
}

function getConnection(): Connection {
  return new Connection(DEVNET_RPC, 'confirmed');
}

export function getCpiAuthority(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [CPI_AUTHORITY_SEED],
    SOLAPP_CUSTODY_PROGRAM_ID,
  );
}

/** Derive the DWalletCoordinator PDA (account #0 in approve_message CPI). */
function getDWalletCoordinator(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('coordinator')],
    IKA_PROGRAM_ID,
  )[0];
}

// ─── dWallet Lifecycle ───────────────────────────────────────────────────────

export interface DWalletInfo {
  dWalletId: string;  // on-chain account address
  publicKey: string;  // the signing public key (user's wallet address)
  attestation: string; // base64 NetworkSignedAttestation — store in DB for Sign requests
}

/**
 * Create a dWallet for a new user via the Ika gRPC network.
 *
 * The Ika gRPC protocol is BCS-serialized Rust types. We shell out to a
 * thin Rust helper binary (`ika-dwallet-helper`) that handles BCS encoding,
 * the DKG protocol, and returns JSON. This is the correct approach until
 * an official TypeScript gRPC client ships.
 *
 * The helper binary is in `programs/ika-helper/` and is compiled once:
 *   cargo build --release --manifest-path programs/ika-helper/Cargo.toml
 */
export async function createDWallet(
  backendKeypair: Keypair,
): Promise<DWalletInfo> {
  const { execFileSync } = await import('child_process');

  // The helper performs DKG via gRPC and returns the dWallet info as JSON.
  // It uses the backend keypair (base58) as the user identity for DKG.
  const output = execFileSync(
    process.env.IKA_HELPER_BIN ?? './bin/ika-dwallet-helper',
    [
      'create-dwallet',
      '--grpc', IKA_GRPC,
      '--rpc',  DEVNET_RPC,
      '--keypair', Buffer.from(backendKeypair.secretKey).toString('base64'),
    ],
    { encoding: 'utf8', timeout: 60_000 },
  );

  const info: DWalletInfo = JSON.parse(output.trim());

  // Transfer dWallet authority to this program's CPI PDA on-chain.
  await registerDWalletOnChain(backendKeypair, new PublicKey(info.dWalletId));

  return info;
}

async function registerDWalletOnChain(
  payer: Keypair,
  dWalletPubkey: PublicKey,
): Promise<void> {
  const connection = getConnection();
  const [cpiAuthority, bump] = getCpiAuthority();

  const ix = new TransactionInstruction({
    programId: SOLAPP_CUSTODY_PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey,           isSigner: true,  isWritable: true  },
      { pubkey: dWalletPubkey,             isSigner: false, isWritable: true  },
      { pubkey: cpiAuthority,              isSigner: false, isWritable: false },
      { pubkey: SOLAPP_CUSTODY_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: IKA_PROGRAM_ID,            isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId,   isSigner: false, isWritable: false },
    ],
    // discriminator (8) + cpi_authority_bump (1)
    data: Buffer.concat([DISC_REGISTER_DWALLET, Buffer.from([bump])]),
  });

  await sendAndConfirmTransaction(getConnection(), new Transaction().add(ix), [payer]);
}

// ─── Transfer Approval ───────────────────────────────────────────────────────

export interface ApproveTransferParams {
  dWalletId: string;
  messageHash: Buffer;    // 32-byte keccak256 of the serialised transaction
  userPubkey: Buffer;     // 32-byte user public key
  backendKeypair: Keypair;
}

/**
 * Approve a transfer by calling `approve_transfer` on-chain.
 *
 * The Ika network detects the resulting MessageApproval PDA and produces
 * the signature via 2PC-MPC. Call `pollForSignature` to retrieve it.
 */
export async function approveTransfer(
  params: ApproveTransferParams,
): Promise<{ messageApprovalAddress: string; txSignature: string }> {
  const { dWalletId, messageHash, userPubkey, backendKeypair } = params;
  const connection = getConnection();
  const [cpiAuthority, cpiAuthorityBump] = getCpiAuthority();
  const coordinator = getDWalletCoordinator();

  const dWalletPubkey = new PublicKey(dWalletId);

  const [messageApproval, messageApprovalBump] = PublicKey.findProgramAddressSync(
    [Buffer.from('message_approval'), messageHash],
    IKA_PROGRAM_ID,
  );

  // Instruction data layout (per CPI framework docs):
  // discriminator(8) | message_hash(32) | user_pubkey(32) |
  // message_approval_bump(1) | cpi_authority_bump(1)
  const data = Buffer.concat([
    DISC_APPROVE_TRANSFER,
    messageHash,
    userPubkey,
    Buffer.from([messageApprovalBump]),
    Buffer.from([cpiAuthorityBump]),
  ]);

  const ix = new TransactionInstruction({
    programId: SOLAPP_CUSTODY_PROGRAM_ID,
    keys: [
      { pubkey: backendKeypair.publicKey,  isSigner: true,  isWritable: true  },
      { pubkey: dWalletPubkey,             isSigner: false, isWritable: false },
      { pubkey: messageApproval,           isSigner: false, isWritable: true  },
      { pubkey: cpiAuthority,              isSigner: false, isWritable: false },
      { pubkey: SOLAPP_CUSTODY_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: IKA_PROGRAM_ID,            isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId,   isSigner: false, isWritable: false },
      // coordinator is account #0 in the inner approve_message CPI
      { pubkey: coordinator,               isSigner: false, isWritable: false },
    ],
    data,
  });

  const txSignature = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(ix),
    [backendKeypair],
  );

  return { messageApprovalAddress: messageApproval.toBase58(), txSignature };
}

/**
 * Poll the MessageApproval account until the Ika network commits the
 * signature (status byte at offset 139 changes 0 → 1).
 */
export async function pollForSignature(
  messageApprovalAddress: string,
  timeoutMs = 30_000,
): Promise<Buffer> {
  const connection = getConnection();
  const pubkey = new PublicKey(messageApprovalAddress);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const info = await connection.getAccountInfo(pubkey);
    if (info) {
      const status = info.data[139];
      if (status === 1) {
        const sigLen = info.data.readUInt16LE(140);
        return Buffer.from(info.data.slice(142, 142 + sigLen));
      }
    }
    await new Promise(r => setTimeout(r, 1_000));
  }

  throw new Error('Ika signature timeout — MessageApproval not signed within 30s');
}
