### POS Controller
> Generate token interest like Proof-of-Stake system.


1. Modified MiniMeToken

  * `BalanceUpdatableMiniMeToken` assumes token controller may update token balance inside `onTransfer` function of token controller.
    - `POSController` cannot use Giveth's `MiniMeToken` becuase it doesn't make token controller to generate or destroy tokens in `onTransfer` function.

2.  POSController
  * `POSController` generates pos-style interests for `POSMintableToken` and `POSMiniMeToken`

3. POSTokenAPI
  * `POSTokenAPI` provides `MiniMeToken`'s onTransfer, onApprove, proxyPayment functionality for `MintableToken`.

  * `POSMintableTokenAPI` provides `POSToken` functionality for `MintableToken`

  * `POSMiniMeTokenAPI` provides `POSToken` functionality for `BalanceUpdatableMiniMeToken`

4. POSMintableToken
  * `POSMintableToken` should inherits `MintableToken` and `POSMintableTokenAPI` to be able to compatible with `POSController`.

5. POSMiniMeToken
  * `POSMiniMeToken` should inherit `BalanceUpdatableMiniMeToken` and  `POSMintableTokenAPI` to be able to compatible with `POSController`.
