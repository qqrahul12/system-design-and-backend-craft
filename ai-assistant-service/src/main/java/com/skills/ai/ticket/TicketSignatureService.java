package com.skills.ai.ticket;

/**
 * Interface Segregation & Single Responsibility Principle:
 * Decouples cryptographic pass generation and anti-tamper signature verification
 * from ticket repository persistence and distributed reservation locks.
 */
public interface TicketSignatureService {

    /**
     * Computes a cryptographic signature over the ticket's immutable fields.
     */
    String sign(String payload);

    /**
     * Verifies that the ticket signature matches the expected cryptographic digest.
     */
    boolean verify(String payload, String signature);
}
