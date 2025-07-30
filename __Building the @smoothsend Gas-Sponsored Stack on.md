<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" class="logo" width="120"/>

# **Building the @smoothsend Gas-Sponsored Stack on Aptos Testnet (July 2025)**

*Key takeaway: Use Aptos’ native “Sponsored Transactions” (A-39) with a TypeScript relayer that quotes live gas and APT-USDC prices from Pyth/Chainlink, applies a fixed 20% markup, and calls `smoothsend::gasless::send_with_fee<USDC>`. Wrap the relayer in a Docker image for Akash deployment, and expose an HTTPS API that a React/Next.js front-end (Petra-compatible) can consume. The pattern is simpler, cheaper, and more secure than ERC-2771/4337 while delivering true gasless UX.*

## **1. Relayer Architecture Overview**

### 1.1 Why Aptos Sponsored Transactions

Aptos nodes accept a `MultiAgentWithFeePayer` payload in which the user signs once and the relayer signs as fee-payer[^1][^2]. No contract proxy is required, so your existing `send_with_fee<USDC>` entry point stays unchanged. Gas price discovery is one REST call (`/v1/estimate_gas_price`)[^3]; nonce management uses the user’s sequence number (or the new replay-protection nonce if you opt into orderless tx after main-net upgrade)[^4][^5].

### 1.2 High-level Flow

1. Front-end builds a raw transaction with `withFeePayer=true` and **fee = 0**.
2. User signs in Petra; signature and tx blob are POSTed to `/api/sponsor-transfer`.
3. Relayer:
a. Fetches gas tiers[^3] and the median APT-USDC price from Pyth or Chainlink[^6][^7][^8].
b. Estimates gas units (1000–1200 for a single USDC + fee transfer via Move simulation)[^9][^10].
c. Computes fee = `gasUnits × gasPrice/1e8 / priceAPT_USDC × 1.20` (20% markup).
d. Writes the fee into the transaction’s third argument, signs as fee payer, submits, returns the tx hash.

*Aptos guarantees sub-second finality, so the relayer can immediately answer the HTTPS request with the hash and stream status via SSE or WebSocket.*

## **2. TypeScript / Node.js Relayer – Step-by-Step**

### 2.1 Project scaffold

```bash
pnpm create tsup ./smoothsend-relayer
pnpm add @aptos-labs/ts-sdk @pythnetwork/pyth-aptos-js express dotenv
pnpm add -D typescript tsx @types/node
```

`.env` (never commit):

```
APTOS_NODE=https://fullnode.testnet.aptoslabs.com
RELAYER_PRIVATE_KEY=0x...
RELAYER_ADDRESS=0x...
MODULE_ADDR=0x...::smoothsend::gasless::send_with_fee
PYTH_ENDPOINT=https://hermes-beta.pyth.network
```


### 2.2 Core code (`src/index.ts`)

```ts
import 'dotenv/config'
import express from 'express'
import {
  Aptos, AptosConfig, Network, Account, Ed25519PrivateKey
} from '@aptos-labs/ts-sdk'
import { AptosPriceServiceConnection } from '@pythnetwork/pyth-aptos-js'

const cfg = new AptosConfig({ network: Network.TESTNET, fullnode: process.env.APTOS_NODE })
const aptos = new Aptos(cfg)
const relayer = Account.fromPrivateKey({
  privateKey: new Ed25519PrivateKey(process.env.RELAYER_PRIVATE_KEY!)
})
const pyth = new AptosPriceServiceConnection(process.env.PYTH_ENDPOINT!)

async function getGasPrice() {
  const r = await fetch(`${process.env.APTOS_NODE}/v1/estimate_gas_price`).then(r => r.json())
  return Number(r.gas_estimate)          // octas per gas unit
}

async function getAptUsdc() {
  const [apt, usdc] = await pyth.getLatestPriceFeeds([
    '0x03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5', // APT/USD
    '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a'  // USDC/USD
  ])
  const a = apt.getPriceUnchecked(), u = usdc.getPriceUnchecked()
  return (a.price * 10 ** a.expo) / (u.price * 10 ** u.expo)
}

async function calculateFee(gasUnits: number) {
  const price = await getGasPrice()      // octas/gu
  const rate  = await getAptUsdc()       // APT/USDC
  const apt   = BigInt(price * gasUnits) / 1_000_000_000n
  const usdc  = Number(apt) / rate
  return Math.ceil(usdc * 1.2)           // 20 % markup
}
```


