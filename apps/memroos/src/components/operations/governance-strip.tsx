"use client";

import { NOC } from "@/lib/noc-theme";
import { MOCK_GOVERNANCE } from "@/lib/noc-mock-data";
import { NocCard, NocPanelHeader, Eyebrow, Mono } from "./noc-primitives";

export function GovernanceStrip() {
  const d = MOCK_GOVERNANCE;
  return (
    <NocCard>
      <NocPanelHeader
        title="Governance & trust"
        hint="Iris preflight, HIL approvals, audit."
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
        }}
      >
        {d.stats.map(({ label, value, sub, color }) => (
          <div
            key={label}
            style={{ borderLeft: `2px solid ${color}`, paddingLeft: 10 }}
          >
            <Eyebrow>{label}</Eyebrow>
            <Mono size={20}>{value}</Mono>
            <div style={{ fontSize: 11, color: NOC.soft }}>{sub}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 14,
          borderTop: `1px solid ${NOC.rule}`,
          paddingTop: 10,
        }}
      >
        <Eyebrow>Recent governance events</Eyebrow>
        <div
          style={{
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            fontSize: 12,
          }}
        >
          {d.events.map((e, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "60px 110px 1fr",
                gap: 10,
              }}
            >
              <Mono color={NOC.soft} size={11}>{e.time}</Mono>
              <span style={{ color: NOC.muted }}>{e.type}</span>
              <span style={{ color: NOC.ink }}>{e.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </NocCard>
  );
}
