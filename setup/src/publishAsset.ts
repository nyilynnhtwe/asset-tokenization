import { normalizeSuiObjectId, fromHex } from "@mysten/sui/utils";
import { Transaction } from "@mysten/sui/transactions";
import { assetTokenizationPackageId, SUI_NETWORK } from "./config";
import { SuiClient } from '@mysten/sui/client';
import { getSigner } from "./helpers";
import { bcs } from '@mysten/bcs';
import { getBytecode } from "./utils/bytecode-template";
import init, * as template from '@mysten/move-bytecode-template';
import { bytecode as genesis_bytecode } from "./utils/genesis_bytecode";

const client = new SuiClient({
  url: SUI_NETWORK,
});

const publishNewAsset = async (
  moduleName: string,
  totalSupply: string,
  symbol: string,
  asset_name: string,
  description: string,
  iconUrl: string,
  burnable: string
) => {
  const signer = getSigner();

  const templateBytecode = getBytecode();

  const templateBytecodeUnit8Array = fromHex(templateBytecode);

  // Update identifiers
  let updatedBytes = template.update_identifiers(templateBytecodeUnit8Array, {
    TEMPLATE: moduleName.toUpperCase(),
    template: moduleName
  });

  // Update DECIMALS
  updatedBytes = template.update_constants(
    updatedBytes,
    bcs.u64().serialize(Number(totalSupply)).toBytes(), // new value
    bcs.u64().serialize(100).toBytes(), // current value
    'U64', // type of the constant
  );

  // Update SYMBOL
  updatedBytes = template.update_constants(
    updatedBytes,
    bcs.string().serialize(symbol).toBytes(), // new value
    bcs.string().serialize('Symbol').toBytes(), // current value
    'Vector(U8)', // type of the constant
  );

  // Update NAME
  updatedBytes = template.update_constants(
    updatedBytes,
    bcs.string().serialize(asset_name).toBytes(), // new value
    bcs.string().serialize('Name').toBytes(), // current value
    'Vector(U8)', // type of the constant
  );

  // Update DESCRIPTION
  updatedBytes = template.update_constants(
    updatedBytes,
    bcs.string().serialize(description).toBytes(), // new value
    bcs.string().serialize('Description').toBytes(), // current value
    'Vector(U8)', // type of the constant
  );

  // Update DESCRIPTION
  updatedBytes = template.update_constants(
    updatedBytes,
    bcs.string().serialize(iconUrl).toBytes(), // new value
    bcs.string().serialize('icon_url').toBytes(), // current value
    'Vector(U8)', // type of the constant
  );

  // Update Burnable
  updatedBytes = template.update_constants(
    updatedBytes,
    bcs.bool().serialize(burnable.toLowerCase() == "true").toBytes(), // new value
    bcs.bool().serialize('true'.toLowerCase() == "true").toBytes(), // current value
    'Vector(U8)', // type of the constant
  );


  const tx = new Transaction();
  tx.setGasBudget(100000000);
  const [upgradeCap] = tx.publish({
    modules: [[...updatedBytes], [...fromHex(genesis_bytecode)]],
    dependencies: [
      normalizeSuiObjectId("0x1"),
      normalizeSuiObjectId("0x2"),
      normalizeSuiObjectId(assetTokenizationPackageId),
    ],
  });

  tx.transferObjects(
    [upgradeCap],
    tx.pure("address", signer.getPublicKey().toSuiAddress())
  );

  const txRes = await client
    .signAndExecuteTransaction({
      transaction: tx,
      signer,
      requestType: "WaitForLocalExecution",
      options: {
        showEvents: true,
        showEffects: true,
        showObjectChanges: true,
        showBalanceChanges: true,
        showInput: true,
      },
    })
    .catch((e) => console.error(e)! || null);

  if (txRes?.effects?.status.status === "success") {
    // console.log("New asset published!", JSON.stringify(txRes, null, 2));
    console.log("New asset published! Digest:", txRes.digest);
    const packageId = txRes.effects.created?.find(
      (item) => item.owner === "Immutable"
    )?.reference.objectId;
    console.log("Package ID:", packageId);
  } else {
    console.log("Error: ", txRes?.effects?.status);
    throw new Error("Publishing failed");
  }
};

publishNewAsset(
  "magical_asset",
  "200",
  "MA",
  "Magical Asset",
  "A magical Asset that can be used for magical things!",
  "new-icon_url",
  "true"
);