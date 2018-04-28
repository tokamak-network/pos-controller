### POS Controller
> Generate token interest like Proof-of-Stake system.


1. Modified MiniMeToken
  * `BalanceUpdatableMiniMeToken` assumes token controller may update token balance inside `onTransfer` function of token controller.
    - `POSController` cannot use Giveth's `MiniMeToken` becuase it doesn't make token controller to generate or destroy tokens in `onTransfer` function.
    - We use `BalanceUpdatableMiniMeToken` for `POSMiniMeToken`

2.  POSController
  * `POSController` generates pos-style interests for `POSMintableToken` and `POSMiniMeToken`.

  * `POSController` provides `claimTokens()` function to claim pos-style interests.
      - Also tokens are claimed when token `transfer()` or `approve()` is executed.
      - Above 2 functions invoke `onTransfer()`, `onApprove()` of `POSController`.
        - Becuase plain `MintableToken` cannot call function of `owner`, we need to add the functionality.
        - Inherits `POSMintableTokenAPI`

3. POSTokenAPI
  * `TokenControllerBridge` provides `MiniMeToken`'s onTransfer, onApprove, proxyPayment functionality for `MintableToken`.

  * `POSMintableTokenAPI` provides `POSController`-compatibility for `MintableToken`.

  * `POSMiniMeTokenAPI` provides `POSController`-compatibility for `BalanceUpdatableMiniMeToken`.

4. POSMintableToken
  * `POSMintableToken` inherits `MintableToken` and `POSMintableTokenAPI`.
      - Cheaper gas fee than `POSMiniMeToken`

5. POSMiniMeToken
  * `POSMiniMeToken` inherits `BalanceUpdatableMiniMeToken` and  `POSMintableTokenAPI`.
      - Can clone other `MiniMeToken` as a parent token
