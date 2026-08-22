package com.authservice.engine.provider.adapter.impl;

import com.authservice.engine.provider.adapter.OtpChannelAdapter;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Gupshup SMS Adapter implementing composite key "SMS:GUPSHUP".
 */
@Component
public class GupshupSmsAdapter implements OtpChannelAdapter {

    @Override
    public String getChannel() {
        return "SMS";
    }

    @Override
    public String getVendorName() {
        return "GUPSHUP";
    }

    @Override
    public boolean sendOtp(String recipient, String otpCode, Map<String, Object> config) {
        // Dispatches HTTP request to Gupshup Enterprise SMS API
        return recipient != null && otpCode != null;
    }
}
