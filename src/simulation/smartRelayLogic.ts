/**
 * Simple ladder-style logic for `smart_relay` output contacts.
 *
 * Programs like `OUT1 = IN1 AND NOT IN2` gate T1↔T2 when A1/A2 supply is present.
 */

import type { Circuit, CircuitComponent } from '../types';
import {
  findTerminalByLabel,
  linePotentialAt,
  terminalKey,
  type PotentialSets,
} from './engineTypes';

export type LogicExpr =
  | { kind: 'ref'; name: string }
  | { kind: 'not'; expr: LogicExpr }
  | { kind: 'and'; left: LogicExpr; right: LogicExpr }
  | { kind: 'or'; left: LogicExpr; right: LogicExpr };

export type ParsedSmartRelayProgram = {
  output: string;
  expr: LogicExpr;
};

const DEFAULT_PROGRAM = 'OUT1 = IN1';

function tokenize(src: string): string[] {
  const tokens: string[] = [];
  let rest = src.trim();
  while (rest.length > 0) {
    const m = rest.match(/^(OUT\d+|IN\d+|\(|\)|AND|OR|NOT|=)/i);
    if (!m || !m[1]) break;
    tokens.push(m[1].toUpperCase());
    rest = rest.slice(m[1].length).trim();
  }
  return tokens;
}

class Parser {
  private i = 0;
  private readonly tokens: string[];
  constructor(tokens: string[]) {
    this.tokens = tokens;
  }

  parseProgram(): ParsedSmartRelayProgram | null {
    const firstToken = this.tokens[0];
    if (!firstToken) return null;
    if (firstToken.startsWith('OUT')) {
      const output = firstToken;
      if (this.tokens[1] !== '=') return null;
      this.i = 2;
      const expr = this.parseOr();
      if (!expr || this.i < this.tokens.length) return null;
      return { output, expr };
    }
    const expr = this.parseOr();
    if (!expr || this.i < this.tokens.length) return null;
    return { output: 'OUT1', expr };
  }

  private parseOr(): LogicExpr | null {
    let left = this.parseAnd();
    if (!left) return null;
    while (this.tokens[this.i] === 'OR') {
      this.i++;
      const right = this.parseAnd();
      if (!right) return null;
      left = { kind: 'or', left, right };
    }
    return left;
  }

  private parseAnd(): LogicExpr | null {
    let left = this.parseNot();
    if (!left) return null;
    while (this.tokens[this.i] === 'AND') {
      this.i++;
      const right = this.parseNot();
      if (!right) return null;
      left = { kind: 'and', left, right };
    }
    return left;
  }

  private parseNot(): LogicExpr | null {
    if (this.tokens[this.i] === 'NOT') {
      this.i++;
      const expr = this.parseNot();
      return expr ? { kind: 'not', expr } : null;
    }
    return this.parsePrimary();
  }

  private parsePrimary(): LogicExpr | null {
    const t = this.tokens[this.i];
    if (!t) return null;
    if (t === '(') {
      this.i++;
      const expr = this.parseOr();
      if (!expr || this.tokens[this.i] !== ')') return null;
      this.i++;
      return expr;
    }
    if (/^IN\d+$/.test(t)) {
      this.i++;
      return { kind: 'ref', name: t };
    }
    return null;
  }
}

export function parseSmartRelayProgram(
  source: string | undefined
): ParsedSmartRelayProgram | null {
  const src = (source ?? DEFAULT_PROGRAM).trim();
  if (!src) return null;
  const parser = new Parser(tokenize(src));
  return parser.parseProgram();
}

export function evaluateLogicExpr(
  expr: LogicExpr,
  inputs: Record<string, boolean>
): boolean {
  switch (expr.kind) {
    case 'ref':
      return Boolean(inputs[expr.name]);
    case 'not':
      return !evaluateLogicExpr(expr.expr, inputs);
    case 'and':
      return (
        evaluateLogicExpr(expr.left, inputs) &&
        evaluateLogicExpr(expr.right, inputs)
      );
    case 'or':
      return (
        evaluateLogicExpr(expr.left, inputs) ||
        evaluateLogicExpr(expr.right, inputs)
      );
    default:
      return false;
  }
}

export function evaluateSmartRelayProgram(
  program: string | undefined,
  inputs: Record<string, boolean>
): boolean {
  const parsed = parseSmartRelayProgram(program);
  if (!parsed) return false;
  return evaluateLogicExpr(parsed.expr, inputs);
}

function inputTerminalActive(potentials: PotentialSets, key: string): boolean {
  return (
    linePotentialAt(potentials, key) ||
    potentials.neutral.has(key) ||
    potentials.pe.has(key)
  );
}

/** Read IN1, IN2, … from terminal potentials. */
export function readSmartRelayInputs(
  component: CircuitComponent,
  potentials: PotentialSets
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const cp of component.connectionPoints) {
    const m = /^IN(\d+)$/i.exec(cp.label.trim());
    if (!m) continue;
    const name = `IN${m[1]}`;
    out[name] = inputTerminalActive(
      potentials,
      terminalKey(component.id, cp.id)
    );
  }
  return out;
}

function smartRelayPowered(
  component: CircuitComponent,
  potentials: PotentialSets
): boolean {
  const k1 =
    findTerminalByLabel(component, 'A1') ||
    findTerminalByLabel(component, 'COIL_A');
  const k2 =
    findTerminalByLabel(component, 'A2') ||
    findTerminalByLabel(component, 'COIL_B');
  if (!k1 || !k2) return false;
  const t1Live = linePotentialAt(potentials, k1);
  const t1N = potentials.neutral.has(k1);
  const t2Live = linePotentialAt(potentials, k2);
  const t2N = potentials.neutral.has(k2);
  return (t1Live && t2N) || (t1N && t2Live);
}

/** Smart relays whose logic output is true (T1↔T2 should close). */
export function computeSmartRelayOutputs(
  circuit: Circuit,
  potentials: PotentialSets
): Set<string> {
  const out = new Set<string>();
  for (const c of circuit.components) {
    if (c.type !== 'smart_relay') continue;
    if (!smartRelayPowered(c, potentials)) continue;
    const inputs = readSmartRelayInputs(c, potentials);
    const program = c.properties.smartRelayProgram ?? DEFAULT_PROGRAM;
    if (evaluateSmartRelayProgram(program, inputs)) {
      out.add(c.id);
    }
  }
  return out;
}

export function unionPickupSets(
  coilPickup: Set<string>,
  smartOutputs: Set<string>
): Set<string> {
  if (smartOutputs.size === 0) return coilPickup;
  return new Set([...coilPickup, ...smartOutputs]);
}
