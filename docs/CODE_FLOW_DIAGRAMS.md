# 🔄 SmoothSend Code Flow Diagrams

## 📊 Complete System Architecture

```mermaid
graph TB
    subgraph "Frontend/Client"
        W[Wallet App<br/>Petra/Martian]
        C[Client Code<br/>client-example.ts]
    end
    
    subgraph "SmoothSend Relayer Server"
        subgraph "Routes Layer"
            R[routes/relayer.ts<br/>API Endpoints]
        end
        
        subgraph "Middleware"
            RL[Rate Limiter<br/>100 req/min]
            CORS[CORS Handler]
        end
        
        subgraph "Controller Layer"
            RC[RelayerController<br/>Business Logic]
        end
        
        subgraph "Service Layer"
            AS[AptosService<br/>Blockchain Integration]
            GS[GasService<br/>Fee Calculation]
            PS[PriceService<br/>APT Price Oracle]
            SM[SafetyMonitor<br/>Beta Limits]
        end
        
        subgraph "External Services"
            RD[Redis<br/>Rate Limiting]
            PG[PostgreSQL<br/>Transaction History]
        end
    end
    
    subgraph "Aptos Blockchain"
        APT[Aptos Network<br/>Testnet/Mainnet]
        SC[Smart Contract<br/>send_with_fee]
    end
    
    %% Main Flow
    W --> C
    C --> R
    R --> RL
    RL --> CORS
    CORS --> RC
    RC --> AS
    RC --> GS
    RC --> PS
    RC --> SM
    AS --> APT
    AS --> SC
    
    %% Data Storage
    RC --> RD
    RC --> PG
    PS --> |Price Data| RD
    
    %% Styling
    classDef frontend fill:#e1f5fe
    classDef server fill:#f3e5f5
    classDef blockchain fill:#e8f5e8
    classDef storage fill:#fff3e0
    
    class W,C frontend
    class R,RL,CORS,RC,AS,GS,PS,SM server
    class APT,SC blockchain
    class RD,PG storage
```

## 🚀 Gasless Transaction Flow (Primary Path)

```mermaid
sequenceDiagram
    participant U as User
    participant W as Wallet (Petra)
    participant C as Client Code
    participant API as Relayer API
    participant RC as RelayerController
    participant AS as AptosService
    participant A as Aptos Network
    participant SC as Smart Contract

    Note over U,SC: 💸 Gasless USDC Transfer Flow

    %% Step 1: Initiate Transfer
    U->>W: "Send 10 USDC to Bob"
    W->>C: User confirms transaction
    
    %% Step 2: Build Transaction
    Note over C: 🔨 Build Transaction with Fee Payer
    C->>C: Build transaction with withFeePayer: true
    C->>C: Set sender, recipient, amount
    C->>C: Set relayer as fee payer
    
    %% Step 3: Sign Transaction
    Note over W: ✍️ User Signature Only
    C->>W: Request signature for transaction
    W->>W: User signs with private key
    W->>C: Return signed transaction
    
    %% Step 4: Serialize & Send
    Note over C: 📦 Prepare for Relayer
    C->>C: Serialize transaction bytes
    C->>C: Serialize authenticator bytes
    C->>API: POST /gasless-wallet-serialized<br/>{transactionBytes, authenticatorBytes}
    
    %% Step 5: Server Processing
    Note over API,AS: 🔄 Relayer Processing
    API->>RC: Route to controller
    RC->>RC: Validate request parameters
    RC->>RC: Deserialize transaction
    RC->>RC: Deserialize user signature
    
    %% Step 6: Add Fee Payer Signature
    Note over RC,AS: 🔐 Dual Signature Process
    RC->>AS: Add relayer fee payer signature
    AS->>AS: Relayer signs as fee payer
    AS->>AS: Combine user + relayer signatures
    
    %% Step 7: Submit to Blockchain
    Note over AS,A: 📡 Blockchain Submission
    AS->>A: Submit dual-signed transaction
    A->>SC: Execute send_with_fee function
    SC->>SC: Validate relayer whitelist
    SC->>SC: Validate user balance
    SC->>SC: Transfer USDC from user to recipient
    SC->>A: Transaction successful
    
    %% Step 8: Response
    Note over A,U: ✅ Success Response
    A->>AS: Transaction hash & details
    AS->>RC: Return result
    RC->>API: Format response
    API->>C: Return success + txHash
    C->>U: "Transfer completed! 🎉"
    
    %% Styling
    Note over U,SC: 🎯 Key: User pays ZERO gas fees!
```

## 🏗️ Controller Architecture Deep Dive

