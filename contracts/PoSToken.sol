pragma solidity ^0.4.18;

import "./zeppelin/token/MintableToken.sol";
import "./PoS.sol";

contract PoSToken is MintableToken {
    string public name;
    string public symbol;
    uint8 public decimal;

    function PoSToken(string _tokenName, string _tokenSymbol, uint8 _decimalUnits) {
        name = _tokenName;
        symbol = _tokenSymbol;
        decimal = _decimalUnits;
    }

    function () public payable {
        require(isContract(owner));
        require(PoS(owner).proxyPayment.value(msg.value)(msg.sender));
    }

    function transfer(address _to, uint256 _value) public returns (bool) {
        if (isContract(owner)) {
            require(PoS(owner).onTransfer(msg.sender, _to, _value));
        }
        super.transfer(_to, _value);
    }

    function approve(address _spender, uint256 _value) public returns (bool) {
        if (isContract(owner)) {
            require(PoS(owner).onApprove(msg.sender, _spender, _value));
        }
        super.approve(_spender, _value);
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        if (isContract(owner)) {
            require(PoS(owner).onTransfer(_from, _to, _value));
        }
        super.transferFrom(_from, _to, _value);
    }

    function isContract(address _addr) constant internal returns(bool) {
        uint size;
        if (_addr == 0) return false;
        assembly {
            size := extcodesize(_addr)
        }
        return size>0;
    }
}
