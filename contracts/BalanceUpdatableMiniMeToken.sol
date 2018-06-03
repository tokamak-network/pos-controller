pragma solidity ^0.4.18;

import "minimetoken/contracts/MiniMeToken.sol";

/// @dev BalanceUpdatableMiniMeToken assumes token controller may update
///  token balance inside `onTransfer` function of token controller.
contract BalanceUpdatableMiniMeToken is MiniMeToken {

  /// @dev Override doTransfer function. only modified parts are documented.
  function doTransfer(address _from, address _to, uint _amount) internal returns(bool) {

    if (_amount == 0) {
      Transfer(_from, _to, _amount);
      return true;
    }

    require(parentSnapShotBlock < block.number);
    require((_to != 0) && (_to != address(this)));

    uint previousBalanceFrom = balanceOfAt(_from, block.number);
    require(previousBalanceFrom >= _amount);

    if (isContract(controller)) {
      require(TokenController(controller).onTransfer(_from, _to, _amount));

      // update balance
      previousBalanceFrom = balanceOfAt(_from, block.number);
      require(previousBalanceFrom >= _amount);
    }

    updateValueAtNow(balances[_from], previousBalanceFrom - _amount);

    var previousBalanceTo = balanceOfAt(_to, block.number);
    require(previousBalanceTo + _amount >= previousBalanceTo); // Check for overflow
    updateValueAtNow(balances[_to], previousBalanceTo + _amount);

    Transfer(_from, _to, _amount);

    return true;
  }
}
