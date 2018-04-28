pragma solidity ^0.4.18;


interface POSTokenI {
  /// @notice Query if a contract implements an interface
  /// @param interfaceID The interface identifier, as specified in ERC-165
  /// @dev Interface identification is specified in ERC-165. This function
  ///  uses less than 30,000 gas.
  /// @return `true` if the contract implements `interfaceID` and
  ///  `interfaceID` is not 0xffffffff, `false` otherwise
  function supportsInterface(bytes4 interfaceID) public view returns (bool);

  /// @notice calls `Ownable.transferOwnership()` or `Controlled.changeController()`
  function transferOwnershipTo(address _to) public;
}
