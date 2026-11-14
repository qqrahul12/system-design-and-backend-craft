package com.skills.ai.split;

import com.skills.ai.auth.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST Controller for SplitMoney group bill splitting, squad expenses, and 1-click settlements.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/split")
@RequiredArgsConstructor
public class SplitBillController {

    private final SplitMoneyService splitMoneyService;
    private final AuthService authService;

    @GetMapping("/users")
    public List<SplitUser> listUsers() {
        return splitMoneyService.listUsers();
    }

    @GetMapping("/groups")
    public List<SplitGroup> listGroups() {
        return splitMoneyService.listGroups();
    }

    @PostMapping("/groups")
    public ResponseEntity<SplitGroup> createGroup(@RequestBody Map<String, Object> req) {
        String name = (String) req.getOrDefault("name", "CineMind Movie Squad");
        String desc = (String) req.getOrDefault("description", "Weekend movie outings");
        @SuppressWarnings("unchecked")
        List<String> memberIds = (List<String>) req.get("memberIds");
        SplitGroup group = splitMoneyService.createGroup(name, desc, memberIds);
        return ResponseEntity.ok(group);
    }

    @GetMapping("/expenses")
    public List<SplitExpense> listExpenses() {
        return splitMoneyService.listExpenses();
    }

    @PostMapping("/create")
    public ResponseEntity<SplitExpense> createSplitExpense(@RequestBody Map<String, Object> req) {
        String name = (String) req.getOrDefault("name", "Movie Outing Bill");
        Number amt = (Number) req.getOrDefault("totalAmount", 40.0);
        String payerId = (String) req.getOrDefault("paidByUserId", "usr-marcus");
        @SuppressWarnings("unchecked")
        List<String> memberIds = (List<String>) req.get("memberUserIds");
        String refType = (String) req.getOrDefault("referenceType", "MOVIE_TICKET");
        String refId = (String) req.getOrDefault("referenceId", "REF-" + System.currentTimeMillis());

        SplitExpense expense = splitMoneyService.splitBill(name, amt.doubleValue(), payerId, memberIds, refType, refId);
        return ResponseEntity.ok(expense);
    }

    @PostMapping("/settle")
    public ResponseEntity<Map<String, Object>> settleShare(@RequestBody Map<String, Object> req) {
        String expenseId = (String) req.get("expenseId");
        String debtorUserId = (String) req.getOrDefault("debtorUserId", "usr-alex");
        String paymentMethod = (String) req.getOrDefault("paymentMethod", "WALLET");

        if (expenseId == null || expenseId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "expenseId is required"));
        }

        try {
            UserShare share = splitMoneyService.settleShare(expenseId, debtorUserId, paymentMethod);
            return ResponseEntity.ok(Map.of(
                    "status", "SETTLED",
                    "expenseId", expenseId,
                    "debtorUserId", debtorUserId,
                    "userName", share.userName(),
                    "amountSettled", share.shareAmount(),
                    "paymentMethod", share.paymentMethod(),
                    "settledAt", share.paidAt().toString()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/balances")
    public ResponseEntity<SplitBalanceSummary> getBalances(
            @RequestParam(required = false, defaultValue = "usr-marcus") String userId
    ) {
        return ResponseEntity.ok(splitMoneyService.getUserBalances(userId));
    }
}
