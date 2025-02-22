import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { TargetContract, TargetContract__factory } from "../../../types";

// constants
import {
  ALL_PERMISSIONS_SET,
  ERC725YKeys,
  OPERATIONS,
  PERMISSIONS,
} from "../../../constants";

// setup
import { LSP6TestContext } from "../../utils/context";
import { setupKeyManager } from "../../utils/fixtures";

// helpers
import {
  abiCoder,
  provider,
  EMPTY_PAYLOAD,
  getRandomAddresses,
  NotAllowedAddressError,
} from "../../utils/helpers";

export const shouldBehaveLikeAllowedAddresses = (
  buildContext: () => Promise<LSP6TestContext>
) => {
  let context: LSP6TestContext;

  let canCallOnlyTwoAddresses: SignerWithAddress;

  let allowedEOA: SignerWithAddress,
    notAllowedEOA: SignerWithAddress,
    allowedTargetContract: TargetContract,
    notAllowedTargetContract: TargetContract;

  beforeEach(async () => {
    context = await buildContext();

    canCallOnlyTwoAddresses = context.accounts[1];
    allowedEOA = context.accounts[2];
    notAllowedEOA = context.accounts[3];

    allowedTargetContract = await new TargetContract__factory(
      context.accounts[0]
    ).deploy();

    notAllowedTargetContract = await new TargetContract__factory(
      context.accounts[0]
    ).deploy();

    let permissionsKeys = [
      ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
        context.owner.address.substring(2),
      ERC725YKeys.LSP6["AddressPermissions:Permissions"] +
        canCallOnlyTwoAddresses.address.substring(2),
      ERC725YKeys.LSP6["AddressPermissions:AllowedAddresses"] +
        canCallOnlyTwoAddresses.address.substring(2),
    ];

    let permissionsValues = [
      ALL_PERMISSIONS_SET,
      ethers.utils.hexZeroPad(PERMISSIONS.CALL + PERMISSIONS.TRANSFERVALUE, 32),
      abiCoder.encode(
        ["address[]"],
        [[allowedEOA.address, allowedTargetContract.address]]
      ),
    ];

    await setupKeyManager(context, permissionsKeys, permissionsValues);

    await context.owner.sendTransaction({
      to: context.universalProfile.address,
      value: ethers.utils.parseEther("10"),
    });
  });

  describe("when caller has no ALLOWED ADDRESSES set", () => {
    describe("it should be allowed to interact with any address", () => {
      const randomAddresses = getRandomAddresses(5);

      randomAddresses.forEach((recipient) => {
        it(`sending 1 LYX to EOA ${recipient}`, async () => {
          let initialBalanceUP = await provider.getBalance(
            context.universalProfile.address
          );
          let initialBalanceEOA = await provider.getBalance(recipient);

          let amount = ethers.utils.parseEther("1");

          let transferPayload =
            context.universalProfile.interface.encodeFunctionData("execute", [
              OPERATIONS.CALL,
              recipient,
              amount,
              EMPTY_PAYLOAD,
            ]);

          await context.keyManager
            .connect(context.owner)
            .execute(transferPayload);

          let newBalanceUP = await provider.getBalance(
            context.universalProfile.address
          );
          expect(parseInt(newBalanceUP)).toBeLessThan(
            parseInt(initialBalanceUP)
          );

          let newBalanceEOA = await provider.getBalance(recipient);
          expect(parseInt(newBalanceEOA)).toBeGreaterThan(
            parseInt(initialBalanceEOA)
          );
        });
      });
    });
  });

  describe("when caller has 2 x ALLOWED ADDRESSES set", () => {
    it("should be allowed to send LYX to an allowed address (= EOA)", async () => {
      let initialBalanceUP = await provider.getBalance(
        context.universalProfile.address
      );
      let initialBalanceEOA = await provider.getBalance(allowedEOA.address);

      let amount = ethers.utils.parseEther("1");

      let transferPayload =
        context.universalProfile.interface.encodeFunctionData("execute", [
          OPERATIONS.CALL,
          allowedEOA.address,
          amount,
          EMPTY_PAYLOAD,
        ]);

      await context.keyManager
        .connect(canCallOnlyTwoAddresses)
        .execute(transferPayload);

      let newBalanceUP = await provider.getBalance(
        context.universalProfile.address
      );
      expect(parseInt(newBalanceUP)).toBeLessThan(parseInt(initialBalanceUP));

      let newBalanceEOA = await provider.getBalance(allowedEOA.address);
      expect(parseInt(newBalanceEOA)).toBeGreaterThan(
        parseInt(initialBalanceEOA)
      );
    });

    it("should be allowed to interact with an allowed address (= contract)", async () => {
      const argument = "new name";

      let targetContractPayload =
        allowedTargetContract.interface.encodeFunctionData("setName", [
          argument,
        ]);

      let payload = context.universalProfile.interface.encodeFunctionData(
        "execute",
        [
          OPERATIONS.CALL,
          allowedTargetContract.address,
          0,
          targetContractPayload,
        ]
      );

      await context.keyManager
        .connect(canCallOnlyTwoAddresses)
        .execute(payload);

      const result = await allowedTargetContract.callStatic.getName();
      expect(result).toEqual(argument);
    });

    it("should revert when sending LYX to a non-allowed address (= EOA)", async () => {
      let initialBalanceUP = await provider.getBalance(
        context.universalProfile.address
      );
      let initialBalanceRecipient = await provider.getBalance(
        notAllowedEOA.address
      );

      let transferPayload =
        context.universalProfile.interface.encodeFunctionData("execute", [
          OPERATIONS.CALL,
          notAllowedEOA.address,
          ethers.utils.parseEther("1"),
          EMPTY_PAYLOAD,
        ]);

      try {
        await context.keyManager
          .connect(canCallOnlyTwoAddresses)
          .execute(transferPayload);
      } catch (error) {
        expect(error.message).toMatch(
          NotAllowedAddressError(
            canCallOnlyTwoAddresses.address,
            notAllowedEOA.address
          )
        );
      }

      let newBalanceUP = await provider.getBalance(
        context.universalProfile.address
      );
      let newBalanceRecipient = await provider.getBalance(
        notAllowedEOA.address
      );

      expect(parseInt(newBalanceUP)).toBe(parseInt(initialBalanceUP));
      expect(parseInt(initialBalanceRecipient)).toBe(
        parseInt(newBalanceRecipient)
      );
    });

    it("should revert when interacting with an non-allowed address (= contract)", async () => {
      const argument = "new name";

      let targetContractPayload =
        notAllowedTargetContract.interface.encodeFunctionData("setName", [
          argument,
        ]);

      let payload = context.universalProfile.interface.encodeFunctionData(
        "execute",
        [
          OPERATIONS.CALL,
          notAllowedTargetContract.address,
          0,
          targetContractPayload,
        ]
      );

      try {
        await context.keyManager
          .connect(canCallOnlyTwoAddresses)
          .execute(payload);
      } catch (error) {
        expect(error.message).toMatch(
          NotAllowedAddressError(
            canCallOnlyTwoAddresses.address,
            notAllowedTargetContract.address
          )
        );
      }
    });
  });
};
