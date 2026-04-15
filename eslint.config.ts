import js from '@eslint/js';
// @ts-ignore
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import type { AST, ESLint, Linter, Rule } from 'eslint';

const semicolonRule: Rule.RuleModule = {
	meta: {
		type: 'problem',
		docs: {
			description:
				'Enforce semicolons after control structures with multiple statements'
		},
		fixable: 'code',
		messages: {
			missingSemicolon:
				'Missing semicolon after closing brace of multi-statement block'
		}
	},
	create: (context) => {
		if (context.filename.endsWith('.d.ts')) return {};
		const sourceCode = context.sourceCode;

		const reportMissingSemicolon = (node: Rule.Node, lastToken: AST.Token) => {
			const nextToken = sourceCode.getTokenAfter(lastToken);
			if (!nextToken || nextToken.value !== ';')
				context.report({
					node,
					messageId: 'missingSemicolon',
					fix: (fixer: Rule.RuleFixer) => fixer.insertTextAfter(lastToken, ';')
				});
		};

		const checkControlStructure = (node: Rule.Node) => {
			const body =
				node.type === 'IfStatement'
					? node.consequent
					: 'body' in node &&
						  node.body &&
						  !Array.isArray(node.body) &&
						  'type' in node.body
						? (node.body as Rule.Node)
						: null;
			// Check if the body is a BlockStatement (single or multiple statements)
			if (body?.type === 'BlockStatement' && body.body?.length >= 1) {
				const tokens = sourceCode.getTokens(node);
				const lastToken = tokens[tokens.length - 1];

				if (lastToken && lastToken.value === '}')
					reportMissingSemicolon(node, lastToken);
			};

			// For IfStatements, also check the else block (alternate)
			if (node.type === 'IfStatement' && node.alternate) {
				const alternate = node.alternate;
				// Only check if it's a BlockStatement (else { ... }), not else if
				if (alternate?.type === 'BlockStatement' && alternate.body?.length >= 1) {
					const tokens = sourceCode.getTokens(alternate);
					const lastToken = tokens[tokens.length - 1];

					if (lastToken && lastToken.value === '}')
						reportMissingSemicolon(alternate as unknown as Rule.Node, lastToken);
				};
			};
		};

		const checkTryStatement = (node: Rule.Node) => {
			if (node.type !== 'TryStatement') return;
			// TryStatement has block, handler, and finalizer properties
			// Check the last child (could be finalizer or handler)
			const tokens = sourceCode.getTokens(node);
			const lastToken = tokens[tokens.length - 1];

			if (lastToken && lastToken.value === '}')
				reportMissingSemicolon(node, lastToken);
		};

		const checkFunctionDeclaration = (node: Rule.Node) => {
			if (node.type !== 'FunctionDeclaration') return;
			const body = node.body;
			// Check if the body is a BlockStatement (single or multiple statements)
			if (body?.type === 'BlockStatement' && body.body?.length >= 1) {
				const tokens = sourceCode.getTokens(body);
				const lastToken = tokens[tokens.length - 1];

				if (lastToken && lastToken.value === '}')
					reportMissingSemicolon(node, lastToken);
			};
		};

		const checkMethodDefinition = (node: Rule.Node) => {
			if (node.type !== 'MethodDefinition') return;
			const body = node.value?.body;
			// Check if the body is a BlockStatement (single or multiple statements)
			if (body?.type === 'BlockStatement' && body.body?.length >= 1) {
				const tokens = sourceCode.getTokens(body);
				const lastToken = tokens[tokens.length - 1];

				if (lastToken && lastToken.value === '}')
					reportMissingSemicolon(node, lastToken);
			};
		};

		const checkClassDeclaration = (node: Rule.Node) => {
			if (node.type !== 'ClassDeclaration') return;
			const body = node.body;
			// Class body is always a ClassBody with body array
			if (body?.type === 'ClassBody' && body.body?.length >= 0) {
				const tokens = sourceCode.getTokens(node);
				const lastToken = tokens[tokens.length - 1];

				if (lastToken && lastToken.value === '}')
					reportMissingSemicolon(node, lastToken);
			};
		};

		const checkWithStatement = (node: Rule.Node) => {
			if (node.type !== 'WithStatement') return;
			const body = node.body;
			if (body?.type === 'BlockStatement' && body.body?.length >= 1) {
				const tokens = sourceCode.getTokens(node);
				const lastToken = tokens[tokens.length - 1];

				if (lastToken && lastToken.value === '}')
					reportMissingSemicolon(node, lastToken);
			};
		};

		const checkArrowFunctionExpression = (node: Rule.Node) => {
			if (node.type !== 'ArrowFunctionExpression') return;
			const body = node.body;
			// Only check if body is a BlockStatement (not expression body)
			// AND if the arrow function is part of a variable declaration or export
			// (not a callback argument to another function)
			const parent = node.parent;
			const isVariableDeclaration = parent?.type === 'VariableDeclarator';
			const isExportDeclaration =
				parent?.type === 'ExportNamedDeclaration' ||
				parent?.type === 'ExportDefaultDeclaration';
			const isAssignment = parent?.type === 'AssignmentExpression';

			// Only enforce semicolon if it's a statement-like context
			if (
				(isVariableDeclaration || isExportDeclaration || isAssignment) &&
				body?.type === 'BlockStatement' &&
				body.body?.length >= 1
			) {
				const tokens = sourceCode.getTokens(body);
				const lastToken = tokens[tokens.length - 1];

				if (lastToken && lastToken.value === '}')
					reportMissingSemicolon(node, lastToken);
			};
		};

		const checkFunctionExpression = (node: Rule.Node) => {
			if (node.type !== 'FunctionExpression') return;
			const body = node.body;
			// Similar check for function expressions - only enforce semicolon in statement contexts
			const parent = node.parent;
			const isVariableDeclaration = parent?.type === 'VariableDeclarator';
			const isExportDeclaration =
				parent?.type === 'ExportNamedDeclaration' ||
				parent?.type === 'ExportDefaultDeclaration';
			const isAssignment = parent?.type === 'AssignmentExpression';

			if (
				(isVariableDeclaration || isExportDeclaration || isAssignment) &&
				body?.type === 'BlockStatement' &&
				body.body?.length >= 1
			) {
				const tokens = sourceCode.getTokens(body);
				const lastToken = tokens[tokens.length - 1];

				if (lastToken && lastToken.value === '}')
					reportMissingSemicolon(node, lastToken);
			};
		};

		return {
			'IfStatement:exit': checkControlStructure,
			'ForStatement:exit': checkControlStructure,
			'ForInStatement:exit': checkControlStructure,
			'ForOfStatement:exit': checkControlStructure,
			'WhileStatement:exit': checkControlStructure,
			'DoWhileStatement:exit': checkControlStructure,
			'TryStatement:exit': checkTryStatement,
			'SwitchStatement:exit': checkControlStructure,
			'FunctionDeclaration:exit': checkFunctionDeclaration,
			'MethodDefinition:exit': checkMethodDefinition,
			'ClassDeclaration:exit': checkClassDeclaration,
			'WithStatement:exit': checkWithStatement,
			'ArrowFunctionExpression:exit': checkArrowFunctionExpression,
			'FunctionExpression:exit': checkFunctionExpression
		};
	}
};

