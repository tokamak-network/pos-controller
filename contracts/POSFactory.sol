pragma solidity ^0.4.18;

import "./POSController.sol";
import "./POSMiniMeTokenImpl.sol";
import "./POSMintableTokenImpl.sol";


/// @title POSFactory
/// @notice POSFactory creates POSMiniMeToken or POSMiniMeToken with POSController.
contract POSFactory {
  event Deploy(address _token, address _controller);

  function createMiniMeToken(
    address _parentToken,
    uint256 _parentSnapShotBlock,
    string _tokenName,
    uint8 _decimalUnits,
    string _tokenSymbol,
    bool _transfersEnabled,
    uint256 _posInterval,
    uint256 _initBlockNumber,
    uint256 _posRate,
    uint256 _posCoeff
  ) public returns (POSMiniMeToken token, POSController posController) {
    token = new POSMiniMeTokenImpl(
      0x00,
      _parentToken,
      _parentSnapShotBlock,
      _tokenName,
      _decimalUnits,
      _tokenSymbol,
      _transfersEnabled
    );

    posController = new POSController(
      address(token),
      _posInterval,
      _initBlockNumber,
      _posRate,
      _posCoeff
    );

    token.changeController(posController);
    posController.transferOwnership(msg.sender);

    emit Deploy(token, posController);
  }

  function createMintableToken(
    string _tokenName,
    uint8 _decimalUnits,
    string _tokenSymbol,
    uint256 _posInterval,
    uint256 _initBlockNumber,
    uint256 _posRate,
    uint256 _posCoeff
  ) public returns (POSMintableToken token, POSController posController) {
    token = new POSMintableTokenImpl(_tokenName, _tokenSymbol, _decimalUnits);

    posController = new POSController(
      address(token),
      _posInterval,
      _initBlockNumber,
      _posRate,
      _posCoeff
    );

    token.transferOwnership(posController);
    posController.transferOwnership(msg.sender);

    emit Deploy(token, posController);
  }
}
