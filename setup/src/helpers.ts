import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { adminPhrase } from "./config";


export function getSigner() {
  const keypair = Ed25519Keypair.deriveKeypair(adminPhrase);
  const admin = keypair.getPublicKey().toSuiAddress();
  console.log("Admin Address = " + admin);
  return keypair;
}

getSigner();