import range from "lodash/range";

import ether from "./helpers/ether";
import advanceToBlock, { advanceBlock } from "./helpers/advanceToBlock";
import increaseTime, { increaseTimeTo, duration } from "./helpers/increaseTime";
import latestTime from "./helpers/latestTime";
import EVMThrow from "./helpers/EVMThrow";
import { capture, restore, Snapshot } from "./helpers/snapshot";
import timer from "./helpers/timer";
import sendTransaction from "./helpers/sendTransaction";
import "./helpers/upgradeBigNumber";

const moment = require("moment");

const BigNumber = web3.BigNumber;
const eth = web3.eth;

const should = require("chai")
  .use(require("chai-as-promised"))
  .use(require("chai-bignumber")(BigNumber))
  .should();

const POSFactory = artifacts.require("./POSFactory.sol");
const POSMintableToken = artifacts.require("./POSMintableTokenImpl.sol");
const POSMiniMeToken = artifacts.require("./POSMiniMeTokenImpl.sol");
const POSController = artifacts.require("./POSController.sol");

contract("POS", async ([ owner, ...holders ]) => {
  // contract instances
  let factory;

  const minime = {
    token: null,
    posController: null,
    posInitBlock: -1,
  };

  const mintable = {
    token: null,
    posController: null,
    posInitBlock: -1,
  };

  const pairs = [ minime, mintable ];

  // PoS parameters
  const posInterval = new BigNumber(100);
  const posRate = new BigNumber(100);
  const posCoeff = new BigNumber(1000);
  const _1ClaimRate = new BigNumber(1.100);
  const _2ClaimRate = new BigNumber(1.210);
  const _3ClaimRate = new BigNumber(1.331);

  // common parameters
  const numHolders = 5;
  const tokenHolders = holders.slice(1, numHolders + 1);
  const tokenAmount = ether(10);

  // helper function
  const moveAfterInterval = async () => {
    const initBlock = Math.min(minime.posInitBlock, mintable.posInitBlock);
    const currentBlockNumber = web3.eth.blockNumber;
    const diff = posInterval - (currentBlockNumber - initBlock) % posInterval;
    const targetBlockNumber = currentBlockNumber + diff + 5; // 5 more blocks

    console.log(`move from ${ web3.eth.blockNumber } to ${ targetBlockNumber } with posInitBlock ${ initBlock }, diff ${ diff }`);

    await advanceToBlock(targetBlockNumber);
  };

  let receipt; // tx receipt

  const getTokenBalance = token => holder => token.balanceOf(holder);
  const claimTokens = posController => holder => posController.claimTokens(holder, { from: holder })
    .should.be.fulfilled;
  const claimAllHolderTokens = posController => Promise.all(tokenHolders
    .map(claimTokens(posController))
    .map(p => p.should.be.fulfilled));

  // setup
  before(async () => {
    factory = await POSFactory.new();

    // minime
    receipt = await factory.createMiniMeToken(
      0,
      0,
      "Test Minime Token",
      18,
      "TMT1",
      true,
      posInterval,
      0,
      posRate,
      posCoeff,
    ).should.be.fulfilled;

    minime.token = POSMiniMeToken.at(receipt.logs.filter(l => l.event === "Deploy")[ 0 ].args._token);
    minime.posController = POSController.at(receipt.logs.filter(l => l.event === "Deploy")[ 0 ].args._controller);
    minime.posInitBlock = await minime.posController.initBlockNumber();

    // mintable
    receipt = await factory.createMintableToken(
      "Test Mintable Token",
      18,
      "TMT2",
      posInterval,
      0,
      posRate,
      posCoeff,
    ).should.be.fulfilled;

    mintable.token = POSMintableToken.at(receipt.logs.filter(l => l.event === "Deploy")[ 0 ].args._token);
    mintable.posController = POSController.at(receipt.logs.filter(l => l.event === "Deploy")[ 0 ].args._controller);
    mintable.posInitBlock = await mintable.posController.initBlockNumber();

    // claim token ownership to mint tokens
    await mintable.posController.claimTokenOwnership(owner)
      .should.be.fulfilled;

    await minime.posController.claimTokenOwnership(owner)
      .should.be.fulfilled;

    // mint to token holders
    await Promise.all(tokenHolders.map(holder =>
      minime.token.generateTokens(holder, tokenAmount)
        .should.be.fulfilled));

    await Promise.all(tokenHolders.map(holder =>
      mintable.token.mint(holder, tokenAmount)
        .should.be.fulfilled));

    await minime.token.changeController(minime.posController.address)
      .should.be.fulfilled;
    await mintable.token.transferOwnership(mintable.posController.address)
      .should.be.fulfilled;
  });

  it("only owner can reclaim tokne ownership", async () => {
    const other = holders[ 0 ];

    // mintable
    await mintable.posController.claimTokenOwnership(other, {
      from: other,
    }).should.be.rejectedWith(EVMThrow);

    await mintable.posController.claimTokenOwnership(owner)
      .should.be.fulfilled;

    // minime
    await minime.posController.claimTokenOwnership(other, {
      from: other,
    }).should.be.rejectedWith(EVMThrow);

    await minime.posController.claimTokenOwnership(owner)
      .should.be.fulfilled;

    (await mintable.token.owner())
      .should.be.equal(owner);

    (await minime.token.controller())
      .should.be.equal(owner);

    // recover
    await minime.token.changeController(minime.posController.address)
      .should.be.fulfilled;
    await mintable.token.transferOwnership(mintable.posController.address)
      .should.be.fulfilled;
  });

  it("holders cannot claim tokens before interval passed", async () => {
    for (const { token, posController } of pairs) {
      const beforeBalances = await Promise.all(tokenHolders.map(getTokenBalance(token)));

      await claimAllHolderTokens(posController);

      const afterBalances = await Promise.all(tokenHolders.map(getTokenBalance(token)));

      beforeBalances.should.be.deep.equal(afterBalances);

      afterBalances.forEach((afterBalance, i) => {
        const beforeBalance = beforeBalances[ i ];

        afterBalance.should.be.bignumber.equal(beforeBalance);
      });
    }
  });

  it("a holder can claim tokens after interval passed", async () => {
    await moveAfterInterval();

    for (const { token, posController } of pairs) {
      const tokenHolder = tokenHolders[ 0 ];
      const claimRate = _1ClaimRate;

      const beforeBalance = await getTokenBalance(token)(tokenHolder);
      await claimTokens(posController)(tokenHolder);
      const expectedBalance = beforeBalance.mul(claimRate);

      const afterBalance = await getTokenBalance(token)(tokenHolder);

      afterBalance.should.be.bignumber.equal(expectedBalance);
    }
  });

  it("a holder can claim tokens after one more interval passed", async () => {
    await moveAfterInterval();

    for (const { token, posController } of pairs) {
      const tokenHolder = tokenHolders[ 0 ];
      const claimRate = _1ClaimRate;

      const beforeBalance = await getTokenBalance(token)(tokenHolder);
      await claimTokens(posController)(tokenHolder);
      const expectedBalance = beforeBalance.mul(claimRate);

      const afterBalance = await getTokenBalance(token)(tokenHolder);

      afterBalance.should.be.bignumber.equal(expectedBalance);
    }
  });

  it("a holder can claim tokens after 2 intervals passed", async () => {
    for (const { token, posController } of pairs) {
      const tokenHolder = tokenHolders[ 1 ];
      const claimRate = _2ClaimRate;

      const beforeBalance = await getTokenBalance(token)(tokenHolder);
      await claimTokens(posController)(tokenHolder);
      const expectedBalance = beforeBalance.mul(claimRate);

      const afterBalance = await getTokenBalance(token)(tokenHolder);

      afterBalance.should.be.bignumber.equal(expectedBalance);
    }
  });

  it("a holder can claim tokens after 3 intervals passed", async () => {
    await moveAfterInterval();

    for (const { token, posController } of pairs) {
      const tokenHolder = tokenHolders[ 2 ];
      const claimRate = _3ClaimRate;

      const beforeBalance = await getTokenBalance(token)(tokenHolder);
      await claimTokens(posController)(tokenHolder);
      const expectedBalance = beforeBalance.mul(claimRate);

      const afterBalance = await getTokenBalance(token)(tokenHolder);

      afterBalance.should.be.bignumber.equal(expectedBalance);
    }
  });

  // testing below single case is successful
  it("holders can claim tokens after 1 intervals passed", async () => {
    for (const { posController } of pairs) {
      await claimAllHolderTokens(posController);
    }

    await moveAfterInterval();

    for (const { token, posController } of pairs) {
      const beforeBalances = await Promise.all(tokenHolders.map(getTokenBalance(token)));
      const claimRate = _1ClaimRate;

      await Promise.all(tokenHolders
        .map(claimTokens(posController)));

      const afterBalances = await Promise.all(tokenHolders.map(getTokenBalance(token)));

      afterBalances.forEach((afterBalance, i) => {
        const beforeBalance = beforeBalances[ i ];

        afterBalance.should.be.bignumber
          .equal(beforeBalance.mul(claimRate));
      });
    }
  });

  // testing below single case is successful
  it("holders can claim tokens after 2 intervals passed", async () => {
    for (const { posController } of pairs) {
      await claimAllHolderTokens(posController);
    }

    await moveAfterInterval();
    await moveAfterInterval();

    for (const { token, posController } of pairs) {
      const beforeBalances = await Promise.all(tokenHolders.map(getTokenBalance(token)));
      const claimRate = _2ClaimRate;

      await Promise.all(tokenHolders
        .map(claimTokens(posController)));

      const afterBalances = await Promise.all(tokenHolders.map(getTokenBalance(token)));

      afterBalances.forEach((afterBalance, i) => {
        const beforeBalance = beforeBalances[ i ];

        afterBalance.should.be.bignumber
          .equal(beforeBalance.mul(claimRate));
      });
    }
  });

  // testing below single case is successful
  it("holders can claim tokens after 3 interval passed", async () => {
    for (const { posController } of pairs) {
      await claimAllHolderTokens(posController);
    }
    await moveAfterInterval(); // 10%
    await moveAfterInterval(); // 21%
    await moveAfterInterval(); // 33.1%

    for (const { token, posController } of pairs) {
      const beforeBalances = await Promise.all(tokenHolders.map(getTokenBalance(token)));
      const claimRate = _3ClaimRate;

      await Promise.all(tokenHolders
        .map(claimTokens(posController)));

      const afterBalances = await Promise.all(tokenHolders.map(getTokenBalance(token)));

      afterBalances.forEach((afterBalance, i) => {
        const beforeBalance = beforeBalances[ i ];
        afterBalance.should.be.bignumber
          .equal(beforeBalance.mul(claimRate));
      });
    }
  });

  it("should generate claimed token when transfer occured", async () => {
    for (const { posController } of pairs) {
      await claimAllHolderTokens(posController);
    }

    await moveAfterInterval(); // 10%
    await moveAfterInterval(); // 21%

    for (const { token, posController } of pairs) {
      const holder0 = tokenHolders[ 0 ];
      const holder1 = tokenHolders[ 1 ];
      const tokenAmountToTransfer = ether(0.001);

      const holder0BalanceBefore = await getTokenBalance(token)(holder0);
      const holder1BalanceBefore = await getTokenBalance(token)(holder1);
      const claimRate = _2ClaimRate;

      const expectedHolder0Balance = holder0BalanceBefore.mul(claimRate)
        .sub(tokenAmountToTransfer);
      const expectedHolder1Balance = holder1BalanceBefore.mul(claimRate)
        .add(tokenAmountToTransfer);

      await token.transfer(holder1, tokenAmountToTransfer, { from: holder0 })
        .should.be.fulfilled;

      const holder0BalanceAfter = await getTokenBalance(token)(holder0);
      const holder1BalanceAfter = await getTokenBalance(token)(holder1);

      holder0BalanceAfter.should.be.bignumber
        .equal(expectedHolder0Balance);
      holder1BalanceAfter.should.be.bignumber
        .equal(expectedHolder1Balance);
    }
  });

  it("should generate no extra tokens for self-transfer", async () => {
    for (const { posController } of pairs) {
      await claimAllHolderTokens(posController);
    }

    await moveAfterInterval(); // 10%
    const claimRate = _1ClaimRate;

    for (const { token, posController } of pairs) {
      const holder = tokenHolders[ 3 ];
      const tokenAmountToTransfer = ether(0.000001);

      const beforeBalance = await getTokenBalance(token)(holder);
      const expectedBalance = beforeBalance.mul(claimRate);

      beforeBalance.should.be.bignumber.gt(tokenAmountToTransfer);

      await token.transfer(holder, tokenAmountToTransfer, {
        from: holder,
      }).should.be.fulfilled;

      const afterBalance = await getTokenBalance(token)(holder);

      afterBalance.should.be.bignumber.equal(expectedBalance);
    }
  });

  // TODO: test MiniMeToken when multiple claims or transfers is in a single block
  // especially for one single holder
});
