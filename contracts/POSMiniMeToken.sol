pragma solidity ^0.4.18;

import "./minime/MiniMeToken.sol";
import "./POSTokenAPI.sol";


contract POSMiniMeToken is MiniMeToken, POSMiniMeTokenAPI {
    function POSMiniMeToken(
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
