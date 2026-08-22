package com.promoservice.engine;

import com.promoservice.domain.Actor;
import com.promoservice.domain.CartContext;
import com.promoservice.domain.ConditionNode;
import com.promoservice.domain.LineItem;
import com.promoservice.domain.impl.*;
import com.promoservice.engine.evaluator.impl.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ASTRuleEngineTest {

    private DefaultASTRuleEngine astRuleEngine;

    @BeforeEach
    void setUp() {
        // Register generic and specialized strategies into registry
        DefaultConditionEvaluatorRegistry registry = new DefaultConditionEvaluatorRegistry(List.of(
                new GtConditionEvaluator(),
                new EqConditionEvaluator(),
                new InConditionEvaluator(),
                new SkuQuantityGteConditionEvaluator(),
                new MembershipTierAtLeastConditionEvaluator(),
                new GeoRegionConditionEvaluator()
        ));
        astRuleEngine = new DefaultASTRuleEngine(registry);
    }

    @Test
    @DisplayName("Chunk 2: B2C Nested Rule Test - (Subtotal > $100 AND Tier == VIP) OR Code == FLASH50")
    void testB2CNestedRule() {
        // Rule: OR( AND(cart.subtotal_cents > 10000, actor.user_tier == "VIP"), cart.promo_code == "FLASH50" )
        ConditionNode subtotalGt = new DefaultConditionNode("GREATER_THAN", "cart.subtotal_cents", 10000L, null);
        ConditionNode tierVip = new DefaultConditionNode("EQUALS", "actor.user_tier", "VIP", null);
        ConditionNode andNode = new DefaultConditionNode("AND", null, null, List.of(subtotalGt, tierVip));

        ConditionNode promoCodeFlash = new DefaultConditionNode("EQUALS", "cart.promo_code", "FLASH50", null);
        ConditionNode rootRule = new DefaultConditionNode("OR", null, null, List.of(andNode, promoCodeFlash));

        // Case 1: VIP user spending $150 ($15000 cents) -> Should pass via AND branch
        Actor vipActor = new DefaultActor("usr_1", "USER", Map.of("user_tier", "VIP"));
        CartContext cart1 = new DefaultCartContext("c1", "t1", "USD", 15000L, 0L, List.of(), Map.of());
        assertTrue(astRuleEngine.evaluate(rootRule, cart1, vipActor));

        // Case 2: REGULAR user spending $150 ($15000 cents) without promo code -> Should fail
        Actor regularActor = new DefaultActor("usr_2", "USER", Map.of("user_tier", "REGULAR"));
        assertFalse(astRuleEngine.evaluate(rootRule, cart1, regularActor));

        // Case 3: REGULAR user spending $50 with promo code "FLASH50" -> Should pass via OR branch
        CartContext cartWithCode = new DefaultCartContext("c2", "t1", "USD", 5000L, 0L, List.of(), Map.of("promo_code", "FLASH50"));
        assertTrue(astRuleEngine.evaluate(rootRule, cartWithCode, regularActor));
    }

    @Test
    @DisplayName("Chunk 2: B2B Volume Slab Rule Test - Account Type == ACCOUNT AND Category == WHOLESALE AND SKU Quantity >= 500")
    void testB2BVolumeSlabRule() {
        // Rule: AND( actor.type == "ACCOUNT", actor.category == "WHOLESALE", SKU "BOLT-99" qty >= 500 )
        ConditionNode isAccount = new DefaultConditionNode("EQUALS", "actor.type", "ACCOUNT", null);
        ConditionNode isWholesale = new DefaultConditionNode("EQUALS", "actor.category", "WHOLESALE", null);
        ConditionNode skuQty500 = new DefaultConditionNode("SKU_QUANTITY_GTE", "BOLT-99", 500, null);

        ConditionNode b2bRootRule = new DefaultConditionNode("AND", null, null, List.of(isAccount, isWholesale, skuQty500));

        Actor b2bActor = new DefaultActor("acc_881", "ACCOUNT", Map.of("category", "WHOLESALE"));

        // Case 1: B2B Cart with 600 units of BOLT-99 -> Passes
        LineItem bolt99LineItem = new DefaultLineItem("item_bolt", "BOLT-99", "hardware", 100L, 600, Map.of());
        CartContext b2bCartPass = new DefaultCartContext("cart_b2b_1", "tenant_corp", "USD", 60000L, 0L, List.of(bolt99LineItem), Map.of());

        assertTrue(astRuleEngine.evaluate(b2bRootRule, b2bCartPass, b2bActor));

        // Case 2: B2B Cart with only 200 units of BOLT-99 -> Fails
        LineItem bolt99SmallItem = new DefaultLineItem("item_bolt", "BOLT-99", "hardware", 100L, 200, Map.of());
        CartContext b2bCartFail = new DefaultCartContext("cart_b2b_2", "tenant_corp", "USD", 20000L, 0L, List.of(bolt99SmallItem), Map.of());

        assertFalse(astRuleEngine.evaluate(b2bRootRule, b2bCartFail, b2bActor));
    }

    @Test
    @DisplayName("Chunk 2: Test IN Operator")
    void testInOperator() {
        ConditionNode tierIn = new DefaultConditionNode("IN", "actor.user_tier", List.of("VIP", "GOLD", "PLATINUM"), null);

        Actor goldActor = new DefaultActor("usr_gold", "USER", Map.of("user_tier", "GOLD"));
        CartContext dummyCart = new DefaultCartContext("c", "t", "USD", 1000L, 0L, List.of(), Map.of());

        assertTrue(astRuleEngine.evaluate(tierIn, dummyCart, goldActor));

        Actor bronzeActor = new DefaultActor("usr_bronze", "USER", Map.of("user_tier", "BRONZE"));
        assertFalse(astRuleEngine.evaluate(tierIn, dummyCart, bronzeActor));
    }

    @Test
    @DisplayName("Chunk 2: Test Specialized MEMBERSHIP_TIER_AT_LEAST Evaluator")
    void testMembershipTierAtLeast() {
        // Rule: Requires at least GOLD tier (GOLD, PLATINUM, DIAMOND pass; BRONZE, SILVER fail)
        ConditionNode tierRule = new DefaultConditionNode("MEMBERSHIP_TIER_AT_LEAST", null, "GOLD", null);

        CartContext dummyCart = new DefaultCartContext("c", "t", "USD", 1000L, 0L, List.of(), Map.of());

        Actor platinumUser = new DefaultActor("u1", "USER", Map.of("membership_tier", "PLATINUM"));
        assertTrue(astRuleEngine.evaluate(tierRule, dummyCart, platinumUser));

        Actor goldUser = new DefaultActor("u2", "USER", Map.of("membership_tier", "GOLD"));
        assertTrue(astRuleEngine.evaluate(tierRule, dummyCart, goldUser));

        Actor silverUser = new DefaultActor("u3", "USER", Map.of("membership_tier", "SILVER"));
        assertFalse(astRuleEngine.evaluate(tierRule, dummyCart, silverUser));
    }

    @Test
    @DisplayName("Chunk 2: Test City / State / Country Geo-Region Offers")
    void testGeoRegionEvaluator() {
        // Offer: Applicable in Cities ["Mumbai", "Bangalore", "Delhi"] OR State ["California", "New York"]
        ConditionNode cityRule = new DefaultConditionNode("IN_GEO_REGION", "cart.city", List.of("Mumbai", "Bangalore", "Delhi"), null);

        // Case 1: Delivery in Mumbai -> Passes
        CartContext cartMumbai = new DefaultCartContext("c1", "t1", "INR", 1000L, 0L, List.of(), Map.of("city", "Mumbai", "state", "Maharashtra", "country", "IN"));
        Actor actor = new DefaultActor("u1", "USER", Map.of());

        assertTrue(astRuleEngine.evaluate(cityRule, cartMumbai, actor));

        // Case 2: Delivery in Pune -> Fails
        CartContext cartPune = new DefaultCartContext("c2", "t1", "INR", 1000L, 0L, List.of(), Map.of("city", "Pune", "state", "Maharashtra", "country", "IN"));
        assertFalse(astRuleEngine.evaluate(cityRule, cartPune, actor));

        // State-level offer: Applicable in State "California"
        ConditionNode stateRule = new DefaultConditionNode("IN_GEO_REGION", "cart.state", "California", null);
        CartContext cartSF = new DefaultCartContext("c3", "t1", "USD", 5000L, 0L, List.of(), Map.of("city", "San Francisco", "state", "California", "country", "US"));
        assertTrue(astRuleEngine.evaluate(stateRule, cartSF, actor));
    }
}
