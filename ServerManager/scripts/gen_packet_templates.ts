import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..', '..');
const packetsRoot = path.join(repoRoot, 'Server', 'packages', 'packets', 'src');
const packetsRootNorm = path.resolve(packetsRoot).toLowerCase();
const outFile = path.join(repoRoot, 'ServerManager', 'renderer', 'src', 'packetTemplates.json');

const files: string[] = [];
const stack: string[] = [packetsRoot];

while (stack.length > 0) {
  const dir = stack.pop();
  if (!dir) continue;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      stack.push(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
}

const program = ts.createProgram(files, {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.CommonJS,
  strict: false,
});
const checker = program.getTypeChecker();

function isExported(node: ts.Node): boolean {
  const flags = ts.getCombinedModifierFlags(node as ts.Declaration);
  return (flags & ts.ModifierFlags.Export) !== 0 || (flags & ts.ModifierFlags.Default) !== 0;
}

function isBufferType(type: ts.Type): boolean {
  const symbol = type.getSymbol();
  const name = symbol?.getName();
  return name === 'Buffer' || name === 'Uint8Array';
}

function unwrapType(type: ts.Type): ts.Type {
  if (type.isUnion()) {
    const nonNullable = type.types.filter(
      (t) => (t.flags & ts.TypeFlags.Null) === 0 && (t.flags & ts.TypeFlags.Undefined) === 0,
    );
    return nonNullable[0] ?? type.types[0];
  }
  return type;
}

function buildTemplate(type: ts.Type, seen: Set<string>): unknown {
  const target = unwrapType(type);

  if (target.flags & ts.TypeFlags.StringLiteral) {
    return (target as ts.StringLiteralType).value;
  }
  if (target.flags & ts.TypeFlags.NumberLiteral) {
    return (target as ts.NumberLiteralType).value;
  }
  if (target.flags & ts.TypeFlags.BooleanLiteral) {
    return (target as ts.IntrinsicType).intrinsicName === 'true';
  }
  if (target.flags & ts.TypeFlags.String) return '';
  if (target.flags & ts.TypeFlags.Number) return 0;
  if (target.flags & ts.TypeFlags.Boolean) return false;
  if (checker.isArrayType(target)) return [];
  if (isBufferType(target)) return '';
  if (target.getCallSignatures().length > 0) return null;

  const symbol = target.getSymbol();
  const name = symbol?.getName();
  if (name) {
    if (seen.has(name)) return {};
    seen.add(name);
  }

  if (target.flags & ts.TypeFlags.Object) {
    const obj: Record<string, unknown> = {};
    const props = target.getProperties();
    for (const prop of props) {
      const propName = prop.getName();
      const decl = prop.valueDeclaration ?? prop.declarations?.[0];
      const propType = decl ? checker.getTypeOfSymbolAtLocation(prop, decl) : checker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration ?? prop);
      const resolved = unwrapType(propType);
      if (isBufferType(resolved)) {
        obj[`${propName}Hex`] = '';
        continue;
      }
      obj[propName] = buildTemplate(resolved, new Set(seen));
    }
    if (name) seen.delete(name);
    return obj;
  }

  if (name) seen.delete(name);
  return null;
}

const dataTypeMap = new Map<string, ts.Type>();
const classCtorTypeMap = new Map<string, ts.Type>();

for (const sourceFile of program.getSourceFiles()) {
  const fileName = path.resolve(sourceFile.fileName).toLowerCase();
  if (!fileName.startsWith(packetsRootNorm)) continue;
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
      const name = node.name?.text;
      if (!name || !name.endsWith('Data')) return;
      const type = checker.getTypeAtLocation(node);
      dataTypeMap.set(name, type);
    }
    if (ts.isClassDeclaration(node) && node.name && isExported(node)) {
      const className = node.name.text;
      const ctor = node.members.find((member) => ts.isConstructorDeclaration(member)) as ts.ConstructorDeclaration | undefined;
      if (!ctor || !ctor.parameters.length) return;
      const param = ctor.parameters[0];
      if (!param.type) return;
      const paramType = checker.getTypeFromTypeNode(param.type);
      classCtorTypeMap.set(className, paramType);
    }
  });
}

const templates: Record<string, unknown> = {};
for (const [className, type] of classCtorTypeMap.entries()) {
  const symbol = type.getSymbol();
  const typeName = symbol?.getName();
  const resolvedType = typeName && dataTypeMap.has(typeName) ? dataTypeMap.get(typeName)! : type;
  templates[className] = buildTemplate(resolvedType, new Set());
}

fs.writeFileSync(outFile, JSON.stringify(templates, null, 2), 'utf8');
console.log(`[gen] Wrote ${Object.keys(templates).length} templates -> ${outFile}`);
