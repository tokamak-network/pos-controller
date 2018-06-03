pragma solidity ^0.4.18;

import "./BalanceUpdatableMiniMeToken.sol";
import "./POSTokenAPI.sol";


/// @dev POSMiniMeToken inherits BalanceUpdatableMiniMeToken to update token balances
///  inside `onTransfer` function, POSMiniMeTokenAPI to provdie common
///  interface for POSController.
// solium-disable no-empty-blocks
contract POSMiniMeToken is BalanceUpdatableMiniMeToken, POSMiniMeTokenAPI {}
