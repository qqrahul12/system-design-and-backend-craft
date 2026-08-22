# 13. Bit Manipulation & Math Problem Solving

## 📖 Table of Contents
1. [Question 1: Sum of Two Integers Without `+` and `-` (Bitwise Arithmetic)](#question-1-sum-of-two-integers-without--and---bitwise-arithmetic)
2. [Question 2: Smallest Number $\ge n$ Whose Digit Product is Divisible by $t$](#question-2-smallest-number-ge-n-whose-digit-product-is-divisible-by-t)

---

## Question 1: Sum of Two Integers Without `+` and `-` (Bitwise Arithmetic)

### 📌 Problem Statement
Given two integers `a` and `b`, return the sum of the two integers without using the operators `+` and `-`.

---

### 🧠 Brainstorming & Mathematical Rationale

Binary addition relies on two fundamental bitwise operations:

1. **Sum Without Carry (`a ^ b`)**:
   Bitwise XOR computes binary addition without considering carries:
   - $0 \oplus 0 = 0$
   - $1 \oplus 0 = 1$
   - $0 \oplus 1 = 1$
   - $1 \oplus 1 = 0$ (carry generated)

2. **Carry Calculation `(a & b) << 1`**:
   Bitwise AND identifies where both bits are `1` (generating a carry). Shifting left by 1 position (`<< 1`) shifts the carry to the next higher bit position where it must be added.

3. **Loop Condition**:
   Repeat the process by setting $a = a \oplus b$ (new partial sum) and $b = (a \ \& \ b) \ll 1$ (new carry) until the carry $b$ becomes `0`.

---

### 💻 Java 21 Implementation

```java
public class BitwiseAddition {

    /**
     * Iterative Solution using Bitwise XOR and AND
     */
    public static int getSum(int a, int b) {
        while (b != 0) {
            int carry = (a & b) << 1; // Compute carry
            a = a ^ b;                // Add without carry
            b = carry;                // Assign carry to be added in next loop
        }
        return a;
    }

    /**
     * Recursive Solution
     */
    public static int getSumRecursive(int a, int b) {
        return b == 0 ? a : getSumRecursive(a ^ b, (a & b) << 1);
    }
}
```

---

### 🔍 Dry Run Example: `a = 5 (0101)`, `b = 3 (0011)`

| Iteration | `a` (Binary) | `b` (Binary) | `carry = (a & b) << 1` | `a = a ^ b` | `b = carry` |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Start** | `0101` (5) | `0011` (3) | - | - | - |
| **Pass 1** | `0101` | `0011` | `(0101 & 0011) << 1` = `0010` (2) | `0101 ^ 0011` = `0110` (6) | `0010` (2) |
| **Pass 2** | `0110` | `0010` | `(0110 & 0010) << 1` = `0100` (4) | `0110 ^ 0010` = `0100` (4) | `0100` (4) |
| **Pass 3** | `0100` | `0100` | `(0100 & 0100) << 1` = `1000` (8) | `0100 ^ 0100` = `0000` (0) | `1000` (8) |
| **Pass 4** | `0000` | `1000` | `(0000 & 1000) << 1` = `0000` (0) | `0000 ^ 1000` = `1000` (8) | `0000` (0) |

**Result**: Loop terminates because `b == 0`. Returns `8`.

- **Time Complexity**: $\mathcal{O}(1)$ (at most 32 iterations for 32-bit integers).
- **Space Complexity**: $\mathcal{O}(1)$ auxiliary space.

---

## Question 2: Smallest Number $\ge n$ Whose Digit Product is Divisible by $t$

### 📌 Problem Statement
You are given two integers `n` and `t`. Return the smallest number greater than or equal to `n` such that the product of its digits is divisible by `t`.

---

### 🧠 Algorithmic Strategy

1. Start checking candidate numbers $x = n, n+1, n+2, \dots$.
2. For each candidate $x$, calculate its **digit product**:
   - Extract digits using `x % 10` and reduce $x$ using `x / 10`.
   - Multiply digits together (`product *= digit`).
3. Check if `product % t == 0`.
4. Return the first number $x$ that satisfies the condition.

#### ⚡ Performance Insight:
Any number containing the digit `0` (e.g. 10, 20, 100) has a digit product of `0`. Since $0 \pmod t = 0$ for any $t \neq 0$, the search will stop within at most 10 increments!

---

### 💻 Java 21 Implementation

```java
public class SmallestDigitProduct {

    public static int smallestNumber(int n, int t) {
        int x = n;
        while (true) {
            if (isDigitProductDivisible(x, t)) {
                return x;
            }
            x++;
        }
    }

    private static boolean isDigitProductDivisible(int number, int t) {
        long product = 1;
        int temp = number;
        while (temp > 0) {
            int digit = temp % 10;
            product *= digit;
            temp /= 10;
        }
        return product % t == 0;
    }
}
```

---

### 🔍 Test Cases & Trace

- **Case 1**: `n = 10, t = 2`
  - $x = 10$: Digits are `1, 0` $\rightarrow$ Product $= 1 \times 0 = 0$. $0 \pmod 2 = 0$.
  - **Return**: `10`

- **Case 2**: `n = 15, t = 6`
  - $x = 15$: Digits are `1, 5` $\rightarrow$ Product $= 5$. $5 \pmod 6 \neq 0$.
  - $x = 16$: Digits are `1, 6` $\rightarrow$ Product $= 6$. $6 \pmod 6 = 0$.
  - **Return**: `16`

- **Time Complexity**: $\mathcal{O}(d)$ per candidate number (where $d$ is number of digits $\le 10$). Overall $\mathcal{O}(1)$ average time.
- **Space Complexity**: $\mathcal{O}(1)$ auxiliary space.
