package com.authservice.engine.provider.adapter;

import java.util.Map;

/**
 * Adapter Pattern Interface supporting Composite Lookup Key (CHANNEL : VENDOR).
 * Allows tenants to configure SMS (Gupshup/Sinch/Twilio), Email (SendGrid/AWS SES), or WhatsApp.
 */
public interface OtpChannelAdapter {

    /**
     * Channel: "SMS", "EMAIL", "WHATSAPP".
     */
    String getChannel();

    /**
     * Vendor Name: "GUPSHUP", "SINCH", "TWILIO", "SENDGRID".
     */
    String getVendorName();

    /**
     * Composite Lookup Key (e.g. "SMS:GUPSHUP", "SMS:SINCH", "EMAIL:SENDGRID", "WHATSAPP:GUPSHUP").
     */
    default String getAdapterKey() {
        return (getChannel() + ":" + getVendorName()).toUpperCase();
    }

    /**
     * Dispatches OTP code via vendor REST API.
     */
    boolean sendOtp(String recipient, String otpCode, Map<String, Object> config);
}
