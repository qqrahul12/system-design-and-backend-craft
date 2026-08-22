package com.authservice.domain;

import java.util.List;

/**
 * Interface representing an individual step within a tenant's authentication flow graph.
 */
public interface FlowStep {

    String getStepId();

    /**
     * Step Discriminator: "AUTHENTICATE_CREDENTIAL", "FORCE_CHANGE_PASSWORD", "ENFORCE_MFA".
     */
    String getStepType();

    List<String> getAllowedMethods();

    /**
     * Optional condition required to execute this step (e.g. user.status == MUST_CHANGE_PASSWORD or is_new_device == true).
     */
    ConditionNode getCondition();
}
