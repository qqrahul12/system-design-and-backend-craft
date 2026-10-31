package com.skills.ai.controller;

import com.skills.ai.agent.AgentExecutionStep;
import com.skills.ai.agent.AgentPersona;
import com.skills.ai.agent.MultiAgentOrchestratorService;
import com.skills.ai.agent.OrchestrationRequest;
import com.skills.ai.agent.OrchestrationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.util.List;

/**
 * REST Controller exposing Multi-Agent Swarm Orchestration and Roster APIs.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/agents")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class AgentController {

    private final MultiAgentOrchestratorService orchestratorService;

    @GetMapping("/roster")
    public List<AgentPersona> getRoster() {
        return orchestratorService.getAgentRoster();
    }

    @PostMapping("/orchestrate")
    public OrchestrationResponse orchestrate(@RequestBody OrchestrationRequest request) {
        log.info("Received Multi-Agent Orchestration request for objective: {}", request.objective());
        return orchestratorService.orchestrate(request);
    }

    @GetMapping(value = "/orchestrate/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<AgentExecutionStep>> streamOrchestration(
            @RequestParam(defaultValue = "Book 2 premier seats for Inception tonight with promo CINE20") String objective,
            @RequestParam(defaultValue = "gemini") String model) {

        log.info("Streaming Multi-Agent Orchestration for objective: {}", objective);
        OrchestrationResponse response = orchestratorService.orchestrate(new OrchestrationRequest(objective, model, "SUPERVISOR_DAG"));
        List<AgentExecutionStep> steps = response.steps();

        // Stream each step with a realistic pacing interval (350ms) for UI animation
        return Flux.interval(Duration.ofMillis(350))
                .take(steps.size())
                .map(index -> {
                    AgentExecutionStep step = steps.get(index.intValue());
                    return ServerSentEvent.<AgentExecutionStep>builder()
                            .id(String.valueOf(step.stepIndex()))
                            .event("agent-step")
                            .data(step)
                            .build();
                });
    }
}
