pragma solidity ^0.4.18;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "minimetoken/contracts/TokenController.sol";
import "./interfaces/POSTokenI.sol";


/// @title POSController
/// @dev POSController is a token controller that generate token interests.
///  according to parameters(rate, coeff, interval blocks).
///  It should be controller of `MiniMeToken` or owner of `MintableToken`.
contract POSController is Ownable, TokenController {
  using SafeMath for uint256;

  struct Claim {
    uint128 fromBlock;
    uint128 claimedValue;
  }

  address public token;

  // POSController parameters
  uint256 public posInterval;
  uint256 public posRate;
  uint256 public posCoeff;

  uint256 public initBlockNumber;

  mapping (address => Claim[]) public claims;

  event Claimed(address indexed _owner, uint256 _amount);

  /* Constructor */
  function POSController(
    address _token,
    uint256 _posInterval,
    uint256 _initBlockNumber,
    uint256 _posRate,
    uint256 _posCoeff
  ) public {
    require(_token != address(0));

    require(_posInterval != 0);
    require(_posRate != 0);
    require(_posCoeff != 0);

    token = _token;
    posInterval = _posInterval;
    posRate = _posRate;
    posCoeff = _posCoeff;

    if (_initBlockNumber == 0) {
      initBlockNumber = block.number;
    } else {
      initBlockNumber = _initBlockNumber;
    }
  }

  /* External */

  /* Public */
  /// @notice claim interests generated by POSController
  function claimTokens(address _owner) public {
    doClaim(_owner, claims[_owner]);
  }

  /// @notice transfer token ownerhsip
  function claimTokenOwnership(address _to) public onlyOwner {
    POSTokenI(token).transferOwnershipTo(_to);
  }

  /// @notice proxyPayment implements MiniMeToken Controller's proxyPayment
  function proxyPayment(address _owner) public payable returns(bool) {
    revert(); // reject ether transfer to token contract
    return false;
  }

  /// @notice onTransfer implements MiniMeToken Controller's onTransfer
  function onTransfer(address _from, address _to, uint _amount) public returns(bool) {
    claimTokens(_from);
    claimTokens(_to);
    return true;
  }

  /// @notice onApprove implements MiniMeToken Controller's onApprove
  function onApprove(address _owner, address _spender, uint _amount) public returns(bool) {
    return true;
  }

  /* Internal */
  function doClaim(address _owner, Claim[] storage c) internal {
    uint256 claimRate;

    if (c.length == 0 && claimable(block.number)) {
      claimRate = getClaimRate(0);
    } else if (c.length > 0 && claimable(c[c.length - 1].fromBlock)) {
      claimRate = getClaimRate(c[c.length - 1].fromBlock);
    }

    if (claimRate > 0) {
      Claim storage newClaim = c[c.length++];

      uint256 balance = ERC20(token).balanceOf(_owner);

      // Short cuircit if there is no token to claim
      if (balance == 0) {
        return;
      }

      // TODO: reduce variables into few statements
      uint256 targetBalance = balance.mul(posCoeff.add(claimRate)).div(posCoeff);
      uint256 claimedValue = targetBalance.sub(balance);

      newClaim.claimedValue = uint128(claimedValue);
      newClaim.fromBlock = uint128(block.number);

      require(generateTokens(_owner, newClaim.claimedValue));

      emit Claimed(_owner, newClaim.claimedValue);
    }
  }

  function generateTokens(address _to, uint256 _value) internal returns (bool) {
    if (POSTokenI(token).supportsInterface(bytes4(keccak256("mint(address,uint256)")))) {
      return MintableTokenI(token).mint(_to, _value);
    } else if (POSTokenI(token).supportsInterface(bytes4(keccak256("generateTokens(address,uint256)")))) {
      return MiniMeTokenI(token).generateTokens(_to, _value);
    }

    return false;
  }

  function claimable(uint256 _blockNumber) internal view returns (bool) {
    if (_blockNumber < initBlockNumber) return false;

    return (_blockNumber - initBlockNumber) >= posInterval;
  }

  function getClaimRate(uint256 _fromBlock) internal view returns (uint256) {
    // interval block number when token holder get interests.
    // if holder didn't claim before, `initBlockNumber`
    // otherwise, n-th interval block (`initBlockNumber` + k * `posInterval`)
    uint256 lastIntervalBlock;

    if (_fromBlock == 0) { // first claim
      lastIntervalBlock = initBlockNumber;
    } else { // second or further claim
      uint256 offset = _fromBlock.sub(initBlockNumber) % posInterval;
      lastIntervalBlock = _fromBlock.sub(offset);
    }

    // # of cumulative claims
    uint256 pow = block.number.sub(lastIntervalBlock) / posInterval;

    // no token to claim
    if (pow == 0) {
      return 0;
    }

    // assume 1 claim is given to reduce loop iteration
    uint256 rate = posRate;

    // if claim rate is 10%,
    // 1st claim: 10%
    // 2nd claim: 10% + 11%
    // 3rd claim: 10% + (10% + 11%) * 110%
    //
    // ith claim: posRate + [i-1th claim] * (posCoeff + posRate) / posCoeff
    for (uint256 i = 0; i < pow - 1; i++) {
      rate = rate.mul(posCoeff.add(posRate)).div(posCoeff).add(posRate);
    }

    return rate;
  }
}
