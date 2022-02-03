import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";

import {
  UniversalProfile,
  UniversalProfile__factory,
  LSP6KeyManager,
  LSP6KeyManager__factory,
  LSP1UniversalReceiverDelegateUP,
  LSP1UniversalReceiverDelegateUP__factory,
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
describe("UniversalProfile", () => {
  let accounts: SignerWithAddress[];

  let URD: LSP1UniversalReceiverDelegateUP;

  let KM1: LSP6KeyManager,
    KM2: LSP6KeyManager,
    KM3: LSP6KeyManager,
    KM4: LSP6KeyManager;

  let Profile1: UniversalProfile,
    Profile2: UniversalProfile,
    Profile3: UniversalProfile,
    Profile4: UniversalProfile;
  let EOA1: SignerWithAddress,
    EOA2: SignerWithAddress,
    EOA3: SignerWithAddress,
    EOA4: SignerWithAddress;

  let lsp7token: LSP7Mintable;

  beforeAll(async () => {
    accounts = await ethers.getSigners();
    EOA1 = accounts[1];
    EOA2 = accounts[2];
    EOA3 = accounts[3];
    EOA4 = accounts[4];

    Profile1 = await new UniversalProfile__factory(EOA1).deploy(EOA1.address);
    Profile2 = await new UniversalProfile__factory(EOA2).deploy(EOA2.address);
    Profile3 = await new UniversalProfile__factory(EOA3).deploy(EOA3.address);
    Profile4 = await new UniversalProfile__factory(EOA4).deploy(EOA4.address);

    KM1 = await new LSP6KeyManager__factory(EOA1).deploy(Profile1.address);
    KM2 = await new LSP6KeyManager__factory(EOA2).deploy(Profile2.address);
    KM3 = await new LSP6KeyManager__factory(EOA3).deploy(Profile3.address);
    KM4 = await new LSP6KeyManager__factory(EOA4).deploy(Profile4.address);

    URD = await new LSP1UniversalReceiverDelegateUP__factory(
      accounts[0]
    ).deploy();

    await Profile1.connect(EOA1).setData(
      [ERC725YKeys.LSP0.LSP1UniversalReceiverDelegate],
      [URD.address]
    );
    await Profile2.connect(EOA2).setData(
      [ERC725YKeys.LSP0.LSP1UniversalReceiverDelegate],
      [URD.address]
    );

    await Profile3.connect(EOA3).setData(
      [ERC725YKeys.LSP0.LSP1UniversalReceiverDelegate],
      [URD.address]
    );

    await Profile4.connect(EOA4).setData(
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
    await setupPermissions(Profile2, EOA2, URD, KM2);
    await setupPermissions(Profile3, EOA3, URD, KM3);
    await setupPermissions(Profile4, EOA4, URD, KM4);
  });

  describe("Checking", () => {
    it("URD address", async () => {
      const [res1] = await Profile1.getData([
        ERC725YKeys.LSP0.LSP1UniversalReceiverDelegate,
      ]);
      const [res2] = await Profile2.getData([
        ERC725YKeys.LSP0.LSP1UniversalReceiverDelegate,
      ]);
      const [res3] = await Profile3.getData([
        ERC725YKeys.LSP0.LSP1UniversalReceiverDelegate,
      ]);
      const [res4] = await Profile4.getData([
        ERC725YKeys.LSP0.LSP1UniversalReceiverDelegate,
      ]);

      // Checking the same URD address
      expect(await ethers.utils.getAddress(res1)).toEqual(URD.address);
      expect(await ethers.utils.getAddress(res2)).toEqual(URD.address);
      expect(await ethers.utils.getAddress(res3)).toEqual(URD.address);
      expect(await ethers.utils.getAddress(res4)).toEqual(URD.address);
    });
  });

  describe("Testing URD with Tokens", () => {
    it("Mint tokens to each Profile", async () => {
      await lsp7token
        .connect(accounts[5])
        .mint(Profile1.address, 20, false, "0x");

      await lsp7token
        .connect(accounts[5])
        .mint(Profile2.address, 20, false, "0x");

      await lsp7token
        .connect(accounts[5])
        .mint(Profile3.address, 20, false, "0x");

      await lsp7token
        .connect(accounts[5])
        .mint(Profile4.address, 20, false, "0x");

      const res1 = await lsp7token.balanceOf(Profile1.address);
      const res2 = await lsp7token.balanceOf(Profile2.address);
      const res3 = await lsp7token.balanceOf(Profile3.address);
      const res4 = await lsp7token.balanceOf(Profile4.address);

      // Testing if the tokens are minted successfully
      expect(res1.toNumber()).toEqual(20);
      expect(res2.toNumber()).toEqual(20);
      expect(res3.toNumber()).toEqual(20);
      expect(res4.toNumber()).toEqual(20);
    });

    it("Checking keys in the storage", async () => {
      let [arrayLengthP1, element1AddressP1] = await getMapAndArrayKeyValues(
        Profile1,
        ERC725YKeys.LSP5["LSP5ReceivedAssets[]"],
        LSP5_ARRAY_KEY.ELEMENT1
      );

      let [arrayLengthP2, element1AddressP2] = await getMapAndArrayKeyValues(
        Profile2,
        ERC725YKeys.LSP5["LSP5ReceivedAssets[]"],
        LSP5_ARRAY_KEY.ELEMENT1
      );

      let [arrayLengthP3, element1AddressP3] = await getMapAndArrayKeyValues(
        Profile3,
        ERC725YKeys.LSP5["LSP5ReceivedAssets[]"],
        LSP5_ARRAY_KEY.ELEMENT1
      );

      let [arrayLengthP4, element1AddressP4] = await getMapAndArrayKeyValues(
        Profile4,
        ERC725YKeys.LSP5["LSP5ReceivedAssets[]"],
        LSP5_ARRAY_KEY.ELEMENT1
      );

      // Checking the keys if registered during minting
      expect(arrayLengthP1).toEqual(ARRAY_LENGTH.ONE);
      expect(await ethers.utils.getAddress(element1AddressP1)).toEqual(
        lsp7token.address
      );

      expect(arrayLengthP2).toEqual(ARRAY_LENGTH.ONE);
      expect(await ethers.utils.getAddress(element1AddressP2)).toEqual(
        lsp7token.address
      );

      expect(arrayLengthP3).toEqual(ARRAY_LENGTH.ONE);
      expect(await ethers.utils.getAddress(element1AddressP3)).toEqual(
        lsp7token.address
      );

      expect(arrayLengthP4).toEqual(ARRAY_LENGTH.ONE);
      expect(await ethers.utils.getAddress(element1AddressP4)).toEqual(
        lsp7token.address
      );
    });

    it("Transferring tokens to each other", async () => {
      // transferring token from UP1 to UP2
      let abi1 = lsp7token.interface.encodeFunctionData("transfer", [
        Profile1.address,
        Profile2.address,
        "20",
        false,
        "0x",
      ]);

      let abiExecutor1 = Profile1.interface.encodeFunctionData("execute", [
        OPERATIONS.CALL,
        lsp7token.address,
        0,
        abi1,
      ]);

      await KM1.connect(EOA1).execute(abiExecutor1);

      // transferring token from UP3 to UP4
      let abi3 = lsp7token.interface.encodeFunctionData("transfer", [
        Profile3.address,
        Profile4.address,
        "20",
        false,
        "0x",
      ]);

      let abiExecutor3 = Profile3.interface.encodeFunctionData("execute", [
        OPERATIONS.CALL,
        lsp7token.address,
        0,
        abi3,
      ]);

      await KM3.connect(EOA3).execute(abiExecutor3);

      const res1 = await lsp7token.balanceOf(Profile1.address);
      const res2 = await lsp7token.balanceOf(Profile2.address);
      const res3 = await lsp7token.balanceOf(Profile3.address);
      const res4 = await lsp7token.balanceOf(Profile4.address);

      // Checking if the token transfer was successful
      expect(res1.toNumber()).toEqual(0);
      expect(res2.toNumber()).toEqual(40);
      expect(res3.toNumber()).toEqual(0);
      expect(res4.toNumber()).toEqual(40);
    });

    it("Checking keys in the storage", async () => {
      let [arrayLengthP1, element1AddressP1] = await getMapAndArrayKeyValues(
        Profile1,
        ERC725YKeys.LSP5["LSP5ReceivedAssets[]"],
        LSP5_ARRAY_KEY.ELEMENT1
      );

      let [arrayLengthP2, element1AddressP2] = await getMapAndArrayKeyValues(
        Profile2,
        ERC725YKeys.LSP5["LSP5ReceivedAssets[]"],
        LSP5_ARRAY_KEY.ELEMENT1
      );

      let [arrayLengthP3, element1AddressP3] = await getMapAndArrayKeyValues(
        Profile3,
        ERC725YKeys.LSP5["LSP5ReceivedAssets[]"],
        LSP5_ARRAY_KEY.ELEMENT1
      );

      let [arrayLengthP4, element1AddressP4] = await getMapAndArrayKeyValues(
        Profile4,
        ERC725YKeys.LSP5["LSP5ReceivedAssets[]"],
        LSP5_ARRAY_KEY.ELEMENT1
      );

      // Checking if the keys are updated in UP1 and UP3 and still the same in UP2 and UP4
      expect(arrayLengthP1).toEqual(ARRAY_LENGTH.ZERO);
      expect(element1AddressP1).toEqual("0x");

      expect(arrayLengthP2).toEqual(ARRAY_LENGTH.ONE);
      expect(await ethers.utils.getAddress(element1AddressP2)).toEqual(
        lsp7token.address
      );

      expect(arrayLengthP3).toEqual(ARRAY_LENGTH.ZERO);
      expect(element1AddressP3).toEqual("0x");

      expect(arrayLengthP4).toEqual(ARRAY_LENGTH.ONE);
      expect(await ethers.utils.getAddress(element1AddressP4)).toEqual(
        lsp7token.address
      );
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
