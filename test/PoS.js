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

contract("PoS", async (accounts) => {
  let token, pos;

  // PoS parameters
  const posInterval = 100;
  const posRate = 10;
  const posCoeff = 100;
  const posRatio = new BigNumber(1.1); // 10%
  let posInitBlock;

  // common parameters
  const numHolders = 10;
  const tokenHolders = accounts.slice(1, numHolders + 1);
  const tokenAmount = ether(10);

  // helper function
  const moveAfterInterval = async () => {
    const currentBlockNumber = web3.eth.blockNumber;
    const diff = posInterval - (currentBlockNumber - posInitBlock) % posInterval;
    const targetBlockNumber = currentBlockNumber + diff;

    console.log(`move from ${ web3.eth.blockNumber } to ${ targetBlockNumber } with posInitBlock ${ posInitBlock }`);

    await advanceToBlock(targetBlockNumber);
  };
  const getTokenBalance = holder => token.balanceOf(holder);
  const claimTokens = holder => pos.claim(holder, { from: holder });

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

  it("holder cannot claim tokens before interval passed", async () => {
    const beforeBalances = await Promise.all(tokenHolders.map(getTokenBalance));

    await Promise.all(tokenHolders
      .map(claimTokens)
      .map(p => p.should.be.fulfilled));

    const afterBalances = await Promise.all(tokenHolders.map(getTokenBalance));

    beforeBalances.should.be.deep.equal(afterBalances);

    afterBalances.forEach((afterBalance, i) => {
      const beforeBalance = beforeBalances[ i ];

      afterBalance.should.be.bignumber.equal(beforeBalance);
    });
  });

  // it("holder can claim tokens after interval passed", async () => {
  //     await moveAfterInterval();
  //
  //     const beforeBalances = await Promise.all(tokenHolders.map(getTokenBalance));
  //
  //     await Promise.all(tokenHolders
  //         .map(claimTokens)
  //         .map(p => p.should.be.fulfilled));
  //
  //     const afterBalances = await Promise.all(tokenHolders.map(getTokenBalance));
  //
  //     afterBalances.forEach((afterBalance, i) => {
  //         const beforeBalance = beforeBalances[i];
  //
  //         afterBalance.should.be.bignumber.equal(beforeBalance.mul(posRatio));
  //     });
  // });

  // it("holder can claim tokens after 2 interval passed", async () => {
  //     let block = web3.eth.blockNumber - posInterval;
  //     await moveAfterInterval(); // 10%
  //     await moveAfterInterval(); // 21%
  //     // await moveAfterInterval(); // 33%
  //
  //     let currentPosRate = await pos.getClaimRate(block); // 21%
  //
  //     let beforeBalances = await Promise.all(accounts.map(getTokenBalance));
  //
  //     await Promise.all(accounts
  //         .map(claimTokens)
  //         .map(tx => tx.should.be.fulfilled)); // 21%
  //
  //     let afterBalances = await Promise.all(accounts.map(getTokenBalance));
  //
  //     afterBalances.forEach((afterBalance, i) => {
  //         const beforeBalance = beforeBalances[i];
  //         afterBalance.should.be.bignumber
  //           .equal(beforeBalance.mul(currentPosRate.add(posCoeff)).div(posCoeff));
  //     });
  // });

  it("should call claim method when onTransfer method called", async () => {
    const account0BalanceBefore = await getTokenBalance(accounts[ 0 ]);
    const account1BalanceBefore = await getTokenBalance(accounts[ 1 ]);

    const account2BalanceBefore = await getTokenBalance(accounts[ 2 ]);
    const account3BalanceBefore = await getTokenBalance(accounts[ 3 ]);

    await moveAfterInterval(); // 10%

    await pos.onTransfer(accounts[ 0 ], accounts[ 1 ], 100);

    const account0BalanceAfter = await getTokenBalance(accounts[ 0 ]);
    const account1BalanceAfter = await getTokenBalance(accounts[ 1 ]);
    const account2BalanceAfter = await getTokenBalance(accounts[ 2 ]);
    const account3BalanceAfter = await getTokenBalance(accounts[ 3 ]);

    account0BalanceAfter.should.be.bignumber
      .equal(account0BalanceBefore.mul((posRate + posCoeff) / posCoeff));
    account1BalanceAfter.should.be.bignumber
      .equal(account1BalanceBefore.mul((posRate + posCoeff) / posCoeff));

    account2BalanceAfter.should.be.bignumber.equal(account2BalanceBefore);
    account3BalanceAfter.should.be.bignumber.equal(account3BalanceBefore);
  });
});
