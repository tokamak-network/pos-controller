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

const Token = artifacts.require("./MiniMeToken.sol");
const PoS = artifacts.require("./PoS.sol");

contract("PoS", async (holders) => {
  let token, pos;

  // PoS parameters
  const posInterval = new BigNumber(100);
  const posRate = new BigNumber(100);
  const posCoeff = new BigNumber(1000);
  const _1ClaimRate = new BigNumber(1.100);
  const _2ClaimRate = new BigNumber(1.210);
  const _3ClaimRate = new BigNumber(1.331);

  let posInitBlock;

  // common parameters
  const numHolders = 5;
  const tokenHolders = holders.slice(1, numHolders + 1);
  const tokenAmount = ether(10);

  // helper function
  const moveAfterInterval = async () => {
    const currentBlockNumber = web3.eth.blockNumber;
    const targetBlockNumber = Number(currentBlockNumber) + Number(posInterval);
    const diff = posInterval - (currentBlockNumber - posInitBlock) % posInterval;

    console.log(`move from ${ web3.eth.blockNumber } to ${ targetBlockNumber } with posInitBlock ${ posInitBlock }, diff ${ diff }`);

    await advanceToBlock(targetBlockNumber);
  };
  const getTokenBalance = holder => token.balanceOf(holder);
  const claimTokens = holder => pos.claim(holder, { from: holder });
  const claimAllHolderTokens = () => Promise.all(tokenHolders
    .map(claimTokens)
    .map(p => p.should.be.fulfilled));

  // setup
  before(async () => {
    token = await Token.new(
      0,
      0,
      0,
      "Test Minime Token",
      18,
      "TMT",
      true,
    );

    await Promise.all(tokenHolders.map(holder =>
      token.generateTokens(holder, tokenAmount)
        .should.be.fulfilled));

    pos = await PoS.new(
      token.address,
      posInterval,
      0,
      posRate,
      posCoeff,
    );

    posInitBlock = await pos.initBlockNumber();

    await token.changeController(pos.address);
  });

  it("holders cannot claim tokens before interval passed", async () => {
    const beforeBalances = await Promise.all(tokenHolders.map(getTokenBalance));

    // await Promise.all(tokenHolders
    //   .map(claimTokens)
    //   .map(p => p.should.be.fulfilled));

    await claimAllHolderTokens();

    const afterBalances = await Promise.all(tokenHolders.map(getTokenBalance));

    beforeBalances.should.be.deep.equal(afterBalances);

    afterBalances.forEach((afterBalance, i) => {
      const beforeBalance = beforeBalances[ i ];

      afterBalance.should.be.bignumber.equal(beforeBalance);
    });
  });

  it("a holder can claim tokens after interval passed", async () => {
    await moveAfterInterval();

    const tokenHolder = tokenHolders[ 0 ];
    const claimRate = _1ClaimRate;

    const beforeBalance = await getTokenBalance(tokenHolder);
    await claimTokens(tokenHolder);
    const expectedBalance = beforeBalance.mul(claimRate);

    const afterBalance = await getTokenBalance(tokenHolder);

    afterBalance.should.be.bignumber.equal(expectedBalance);
  });

  it("a holder can claim tokens after one more interval passed", async () => {
    await moveAfterInterval();

    const tokenHolder = tokenHolders[ 0 ];
    const claimRate = _1ClaimRate;

    const beforeBalance = await getTokenBalance(tokenHolder);
    await claimTokens(tokenHolder);
    const expectedBalance = beforeBalance.mul(claimRate);

    const afterBalance = await getTokenBalance(tokenHolder);

    afterBalance.should.be.bignumber.equal(expectedBalance);
  });

  it("a holder can claim tokens after 2 intervals passed", async () => {
    const tokenHolder = tokenHolders[ 1 ];
    const claimRate = _2ClaimRate;

    const beforeBalance = await getTokenBalance(tokenHolder);
    await claimTokens(tokenHolder);
    const expectedBalance = beforeBalance.mul(claimRate);

    const afterBalance = await getTokenBalance(tokenHolder);

    afterBalance.should.be.bignumber.equal(expectedBalance);
  });

  it("a holder can claim tokens after 3 intervals passed", async () => {
    await moveAfterInterval();

    const tokenHolder = tokenHolders[ 2 ];
    const claimRate = _3ClaimRate;

    const beforeBalance = await getTokenBalance(tokenHolder);
    await claimTokens(tokenHolder);
    const expectedBalance = beforeBalance.mul(claimRate);

    const afterBalance = await getTokenBalance(tokenHolder);

    afterBalance.should.be.bignumber.equal(expectedBalance);
  });

  it("holders can claim tokens after 2 intervals passed", async () => {
    await claimAllHolderTokens();
    await moveAfterInterval();
    await moveAfterInterval();

    const beforeBalances = await Promise.all(tokenHolders.map(getTokenBalance));
    const claimRate = _2ClaimRate;

    await Promise.all(tokenHolders
      .map(claimTokens)
      .map(p => p.should.be.fulfilled));

    const afterBalances = await Promise.all(tokenHolders.map(getTokenBalance));

    afterBalances.forEach((afterBalance, i) => {
      const beforeBalance = beforeBalances[ i ];

      afterBalance.should.be.bignumber
        .equal(beforeBalance.mul(claimRate));
    });
  });

  it("holders can claim tokens after 3 interval passed", async () => {
    await claimAllHolderTokens();
    await moveAfterInterval(); // 10%
    await moveAfterInterval(); // 21%
    await moveAfterInterval(); // 33.1%

    const beforeBalances = await Promise.all(holders.map(getTokenBalance));
    const claimRate = _3ClaimRate;

    await Promise.all(holders
      .map(claimTokens)
      .map(p => p.should.be.fulfilled));

    const afterBalances = await Promise.all(holders.map(getTokenBalance));

    afterBalances.forEach((afterBalance, i) => {
      const beforeBalance = beforeBalances[ i ];
      afterBalance.should.be.bignumber
        .equal(beforeBalance.mul(claimRate));
    });
  });

  it("should generate claimed token when transfer occured", async () => {
    await claimAllHolderTokens();
    await moveAfterInterval(); // 10%
    await moveAfterInterval(); // 21%

    const holder0 = tokenHolders[ 0 ];
    const holder1 = tokenHolders[ 1 ];
    const tokenAmountToTransfer = ether(0.001);

    const holder0BalanceBefore = await getTokenBalance(holder0);
    const holder1BalanceBefore = await getTokenBalance(holder1);
    const claimRate = _2ClaimRate;

    const expectedHolder0Balance = holder0BalanceBefore.mul(claimRate)
      .sub(tokenAmountToTransfer);
    const expectedHolder1Balance = holder1BalanceBefore.mul(claimRate)
      .add(tokenAmountToTransfer);

    await token.transfer(holder1, tokenAmountToTransfer, { from: holder0 });

    const holder0BalanceAfter = await getTokenBalance(holder0);
    const holder1BalanceAfter = await getTokenBalance(holder1);

    holder0BalanceAfter.should.be.bignumber
      .equal(expectedHolder0Balance);
    holder1BalanceAfter.should.be.bignumber
      .equal(expectedHolder1Balance);
  });

  // TODO: test when multiple claims or transfers is in a single block
  // especially for one single holder
});
