package com.skills.ai.controller;

import com.skills.ai.concessions.ConcessionCombo;
import com.skills.ai.concessions.ConcessionItem;
import com.skills.ai.concessions.ConcessionsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST Controller exposing CineMind Gourmet F&B Menu and AI pairings.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/concessions")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class ConcessionsController {

    private final ConcessionsService concessionsService;

    @GetMapping("/menu")
    public List<ConcessionItem> getMenu() {
        return concessionsService.getMenu();
    }

    @PostMapping("/recommend")
    public List<ConcessionCombo> recommendCombos(@RequestBody(required = false) Map<String, Object> body) {
        String genre = body != null && body.containsKey("genre") ? (String) body.get("genre") : "Sci-Fi";
        int partySize = body != null && body.containsKey("partySize") ? ((Number) body.get("partySize")).intValue() : 2;
        return concessionsService.recommendCombos(genre, partySize);
    }
}
