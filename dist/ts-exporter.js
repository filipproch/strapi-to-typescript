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
const change_case_1 = require("change-case");
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
        if (model.type === 'StrapiID')
            return 'StrapiID';
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
        return this.overrideToPropertyType
            ? this.overrideToPropertyType(`${model.type}`, fieldName, interfaceName) || this.defaultToPropertyType(interfaceName, fieldName, model, enumm)
            : this.defaultToPropertyType(interfaceName, fieldName, model, enumm);
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
            return Object.assign(Object.assign({}, m), { name: m.info.name, snakeName: m._modelName, interfaceName: `I${change_case_1.pascalCase(m._modelName)}` });
        });
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, _reject) => {
                // Write index.ts
                const outputFile = path.resolve(this.config.output, 'api-types.d.ts');
                // const output = this.strapiModels
                //   .map(s => (this.config.nested ? `export * from './${s.snakeName}/${s.snakeName}';` : `export * from './${s.snakeName}';`))
                //   .sort()
                //   .join('\n');
                // Write each interfaces
                const declarations = [];
                declarations.push(`declare type AvailableStrapiApiModels = ${this.strapiModels
                    .filter((it) => !it.isComponent)
                    .map((it) => `'${it._modelName}'`)
                    .join(' | ')};\n\n`);
                declarations.push(`declare type StrapiApiModels = {
        ${this.strapiModels
                    .filter((it) => !it.isComponent)
                    .map((it) => `'${it._modelName}': {
              Model: ${it.interfaceName}
              Query: ${it.interfaceName}Query
              Input: ${it.interfaceName}Input
            }`)
                    .join('\n')}
      };\n\n`);
                this.strapiModels.forEach(g => {
                    const folder = this.config.nested ? path.resolve(this.config.output, g.snakeName) : this.config.output;
                    if (!fs.existsSync(folder))
                        fs.mkdirSync(folder);
                    declarations.push(this.strapiModelToInterface(g));
                    // fs.writeFile(path.resolve(folder, `${g.snakeName}.ts`), , { encoding: 'utf8' }, (err) => {
                    //   count--;
                    //   if (err) reject(err);
                    //   if (count === 0) resolve(this.strapiModels.length);
                    // });
                });
                fs.writeFileSync(outputFile, declarations.join('\n\n') + '\n', {
                    encoding: 'utf8',
                });
                resolve(this.strapiModels.length);
            });
        });
    }
    strapiModelToInterface(m) {
        const result = [];
        //result.push(...this.strapiModelExtractImports(m));
        //if (result.length > 0) result.push('')
        const pushModel = (args) => {
            var _a;
            const { prefix = '', suffix = '', useNumberInsteadOfModel = false, makeGeneratedFieldsOptional = false, } = args;
            result.push('/**');
            result.push(` * Model ${suffix} definition for ${m.name}`);
            result.push(' */');
            result.push(`declare type ${prefix}${m.interfaceName}${suffix} = {`);
            if (!makeGeneratedFieldsOptional) {
                result.push(`  ${this.strapiModelAttributeToProperty({
                    interfaceName: m.interfaceName,
                    name: 'id',
                    a: {
                        type: 'StrapiID',
                        required: true
                    },
                    useNumberInsteadOfModel,
                    makeGeneratedFieldsOptional,
                })}`);
            }
            if (((_a = m.options) === null || _a === void 0 ? void 0 : _a.timestamps) === true && !makeGeneratedFieldsOptional) {
                result.push(`  ${this.strapiModelAttributeToProperty({
                    interfaceName: m.interfaceName,
                    name: 'updated_at',
                    a: {
                        type: 'date',
                        required: false
                    },
                    useNumberInsteadOfModel,
                    makeGeneratedFieldsOptional,
                })}`);
                result.push(`  ${this.strapiModelAttributeToProperty({
                    interfaceName: m.interfaceName,
                    name: 'created_at',
                    a: {
                        type: 'date',
                        required: true
                    },
                    useNumberInsteadOfModel,
                    makeGeneratedFieldsOptional,
                })}`);
            }
            if (m.attributes) {
                for (const aName in m.attributes) {
                    if ((util.excludeField && util.excludeField(m.interfaceName, aName)) || !m.attributes.hasOwnProperty(aName))
                        continue;
                    const attribute = m.attributes[aName];
                    if (useNumberInsteadOfModel && ((attribute.component && attribute.repeatable) || attribute.collection)) {
                        continue;
                    }
                    result.push(`  ${this.strapiModelAttributeToProperty({
                        interfaceName: m.interfaceName,
                        name: aName,
                        a: m.attributes[aName],
                        useNumberInsteadOfModel,
                        makeGeneratedFieldsOptional,
                    })}`);
                }
            }
            if (util.addField) {
                let addFields = util.addField(m.interfaceName);
                if (addFields && Array.isArray(addFields))
                    for (let f of addFields) {
                        result.push(`  ${f.name}: ${f.type};`);
                    }
            }
            result.push('}');
        };
        pushModel({
            useNumberInsteadOfModel: false,
        });
        pushModel({
            suffix: 'Query',
            useNumberInsteadOfModel: true,
        });
        pushModel({
            suffix: 'Input',
            useNumberInsteadOfModel: true,
            makeGeneratedFieldsOptional: true,
        });
        if (this.config.enum) {
            result.push('', ...this.strapiModelAttributeToEnum(m.interfaceName, m.attributes));
        }
        else {
            result.push('', ...this.strapiModelAttributeToType(m.interfaceName, m.attributes));
        }
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
    strapiModelAttributeToProperty(args) {
        const { interfaceName, name, a: attribute, useNumberInsteadOfModel, makeGeneratedFieldsOptional, } = args;
        let a = attribute;
        const findModelName = (model, opts) => {
            const { useQuery = false } = (opts !== null && opts !== void 0 ? opts : {});
            const result = findModel(this.strapiModels, model);
            if (!result && model !== '*')
                console.debug(`type '${model}' unknown on ${interfaceName}[${name}] => fallback to 'any'. Add in the input arguments the folder that contains *.settings.json with info.name === '${model}'`);
            return result
                ? `${result.interfaceName}${useQuery ? 'Query' : ''}`
                : 'any';
        };
        const isRequired = a.required || a.collection || a.repeatable || (!makeGeneratedFieldsOptional && a.generated);
        //const required = isRequired ? '' : '?';
        const optional = makeGeneratedFieldsOptional && a.generated ? '?' : '';
        const nullable = isRequired || a.generated ? '' : 'null | ';
        a = componentCompatible(a);
        const collection = a.collection ? '[]' : '';
        let propType;
        if (a.collection !== undefined) {
            if (attribute.component !== undefined) {
                propType = findModelName(a.collection, {
                    useQuery: useNumberInsteadOfModel,
                });
            }
            else {
                propType = findModelName(a.collection);
            }
        }
        else if (a.model !== undefined) {
            if (attribute.component !== undefined) {
                propType = findModelName(a.model, {
                    useQuery: useNumberInsteadOfModel,
                });
            }
            else {
                propType = useNumberInsteadOfModel
                    ? 'number'
                    : `${findModelName(a.model)}`;
            }
        }
        else {
            if (a.type !== undefined) {
                propType = util.toPropertyType(interfaceName, name, a, true);
            }
            else {
                propType = 'unknown';
            }
        }
        const fieldName = util.toPropertyName(name, interfaceName);
        return `${fieldName}${optional}: ${nullable}${propType}${collection};`;
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
                enums.push(`declare enum ${util.toEnumName(aName, interfaceName)} {`);
                attributes[aName].enum.forEach(e => {
                    enums.push(`  ${e} = "${e}",`);
                });
                enums.push(`}\n`);
            }
        }
        return enums;
    }
    strapiModelAttributeToType(interfaceName, attributes) {
        const types = [];
        for (const aName in attributes) {
            if (!attributes.hasOwnProperty(aName))
                continue;
            if (attributes[aName].type === 'enumeration') {
                types.push(`declare type ${util.toEnumName(aName, interfaceName)} = ${attributes[aName].enum.map(it => `'${it}'`).join(' | ')};`);
            }
        }
        return types;
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