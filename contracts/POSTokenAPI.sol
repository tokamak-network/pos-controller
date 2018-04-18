pragma solidity ^0.4.18;

import "./zeppelin/ownership/Ownable.sol";
import "./zeppelin/token/ERC20/ERC20.sol";
import "./interfaces/POSControllerI.sol";
import "./interfaces/ERC165.sol";


/// @title POSTokenAPI
/// @notice POSTokenAPI adds token apis
contract POSTokenAPI is Ownable, ERC20, ERC165 {
    address public controller;

    function setController(address _controller) external onlyOwner {
        require(_controller == address(0)); // one time initialization
        require(isContract(_controller));
        controller = _controller;
    }

    function transfer(address _to, uint256 _value) public returns (bool) {
        if (controller != address(0)) {
            POSControllerI(controller).claim(msg.sender);
            POSControllerI(controller).claim(_to);
        }

        return super.transfer(_to, _value);
    }

    function approve(address _spender, uint256 _value) public returns (bool) {
        if (controller != address(0)) {
            POSControllerI(controller).claim(msg.sender);
        }

        return super.approve(_spender, _value);
    }

    /// @dev Internal function to determine if an address is a contract
    /// @param _addr The address being queried
    /// @return True if `_addr` is a contract
    function isContract(address _addr) internal view returns(bool) {
        uint size;
        if (_addr == 0) return false;
        assembly {
            size := extcodesize(_addr)
        }
        return size > 0;
    }
}


/// @title POSMintableTokenAPI
/// @notice POSMintableTokenAPI adds token apis for MintableToken
contract POSMintableTokenAPI is POSTokenAPI {
    function supportsInterface(bytes4 interfaceID) external pure returns (bool) {
        return interfaceID == bytes4(keccak256("mint(address,uint256)")); // TODO: use bytes4 literal
    }
}


/// @title POSMiniMeTokenAPI
/// @notice POSMiniMeTokenAPI adds token apis for MiniMeToken
contract POSMiniMeTokenAPI is POSTokenAPI {
    function supportsInterface(bytes4 interfaceID) external pure returns (bool) {
        return interfaceID == bytes4(keccak256("generateTokens(address,uint256)")); // TODO: use bytes4 literal
    }
}
