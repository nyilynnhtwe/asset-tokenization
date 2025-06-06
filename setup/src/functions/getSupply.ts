import { Transaction } from "@mysten/sui/transactions";
import { SuiClient } from "@mysten/sui/client";
import { SUI_NETWORK, assetCap } from "../config";

const client = new SuiClient({ url: SUI_NETWORK });

type SupplyFields = {
    supply: {
      fields: {
        value: number
      }
    }
}

export async function GetSupply() {
  const tx = new Transaction();

  const asset_cap = await client.getObject({
    id: assetCap,
    options: {
      showContent:true
    }
  })

  const supply = asset_cap.data?.content?.dataType == 'moveObject' && (asset_cap.data?.content.fields as SupplyFields).supply.fields.value;
  console.log("Current Supply: ", supply)
  return supply;
}