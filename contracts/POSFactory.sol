pragma solidity ^0.4.18;

import "./POSController.sol";
import "./POSMiniMeToken.sol";
import "./POSMintableToken.sol";


/// @title POSFactory
/// @notice POSFactory creates POSMiniMeToken or POSMiniMeToken
contract POSFactory {
    event Deploy(address _token, address _controller);

    function createMiniMeToken(
        address _parentToken,
        uint _parentSnapShotBlock,
        string _tokenName,
        uint8 _decimalUnits,
        string _tokenSymbol,
        bool _transfersEnabled,
        uint _posInterval,
        uint _initBlockNumber,
        uint _posRate,
        uint _posCoeff
    ) public returns (POSMiniMeToken token, POSController controller) {
        token = new POSMiniMeToken(
            0x00,
            _parentToken,
            _parentSnapShotBlock,
            _tokenName,
            _decimalUnits,
            _tokenSymbol,
            _transfersEnabled
        );

        controller = new POSController(
            address(token),
            _posInterval,
            _initBlockNumber,
            _posRate,
            _posCoeff
        );

        /* token.setController(address(controller)); */

        token.changeController(msg.sender);
        controller.transferOwnership(msg.sender);

        emit Deploy(token, controller);
    }

    function createMintableToken(
        uint _posInterval,
        uint _initBlockNumber,
        uint _posRate,
        uint _posCoeff
    ) public returns (POSMintableToken token, POSController controller) {
        token = new POSMintableToken();

        controller = new POSController(
            address(token),
            _posInterval,
            _initBlockNumber,
            _posRate,
            _posCoeff
        );

        token.setController(address(controller));

        token.transferOwnership(msg.sender);
        controller.transferOwnership(msg.sender);

        emit Deploy(token, controller);
    }
}
