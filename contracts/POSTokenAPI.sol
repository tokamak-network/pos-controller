pragma solidity ^0.4.18;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "./minime/Controlled.sol";
import "./minime/MiniMeToken.sol";
import "./minime/TokenController.sol";
import "./interfaces/POSTokenI.sol";


/// @title TokenControllerBridge
/// @notice TokenControllerBridge mocks Giveth's `Controller` for
///  Zeppelin's `Ownable` `ERC20` Token.
contract TokenControllerBridge is ERC20, Ownable {
  function () public payable {
    require(isContract(owner));
    require(TokenController(owner).proxyPayment.value(msg.value)(msg.sender));
  }

  /// @dev invoke onTransfer function before actual transfer function is executed.
  function transfer(address _to, uint256 _value) public returns (bool) {
    if (isContract(owner)) { // owner should be able to generate tokens
      TokenController(owner).onTransfer(msg.sender, _to, _value);
    }

    return super.transfer(_to, _value);
  }

  /// @dev invoke onApprove function before actual transfer function is executed.
  function approve(address _spender, uint256 _value) public returns (bool) {
    if (isContract(owner)) {
      TokenController(owner).onApprove(msg.sender, _spender, _value);
    }

    return super.approve(_spender, _value);
  }

  /// @dev Internal function to determine if an address is a contract
  /// @param _addr The address being queried
  /// @return True if `_addr` is a contract
  function isContract(address _addr) internal view returns(bool) {
    uint256 size;
    if (_addr == 0) return false;
    assembly {
      size := extcodesize(_addr)
    }
    return size > 0;
  }
}


/// @title POSMintableTokenAPI
/// @notice MintableToken should inherit POSMintableTokenAPI to be able to
///  compatible with POSController.
contract POSMintableTokenAPI is POSTokenI, TokenControllerBridge {
  function supportsInterface(bytes4 interfaceID) public view returns (bool) {
    return interfaceID == bytes4(keccak256("mint(address,uint256)")); // TODO: use bytes4 literal
  }

  function transferOwnershipTo(address _to) public {
    transferOwnership(_to);
  }
}


/// @title POSMiniMeTokenAPI
/// @notice BalanceUpdatableMiniMeToken should inherit POSMintableTokenAPI to be able to
///  compatible with POSController.
contract POSMiniMeTokenAPI is POSTokenI, Controlled {
  function supportsInterface(bytes4 interfaceID) public view returns (bool) {
    return interfaceID == bytes4(keccak256("generateTokens(address,uint256)")); // TODO: use bytes4 literal
  }

  function transferOwnershipTo(address _to) public {
    changeController(_to);
  }
}
