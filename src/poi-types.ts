import type { Proof } from './transaction-types'

type POIPublicInputs = {
  proof: Proof;
  poiMerkleroots: Uint8Array[];
  anyRailgunTxidMerklerootAfterTransaction: Uint8Array;
}

 type POICircuitInputs = {
   // --- Public inputs ---
   anyRailgunTxidMerklerootAfterTransaction: Uint8Array;
   poiMerkleroots: Uint8Array[];

   // --- Private inputs ---

   // Railgun Transaction info
   boundParamsHash: Uint8Array;
   nullifiers: Uint8Array[];
   commitmentsOut: Uint8Array[];

   // Spender wallet info
   spendingPublicKey: Uint8Array[];
   nullifyingKey: Uint8Array;

   // Nullified notes data
   token: Uint8Array;
   randomsIn: Uint8Array[];
   valuesIn: bigint[];
   utxoPositionsIn: number[];
   utxoTreeIn: number;

   // Commitment notes data
   npksOut: Uint8Array[];
   valuesOut: bigint[];
   utxoBatchGlobalStartPositionOut: Uint8Array;

   // Unshield data
   railgunTxidIfHasUnshield: Uint8Array;

   // Railgun txidIndex: string; tree
   railgunTxidMerkleProofIndices: Uint8Array;
   railgunTxidMerkleProofPathElements: Uint8Array[];

   // POI tree
   poiInMerkleProofIndices: number[];
   poiInMerkleProofPathElements: Uint8Array[][];
 }

 type POISnarkjsFormattedCircuitInputs = {
   // Public inputs
   anyRailgunTxidMerklerootAfterTransaction: string;
   poiMerkleroots: string[];

   // Private inputs
   boundParamsHash: string;
   nullifiers: string[];
   commitmentsOut: string[];
   spendingPublicKey: string[];
   nullifyingKey: string;
   token: string;
   randomsIn: string[];
   valuesIn: string[];
   utxoPositionsIn: number[];
   utxoTreeIn: number;
   npksOut: string[];
   valuesOut: string[];
   utxoBatchGlobalStartPositionOut: string;
   railgunTxidIfHasUnshield: string;
   railgunTxidMerkleProofIndices: string;
   railgunTxidMerkleProofPathElements: string[];
   poiInMerkleProofIndices: string[];
   poiInMerkleProofPathElements: string[][];
 }

export type { POIPublicInputs, POICircuitInputs, POISnarkjsFormattedCircuitInputs }
