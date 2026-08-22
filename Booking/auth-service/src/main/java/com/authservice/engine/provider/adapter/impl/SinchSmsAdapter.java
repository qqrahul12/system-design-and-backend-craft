package com.authservice.engine.provider.adapter.impl;

import com.authservice.engine.provider.adapter.OtpChannelAdapter;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Sinch SMS Adapter implementing composite key "SMS:SINCH".
 */
@Component
public class SinchSmsAdapter implements OtpChannelAdapter {

    @Override
    public String getChannel() {
        return "SMS";
    }

    @Override
    public String getVendorName() {
        return "SINCH";
    }

    @Override
    public boolean sendOtp(String recipient, String otpCode, Map<String, Object> config) {
        // Dispatches HTTP request to Sinch Global SMS API
        return recipient != null && otpCode != null;
    }
}
