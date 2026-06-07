import { describe, expect, it } from 'vitest';
import {
  evaluateLogicExpr,
  evaluateSmartRelayProgram,
  parseSmartRelayProgram,
} from '../smartRelayLogic';

describe('parseSmartRelayProgram', () => {
  it('parses assignment form', () => {
    const parsed = parseSmartRelayProgram('OUT1 = IN1 AND NOT IN2');
    expect(parsed?.output).toBe('OUT1');
    expect(parsed?.expr).toEqual({
      kind: 'and',
      left: { kind: 'ref', name: 'IN1' },
      right: { kind: 'not', expr: { kind: 'ref', name: 'IN2' } },
    });
  });

  it('parses bare expression as OUT1', () => {
    const parsed = parseSmartRelayProgram('IN1 OR IN2');
    expect(parsed?.output).toBe('OUT1');
    expect(parsed?.expr.kind).toBe('or');
  });

  it('returns null for invalid syntax', () => {
    expect(parseSmartRelayProgram('OUT1 = FOO')).toBeNull();
  });
});

describe('evaluateSmartRelayProgram', () => {
  it('evaluates AND NOT', () => {
    expect(
      evaluateSmartRelayProgram('OUT1 = IN1 AND NOT IN2', {
        IN1: true,
        IN2: false,
      })
    ).toBe(true);
    expect(
      evaluateSmartRelayProgram('OUT1 = IN1 AND NOT IN2', {
        IN1: true,
        IN2: true,
      })
    ).toBe(false);
  });

  it('evaluates OR', () => {
    expect(
      evaluateSmartRelayProgram('OUT1 = IN1 OR IN2', { IN1: false, IN2: true })
    ).toBe(true);
  });

  it('respects parentheses', () => {
    const expr = parseSmartRelayProgram('OUT1 = (IN1 OR IN2) AND NOT IN2')!.expr;
    expect(
      evaluateLogicExpr(expr, { IN1: false, IN2: true })
    ).toBe(false);
    expect(
      evaluateLogicExpr(expr, { IN1: true, IN2: false })
    ).toBe(true);
  });
});
