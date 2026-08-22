# 17. Back-of-the-Envelope Estimation, Latency Numbers & Availability SLAs

## 📖 Table of Contents
1. [Power of Two Data Volume Reference](#1-power-of-two-data-volume-reference)
2. [Latency Numbers Every Programmer Should Know](#2-latency-numbers-every-programmer-should-know)
3. [Availability Numbers & SLA Nines](#3-availability-numbers--sla-nines)
4. [Master Back-of-the-Envelope Estimation Template (Twitter Case Study)](#4-master-back-of-the-envelope-estimation-template-twitter-case-study)
5. [System Design Interview Math Rules of Thumb](#5-system-design-interview-math-rules-of-thumb)

---

## 1. Power of Two Data Volume Reference

In distributed systems, data volume calculations rely on powers of 2. 

| Power of 2 | Approximate Value | Full Name | Short Name | Byte Count |
| :--- | :--- | :--- | :--- | :--- |
| $2^{10}$ | 1 Thousand | 1 Kilobyte | 1 KB | $1,000$ Bytes |
| $2^{20}$ | 1 Million | 1 Megabyte | 1 MB | $1,000,000$ Bytes |
| $2^{30}$ | 1 Billion | 1 Gigabyte | 1 GB | $1,000,000,000$ Bytes |
| $2^{40}$ | 1 Trillion | 1 Terabyte | 1 TB | $10^{12}$ Bytes |
| $2^{50}$ | 1 Quadrillion | 1 Petabyte | 1 PB | $10^{15}$ Bytes |

---

## 2. Latency Numbers Every Programmer Should Know

Dr. Jeff Dean (Google Senior Fellow) compiled standard computer operation timings. These latency comparisons dictate architectural choices in distributed systems design:

| Operation Name | Latency (Time) | Scale Relative to RAM |
| :--- | :--- | :--- |
| **L1 Cache Reference** | $0.5 \text{ ns}$ | Fast |
| **Branch Mispredict** | $5 \text{ ns}$ | - |
| **L2 Cache Reference** | $7 \text{ ns}$ | 14x slower than L1 |
| **Mutex Lock / Unlock** | $100 \text{ ns}$ | - |
| **Main Memory Reference (RAM)** | $100 \text{ ns}$ | **Baseline (100 ns)** |
| **Compress 1KB with Zippy/Snappy** | $10,000 \text{ ns} = 10 \ \mu\text{s}$ | 100x RAM |
| **Send 2KB over 1 Gbps Network** | $20,000 \text{ ns} = 20 \ \mu\text{s}$ | 200x RAM |
| **Read 1MB Sequentially from RAM** | $250,000 \text{ ns} = 250 \ \mu\text{s}$ | 2,500x RAM |
| **Round Trip within Same Datacenter** | $500,000 \text{ ns} = 500 \ \mu\text{s} = 0.5 \text{ ms}$ | 5,000x RAM |
| **Read 1MB Sequentially from SSD** | $1,000,000 \text{ ns} = 1 \text{ ms}$ | 10,000x RAM |
| **Disk Seek (HDD)** | $10,000,000 \text{ ns} = 10 \text{ ms}$ | **100,000x RAM** 🔴 |
| **Read 1MB Sequentially from Network**| $10,000,000 \text{ ns} = 10 \text{ ms}$ | 100,000x RAM |
| **Read 1MB Sequentially from HDD** | $30,000,000 \text{ ns} = 30 \text{ ms}$ | 300,000x RAM |
| **Packet CA $\rightarrow$ Netherlands $\rightarrow$ CA**| $150,000,000 \text{ ns} = 150 \text{ ms}$ | 1,500,000x RAM |

```
Units:
1 ns  = 10^-9 seconds
1 µs  = 10^-6 seconds = 1,000 ns
1 ms  = 10^-3 seconds = 1,000 µs = 1,000,000 ns
```

### 💡 Core Engineering Takeaways:
1. **RAM is fast ($100 \text{ ns}$), Disk is slow ($10 \text{ ms}$)**: Avoid HDD random disk seeks at all costs. Use in-memory caches (Redis, Caffeine) or append-only write logs (WAL / LSM Trees).
2. **CPUs compress fast ($10 \ \mu\text{s}$)**: Always compress data (gzip, zstd, snappy) before sending across network connections.
3. **Cross-Datacenter RTT is expensive ($150 \text{ ms}$)**: Keep read caches local to geographic regions (CDNs, edge locations).

---

## 3. Availability Numbers & SLA Nines

High availability is measured in "Nines" of continuous uptime specified in Service Level Agreements (SLAs):

| Availability % | Downtime per Day | Downtime per Month | Downtime per Year | Application Tier |
| :--- | :--- | :--- | :--- | :--- |
| **99%** (2 Nines) | 14.40 minutes | 7.31 hours | 3.65 days | Internal Batch Jobs |
| **99.9%** (3 Nines) | 1.44 minutes | 43.8 minutes | 8.76 hours | Standard Cloud APIs |
| **99.99%** (4 Nines) | 8.64 seconds | 4.38 minutes | 52.60 minutes | **Cloud Provider SLA Standard (AWS/GCP)** |
| **99.999%** (5 Nines) | 864 milliseconds | 26.30 seconds | 5.26 minutes | Financial & Payment Gateways |
| **99.9999%** (6 Nines)| 86.40 milliseconds| 2.63 seconds | 31.56 seconds | Telecom & Core Safety Systems |

---

## 4. Master Back-of-the-Envelope Estimation Template (Twitter Case Study)

### 📌 Problem Statement:
Estimate QPS, Peak QPS, Daily Storage, and 5-Year Media Storage requirement for Twitter.

### 1. Define Assumptions:
- **Monthly Active Users (MAU)** = 300 Million.
- **Daily Active Users (DAU)** = 50% of MAU = $150 \text{ Million DAU}$.
- **Tweet Creation Rate** = 2 tweets/day per DAU.
- **Media Content Rate** = 10% of tweets contain media (images/videos).
- **Average Media Size** = 1 MB.
- **Retention Period** = 5 years.

---

### 2. Step-by-Step Calculations:

#### A. Query Per Second (QPS) Estimation:
$$\text{Total Daily Tweets} = 150 \text{ Million DAU} \times 2 \text{ tweets/day} = 300 \text{ Million tweets/day}$$

$$\text{Seconds in a Day} = 24 \times 3,600 = 86,400 \approx 100,000 \text{ seconds}$$

$$\text{Tweets QPS} = \frac{300,000,000}{86,400} \approx \frac{300,000,000}{100,000} \approx \mathbf{3,500 \text{ QPS}}$$

$$\text{Peak QPS} = 2 \times \text{QPS} = 2 \times 3,500 = \mathbf{7,000 \text{ Peak QPS}}$$

---

#### B. Media Storage Estimation:
$$\text{Daily Media Tweets} = 300 \text{ Million tweets} \times 10\% = 30 \text{ Million media tweets/day}$$

$$\text{Daily Media Storage} = 30 \text{ Million} \times 1 \text{ MB} = \mathbf{30 \text{ TB / day}}$$

$$\text{5-Year Media Storage} = 30 \text{ TB/day} \times 365 \text{ days} \times 5 \text{ years} = 30 \text{ TB} \times 1,825 \approx \mathbf{54.75 \text{ PB} \approx 55 \text{ PB}}$$

---

## 5. System Design Interview Math Rules of Thumb

1. **Use Rounding & Approximations**:
   Simplify math during live interviews!
   - 1 day = $86,400 \text{ seconds} \approx 100,000 \text{ seconds} = 10^5 \text{ seconds}$.
   - $99,987 / 9.1 \rightarrow 100,000 / 10 = 10,000$.

2. **Always State Assumptions Out Loud**:
   Write down DAU percentages, average payload sizes, and read:write ratios upfront before starting math.

3. **Label Units Explicitly**:
   Never write plain numbers! Always append KB, MB, GB, TB, PB, or QPS to avoid magnitude errors.

4. **Remember Common Conversion Multipliers**:
   - $1 \text{ Million requests/day} \approx 12 \text{ QPS}$.
   - $100 \text{ Million requests/day} \approx 1,200 \text{ QPS}$.
   - $1 \text{ Billion requests/day} \approx 12,000 \text{ QPS}$.
