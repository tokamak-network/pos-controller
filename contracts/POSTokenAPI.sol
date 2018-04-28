pragma solidity ^0.4.18;

import "./zeppelin/ownership/Ownable.sol";
import "./zeppelin/token/ERC20/ERC20.sol";
import "./zeppelin/token/MintableToken.sol";
import "./minime/Controlled.sol";
import "./minime/MiniMeToken.sol";
import "./minime/TokenController.sol";
import "./interfaces/ERC165.sol";
import "./interfaces/POSTokenI.sol";


/// @title POSTokenAPI
/// @notice POSTokenAPI provides MiniMeToken's onTransfer, onApprove, proxyPayment
///  functionality for MintableToken.
contract POSTokenAPI is ERC20, Ownable {
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
/// @notice POSMintableTokenAPI implements ERC165, POSTokenI.
///  MintableToken should inherit POSMintableTokenAPI to be able to
///  compatible with POSController.
contract POSMintableTokenAPI is POSTokenI, POSTokenAPI {
  function supportsInterface(bytes4 interfaceID) public view returns (bool) {
    return interfaceID == bytes4(keccak256("mint(address,uint256)")); // TODO: use bytes4 literal
  }

  function transferOwnershipTo(address _to) public {
    transferOwnership(_to);
  }
}


/// @title POSMiniMeTokenAPI
/// @notice POSMiniMeTokenAPI implements ERC165, POSTokenI
///  BalanceUpdatableMiniMeToken should inherit POSMintableTokenAPI to be able to
///  compatible with POSController.
contract POSMiniMeTokenAPI is ERC165, POSTokenI, Controlled {
  function supportsInterface(bytes4 interfaceID) public view returns (bool) {
    return interfaceID == bytes4(keccak256("generateTokens(address,uint256)")); // TODO: use bytes4 literal
  }

  function transferOwnershipTo(address _to) public {
    changeController(_to);
  }
}
