pragma solidity ^0.4.18;

import "./zeppelin/token/ERC20/ERC20.sol";
import "./zeppelin/token/MintableToken.sol";
import "./POSTokenAPI.sol";


contract POSMintableToken is ERC20, MintableToken, POSMintableTokenAPI {
}
