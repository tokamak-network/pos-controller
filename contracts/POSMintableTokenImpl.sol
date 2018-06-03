pragma solidity ^0.4.18;

import "./POSMintableToken.sol";

/// @dev POSMintableToken inherits POSMintableTokenAPI to provdie common
///  interface for POSController.
contract POSMintableTokenImpl is POSMintableToken {
  string public name;
  string public symbol;
  uint8 public decimals;

  function POSMintableTokenImpl(
    string _name,
    string _symbol,
    uint8 _decimals
  ) public {
    name = _name;
    symbol = _symbol;
    decimals = _decimals;
  }
}
