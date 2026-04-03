import type { Idl } from "@coral-xyz/anchor";
import { eventDiscriminator } from "./discriminator.js";

const pubkey = "pubkey" as const;
const u64 = "u64" as const;
const i64 = "i64" as const;
const bool = "bool" as const;

type IdlTypeDefEntry = NonNullable<Idl["types"]>[number];

function structDef(name: string, fields: unknown): IdlTypeDefEntry {
  return {
    name,
    type: {
      kind: "struct",
      fields: fields as never,
    },
  } as IdlTypeDefEntry;
}

function baseIdl(address: string, programName: string): Pick<Idl, "address" | "metadata" | "instructions"> {
  return {
    address,
    metadata: {
      name: programName,
      version: "0.1.0",
      spec: "0.1.0",
    },
    instructions: [],
  };
}

export function mixerIdl(address: string): Idl {
  const types: NonNullable<Idl["types"]> = [
    structDef("DepositStateEvent", [
      { name: "commitment", type: { array: ["u8", 32] } },
      { name: "leafIndex", type: u64 },
      { name: "mixer", type: pubkey },
      { name: "merkleTree", type: pubkey },
    ]),
    structDef("WithdrawValidated", [
      { name: "recipient", type: pubkey },
      { name: "nullifierHash", type: { array: ["u8", 32] } },
      { name: "mixer", type: pubkey },
      { name: "merkleTree", type: pubkey },
    ]),
  ];
  return {
    ...baseIdl(address, "aintivirus_mixer"),
    types,
    events: [
      { name: "DepositStateEvent", discriminator: eventDiscriminator("DepositStateEvent") },
      { name: "WithdrawValidated", discriminator: eventDiscriminator("WithdrawValidated") },
    ],
  };
}

export function factoryIdl(address: string): Idl {
  const types: NonNullable<Idl["types"]> = [
    structDef("MixerDeployed", [
      { name: "amount", type: u64 },
      { name: "asset", type: pubkey },
      { name: "mixerPool", type: pubkey },
      { name: "mixer", type: pubkey },
      { name: "merkleTree", type: pubkey },
      { name: "authority", type: pubkey },
    ]),
    structDef("Deposited", [
      { name: "user", type: pubkey },
      { name: "asset", type: pubkey },
      { name: "amount", type: u64 },
      { name: "fee", type: u64 },
      { name: "partnerFee", type: u64 },
      { name: "commitment", type: { array: ["u8", 32] } },
      { name: "partner", type: pubkey },
      { name: "mixer", type: pubkey },
    ]),
    structDef("Withdrawn", [
      { name: "asset", type: pubkey },
      { name: "amount", type: u64 },
      { name: "recipient", type: pubkey },
      { name: "nullifierHash", type: { array: ["u8", 32] } },
      { name: "mixer", type: pubkey },
      { name: "fee", type: u64 },
      { name: "relayer", type: pubkey },
    ]),
    structDef("MixerGiftCardEnabledUpdated", [
      { name: "mixerPool", type: pubkey },
      { name: "enabled", type: bool },
    ]),
    structDef("Staked", [
      { name: "staker", type: pubkey },
      { name: "asset", type: pubkey },
      { name: "amount", type: u64 },
    ]),
    structDef("Claimed", [
      { name: "staker", type: pubkey },
      { name: "asset", type: pubkey },
      { name: "seasonId", type: u64 },
      { name: "rewardAmount", type: u64 },
    ]),
    structDef("Unstaked", [
      { name: "staker", type: pubkey },
      { name: "asset", type: pubkey },
      { name: "amount", type: u64 },
    ]),
  ];
  return {
    ...baseIdl(address, "aintivirus_factory"),
    types,
    events: [
      { name: "MixerDeployed", discriminator: eventDiscriminator("MixerDeployed") },
      { name: "Deposited", discriminator: eventDiscriminator("Deposited") },
      { name: "Withdrawn", discriminator: eventDiscriminator("Withdrawn") },
      {
        name: "MixerGiftCardEnabledUpdated",
        discriminator: eventDiscriminator("MixerGiftCardEnabledUpdated"),
      },
      { name: "Staked", discriminator: eventDiscriminator("Staked") },
      { name: "Claimed", discriminator: eventDiscriminator("Claimed") },
      { name: "Unstaked", discriminator: eventDiscriminator("Unstaked") },
    ],
  };
}

export function stakingIdl(address: string): Idl {
  const types: NonNullable<Idl["types"]> = [
    structDef("StakedState", [
      { name: "staker", type: pubkey },
      { name: "asset", type: pubkey },
      { name: "amount", type: u64 },
      { name: "seasonId", type: u64 },
      { name: "weight", type: u64 },
    ]),
    structDef("ClaimedState", [
      { name: "staker", type: pubkey },
      { name: "asset", type: pubkey },
      { name: "seasonId", type: u64 },
      { name: "rewardAmount", type: u64 },
      { name: "weightValue", type: u64 },
      { name: "staked", type: u64 },
      { name: "totalRewardAmount", type: u64 },
      { name: "totalWeightValue", type: u64 },
    ]),
    structDef("UnstakedState", [
      { name: "staker", type: pubkey },
      { name: "asset", type: pubkey },
      { name: "amount", type: u64 },
      { name: "weight", type: u64 },
    ]),
    structDef("NextSeasonStarted", [
      { name: "seasonId", type: u64 },
      { name: "startTimestamp", type: i64 },
      { name: "endTimestamp", type: i64 },
    ]),
    structDef("RewardsAdded", [
      { name: "asset", type: pubkey },
      { name: "amount", type: u64 },
      { name: "seasonId", type: u64 },
    ]),
  ];
  return {
    ...baseIdl(address, "aintivirus_staking"),
    types,
    events: [
      { name: "StakedState", discriminator: eventDiscriminator("StakedState") },
      { name: "ClaimedState", discriminator: eventDiscriminator("ClaimedState") },
      { name: "UnstakedState", discriminator: eventDiscriminator("UnstakedState") },
      { name: "NextSeasonStarted", discriminator: eventDiscriminator("NextSeasonStarted") },
      { name: "RewardsAdded", discriminator: eventDiscriminator("RewardsAdded") },
    ],
  };
}
