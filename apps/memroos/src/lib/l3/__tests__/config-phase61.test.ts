// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { parseEvalConfigYaml, buildDefaultEvalConfig } from '@/lib/evals/config';

describe('Phase 61 config', () => {
  it('defaults have companies and businessOps', () => {
    const c = buildDefaultEvalConfig();
    expect(c.companies).toBeDefined();
    expect(c.businessOps).toBeDefined();
    const sum = Object.values(c.companies.default.l3_sub_weights).reduce((a,b)=>a+b,0);
    expect(Math.abs(sum - 1.0)).toBeLessThan(1e-9);
  });

  it('parses companies and business_ops blocks from YAML', () => {
    const yaml = `
companies:
  acme:
    l3_sub_weights:
      completion_rate: 0.4
      escalation_rate: 0.2
      ttr_p50: 0.2
      operator_approval_rate: 0.1
      cost_per_task: 0.1
business_ops:
  poll_interval_seconds: 120
  correlation_id_field: my_corr_id
`;
    const config = parseEvalConfigYaml(yaml);
    expect(config.companies.acme).toBeDefined();
    expect(config.companies.acme.l3_sub_weights.completion_rate).toBe(0.4);
    expect(config.businessOps.poll_interval_seconds).toBe(120);
    expect(config.businessOps.correlation_id_field).toBe('my_corr_id');
  });

  it('throws when company sub-weights do not sum to 1.0', () => {
    const yaml = `
companies:
  bad:
    l3_sub_weights:
      completion_rate: 0.5
      escalation_rate: 0.5
      ttr_p50: 0.5
      operator_approval_rate: 0.0
      cost_per_task: 0.0
`;
    expect(() => parseEvalConfigYaml(yaml)).toThrow(/must sum to 1.0/);
  });
});
