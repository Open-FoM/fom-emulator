import { Packet, LithMessage } from './base';

export interface FormatOptions {
    maxWidth?: number;
    indent?: string;
    indentLevel?: number;
    colors?: boolean;
}

const DEFAULT_OPTIONS: Required<FormatOptions> = {
    maxWidth: 80,
    indent: '  ',
    indentLevel: 0,
    colors: false,
};

const COLORS = {
    reset: '\x1b[0m',
    className: '\x1b[36m',
    fieldName: '\x1b[33m',
    string: '\x1b[32m',
    number: '\x1b[35m',
    boolean: '\x1b[34m',
    null: '\x1b[90m',
    bracket: '\x1b[37m',
};

function colorize(text: string, color: keyof typeof COLORS, useColors: boolean): string {
    if (!useColors) return text;
    return `${COLORS[color]}${text}${COLORS.reset}`;
}

interface ParsedField {
    name: string;
    value: string;
    isNested: boolean;
}

function parsePacketString(str: string): { className: string; fields: ParsedField[] } | null {
    const match = str.match(/^(\w+)\s*\{\s*(.*)\s*\}$/s);
    if (!match) return null;

    const className = match[1];
    const fieldsStr = match[2].trim();
    
    if (!fieldsStr) {
        return { className, fields: [] };
    }

    const fields: ParsedField[] = [];
    let depth = 0;
    let bracketDepth = 0;
    let current = '';
    let i = 0;

    while (i < fieldsStr.length) {
        const char = fieldsStr[i];
        
        if (char === '{') depth++;
        else if (char === '}') depth--;
        else if (char === '[') bracketDepth++;
        else if (char === ']') bracketDepth--;
        
        if (char === ',' && depth === 0 && bracketDepth === 0) {
            const field = parseField(current.trim());
            if (field) fields.push(field);
            current = '';
        } else {
            current += char;
        }
        i++;
    }
    
    if (current.trim()) {
        const field = parseField(current.trim());
        if (field) fields.push(field);
    }

    return { className, fields };
}

function parseField(str: string): ParsedField | null {
    const colonIdx = str.indexOf(':');
    if (colonIdx === -1) return null;
    
    const name = str.slice(0, colonIdx).trim();
    const value = str.slice(colonIdx + 1).trim();
    const isNested = value.includes('{') || value.startsWith('[');
    
    return { name, value, isNested };
}

function formatValue(value: string, options: Required<FormatOptions>, currentIndent: string): string {
    const { colors } = options;
    
    if (value.match(/^\w+\s*\{/)) {
        const nested = parsePacketString(value);
        if (nested) {
            return formatParsed(nested, options, currentIndent);
        }
    }
    
    if (value.startsWith('[')) {
        return formatArray(value, options, currentIndent);
    }
    
    if (value.startsWith('"')) {
        return colorize(value, 'string', colors);
    }
    
    if (value === 'true' || value === 'false') {
        return colorize(value, 'boolean', colors);
    }
    
    if (value === 'null') {
        return colorize(value, 'null', colors);
    }
    
    if (value.match(/^-?[\d.]+$/) || value.match(/^0x[\da-fA-F]+$/)) {
        return colorize(value, 'number', colors);
    }
    
    return value;
}

function formatArray(value: string, options: Required<FormatOptions>, currentIndent: string): string {
    const { colors, indent, maxWidth } = options;
    const nextIndent = currentIndent + indent;
    
    const inner = value.slice(1, -1).trim();
    if (!inner) {
        return colorize('[]', 'bracket', colors);
    }
    
    const elements: string[] = [];
    let depth = 0;
    let bracketDepth = 0;
    let current = '';
    
    for (const char of inner) {
        if (char === '{') depth++;
        else if (char === '}') depth--;
        else if (char === '[') bracketDepth++;
        else if (char === ']') bracketDepth--;
        
        if (char === ',' && depth === 0 && bracketDepth === 0) {
            elements.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    if (current.trim()) elements.push(current.trim());
    
    const formattedElements = elements.map(el => formatValue(el, options, nextIndent));
    
    const singleLine = colorize('[', 'bracket', colors) + formattedElements.join(', ') + colorize(']', 'bracket', colors);
    if (currentIndent.length + singleLine.length <= maxWidth && !value.includes('{')) {
        return singleLine;
    }
    
    const lines = [colorize('[', 'bracket', colors)];
    for (let i = 0; i < formattedElements.length; i++) {
        const comma = i < formattedElements.length - 1 ? ',' : '';
        lines.push(`${nextIndent}${formattedElements[i]}${comma}`);
    }
    lines.push(`${currentIndent}${colorize(']', 'bracket', colors)}`);
    
    return lines.join('\n');
}

function formatParsed(
    parsed: { className: string; fields: ParsedField[] },
    options: Required<FormatOptions>,
    currentIndent: string = ''
): string {
    const { colors, indent, maxWidth } = options;
    const { className, fields } = parsed;
    const nextIndent = currentIndent + indent;
    
    const simpleFields = fields.map(f => `${f.name}: ${f.value}`).join(', ');
    const simpleLine = `${className} { ${simpleFields} }`;
    
    const hasNested = fields.some(f => f.isNested);
    if (currentIndent.length + simpleLine.length <= maxWidth && !hasNested) {
        const coloredClassName = colorize(className, 'className', colors);
        const coloredFields = fields.map(f => {
            const coloredName = colorize(f.name, 'fieldName', colors);
            const coloredValue = formatValue(f.value, options, currentIndent);
            return `${coloredName}: ${coloredValue}`;
        }).join(', ');
        return `${coloredClassName} ${colorize('{', 'bracket', colors)} ${coloredFields} ${colorize('}', 'bracket', colors)}`;
    }
    
    const lines: string[] = [];
    lines.push(`${colorize(className, 'className', colors)} ${colorize('{', 'bracket', colors)}`);
    
    for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        const comma = i < fields.length - 1 ? ',' : '';
        const coloredName = colorize(field.name, 'fieldName', colors);
        const coloredValue = formatValue(field.value, options, nextIndent);
        
        lines.push(`${nextIndent}${coloredName}: ${coloredValue}${comma}`);
    }
    
    lines.push(`${currentIndent}${colorize('}', 'bracket', colors)}`);
    
    return lines.join('\n');
}

export function formatPacket(packet: Packet | LithMessage, options: FormatOptions = {}): string {
    const opts: Required<FormatOptions> = { ...DEFAULT_OPTIONS, ...options };
    const baseIndent = opts.indent.repeat(opts.indentLevel);
    const str = packet.toString();
    
    const parsed = parsePacketString(str);
    if (!parsed) {
        return str;
    }
    
    return formatParsed(parsed, opts, baseIndent);
}

export function formatPacketString(str: string, options: FormatOptions = {}): string {
    const opts: Required<FormatOptions> = { ...DEFAULT_OPTIONS, ...options };
    const baseIndent = opts.indent.repeat(opts.indentLevel);
    
    const parsed = parsePacketString(str);
    if (!parsed) {
        return str;
    }
    
    return formatParsed(parsed, opts, baseIndent);
}

export function createPacketFormatter(defaultOptions: FormatOptions = {}) {
    return (packet: Packet | LithMessage, options: FormatOptions = {}): string => {
        return formatPacket(packet, { ...defaultOptions, ...options });
    };
}
