pragma solidity ^0.4.18;

import "./zeppelin/math/SafeMath.sol";
import "./zeppelin/ownership/Ownable.sol";
import "./minime/TokenController.sol";
import "./PoSToken.sol";


/// @title PoS
/// @dev PoS contract is a mintable token controller that mint token interests
/// according to predefined PoS-like rule.
contract PoS is Ownable, TokenController {
    using SafeMath for uint;

    struct Claim {
        uint128 fromBlock;
        uint128 claimedValue;
    }

    PoSToken public token;

    // PoS parameters
    uint public posInterval;
    uint public posRate;
    uint public posCoeff;

    uint public initBlockNumber;

    mapping (address => Claim[]) public claims;

    /* Constructor */
    function PoS(
        PoSToken _token,
        uint _posInterval,
        uint _initBlockNumber,
        uint _posRate,
        uint _posCoeff
    ) public {
        token = _token;
        posInterval = _posInterval;
        posRate = _posRate;
        posCoeff = _posCoeff;

        if (_initBlockNumber == 0) {
            initBlockNumber = block.number;
        } else {
            initBlockNumber = _initBlockNumber;
        }
    }

    /* External */
    function setRate(uint _newRate) external onlyOwner {
        require(_newRate != 0);
        posRate = _newRate;
    }

    function setInterval(uint _newInterval) external onlyOwner {
        require(_newInterval != 0);
        posInterval = _newInterval;
    }

    /* Public */
    /// @notice claim interests generated by PoS
    function claim(address _owner) public {
        doClaim(_owner, claims[_owner]);
    }

    /// @notice Called when `_owner` sends ether to the MiniMe Token contract
    /// @param _owner The address that sent the ether to create tokens
    /// @return True if the ether is accepted, false if it throws
    function proxyPayment(address _owner) public payable returns(bool) {
        _owner.transfer(msg.value); // send back
    }

    /// @notice Notifies the controller about a token transfer allowing the
    ///    controller to react if desired
    /// @param _from The origin of the transfer
    /// @param _to The destination of the transfer
    /// @return False if the controller does not authorize the transfer
    function onTransfer(address _from, address _to, uint) public returns(bool) {
        claim(_from);
        claim(_to);
        return true;
    }

    /// @notice Notifies the controller about an approval allowing the
    ///    controller to react if desired
    /// @param _owner The address that calls `approve()`
    /// @return False if the controller does not authorize the approval
    function onApprove(address _owner, address, uint) public returns(bool) {
        claim(_owner);
    }

    /* Internal */
    function doClaim(address _owner, Claim[] storage c) internal {
        uint claimRate;

        if (c.length == 0 && claimable(block.number)) {
            claimRate = getClaimRate(0);
        } else if (c.length > 0 && claimable(c[c.length - 1].fromBlock)) {
            claimRate = getClaimRate(c[c.length - 1].fromBlock);
        }

        if (claimRate > 0) {
            Claim storage newClaim = c[c.length++];

            // TODO: reduce variables into few statements
            uint balance = token.balanceOf(_owner);

            uint targetBalance = balance.mul(posCoeff.add(claimRate)).div(posCoeff);
            uint claimedValue = targetBalance.sub(balance);

            newClaim.claimedValue = uint128(claimedValue);
            newClaim.fromBlock = uint128(block.number);

            token.mint(_owner, newClaim.claimedValue);
        }
    }

    function claimable(uint _blockNumber) internal view returns (bool) {
        if (_blockNumber < initBlockNumber) return false;

        return (_blockNumber - initBlockNumber) >= posInterval;
    }

    function getClaimRate(uint _fromBlock) internal view returns (uint) {
        // interval block number when token holder get interests.
        // if holder didn't claim before, `initBlockNumber`
        // otherwise, n-th interval block (`initBlockNumber` + k * `posInterval`)
        uint pow;

        if (_fromBlock == 0) { // first claim
            pow = block.number.sub(initBlockNumber).div(posInterval);
        } else { // second or further claim
            uint offset = _fromBlock.sub(initBlockNumber) % posInterval;
            pow = block.number.sub(_fromBlock).add(offset).div(posInterval);
        }

        if (pow == 0) return 0;

        // assume 1 claim is given to reduce loop iteration
        uint rate = posRate;

        // if claim rate is 10%,
        // 1st claim: 10%
        // 2nd claim: 10% + 11%
        // 3rd claim: 10% + (10% + 11%) * 110%
        //
        // ith claim: posRate + [i-1th claim] * (posCoeff + posRate) / posCoeff
        for (uint i = 0; i < pow - 1; i++) {
            rate = rate.mul(posCoeff.add(posRate)).div(posCoeff).add(posRate);
        }

        return rate;
    }
}
