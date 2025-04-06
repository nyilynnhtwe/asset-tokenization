import { Transaction } from "@mysten/sui/transactions";
import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { KioskClient, KioskTransaction } from "@mysten/kiosk";
import { SUI_NETWORK, KIOSK_NETWORK, tokenizedAssetType, adminPhrase, tokenizedAssetID, targetKioskId, transferPolicy } from "../config";

const client = new SuiClient({ url: SUI_NETWORK });

const kioskClient = new KioskClient({
  client,
  network: KIOSK_NETWORK,
});

const owner_keypair = Ed25519Keypair.deriveKeypair(
  adminPhrase
);

const address = owner_keypair.toSuiAddress().toString();

export async function LockItemInKiosk(minted_asset?: string) {
  const tx = new Transaction();
  const item = minted_asset ?? tokenizedAssetID;

  const { kioskOwnerCaps } = await kioskClient.getOwnedKiosks({ address });

  const kioskCap = kioskOwnerCaps.find((cap) => cap.kioskId === targetKioskId);
  const kioskTx = new KioskTransaction({
    transaction: tx,
    kioskClient,
    cap: kioskCap,
  });

  kioskTx.lock({
    itemType: tokenizedAssetType,
    item: item,
    policy: tx.object(transferPolicy),
  });

  kioskTx.finalize();

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: owner_keypair,
    options: {
      showEffects: true,
    },
  });

  console.log("Execution status", result.effects?.status);
  console.log("Result", result.effects);

  const created_objects_length = result.effects?.created?.length as number;
  let i = 0;
  const target_type = `0x2::dynamic_field::Field<0x2::kiosk::Lock, bool>`;
  let target_object_id: string;
  while (i < created_objects_length) {
    target_object_id = (result.effects?.created &&
      result.effects?.created[i].reference.objectId) as string;
    let target_object = await client.getObject({
      id: target_object_id,
      options: {
        showType: true,
      },
    });
    let current_type = target_object.data?.type as string;
    if (current_type == target_type) {
      console.log("Lock Dynamic Field: ", target_object_id);
      return target_object_id;
    }
    i = i + 1;
  }
}