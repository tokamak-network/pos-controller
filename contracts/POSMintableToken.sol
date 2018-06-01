pragma solidity ^0.4.18;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "./POSTokenAPI.sol";


/// @dev POSMintableToken inherits POSMintableTokenAPI to provdie common
///  interface for POSController.
contract POSMintableToken is MintableToken, POSMintableTokenAPI {
  string public name;
  string public symbol;
  uint8 public decimals;

  function POSMintableToken(
    string _name,
    string _symbol,
    uint8 _decimals
  ) public {
    name = _name;
    symbol = _symbol;
    decimals = _decimals;
  }
}