```mermaid
graph TD
    subgraph "RelayerController.ts - All Endpoints"
        subgraph "🚀 Gasless Endpoints"
            GW[submitGaslessWithProperWallet<br/>POST /gasless-wallet-serialized<br/>✅ PRODUCTION METHOD]
        end
        
        subgraph "💰 Traditional Endpoints"
            Q[getQuote<br/>POST /quote<br/>⚠️ UNUSED - Legacy]
        end
        
        subgraph "🔧 Utility Endpoints"
            H[getHealth<br/>GET /health]
            B[getBalance<br/>GET /balance/:address]
            S[getStats<br/>GET /stats]
            SS[getSafetyStats<br/>GET /safety-stats]
            TS[getTransactionStatus<br/>GET /status/:txnHash]
        end
    end
    
    subgraph "Service Dependencies"
        AS[AptosService<br/>🔗 Blockchain calls]
        PS[PriceService<br/>💲 APT pricing]
        GS[GasService<br/>⛽ Fee calculation]
        SM[SafetyMonitor<br/>🛡️ Beta limits]
    end
    
    %% Connections
    GW --> AS
    GW --> SM
    Q --> GS
    Q --> AS
    H --> AS
    H --> PS
    B --> AS
    S --> AS
    SS --> SM
    TS --> AS
    
    %% Service interconnections
    GS --> AS
    GS --> PS
    
    %% Styling
    classDef active fill:#c8e6c9
    classDef legacy fill:#ffecb3
    classDef utility fill:#e1f5fe
    classDef service fill:#f3e5f5
    
    class GW active
    class Q legacy
    class H,B,S,SS,TS utility
    class AS,PS,GS,SM service
```

## 🔐 Transaction Serialization Process

```mermaid
graph LR
    subgraph "Client Side"
        subgraph "1️⃣ Transaction Building"
            TB[Build Raw Transaction<br/>• Sender address<br/>• Recipient address<br/>• Amount (USDC)<br/>• withFeePayer: true]
        end
        
        subgraph "2️⃣ User Signing"
            US[User Signs Transaction<br/>• Wallet private key<br/>• Ed25519 signature<br/>• Creates authenticator]
        end
        
        subgraph "3️⃣ Serialization"
            SER[Serialize Both<br/>• Transaction → bytes[]<br/>• Authenticator → bytes[]<br/>• Send to relayer]
        end
    end
    
    subgraph "Server Side"
        subgraph "4️⃣ Deserialization"
            DES[Deserialize Data<br/>• bytes[] → Transaction<br/>• bytes[] → Authenticator<br/>• Validate structure]
        end
        
        subgraph "5️⃣ Fee Payer Signing"
            FPS[Add Relayer Signature<br/>• Relayer private key<br/>• Signs as fee payer<br/>• Creates fee payer auth]
        end
        
        subgraph "6️⃣ Submission"
            SUB[Submit to Aptos<br/>• Dual signatures<br/>• User + Fee Payer<br/>• No sequence conflicts]
        end
    end
    
    TB --> US
    US --> SER
    SER --> DES
    DES --> FPS
    FPS --> SUB
    
    %% Benefits
    SUB --> BEN1[✅ No Race Conditions]
    SUB --> BEN2[✅ Universal Wallet Support]
    SUB --> BEN3[✅ Proper Security]
    
    %% Styling
    classDef client fill:#e3f2fd
    classDef server fill:#f1f8e9
    classDef benefit fill:#c8e6c9
    
    class TB,US,SER client
    class DES,FPS,SUB server
    class BEN1,BEN2,BEN3 benefit
```

## 🛡️ Security & Safety Flow

