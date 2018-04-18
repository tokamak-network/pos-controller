pragma solidity ^0.4.18;

import "./zeppelin/token/MintableToken.sol";
import "./POSTokenAPI.sol";


contract POSMintableToken is MintableToken, POSMintableTokenAPI {
    function POSMintableToken() public {}
}
