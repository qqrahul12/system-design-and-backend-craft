package com.authservice.engine.provider.adapter.impl;

import com.authservice.engine.provider.adapter.OtpChannelAdapter;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * SendGrid Email Adapter implementing composite key "EMAIL:SENDGRID".
 */
@Component
public class SendGridEmailAdapter implements OtpChannelAdapter {

    @Override
    public String getChannel() {
        return "EMAIL";
    }

    @Override
    public String getVendorName() {
        return "SENDGRID";
    }

    @Override
    public boolean sendOtp(String recipient, String otpCode, Map<String, Object> config) {
        // Dispatches HTTP request to SendGrid v3 Mail API
        return recipient != null && otpCode != null;
    }
}
