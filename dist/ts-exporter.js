"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convert = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const pluralize_1 = require("pluralize");
const util = {
    // InterfaceName
    defaultToInterfaceName: (name) => name ? `I${name.replace(/^./, (str) => str.toUpperCase()).replace(/[ ]+./g, (str) => str.trimLeft().toUpperCase()).replace(/\//g, '')}` : 'any',
    overrideToInterfaceName: undefined,
    toInterfaceName(name) {
        return util.overrideToInterfaceName ? util.overrideToInterfaceName(name) || util.defaultToInterfaceName(name) : this.defaultToInterfaceName(name);
    },
    // EnumName
    defaultToEnumName: (name, interfaceName) => name ? `${interfaceName}${name.replace(/^./, (str) => str.toUpperCase())}` : 'any',
    overrideToEnumName: undefined,
    toEnumName(name, interfaceName) {
        return this.overrideToEnumName ? this.overrideToEnumName(name, interfaceName) || this.defaultToEnumName(name, interfaceName) : this.defaultToEnumName(name, interfaceName);
    },
    /**
     * Convert a Strapi type to a TypeScript type.
     *
     * @param interfaceName name of current interface
     * @param fieldName name of the field
     * @param model Strapi type
     * @param enumm Use Enum type (or string literal types)
     */
    defaultToPropertyType: (interfaceName, fieldName, model, enumm) => {
        const pt = model.type ? model.type.toLowerCase() : 'any';
        switch (pt) {
            case 'text':
            case 'richtext':
            case 'email':
            case 'password':
            case 'uid':
            case 'time':
                return 'string';
            case 'enumeration':
                if (enumm) {
                    return model.enum ? util.toEnumName(fieldName, interfaceName) : 'string';
                }
                else {
                    return model.enum ? `"${model.enum.join(`" | "`)}"` : 'string';
                }
            case 'date':
            case 'datetime':
            case 'timestamp':
                return 'Date';
            case 'media':
                return 'Blob';
            case 'json':
                return '{ [key: string]: any }';
            case 'dynamiczone':
                return 'any[]';
            case 'decimal':
            case 'float':
            case 'biginteger':
            case 'integer':
                return 'number';
            case 'string':
            case 'number':
            case 'boolean':
            default:
                return pt;
        }
    },
    overrideToPropertyType: undefined,
    toPropertyType(interfaceName, fieldName, model, enumm) {
        return this.overrideToPropertyType ? this.overrideToPropertyType(`${model.type}`, fieldName, interfaceName) || this.defaultToPropertyType(interfaceName, fieldName, model, enumm) : this.defaultToPropertyType(interfaceName, fieldName, model, enumm);
    },
    defaultToPropertyname(fieldName) {
        return fieldName;
    },
    overrideToPropertyName: undefined,
    toPropertyName(fieldName, interfaceName) {
        return this.overrideToPropertyName ? this.overrideToPropertyName(fieldName, interfaceName) || this.defaultToPropertyname(fieldName) : this.defaultToPropertyname(fieldName);
    },
    excludeField: undefined,
    addField: undefined,
};
const findModel = (structure, name) => {
    return structure.filter((s) => s.name.toLowerCase() === name || s.snakeName === name).shift();
};
/**
 * Transform a Strapi Attribute of component.
 *
 * @param attr IStrapiModelAttribute
 */
