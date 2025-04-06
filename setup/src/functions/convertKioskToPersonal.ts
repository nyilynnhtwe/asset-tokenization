import { Transaction } from "@mysten/sui/transactions";
import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { KioskClient, KioskTransaction } from "@mysten/kiosk";
import { SUI_NETWORK, KIOSK_NETWORK, adminPhrase, targetKioskId, buyerPhrase } from "../config";

const client = new SuiClient({ url: SUI_NETWORK });

const kioskClient = new KioskClient({
  client,
  network: KIOSK_NETWORK,
});

const owner_keypair = Ed25519Keypair.deriveKeypair(
    adminPhrase
  );
const owner_address = owner_keypair.toSuiAddress().toString();

const buyer_keypair = Ed25519Keypair.deriveKeypair(
  buyerPhrase
);
const buyer_address = buyer_keypair.toSuiAddress().toString();

export async function ConvertKioskToPersonal(KioskID?: string) {
    const targetKiosk = KioskID ?? targetKioskId;
    const tx = new Transaction();

    const { kioskOwnerCaps } = await kioskClient.getOwnedKiosks({address:owner_address});
    // const { kioskOwnerCaps } = await kioskClient.getOwnedKiosks({address:buyer_address});

  
    const targetKioskOwnerCap = kioskOwnerCaps.find(
      (kioskCap) => kioskCap.kioskId === targetKiosk
    );
  
    console.log("Target Kiosk Owner Cap: ", targetKioskOwnerCap);
  
    const kioskTx = new KioskTransaction({
      transaction: tx,
      kioskClient,
      cap: targetKioskOwnerCap,
    });
  
    kioskTx.convertToPersonal(false).finalize();
  
    const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: owner_keypair,
        // signer: buyer_keypair,
        options: {
          showEffects: true,
        },
      });
  
    console.log("Kiosk converted to personal: ", result.effects?.status, result.digest);
  };