#### API endpoint

```ts
const app = express().use(express.json())

app.post('/api/sponsor-transfer', async (req, res) => {
  try {
    const { rawTx, userSig } = req.body           // tx built client-side
    const G = 1100                                // worst-case gas units

    const fee = await calculateFee(G)
    rawTx.data.functionArguments[^2] = fee         // inject USDC fee

    const tx = await aptos.transaction.build.fromJSON(rawTx) // rehydrate
    const feePayerAuthenticator = aptos.transaction.signAsFeePayer({
      signer: relayer, transaction: tx
    })

    const { hash } = await aptos.transaction.submit.simple({
      transaction: tx,
      senderAuthenticator: userSig,
      feePayerAuthenticator
    })
    res.json({ ok: true, hash })
  } catch (e:any) { res.status(500).json({ ok:false, error:e.message }) }
})

app.listen(3000, () => console.log('Relayer up on :3000'))
```


### 2.3 Docker \& Akash

`Dockerfile`

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["node","dist/index.js"]
```

`deploy.yaml` (Akash SDL) — minimal version:

```yaml
version: "2.0"
services:
  relayer:
    image: smoothsend/relayer:1.0.0
    env:
      - APTOS_NODE=${APTOS_NODE}
      - RELAYER_PRIVATE_KEY=secret:relayer_key
      - MODULE_ADDR=${MODULE_ADDR}
      - PYTH_ENDPOINT=${PYTH_ENDPOINT}
    expose:
      - port: 3000
        as: 80
        to:
          - global: true

profiles:
  compute:
    relayer:
      resources:
        cpu:
          units: 1
        memory:
          size: 1Gi
        storage:
          size: 2Gi
  placement:
    akash:
      pricing:
        relayer:
          denom: uakt
          amount: 250
deployment:
  relayer:
    akash:
      profile: relayer
      count: 1
```

Upload the encrypted private-key secret and `akash tx deployment create deploy.yaml`[^11][^12].

## **3. Front-End (React 18 / Next 14)**

### 3.1 Wallet Connect

```tsx
import { PetraWallet } from 'petra-plugin-wallet-adapter'
import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react'

const wallets = [new PetraWallet()]
<AptosWalletAdapterProvider plugins={wallets} autoConnect>
  <App/>
</AptosWalletAdapterProvider>
```


### 3.2 UI Snippet

```tsx
const [pending, startTx] = useTransition()
const [hash, setHash] = useState<string>()
const send = async () => {
  const tx = await aptos.transaction.build.simple({
    sender: account.address,
    data: {
      function: process.env.NEXT_PUBLIC_SEND_FUNC!,
      typeArguments: ['0x...::usdc::USDC'],
      functionArguments: [ recipient, amount, 0 ]          // placeholder fee
    },
    withFeePayer: true
  })
  const userSig = aptos.transaction.sign({ signer: account, transaction: tx })

  startTx(async () => {
    const res = await fetch('/api/sponsor-transfer', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ rawTx: tx, userSig })
    }).then(r => r.json())
    setHash(res.hash)
  })
}
```

*Use `useTransition` to keep the button in a “spinner” state until the relayer returns; React 18 guarantees the pending flag resets once the async work resolves*[^13][^14].

### 3.3 Transaction Status Component

```tsx
import useSWR from 'swr'
const { data, error } = useSWR(hash ? `/api/tx/${hash}` : null, fetcher, {
  refreshInterval: 1500
})

