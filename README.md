# 🚀 CryptoTick Hub: Enterprise-Grade Event-Driven Market Intelligence

**CryptoTick Hub** is a high-performance, cloud-native analytical platform engineered for real-time cryptocurrency market surveillance. Built on a fully **Serverless, Event-Driven Architecture (EDA)**, the system manages high-frequency data ingestion, stateful volatility analysis, and automated intelligence delivery with sub-second latency.

---

## 🏗 System Architecture & Engineering Principles

The platform is architected to adhere to the **AWS Well-Architected Framework**, focusing on operational excellence, security, and reliability.

### **1. Data Ingestion & Orchestration (Producer)**
* **Microservice:** `IngestionService` (Java 17)
* **Logic:** A cron-scheduled **AWS Lambda** poller (1-minute intervals) interfaces with the Binance REST API. It fetches ticker data for a high-traffic asset watchlist and publishes payload batches to an asynchronous pipeline.
* **Pattern:** Producer-Consumer decoupling to ensure ingestion stability regardless of downstream processing state.

### **2. Asynchronous Messaging Layer**
* **Provider:** **Amazon SQS**
* **Role:** Acts as a high-durability buffer and load leveler. By decoupling ingestion from analytics, the system guarantees zero data loss during traffic spikes and enables independent scaling of compute resources.

### **3. Stateful Analytics Engine (Consumer)**
* **Microservice:** `AnalyticsEngine` (Java 17)
* **Processing:** Triggered by SQS events, this engine performs real-time delta calculations:
  `Delta = (Price_Current - Price_Previous) / Price_Previous`
* **Volatility Logic:** Evaluates user-defined thresholds (expressed in percentages, e.g., 0.5% or 5.0%) stored in a distributed configuration layer.
* **Alerting:** Upon a threshold breach, the engine programmatically invokes **Amazon SES (Simple Email Service)** to deliver personalized market intelligence directly to the user's verified endpoint.

### **4. Persistence Strategy**
* **Database:** **Amazon DynamoDB** (NoSQL)
* **Schema Design:** Optimized for O(1) lookups. Uses a composite key structure:
    * **Partition Key:** `userId` (for scoped data isolation).
    * **Sort Key:** `timestamp` (for efficient time-series trajectory queries).
* **Scaling:** On-demand capacity mode to handle variable read/write throughput.

### **5. Security & Identity Layer**
* **Authentication:** **Amazon Cognito** (Managed User Pools).
* **Auth Lifecycle:** Implements secure JWT-based authentication with **Refresh Token** support (24h validity), ensuring session persistence and cryptographically secure API access.
* **API Security:** **AWS API Gateway** with a Cognito Authorizer and strict **CORS** policies.

---

## 🛠 Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Infrastructure** | AWS CDK v2 (Java), CloudFormation |
| **Backend** | Java 17, AWS Lambda, AWS SQS, AWS EventBridge, Maven |
| **Authentication/Authorization** | AWS Cognito User Pool, AWS Cognito Identity Pool |
| **Logging/Monitoring** | AWS CloudWatch, AWS X-Ray |
| **Frontend** | React 18, Vite, Recharts, AWS Amplify UI |
| **Networking** | AWS CloudFront (Edge Caching), API Gateway |
| **Storage** | Amazon S3 (Static Hosting), DynamoDB |

---

## 🌟 Technical Highlights

* **Serverless Precision:** 100% **cold-start optimized** Java Lambdas with fine-grained IAM roles (Principle of Least Privilege).
* **Real-Time Visualization:** High-performance SVG-based trajectory mapping with dynamic time-range filtering (1H, 1D, 1W, 1M).
* **Cloud-Native IaC:** Entire infrastructure is defined as code (IaC) using the **AWS Cloud Development Kit (CDK)**, ensuring idempotent and reproducible deployments.
* **Adaptive UI:** Modern terminal-inspired Dark UI featuring glassmorphism and real-time telemetry indicators.

---

## 🚀 Deployment & Orchestration

### **Backend (Infrastructure as Code)**
The stack is synthesized into CloudFormation templates via AWS CDK.

```bash
# Clone the repository
git clone https://github.com/levanatsvlishvili/CryptoTick.git

# Build microservices and deploy stack
cd infra
mvn clean package
cdk deploy --all
```

### **Frontend (Analytics Terminal)**
```bash
cd frontend
npm install
npm run build
# Sync build folder with S3 Bucket defined in CDK output
```

---

## 🔐 Configuration & Security Notes
* **SES Sandbox:** In the current development environment, Amazon SES is in Sandbox mode. **Target emails must be verified** in the AWS Console under "Verified Identities."
* **IAM Policy:** All compute resources operate under strict IAM policies, with access scoped exclusively to relevant DynamoDB tables and SES resources.

---

## 👨‍💻 Engineer

**Levan Natsvlishvili** *AWS Certified Developer | Software Engineer*


[![Github](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/levanatsvlishvili/CryptoTick)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/levan-natsvlishvili/)

---
*© 2026 CryptoTick Hub. Engineered for Market Intelligence and Scalability.*