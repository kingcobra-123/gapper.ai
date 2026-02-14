import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  AuthPlanContext,
  type AuthPlanSnapshot
} from "../src/auth/AuthPlanContext";
import { TerminalPlanGate } from "../src/components/auth/TerminalPlanGate";

function buildSnapshot(
  overrides: Partial<AuthPlanSnapshot> = {}
): AuthPlanSnapshot {
  return {
    status: "ready",
    userId: "11111111-1111-1111-1111-111111111111",
    email: "user@example.com",
    plan: "premium",
    gateEnabled: true,
    isPremium: true,
    terminalAllowed: true,
    error: null,
    refresh: async () => {},
    ...overrides
  };
}

function renderGateHtml(snapshot: AuthPlanSnapshot, authenticated = true): string {
  return renderToStaticMarkup(
    React.createElement(
      AuthPlanContext.Provider,
      { value: snapshot },
      React.createElement(
        TerminalPlanGate,
        {
          authenticated,
          onOpenSignIn: () => {},
          onSignOut: () => {}
        },
        React.createElement(
          "div",
          { id: "terminal-content-marker" },
          "terminal content"
        )
      )
    )
  );
}

test("paywall renders when gate enabled and plan is free", () => {
  const html = renderGateHtml(
    buildSnapshot({
      plan: "free",
      isPremium: false,
      terminalAllowed: false,
      gateEnabled: true
    })
  );

  assert.equal(html.includes("Premium required"), true);
  assert.equal(html.includes("Join waitlist"), true);
  assert.equal(html.includes("terminal-content-marker"), false);
});

test("loading skeleton shows while plan check is pending", () => {
  const html = renderGateHtml(
    buildSnapshot({
      status: "loading",
      plan: "free",
      isPremium: false,
      terminalAllowed: false
    })
  );

  assert.equal(html.includes("terminal-gate-loading"), true);
  assert.equal(html.includes("Checking membership access"), true);
  assert.equal(html.includes("terminal-content-marker"), false);
});

test("terminal does not render until premium is confirmed", () => {
  const loadingHtml = renderGateHtml(
    buildSnapshot({
      status: "loading",
      plan: "free",
      isPremium: false,
      terminalAllowed: false
    })
  );
  const freeHtml = renderGateHtml(
    buildSnapshot({
      status: "ready",
      plan: "free",
      isPremium: false,
      terminalAllowed: false
    })
  );
  const premiumHtml = renderGateHtml(
    buildSnapshot({
      status: "ready",
      plan: "premium",
      isPremium: true,
      terminalAllowed: true
    })
  );

  assert.equal(loadingHtml.includes("terminal-content-marker"), false);
  assert.equal(freeHtml.includes("terminal-content-marker"), false);
  assert.equal(premiumHtml.includes("terminal-content-marker"), true);
});
