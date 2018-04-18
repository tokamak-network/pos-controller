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
const POSMintableToken = artifacts.require("./POSMintableToken.sol");
const POSMiniMeToken = artifacts.require("./POSMiniMeToken.sol");
const POSController = artifacts.require("./POSController.sol");

contract("POS", async (holders) => {
  const minime = {
    token: null,
    controller: null,
    posInitBlock: -1,
  };

  const mintable = {
    token: null,
    controller: null,
    posInitBlock: -1,
  };

  const pairs = [ minime, mintable ];

  let factory;

  // PoS parameters
  const posInterval = new BigNumber(200);
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

  const getTokenBalance = token => holder => token.balanceOf(holder);
  const claimTokens = controller => holder => controller.claim(holder, { from: holder });
  const claimAllHolderTokens = controller => Promise.all(tokenHolders
    .map(claimTokens(controller))
    .map(p => p.should.be.fulfilled));

  // setup
  before(async () => {
    console.log("creating factory");

    factory = await POSFactory.new();

    // TODO: get address of token and controller from tx event
    // minime
    const [ minimeTokenAddr, minimeControllerAddr ] = await factory.createMiniMeToken(
      0,
      0,
      "Test Minime Token",
      18,
      "TMT",
      true,
      posInterval,
      0,
      posRate,
      posCoeff,
    );

    minime.token = POSMiniMeToken.at(minimeTokenAddr);
    minime.controller = POSController.at(minimeTokenAddr);
    minime.posInitBlock = await minime.controller.initBlockNumber();

    console.log("minime created");

    // mintable
    const [ mintableTokenAddr, mintableControllerAddr ] = await factory.createMintableToken(
      posInterval,
      0,
      posRate,
      posCoeff,
    );

    mintable.token = POSMiniMeToken.at(minimeTokenAddr);
    mintable.controller = POSController.at(minimeControllerAddr);
    mintable.posInitBlock = await mintable.controller.initBlockNumber();

    console.log("mintable created");

    await Promise.all(tokenHolders.map(holder =>
      minime.token.generateTokens(holder, tokenAmount)
        .should.be.fulfilled));

    await Promise.all(tokenHolders.map(holder =>
      mintable.token.generateTokens(holder, tokenAmount)
        .should.be.fulfilled));

    await minime.token.changeController(minime.controller.address)
      .should.be.fulfilled;
    await mintable.token.transferOwnership(minime.controller.address)
      .should.be.fulfilled;
  });

  it("holders cannot claim tokens before interval passed", async () => {
    for (const { token, controller } of pairs) {
      const beforeBalances = await Promise.all(tokenHolders.map(getTokenBalance(token)));

      await claimAllHolderTokens(controller);

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

    for (const { token, controller } of pairs) {
      const tokenHolder = tokenHolders[ 0 ];
      const claimRate = _1ClaimRate;

      const beforeBalance = await getTokenBalance(token)(tokenHolder);
      await claimTokens(controller)(tokenHolder);
      const expectedBalance = beforeBalance.mul(claimRate);

      const afterBalance = await getTokenBalance(token)(tokenHolder);

      afterBalance.should.be.bignumber.equal(expectedBalance);
    }
  });

  it("a holder can claim tokens after one more interval passed", async () => {
    await moveAfterInterval();

    for (const { token, controller } of pairs) {
      const tokenHolder = tokenHolders[ 0 ];
      const claimRate = _1ClaimRate;

      const beforeBalance = await getTokenBalance(token)(tokenHolder);
      await claimTokens(controller)(tokenHolder);
      const expectedBalance = beforeBalance.mul(claimRate);

      const afterBalance = await getTokenBalance(token)(tokenHolder);

      afterBalance.should.be.bignumber.equal(expectedBalance);
    }
  });

  it("a holder can claim tokens after 2 intervals passed", async () => {
    for (const { token, controller } of pairs) {
      const tokenHolder = tokenHolders[ 1 ];
      const claimRate = _2ClaimRate;

      const beforeBalance = await getTokenBalance(token)(tokenHolder);
      await claimTokens(controller)(tokenHolder);
      const expectedBalance = beforeBalance.mul(claimRate);

      const afterBalance = await getTokenBalance(token)(tokenHolder);

      afterBalance.should.be.bignumber.equal(expectedBalance);
    }
  });

  it("a holder can claim tokens after 3 intervals passed", async () => {
    await moveAfterInterval();

    for (const { token, controller } of pairs) {
      const tokenHolder = tokenHolders[ 2 ];
      const claimRate = _3ClaimRate;

      const beforeBalance = await getTokenBalance(token)(tokenHolder);
      await claimTokens(controller)(tokenHolder);
      const expectedBalance = beforeBalance.mul(claimRate);

      const afterBalance = await getTokenBalance(token)(tokenHolder);

      afterBalance.should.be.bignumber.equal(expectedBalance);
    }
  });

  // TODO: fix test or contract
  it("holders can claim tokens after 2 intervals passed", async () => {
    for (const { controller } of pairs) {
      await claimAllHolderTokens(controller);
    }

    await moveAfterInterval();
    await moveAfterInterval();

    for (const { token, controller } of pairs) {
      const beforeBalances = await Promise.all(tokenHolders.map(getTokenBalance(token)));
      const claimRate = _2ClaimRate;

      await Promise.all(tokenHolders
        .map(claimTokens(controller))
        .map(p => p.should.be.fulfilled));

      const afterBalances = await Promise.all(tokenHolders.map(getTokenBalance(token)));

      afterBalances.forEach((afterBalance, i) => {
        const beforeBalance = beforeBalances[ i ];

        afterBalance.should.be.bignumber
          .equal(beforeBalance.mul(claimRate));
      });
    }
  });

  // TODO: fix test or contract
  it("holders can claim tokens after 3 interval passed", async () => {
    for (const { controller } of pairs) {
      await claimAllHolderTokens(controller);
    }
    await moveAfterInterval(); // 10%
    await moveAfterInterval(); // 21%
    await moveAfterInterval(); // 33.1%

    for (const { token, controller } of pairs) {
      const beforeBalances = await Promise.all(holders.map(getTokenBalance(token)));
      const claimRate = _3ClaimRate;

      await Promise.all(holders
        .map(claimTokens(controller))
        .map(p => p.should.be.fulfilled));

      const afterBalances = await Promise.all(holders.map(getTokenBalance(token)));

      afterBalances.forEach((afterBalance, i) => {
        const beforeBalance = beforeBalances[ i ];
        afterBalance.should.be.bignumber
          .equal(beforeBalance.mul(claimRate));
      });
    }
  });

  // TODO: fix test or contract
  it("should generate claimed token when transfer occured", async () => {
    for (const { controller } of pairs) {
      await claimAllHolderTokens(controller);
    }
    await moveAfterInterval(); // 10%
    await moveAfterInterval(); // 21%

    for (const { token, controller } of pairs) {
      const holder0 = holders[ 0 ];
      const holder1 = holders[ 1 ];
      const tokenAmountToTransfer = ether(0.001);

      const holder0BalanceBefore = await getTokenBalance(token)(holder0);
      const holder1BalanceBefore = await getTokenBalance(token)(holder1);
      const claimRate = _2ClaimRate;

      const expectedHolder0Balance = holder0BalanceBefore.mul(claimRate)
        .sub(tokenAmountToTransfer);
      const expectedHolder1Balance = holder1BalanceBefore.mul(claimRate)
        .add(tokenAmountToTransfer);

      await token.transfer(holder1, tokenAmountToTransfer, { from: holder0 });

      const holder0BalanceAfter = await getTokenBalance(token)(holder0);
      const holder1BalanceAfter = await getTokenBalance(token)(holder1);

      holder0BalanceAfter.should.be.bignumber
        .equal(expectedHolder0Balance);
      holder1BalanceAfter.should.be.bignumber
        .equal(expectedHolder1Balance);
    }
  });

  // TODO: test when multiple claims or transfers is in a single block
  // especially for one single holder
});
