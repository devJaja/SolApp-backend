/**
 * Encrypt FHE Service
 *
 * Wraps the @encrypt.xyz/pre-alpha-solana-client gRPC client and the
 * solapp-privacy on-chain program to enable confidential tips in chat.
 *
 * Pre-alpha environment:
 *   gRPC  : https://pre-alpha-dev-1.encrypt.ika-network.net:443
 *   RPC   : https://api.devnet.solana.com
 *   Prog  : 4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8
 *
 * Install the client on the backend:
 *   bun add @encrypt.xyz/pre-alpha-solana-client
 */

import {
  createEncryptClient,
  encodeReadCiphertextMessage,
  Chain,
} from '@encrypt.xyz/pre-alpha-solana-client/grpc';
import {
  Connection,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  Keypair,
} from '@solana/web3.js';

// ─── Constants ───────────────────────────────────────────────────────────────

export const ENCRYPT_PROGRAM_ID = new PublicKey(
  '4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8',
);

export const SOLAPP_PRIVACY_PROGRAM_ID = new PublicKey(
  process.env.SOLAPP_PRIVACY_PROGRAM_ID ?? '11111111111111111111111111111112',
);

const DEVNET_RPC       = 'https://api.devnet.solana.com';
const ENCRYPT_CPI_SEED = Buffer.from('__encrypt_cpi_authority');

// FHE type identifier for Uint64 (per Encrypt docs)
const FHE_TYPE_UINT64 = 4;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getConnection(): Connection {
  return new Connection(DEVNET_RPC, 'confirmed');
}

function getEncryptCpiAuthority(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [ENCRYPT_CPI_SEED],
    SOLAPP_PRIVACY_PROGRAM_ID,
  );
}

/** Encode a SOL amount (in lamports) as a little-endian Uint64 buffer. */
function encodeLamports(lamports: bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(lamports);
  return buf;
}

// ─── Ciphertext Management ───────────────────────────────────────────────────

export interface CiphertextId {
  id: Uint8Array;
  accountAddress: string;
}

/**
 * Create an encrypted input ciphertext for a given SOL amount.
 *
 * The ciphertext is authorised for the solapp-privacy program only —
 * no other program can use it as an input.
 */
export async function encryptAmount(
  lamports: bigint,
  networkEncryptionPublicKey: Uint8Array,
  proof: Uint8Array,
): Promise<CiphertextId> {
  const client = createEncryptClient();

  const { ciphertextIdentifiers } = await client.createInput({
    chain: Chain.SOLANA,
    inputs: [
      {
        ciphertextBytes: encodeLamports(lamports),
        fheType: FHE_TYPE_UINT64,
      },
    ],
    proof,
    authorized: SOLAPP_PRIVACY_PROGRAM_ID.toBytes(),
    networkEncryptionPublicKey,
  });

  const id = ciphertextIdentifiers[0];
  return {
    id,
    accountAddress: Buffer.from(id).toString('hex'),
  };
}

// ─── Private Tip Execution ───────────────────────────────────────────────────

export interface PrivateTipParams {
  chatId: Buffer;                  // 32-byte chat identifier
  senderPubkey: PublicKey;
  receiverPubkey: PublicKey;
  senderBalanceCt: PublicKey;      // existing encrypted balance account
  receiverBalanceCt: PublicKey;    // existing encrypted balance account
  tipAmountCt: PublicKey;          // freshly created encrypted amount account
  backendKeypair: Keypair;
}

/**
 * Execute a private tip on-chain.
 *
 * Calls `execute_private_tip` on the solapp-privacy program, which CPI-calls
 * the Encrypt program's `execute_graph`. The FHE executor evaluates the
 * confidential_transfer graph and commits new ciphertexts for both balances.
 */
export async function executePrivateTip(
  params: PrivateTipParams,
): Promise<{ txSignature: string }> {
  const {
    chatId,
    senderPubkey,
    receiverPubkey,
    senderBalanceCt,
    receiverBalanceCt,
    tipAmountCt,
    backendKeypair,
  } = params;

  const connection = getConnection();
  const [cpiAuthority] = getEncryptCpiAuthority();

  // Derive the chat record PDA
  const [chatRecord] = PublicKey.findProgramAddressSync(
    [Buffer.from('chat'), chatId],
    SOLAPP_PRIVACY_PROGRAM_ID,
  );

  // Derive output ciphertext PDAs (new balances after the tip)
  const [newSenderBalance] = PublicKey.findProgramAddressSync(
    [Buffer.from('ct_out'), senderPubkey.toBuffer(), chatId],
    SOLAPP_PRIVACY_PROGRAM_ID,
  );
  const [newReceiverBalance] = PublicKey.findProgramAddressSync(
    [Buffer.from('ct_out'), receiverPubkey.toBuffer(), chatId],
    SOLAPP_PRIVACY_PROGRAM_ID,
  );

  const discriminator = Buffer.from([0x45, 0x78, 0x50, 0x72, 0x54, 0x69, 0x70, 0x00]);

  const ix = {
    programId: SOLAPP_PRIVACY_PROGRAM_ID,
    keys: [
      { pubkey: backendKeypair.publicKey, isSigner: true,  isWritable: true  },
      { pubkey: chatRecord,               isSigner: false, isWritable: false },
      { pubkey: senderPubkey,             isSigner: false, isWritable: false },
      { pubkey: receiverPubkey,           isSigner: false, isWritable: false },
      { pubkey: senderBalanceCt,          isSigner: false, isWritable: false },
      { pubkey: receiverBalanceCt,        isSigner: false, isWritable: false },
      { pubkey: tipAmountCt,              isSigner: false, isWritable: false },
      { pubkey: newSenderBalance,         isSigner: false, isWritable: true  },
      { pubkey: newReceiverBalance,       isSigner: false, isWritable: true  },
      { pubkey: cpiAuthority,             isSigner: false, isWritable: false },
      { pubkey: SOLAPP_PRIVACY_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ENCRYPT_PROGRAM_ID,       isSigner: false, isWritable: false },
      { pubkey: new PublicKey('11111111111111111111111111111111'), isSigner: false, isWritable: false },
    ],
    data: discriminator,
  };

  const tx = new Transaction().add(ix as any);
  const txSignature = await sendAndConfirmTransaction(connection, tx, [backendKeypair]);

  return { txSignature };
}

// ─── Decryption (authorised read) ────────────────────────────────────────────

export interface ReadCiphertextParams {
  ciphertextAccountAddress: string;
  reencryptionKey: Uint8Array;
  epoch: number;
  userKeypair: Keypair;
}

/**
 * Read a ciphertext off-chain on behalf of an authorised user.
 *
 * In pre-alpha this returns the plaintext directly (mock FHE).
 * In production it returns a re-encrypted ciphertext decryptable only
 * by the user's key.
 */
export async function readCiphertext(
  params: ReadCiphertextParams,
): Promise<bigint> {
  const { ciphertextAccountAddress, reencryptionKey, epoch, userKeypair } = params;
  const client = createEncryptClient();

  const ctId = Buffer.from(ciphertextAccountAddress, 'hex');
  const msg  = encodeReadCiphertextMessage(Chain.SOLANA, ctId, reencryptionKey, epoch);

  // Sign the read request with the user's keypair to prove authorisation
  const signature = userKeypair.sign(msg).signature;

  const result = await client.readCiphertext({
    message: msg,
    signature,
    signer: userKeypair.publicKey.toBytes(),
  });

  // In pre-alpha, result.value is the raw plaintext bytes
  return Buffer.from(result.value).readBigUInt64LE(0);
}
