package com.skills.ai.patterns.adapter;

/**
 * Adapter Pattern Target Interface:
 * Unifies heterogeneous external & internal payment gateways (Stripe Card, CineMind Wallet, Apple Pay)
 * under a single polymorphic contract adhering to the Open/Closed Principle (OCP).
 */
public interface PaymentGatewayAdapter {

    PaymentResult processPayment(String orderReference, double amount, String description);

    String getProviderName();

    boolean supports(String paymentMethod);
}