```mermaid
graph TD
    subgraph "Request Entry"
        REQ[Incoming Request]
    end
    
    subgraph "🚧 Rate Limiting Layer"
        RL1[Global Rate Limiter<br/>Express rate limit]
        RL2[Address Rate Limiter<br/>100 req/min per address]
    end
    
    subgraph "🔒 Validation Layer"
        V1[Parameter Validation<br/>Required fields check]
        V2[Signature Validation<br/>Ed25519 verification]
        V3[Balance Validation<br/>Sufficient USDC check]
    end
    
    subgraph "🛡️ Safety Monitor"
        SM1[Transaction Limits<br/>Max 10 USDC per tx]
        SM2[Daily User Limits<br/>Max 100 USDC per user]
        SM3[Global Daily Limits<br/>Max 1000 USDC system-wide]
    end
    
    subgraph "🔐 Contract Security"
        CS1[Relayer Whitelist<br/>Only approved relayers]
        CS2[Contract Validation<br/>send_with_fee function]
        CS3[Zero Transfer Prevention<br/>Amount > 0 check]
    end
    
    subgraph "✅ Transaction Execution"
        EXEC[Execute Transaction<br/>Dual signatures submitted]
    end
    
    %% Flow
    REQ --> RL1
    RL1 --> RL2
    RL2 --> V1
    V1 --> V2
    V2 --> V3
    V3 --> SM1
    SM1 --> SM2
    SM2 --> SM3
    SM3 --> CS1
    CS1 --> CS2
    CS2 --> CS3
    CS3 --> EXEC
    
    %% Error paths
    RL1 -.->|429| ERR1[Rate Limit Error]
    RL2 -.->|429| ERR2[Address Limit Error]
    V1 -.->|400| ERR3[Invalid Parameters]
    V2 -.->|400| ERR4[Invalid Signature]
    V3 -.->|400| ERR5[Insufficient Balance]
    SM1 -.->|400| ERR6[Amount Too Large]
    SM2 -.->|400| ERR7[Daily Limit Exceeded]
    SM3 -.->|503| ERR8[System Limit Reached]
    CS1 -.->|403| ERR9[Unauthorized Relayer]
    CS2 -.->|400| ERR10[Invalid Function]
    CS3 -.->|400| ERR11[Zero Amount]
    
    %% Styling
    classDef entry fill:#e8eaf6
    classDef security fill:#fff3e0
    classDef safety fill:#fce4ec
    classDef contract fill:#e0f2f1
    classDef success fill:#c8e6c9
    classDef error fill:#ffebee
    
    class REQ entry
    class RL1,RL2,V1,V2,V3 security
    class SM1,SM2,SM3 safety
    class CS1,CS2,CS3 contract
    class EXEC success
    class ERR1,ERR2,ERR3,ERR4,ERR5,ERR6,ERR7,ERR8,ERR9,ERR10,ERR11 error
```

## 📊 Service Layer Interactions

```mermaid
graph TB
    subgraph "🔗 AptosService"
        AS1[Blockchain Connection<br/>• Network configuration<br/>• Transaction simulation<br/>• Balance queries]
        AS2[Transaction Processing<br/>• Deserialize transactions<br/>• Add fee payer signatures<br/>• Submit to network]
        AS3[Status Monitoring<br/>• Transaction status<br/>• Health checks<br/>• Account validation]
    end
    
    subgraph "💲 PriceService"
        PS1[Price Feeds<br/>• CoinGecko API<br/>• APT/USD pricing<br/>• Smart oracle logic]
        PS2[Caching Strategy<br/>• Redis cache<br/>• 5min expiry<br/>• Fallback pricing]
    end
    
    subgraph "⛽ GasService (Legacy)"
        GS1[Fee Calculation<br/>• Gas estimation<br/>• Price conversion<br/>• Markup application]
        GS2[Quote Generation<br/>• Cost analysis<br/>• USD conversion<br/>• Fee breakdown]
    end
    
    subgraph "🛡️ SafetyMonitor"
        SM1[Beta Limits<br/>• Per-transaction: 10 USDC<br/>• Per-user daily: 100 USDC<br/>• System daily: 1000 USDC]
        SM2[Usage Tracking<br/>• Transaction counting<br/>• Volume monitoring<br/>• Limit enforcement]
    end
    
    %% Interconnections
    AS2 --> AS1
    AS3 --> AS1
    PS2 --> PS1
    GS1 --> AS1
    GS1 --> PS1
    GS2 --> GS1
    SM2 --> SM1
    
    %% External connections
    AS1 --> APTOS[Aptos Network]
    PS1 --> CG[CoinGecko API]
    PS2 --> REDIS[Redis Cache]
    SM2 --> MEM[In-Memory Store]
    
    %% Usage indicators
    AS1 -.->|✅ ACTIVE| CONTROLLER[RelayerController]
    PS1 -.->|✅ ACTIVE| CONTROLLER
    SM1 -.->|✅ ACTIVE| CONTROLLER
    GS1 -.->|⚠️ LEGACY| QUOTE[Quote Endpoint Only]
    
    %% Styling
    classDef active fill:#c8e6c9
    classDef legacy fill:#ffecb3
    classDef external fill:#e1f5fe
    classDef storage fill:#f3e5f5
    
    class AS1,AS2,AS3,PS1,PS2,SM1,SM2 active
    class GS1,GS2 legacy
    class APTOS,CG external
    class REDIS,MEM storage
```

## 🔄 Error Handling Flow

