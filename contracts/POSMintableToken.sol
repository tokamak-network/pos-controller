pragma solidity ^0.4.18;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "./POSTokenAPI.sol";


/// @dev POSMintableToken inherits POSMintableTokenAPI to provdie common
///  interface for POSController.
// solium-disable no-empty-blocks
contract POSMintableToken is MintableToken, POSMintableTokenAPI {}