const unnecesaryCurlyRule: Rule.RuleModule = {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Remove unnecessary curly braces for single-statement blocks'
		},
		fixable: 'code',
		messages: {
			unnecessaryBraces:
				'Unnecessary curly braces for single-statement block. Remove them.'
		}
	},
	create: (context) => {
		const checkSingleStatement = (node: Rule.Node) => {
			const body =
				node.type === 'IfStatement'
					? node.consequent
					: 'body' in node &&
						  node.body &&
						  !Array.isArray(node.body) &&
						  'type' in node.body
						? (node.body as Rule.Node)
						: null;
			// Check if body is a block with a single statement
			if (body?.type === 'BlockStatement' && body.body?.length === 1)
				context.report({
					node: body,
					messageId: 'unnecessaryBraces'
				});
		};

		return {
			'IfStatement:exit': checkSingleStatement,
			'ForStatement:exit': checkSingleStatement,
			'ForInStatement:exit': checkSingleStatement,
			'ForOfStatement:exit': checkSingleStatement,
			'WhileStatement:exit': checkSingleStatement,
			'DoWhileStatement:exit': checkSingleStatement
		};
	}
};

const avoidForEachRule: Rule.RuleModule = {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Avoid forEach, use for...of instead when index is not needed'
		},
		messages: {
			avoidForEach:
				'Avoid using forEach. Use for...of loop instead when the index is not needed.'
		}
	},
	create: (context) => {
		return {
			'CallExpression:exit': (node: Rule.Node) => {
				if (node.type !== 'CallExpression') return;
				// Check if this is a forEach call
				if (
					node.callee?.type === 'MemberExpression' &&
					node.callee.property.type === 'Identifier' &&
					node.callee.property.name === 'forEach' &&
					node.arguments?.length > 0
				) {
					const callback = node.arguments[0];
					// Check if callback has only one parameter (not using index/key)
					if (
						(callback?.type === 'ArrowFunctionExpression' ||
							callback?.type === 'FunctionExpression') &&
						callback?.params?.length === 1
					)
						context.report({
							node,
							messageId: 'avoidForEach'
						});
				};
			}
		};
	}
};

const config: Linter.Config[] = [
	{
		ignores: ['dist', 'node_modules', '*.js', '**/*.js']
	},
	{
		files: ['**/*.ts'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: 2022,
				sourceType: 'module',
				project: './tsconfig.json'
			},
			globals: {
				console: 'readonly',
				process: 'readonly'
			}
		},
		plugins: {
			'@typescript-eslint': tsPlugin as unknown as ESLint.Plugin,
			custom: {
				rules: {
					'semicolon-after-control': semicolonRule,
					'no-unnecessary-braces': unnecesaryCurlyRule,
					'avoid-forEach': avoidForEachRule
				}
			}
		},
		rules: {
			...js.configs.recommended.rules,
			'@typescript-eslint/explicit-module-boundary-types': 'warn',
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
			'@typescript-eslint/no-namespace': 'off',
			'no-console': 'off',
			'no-undef': 'off',
			semi: ['error', 'always'],
			quotes: ['error', 'single'],
			indent: ['error', 'tab'],
			'comma-dangle': ['error', 'never'],
			curly: 'off',
			'custom/no-unnecessary-braces': 'error',
			'no-trailing-spaces': 'error',
			'custom/semicolon-after-control': 'error',
			'func-style': ['error', 'expression']
		}
	}
];

export default config;
