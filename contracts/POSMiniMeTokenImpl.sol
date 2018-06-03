pragma solidity ^0.4.18;

import "./POSMiniMeToken.sol";


/// @dev POSMiniMeToken inherits BalanceUpdatableMiniMeToken to update token balances
///  inside `onTransfer` function, POSMiniMeTokenAPI to provdie common
///  interface for POSController.
contract POSMiniMeTokenImpl is POSMiniMeToken {
  function POSMiniMeTokenImpl(
    address _tokenFactory,
    address _parentToken,
    uint _parentSnapShotBlock,
    string _tokenName,
    uint8 _decimalUnits,
    string _tokenSymbol,
    bool _transfersEnabled
  ) public MiniMeToken(
    _tokenFactory,
    _parentToken,
    _parentSnapShotBlock,
    _tokenName,
    _decimalUnits,
    _tokenSymbol,
    _transfersEnabled
  ) {}
}