return (
 <>
  { pending && <Spinner/> }
  { error   && <Alert type="error" msg={error.message}/> }
  { data?.success && <Alert type="success" msg="Done!" /> }
 </>
)
```


## **4. Security Hardening**

| Threat | Mitigation | Sources |
| :-- | :-- | :-- |
| Private-key theft | Import fee-payer key into AWS KMS (FIPS-140 L3) or Nitro Enclave; relayer container loads only the KMS key-id[^15][^16][^17][^18]. |  |
| Tx tampering | Verify `relayer_address` argument server-side matches `RELAYER_ADDRESS`, and that the signed Tx hash equals the body[^2][^19]. |  |
| Replay / nonce | Default Aptos sequence numbers enforce order; enable orderless Tx + `replayProtectionNonce` once AIP-X ships[^20][^4]. |  |
| Abuse / DoS | `express-rate-limit`, Cloudflare WAF, per-IP 100 req/15 min[^21][^22]. |  |
| Key rotation | Aptos `rotate_auth_key` + AWS KMS **import‐new-key**, broadcast new relayer addr to on-chain whitelist[^15][^2]. |  |

## **5. Testing Checklist**

| Step | Tooling | Notes |
| :-- | :-- | :-- |
| Claim test APT | `aptos account fund-with-faucet` (1.001 APT/24h)[^23][^24]. |  |
| Claim test USDC | Circle faucet (10 USDC/h per addr)[^25][^26][^23]. |  |
| Simulate Tx | `aptos.transaction.simulate.simple` with `estimate_*` flags[^9][^27]. |  |
| Gas profile | `aptos move run --profile-gas` or CLI gas profiler[^28][^10]. Expect ~1100 gu; cross-check relayer math. |  |
| Load test | Worker Threads 50 × concurrent sponsors, expect 50 TPS before Akash CPU saturates (1 vCPU)[^29]. |  |

## **6. Useful Open-Source Templates \& SDKs**

* Aptos TypeScript SDK examples (multi-agent, sponsorship)[^30][^31][^32].
* Pyth Aptos starter (`@pythnetwork/pyth-aptos-js`)[^6].
* Chainlink Aptos starter-kit (feed + CCIP)[^33][^34].
* `awesome-akash` deployment examples for CI, front-end hosting, GPUs[^35][^36][^37].
* OpenZeppelin Defender Relayers if you later bridge to EVM for marketing assets[^38][^39][^40].
* Biconomy docs – reference for gasless UX copywriting even though you’re on Aptos[^41][^42][^43].


## **7. Marketing Playbook for X / Discord**

1. **Narrative** – “Pay USDC, not APT. Gas = 0.1 USDC, fee = 0.12 USDC → ✨ transparent 20% relayer markup.”
2. **Thread idea** – Show two GIFs side-by-side: ordinary Aptos transfer vs Smoothsend gasless (Petra confirm then toast). Tag @AptosLabs + @circle + @pythnetwork[^7][^24].
3. **Data tweet** – “⛽️ Latest gas on Aptos: 0.0007 APT = 0.10 USDC (Pyth). Our relayer covers it, you pay 0.12. Flat, predictable.”
4. **Community** – weekly AMA in Aptos Discord; propose an Akash “decentralized infra” co-tweet (\#AkashGPU, link to SDL template)[^12][^11].
5. **Dev evangelism** – open-source relayer repo + walk-through article “From 0 to gasless in 300 lines” cross-posted to Aptos Forum \& Dev.to[^19][^44].

## **8. Next Steps**

1. Add Pyth **price push** on-chain to save one HTTP call per request (batch oracle updates)[^6].
2. Cache gas price for 3 s to cut REST spam.
3. Enable `orderless transactions` after main-net 1.10 to remove strict sequence constraints[^4][^5].
4. Apply to **Aptos Gas Station** program (up to 1 k APT credits) to fund main-net fees[^2].
5. Bundle the relayer + front-end in a single Akash SDL with two services (API + Next.js) when you go production.

## **⚠️ CRITICAL PRODUCTION WARNING**

**Free Sponsored Transaction Endpoints REMOVED for production safety:**
- `/sponsored-quote`, `/sponsored-build`, `/sponsored-submit` 
- `/gasless` (old endpoint)
- `/true-gasless`

These endpoints provided **100% free transactions** where users paid $0 and the relayer absorbed all gas costs. This would **bankrupt the relayer** in production.

**✅ Use these SAFE endpoints instead:**
- `/gasless/quote` → `/gasless/submit` (user pays USDC fees)
- `/gasless-with-wallet` (user pays USDC fees)

These maintain the gasless UX while ensuring **sustainable economics**: users pay USDC fees with transparent markup, relayer remains profitable.

**Delivering gasless USDC on Aptos is now a copy-paste away—start shipping!**

<div style="text-align: center">⁂</div>

[^1]: https://aptos.dev/en/build/sdks/ts-sdk/building-transactions/sponsoring-transactions

[^2]: https://aptos.dev/build/guides/sponsored-transactions

[^3]: https://www.quicknode.com/docs/aptos/v1-estimate_gas_price

[^4]: https://aptos.dev/en/build/sdks/ts-sdk/building-transactions/orderless-transactions

[^5]: https://github.com/aptos-labs/aptos-core/releases

[^6]: https://www.pyth.network/guides/aptos

[^7]: https://www.binance.com/en/square/post/18748384994370

[^8]: https://aptosfoundation.org/currents/chainlink-standard-goes-live-on-aptos-mainnet

[^9]: https://aptos.dev/en/build/sdks/ts-sdk/building-transactions

[^10]: https://aptos.dev/en/network/blockchain/gas-txn-fee

[^11]: https://akash.network/docs/deployments/apps-on-akash/

[^12]: https://akash.network/docs/architecture/containers-and-kubernetes/

[^13]: https://react.dev/reference/react/useTransition

[^14]: https://stackoverflow.com/questions/75139564/reacts-usetransition-stucked-in-ispending-true-when-calling-api-routes-from

[^15]: https://docs.aws.amazon.com/kms/latest/developerguide/overview.html

[^16]: https://aws.amazon.com/blogs/web3/make-eoa-private-keys-compatible-with-aws-kms/

[^17]: https://aws.amazon.com/blogs/web3/import-ethereum-private-keys-to-aws-kms/

[^18]: https://repost.aws/ja/questions/QU-ocp5jLZTgiBzyXN5exIfA/is-it-possible-to-use-kms-for-web3-signing?sc_ichannel=ha\&sc_ilang=en\&sc_isite=repost\&sc_iplace=hp\&sc_icontent=QU-ocp5jLZTgiBzyXN5exIfA\&sc_ipos=5

[^19]: https://aptos.dev/en/build/guides/transaction-management

[^20]: https://github.com/aptos-foundation/AIPs/issues/593

[^21]: https://github.com/akash-network/console

[^22]: https://itnext.io/centralizing-api-error-handling-in-react-apps-810b2be1d39d

[^23]: https://developers.circle.com/w3s/developer-console-faucet

[^24]: https://www.youtube.com/watch?v=j15XhDu_XXw

[^25]: https://faucet.circle.com

[^26]: https://crypto.news/circle-launches-usdc-and-eurc-faucets-to-support-dev-activity/

[^27]: https://www.quicknode.com/docs/aptos/v1-transactions-simulate

[^28]: https://aptos.dev/en/build/cli/working-with-move-contracts/local-simulation-benchmarking-and-gas-profiling

[^29]: https://www.youtube.com/watch?v=aXOdjNLQarw

[^30]: https://aptos.dev/en/build/sdks/ts-sdk

[^31]: https://github.com/aptos-labs/aptos-ts-sdk

[^32]: https://github.com/aptos-labs/aptos-ts-sdk/blob/main/examples/typescript-esm/multisig_v2.ts

[^33]: https://github.com/smartcontractkit/aptos-starter-kit

[^34]: https://github.com/smartcontractkit/chainlink-aptos

[^35]: https://github.com/akash-network/awesome-akash/blob/master/README.md

[^36]: https://github.com/akash-network/awesome-akash

[^37]: https://fleek.xyz/guides/builders-stack-akash/

[^38]: https://docs.openzeppelin.com/defender/tutorial/relayer

[^39]: https://dev.to/slw/how-to-deploy-smart-contracts-via-relayer-3876

[^40]: https://docs.openzeppelin.com/defender/guide/meta-tx

[^41]: https://docs-gasless.biconomy.io/products/enable-gasless-transactions

[^42]: https://dev.to/bhaskardutta/biconomy-win-your-customers-heart-with-gasless-transactions-3ak2

[^43]: https://docs-gasless.biconomy.io/products/enable-gasless-transactions/choose-an-approach-to-enable-gasless/eip-2771

[^44]: https://www.growth-hackers.net/the-definitive-web3-marketing-guide-you-need/

[^45]: https://github.com/aptos-labs/aptos-ts-sdk/blob/main/src/api/transactionSubmission/simulate.ts

[^46]: https://gist.github.com/tyler-smith/aca1516bc70964f226f44942be136f21

[^47]: https://www.youtube.com/watch?v=vgGil-xfQq8

[^48]: https://www.youtube.com/watch?v=4czUCGqa4IM

[^49]: https://stackoverflow.com/questions/63525616/relay-smart-contract-design

[^50]: https://gist.github.com/0xAnto/498968bed8c7fa527dbabfba39f9285f

[^51]: https://aptos.dev/sdks/ts-sdk/typescript-sdk-client-layer/

[^52]: https://www.npmjs.com/package/@shinami/clients?activeTab=readme

[^53]: https://www.gelato.network/relay

[^54]: https://aptos.dev/en/build/guides/first-transaction

[^55]: https://github.com/hippospace/aptos-wallet-adapter

[^56]: https://aptos.dev/en/build/sdks/wallet-adapter/dapp

[^57]: https://aptos.dev/en/build/sdks/wallet-adapter/wallets

[^58]: https://forum.aptosfoundation.org/t/aptos-x-chainlink-partnership-developments/14946

[^59]: https://stackoverflow.com/questions/79534321/hook-usewallet-in-library-aptos-labs-wallet-adapter-react-does-not-update-acc

[^60]: https://www.bitget.com/news/detail/12560603850445

[^61]: https://aptos.dev/en/build/guides/build-e2e-dapp/3-add-wallet-support

[^62]: https://docs.immersve.com/guides/obtaining-test-tokens/

[^63]: https://petra.app/docs

[^64]: https://github.com/avalonfinancexyz/ORACLE

[^65]: https://www.youtube.com/watch?v=DwbcJ1vFNJo

[^66]: https://aroundb.com/mastering-web3-growth-elevating-your-twitter-game-for-project-success/

[^67]: https://blockchainpress.media/web3-twitter-marketing-tools/

[^68]: https://aws.amazon.com/blogs/database/part2-use-aws-kms-to-securely-manage-ethereum-accounts/

[^69]: https://akash.network/docs/guides/deployments/apache-http/

[^70]: https://www.linkedin.com/pulse/unlocking-potential-web3-social-media-marketing-twitter-apolonis-v4irf

[^71]: https://github.com/akash-network/console-ci-test

[^72]: https://blog.tokensoft.io/best-twitter-practices-for-web3-projects-be65d14df735?gi=09d67f943955

[^73]: https://github.com/Zblocker64/cloudmos

[^74]: https://www.linkedin.com/pulse/marketing-pr-web3-strategies-building-growing-communities-fendi-khan-wtq8e

[^75]: https://repost.aws/questions/QU-ocp5jLZTgiBzyXN5exIfA/is-it-possible-to-use-kms-for-web3-signing

[^76]: https://devpost.com/software/akash-near

[^77]: https://docs.aws.amazon.com/kms/latest/developerguide/data-protection.html

[^78]: https://github.com/akash-network/console/pkgs/container/deploy-web

[^79]: https://aptos.dev/build/guides/first-transaction

[^80]: https://www.ankr.com/docs/rpc-service/chains/chains-api/aptos/

[^81]: https://github.com/aptos-foundation/AIPs/issues/134

[^82]: https://goldrush.dev/guides/building-with-account-abstraction-part-3-using-the-paymaster-contract/

[^83]: https://www.youtube.com/watch?v=1GKfY3Pw458

[^84]: https://akash.network/docs/

[^85]: https://portal.thirdweb.com/connect/account-abstraction/gasless/openzeppelin

[^86]: https://lobehub.com/mcp/akash-network-mcp

[^87]: https://dev.to/imyusufakhtar/effective-loading-and-error-handling-in-react-applications-4bcc

[^88]: https://docs.mpcvault.com/product/how-to-customize-a-transaction-nonce/

[^89]: https://stackoverflow.com/questions/68970650/how-to-show-success-or-error-message-based-on-the-response-of-the-api-in-react-j

[^90]: https://aptos.dev/en/build/smart-contracts/error-codes

[^91]: https://www.youtube.com/watch?v=1z_vfK05Tl4

[^92]: https://help.tokenpocket.pro/en/wallet-faq-en/multisig-wallet/nonce

[^93]: https://uxcam.com/blog/react-error-handling-best-practices/

[^94]: https://aptos.dev/build/guides/transaction-management

[^95]: https://www.loggly.com/blog/best-practices-for-client-side-logging-and-error-handling-in-react/

[^96]: https://developers.circle.com/cctp/aptos-packages

[^97]: https://www.developerway.com/posts/how-to-handle-errors-in-react

[^98]: https://www.zipy.ai/blog/react-errors

[^99]: https://aptos-labs.github.io/aptos-ts-sdk/@aptos-labs/ts-sdk-1.35.0/classes/Aptos.html

