"use client";

import { Spark } from "@/components/shared/charts";
import { NOC, NOC_FONT_MONO } from "@/lib/noc-theme";
import { MOCK_EFFICIENCY } from "@/lib/noc-mock-data";
import { Eyebrow, Mono, SampleChip, PillBtn } from "./noc-primitives";

export function EfficiencySignals() {
  return (
    <div style={{ padding: "0 28px 14px" }}>
      <div
        style={{
          background: NOC.paper,
          border: `1px solid ${NOC.rule}`,
        }}
      >
        {/* Header row */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${NOC.rule}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 13, color: NOC.ink }}>
            Efficiency signals · is memory actually paying off?
          </div>
          <SampleChip />
          <span style={{ fontSize: 11.5, color: NOC.soft }}>
            If the system has it, the agent should not have to re-ask, re-search, or re-learn.
          </span>
          <div style={{ marginLeft: "auto" }}>
            <PillBtn>Open report</PillBtn>
          </div>
        </div>

        {/* Signal cells */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))",
          }}
        >
          {MOCK_EFFICIENCY.map((m, i) => {
            const good = m.tone === "good";
            const dColor = good ? NOC.success : NOC.terra;
            const dBg = good ? NOC.successBg : NOC.peach;
            return (
              <div
                key={m.key}
                style={{
                  padding: 14,
                  borderRight: i < 4 ? `1px solid ${NOC.rule}` : "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 6,
                  }}
                >
                  <Eyebrow>{m.key}</Eyebrow>
                  <span
                    style={{
                      fontFamily: NOC_FONT_MONO,
                      fontSize: 11,
                      fontWeight: 600,
                      color: dColor,
                      background: dBg,
                      padding: "1px 5px",
                      flexShrink: 0,
                    }}
                  >
                    {m.delta}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: NOC.muted,
                    lineHeight: 1.4,
                    minHeight: 32,
                  }}
                >
                  {m.desc}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 6,
                  }}
                >
                  <Mono size={24} color={good ? NOC.ink : NOC.terra}>
                    {m.value}
                  </Mono>
                  <span style={{ fontSize: 11, color: NOC.soft }}>{m.unit}</span>
                </div>
                <Spark
                  values={m.spark}
                  color={good ? NOC.success : NOC.terra}
                  w={220}
                  h={26}
                  fill
                />
                <div
                  style={{
                    fontSize: 11,
                    color: NOC.soft,
                    lineHeight: 1.4,
                    marginTop: 2,
                  }}
                >
                  {m.hint}
                </div>
              </div>
            );
          })}
        </div>

        {/* Recommendations footer */}
        <div
          style={{
            padding: "10px 16px",
            borderTop: `1px solid ${NOC.rule}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: NOC.fog,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontFamily: NOC_FONT_MONO,
              color: NOC.terra,
              fontWeight: 700,
              letterSpacing: "0.08em",
            }}
          >
            3 RECOMMENDATIONS
          </span>
          <span style={{ fontSize: 12, color: NOC.muted }}>
            Cap retrieval at 4 calls/run · pre-summarize cordant-ops dashboards · pin 5 most-rediscovered facts to durable memory.
          </span>
          <div style={{ marginLeft: "auto" }}>
            <PillBtn variant="solid">Apply all</PillBtn>
          </div>
        </div>
      </div>
    </div>
  );
}
