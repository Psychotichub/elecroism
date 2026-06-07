/**
 * Flags raw Tailwind palette utilities (e.g. bg-blue-600) outside `src/components/ui`.
 * Prefer `es-*` tokens from `tokens.css` / `src/components/ui`.
 */
const RAW_PALETTE_CLASS =
  /\b(?:bg|text|border(?:-[xytrbl])?|ring|outline|from|to|via|divide|decoration|accent|caret|fill|stroke)-(?:slate|gray|grey|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:\d{1,3}|[\w-]+)(?:\/\d+)?/;

function checkClassString(value, context, node) {
  if (!value) return;
  const match = value.match(RAW_PALETTE_CLASS);
  if (match) {
    context.report({
      node,
      messageId: 'banned',
      data: { match: match[0] },
    });
  }
}

function checkExpression(context, node) {
  if (!node) return;

  switch (node.type) {
    case 'JSXExpressionContainer':
      checkExpression(context, node.expression);
      return;
    case 'Literal':
      if (typeof node.value === 'string') {
        checkClassString(node.value, context, node);
      }
      return;
    case 'TemplateLiteral':
      for (const quasi of node.quasis) {
        checkClassString(quasi.value.cooked ?? quasi.value.raw, context, quasi);
      }
      for (const expr of node.expressions) {
        checkExpression(context, expr);
      }
      return;
    case 'ConditionalExpression':
      checkExpression(context, node.consequent);
      checkExpression(context, node.alternate);
      return;
    case 'LogicalExpression':
      checkExpression(context, node.left);
      checkExpression(context, node.right);
      return;
    case 'CallExpression': {
      const callee = node.callee;
      const isCn =
        (callee.type === 'Identifier' && callee.name === 'cn') ||
        (callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'cn');
      if (isCn) {
        for (const arg of node.arguments) {
          checkExpression(context, arg);
        }
      }
      return;
    }
    default:
      return;
  }
}

/** @type {import('eslint').Rule.RuleModule} */
export const noRawTailwindColors = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow raw Tailwind palette colour classes outside src/components/ui',
    },
    messages: {
      banned:
        'Avoid raw Tailwind palette class "{{match}}". Use es-* design tokens via src/components/ui primitives.',
    },
    schema: [],
  },
  create(context) {
    const normalized = context.filename.replace(/\\/g, '/');
    if (normalized.includes('src/components/ui/')) {
      return {};
    }

    return {
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier') return;
        if (node.name.name !== 'className') return;
        checkExpression(context, node.value);
      },
    };
  },
};
