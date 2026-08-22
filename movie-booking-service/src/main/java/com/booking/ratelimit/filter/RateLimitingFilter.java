package com.booking.ratelimit.filter;

import com.booking.ratelimit.RateLimitResult;
import com.booking.ratelimit.RateLimiter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private final RateLimiter rateLimiter;

    public RateLimitingFilter(RateLimiter rateLimiter) {
        this.rateLimiter = rateLimiter;
    }

    final String jsonResponse = """
    {
        "error": "Too Many Requests",
        "message": "Rate limit exceeded. Please try again later."
    }
    """;

    /**
     * @param request
     * @param response
     * @param filterChain
     * @throws ServletException
     * @throws IOException
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String clientIp = extractClientIp(request);
        RateLimitResult result = rateLimiter.tryAcquire(clientIp);
        if (result != null && result.allowed()) {
            response.setHeader("X-rate-limit-remaining", String.valueOf(result.remainingTokens()));
            filterChain.doFilter(request, response);
        } else  {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("X-rate-limit-remaining", "0");
            response.setHeader("X-retry-after", "5");
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write(jsonResponse);
        }
    }

    private String extractClientIp(HttpServletRequest request) {
        String ip = request.getHeader("x-forwarded-for");
        if (ip != null && !ip.isEmpty()) {
            return ip.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
