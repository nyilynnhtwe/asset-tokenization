import { config } from "dotenv";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { KioskClient, Network, KioskTransaction } from "@mysten/kiosk";
config({});

const client = new SuiClient({ url: getFullnodeUrl("testnet") });

const kioskClient = new KioskClient({
  client,
  network: Network.TESTNET,
});

const owner_keypair = Ed25519Keypair.deriveKeypair(
  process.env.OWNER_MNEMONIC_PHRASE as string
);
const address = owner_keypair.toSuiAddress().toString();

export async function DelistItem(tokenized_asset?: string) {
  const itemId = tokenized_asset ?? (process.env.TOKENIZED_ASSET as string);
  const itemType = `${process.env.ASSET_TOKENIZATION_PACKAGE_ID}::tokenized_asset::TokenizedAsset<${process.env.TEMPLATE_PACKAGE_ID}::fnft_template::FNFT_TEMPLATE>`;

  const tx = new TransactionBlock();
  const { kioskOwnerCaps } = await kioskClient.getOwnedKiosks({ address });

  const targetKioskId = process.env.TARGET_KIOSK as string;

  const kioskCap = kioskOwnerCaps.find((cap) => cap.kioskId === targetKioskId);
  const kioskTx = new KioskTransaction({
    transactionBlock: tx,
    kioskClient,
    cap: kioskCap,
  });

  kioskTx
    .delist({
      itemId,
      itemType,
    })
    .finalize();

  const result = await client.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    signer: owner_keypair,
    options: {
      showEffects: true,
    },
  });

  console.log("Execution status", result.effects?.status);
  console.log("Result", result.effects);
  console.log("Delisted Item: ", itemId);
  return itemId;
}