```mermaid
flowchart TD
    START[Request Received] --> RATE{Rate Limit Check}
    
    RATE -->|Pass| VALIDATE{Parameter Validation}
    RATE -->|Fail| ERR_RATE[429: Rate Limit Exceeded]
    
    VALIDATE -->|Pass| DESERIALIZE{Transaction Deserialization}
    VALIDATE -->|Fail| ERR_PARAM[400: Missing Parameters]
    
    DESERIALIZE -->|Pass| SAFETY{Safety Limits Check}
    DESERIALIZE -->|Fail| ERR_DESERIAL[400: Invalid Transaction Format]
    
    SAFETY -->|Pass| SIGNATURE{Signature Validation}
    SAFETY -->|Fail| ERR_SAFETY[400: Safety Limit Exceeded]
    
    SIGNATURE -->|Pass| BALANCE{Balance Check}
    SIGNATURE -->|Fail| ERR_SIG[400: Invalid Signature]
    
    BALANCE -->|Pass| SUBMIT{Submit to Blockchain}
    BALANCE -->|Fail| ERR_BAL[400: Insufficient Balance]
    
    SUBMIT -->|Success| SUCCESS[200: Transaction Successful]
    SUBMIT -->|Blockchain Error| ERR_CHAIN[500: Blockchain Error]
    SUBMIT -->|Network Error| ERR_NET[503: Network Unavailable]
    
    %% Error responses
    ERR_RATE --> LOG[Log Error Details]
    ERR_PARAM --> LOG
    ERR_DESERIAL --> LOG
    ERR_SAFETY --> LOG
    ERR_SIG --> LOG
    ERR_BAL --> LOG
    ERR_CHAIN --> LOG
    ERR_NET --> LOG
    
    LOG --> RESPOND[Return Error Response]
    SUCCESS --> RESPOND_SUCCESS[Return Success Response]
    
    %% Styling
    classDef decision fill:#fff3e0
    classDef success fill:#c8e6c9
    classDef error fill:#ffcdd2
    classDef process fill:#e1f5fe
    
    class RATE,VALIDATE,DESERIALIZE,SAFETY,SIGNATURE,BALANCE,SUBMIT decision
    class SUCCESS,RESPOND_SUCCESS success
    class ERR_RATE,ERR_PARAM,ERR_DESERIAL,ERR_SAFETY,ERR_SIG,ERR_BAL,ERR_CHAIN,ERR_NET error
    class START,LOG,RESPOND process
```

## 🎯 API Endpoint Map

```mermaid
graph LR
    subgraph "Base: /api/v1/relayer"
        subgraph "🚀 Gasless (Production)"
            EP1[POST /gasless-wallet-serialized<br/>✅ PRIMARY ENDPOINT<br/>Production gasless transfers]
        end
        
        subgraph "💰 Traditional (Legacy)"
            EP2[POST /quote<br/>⚠️ UNUSED<br/>Fee calculation only]
        end
        
        subgraph "🔧 Utilities (Active)"
            EP3[GET /health<br/>✅ Service status]
            EP4[GET /balance/:address<br/>✅ USDC balance check]
            EP5[GET /stats<br/>✅ Transaction statistics]
            EP6[GET /safety-stats<br/>✅ Beta monitoring]
            EP7[GET /status/:txnHash<br/>✅ Transaction status]
        end
    end
    
    %% Usage indicators
    EP1 --> U1[Frontend Integration<br/>Mobile Apps<br/>Web Dashboards]
    EP3 --> U2[Health Monitoring<br/>Uptime Services<br/>Load Balancers]
    EP4 --> U3[Balance Checking<br/>User Interfaces<br/>Validation Logic]
    EP5 --> U4[Analytics<br/>Dashboard Metrics<br/>Performance Monitoring]
    EP6 --> U5[Beta Management<br/>Safety Monitoring<br/>Limit Tracking]
    EP7 --> U6[Transaction Tracking<br/>Status Updates<br/>Confirmation UIs]
    
    EP2 --> U7[❌ No Active Usage<br/>Legacy/Unused Code]
    
    %% Styling
    classDef primary fill:#c8e6c9
    classDef legacy fill:#ffecb3
    classDef utility fill:#e1f5fe
    classDef usage fill:#f3e5f5
    classDef unused fill:#ffcdd2
    
    class EP1 primary
    class EP2 legacy
    class EP3,EP4,EP5,EP6,EP7 utility
    class U1,U2,U3,U4,U5,U6 usage
    class U7 unused
```

---

## 💡 Key Insights from Diagrams

### 🎯 **Primary Flow**: 
The gasless transaction flow using transaction serialization is the core production feature.

### ⚠️ **Legacy Code**: 
The quote endpoint and gas calculation service are unused legacy components.

### 🛡️ **Security Layers**: 
Multiple validation and safety layers protect the system at different levels.

### 🔄 **Clean Architecture**: 
Clear separation between routes, controllers, services, and external dependencies.

### 📊 **Monitoring Ready**: 
Comprehensive utility endpoints for health monitoring and analytics.

*Generated: September 3, 2025*