const componentCompatible = (attr) => {
    if (attr.type === 'component') {
        let model = pluralize_1.singular(attr.component.split('.')[1]);
        return attr.repeatable ? { collection: model } : { model: model };
    }
    return attr;
};
class Converter {
    constructor(strapiModelsParse, config) {
        this.config = config;
        this.strapiModels = [];
        if (!fs.existsSync(this.config.output))
            fs.mkdirSync(this.config.output);
        if (config.enumName && typeof config.enumName === 'function')
            util.overrideToEnumName = config.enumName;
        if (config.interfaceName && typeof config.interfaceName === 'function')
            util.overrideToInterfaceName = config.interfaceName;
        if (config.fieldType && typeof config.fieldType === 'function')
            util.overrideToPropertyType = config.fieldType;
        else if (config.type && typeof config.type === 'function')
            util.overrideToPropertyType = config.type;
        if (config.excludeField && typeof config.excludeField === 'function')
            util.excludeField = config.excludeField;
        if (config.addField && typeof config.addField === 'function')
            util.addField = config.addField;
        if (config.fieldName && typeof config.fieldName === 'function')
            util.overrideToPropertyName = config.fieldName;
        this.strapiModels = strapiModelsParse.map(m => {
            return Object.assign(Object.assign({}, m), { name: m.info.name, snakeName: m.info.name
                    .split(/(?=[A-Z])/)
                    .join('-')
                    .replace(/[\/\- ]+/g, "-")
                    .toLowerCase(), interfaceName: util.toInterfaceName(m.info.name) });
        });
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                // Write index.ts
                const outputFile = path.resolve(this.config.output, 'index.ts');
                const output = this.strapiModels
                    .map(s => (this.config.nested ? `export * from './${s.snakeName}/${s.snakeName}';` : `export * from './${s.snakeName}';`))
                    .sort()
                    .join('\n');
                fs.writeFileSync(outputFile, output + '\n');
                // Write each interfaces
                let count = this.strapiModels.length;
                this.strapiModels.forEach(g => {
                    const folder = this.config.nested ? path.resolve(this.config.output, g.snakeName) : this.config.output;
                    if (!fs.existsSync(folder))
                        fs.mkdirSync(folder);
                    fs.writeFile(path.resolve(folder, `${g.snakeName}.ts`), this.strapiModelToInterface(g), { encoding: 'utf8' }, (err) => {
                        count--;
                        if (err)
                            reject(err);
                        if (count === 0)
                            resolve(this.strapiModels.length);
                    });
                });
            });
        });
    }
    strapiModelToInterface(m) {
        var _a;
        const result = [];
        result.push(...this.strapiModelExtractImports(m));
        if (result.length > 0)
            result.push('');
        result.push('/**');
        result.push(` * Model definition for ${m.name}`);
        result.push(' */');
        result.push(`export interface ${m.interfaceName} {`);
        result.push(`  ${this.strapiModelAttributeToProperty(m.interfaceName, 'id', {
            type: 'number',
            required: true
        })}`);
        if (((_a = m.options) === null || _a === void 0 ? void 0 : _a.timestamps) === true) {
            result.push(`  ${this.strapiModelAttributeToProperty(m.interfaceName, 'updated_at', {
                type: 'date',
                required: false
            })}`);
            result.push(`  ${this.strapiModelAttributeToProperty(m.interfaceName, 'created_at', {
                type: 'date',
                required: true
            })}`);
        }
        if (m.attributes)
            for (const aName in m.attributes) {
                if ((util.excludeField && util.excludeField(m.interfaceName, aName)) || !m.attributes.hasOwnProperty(aName))
                    continue;
                result.push(`  ${this.strapiModelAttributeToProperty(m.interfaceName, aName, m.attributes[aName])}`);
            }
        if (util.addField) {
            let addFields = util.addField(m.interfaceName);
            if (addFields && Array.isArray(addFields))
                for (let f of addFields) {
                    result.push(`  ${f.name}: ${f.type};`);
                }
        }
        result.push('}');
        if (this.config.enum)
            result.push('', ...this.strapiModelAttributeToEnum(m.interfaceName, m.attributes));
        return result.join('\n');
    }
    ;
    /**
     * Find all required models and import them.
     *
     * @param m Strapi model to examine
     * @param structure Overall output structure
     */
    strapiModelExtractImports(m) {
        const toImportDefinition = (name) => {
            const found = findModel(this.strapiModels, name);
            const toFolder = (f) => (this.config.nested ? `../${f.snakeName}/${f.snakeName}` : `./${f.snakeName}`);
            return found ? `import { ${found.interfaceName} } from '${toFolder(found)}';` : '';
        };
        const imports = [];
        if (m.attributes)
            for (const aName in m.attributes) {
                if (!m.attributes.hasOwnProperty(aName))
                    continue;
                const a = componentCompatible(m.attributes[aName]);
                if ((a.collection || a.model) === m.name)
                    continue;
                const proposedImport = toImportDefinition(a.collection || a.model || '');
                if (proposedImport)
                    imports.push(proposedImport);
            }
        return imports
            .filter((value, index, arr) => arr.indexOf(value) === index) // is unique
            .sort();
    }
    ;
    /**
     * Convert a Strapi Attribute to a TypeScript property.
     *
     * @param interfaceName name of current interface
     * @param name Name of the property
     * @param a Attributes of the property
     * @param structure Overall output structure
     * @param enumm Use Enum type (or string literal types)
     */
    strapiModelAttributeToProperty(interfaceName, name, a) {
        const findModelName = (n) => {
            const result = findModel(this.strapiModels, n);
            if (!result && n !== '*')
                console.debug(`type '${n}' unknown on ${interfaceName}[${name}] => fallback to 'any'. Add in the input arguments the folder that contains *.settings.json with info.name === '${n}'`);
            return result ? result.interfaceName : 'any';
        };
        const required = !a.required && !(!this.config.collectionCanBeUndefined && (a.collection || a.repeatable)) ? '?' : '';
        const nullable = required === '?' ? 'null | ' : '';
        a = componentCompatible(a);
        const collection = a.collection ? '[]' : '';
        const propType = a.collection
            ? findModelName(a.collection)
            : a.model
                ? (a.component ? findModelName(a.model) : `number | ${findModelName(a.model)}`)
                : a.type
                    ? util.toPropertyType(interfaceName, name, a, this.config.enum)
                    : 'unknown';
        const fieldName = util.toPropertyName(name, interfaceName);
        return `${fieldName}${required}: ${nullable}${propType}${collection};`;
    }
    ;
    /**
     * Convert all Strapi Enum to TypeScript Enumeration.
     *
     * @param interfaceName name of current interface
     * @param a Attributes
     */
    strapiModelAttributeToEnum(interfaceName, attributes) {
        const enums = [];
        for (const aName in attributes) {
            if (!attributes.hasOwnProperty(aName))
                continue;
            if (attributes[aName].type === 'enumeration') {
                enums.push(`export enum ${util.toEnumName(aName, interfaceName)} {`);
                attributes[aName].enum.forEach(e => {
                    enums.push(`  ${e} = "${e}",`);
                });
                enums.push(`}\n`);
            }
        }
        return enums;
    }
}
/**
 * Export a StrapiModel to a TypeScript interface
 */
const convert = (strapiModels, config) => __awaiter(void 0, void 0, void 0, function* () {
    return new Converter(strapiModels, config).run();
});
exports.convert = convert;
//# sourceMappingURL=ts-exporter.js.map