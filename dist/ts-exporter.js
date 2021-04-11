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
//import { singular } from 'pluralize'
const strapi_model_1 = require("./models/strapi-model");
const change_case_1 = require("change-case");
const Utils = {
    // InterfaceName
    toInterfaceName(name) {
        return name
            ? `I${name
                .replace(/^./, (str) => str.toUpperCase())
                .replace(/[ ]+./g, (str) => str.trimLeft().toUpperCase()).replace(/\//g, '')}`
            : 'any';
    },
    // EnumName
    toEnumerationName(def, fieldName, interfaceName) {
        return def.enumName
            ? `I${def.enumName}`
            : `${interfaceName}${fieldName.replace(/^./, (str) => str.toUpperCase())}`;
    },
    dynamicZoneTypeName(fieldName, interfaceName, suffix) {
        return `${interfaceName}${fieldName.replace(/^./, (str) => str.toUpperCase())}DynamicZone${suffix}`;
    },
    propertyTypeForStrapiType: (type) => {
        switch (type) {
            case 'text':
            case 'richtext':
            case 'email':
            case 'password':
            case 'uid':
            case 'time':
                return 'string';
            case 'enumeration':
            case 'dynamiczone':
            case 'component':
                throw new Error('unsupported (special case)');
            case 'date':
            case 'datetime':
                return 'Date';
            case 'json':
                return '{ [key: string]: any }';
            case 'decimal':
            case 'float':
            case 'biginteger':
            case 'integer':
                return 'number';
            case 'string':
            case 'boolean':
                return type;
        }
    },
    excludeField: undefined,
    addField: undefined,
};
const buildModelMap = (allModels) => {
    const modelMap = {};
    const componentMap = {};
    for (let model of allModels) {
        if (model.file.type === 'api') {
            modelMap[model.file.modelName] = model;
        }
        else if (model.file.type === 'component') {
            componentMap[`${model.file.categoryName}.${model.file.modelName}`] = model;
        }
    }
    return {
        typeForModel: (name) => { var _a; return (_a = modelMap[name]) !== null && _a !== void 0 ? _a : null; },
        typeForComponent: (name) => { var _a; return (_a = componentMap[name]) !== null && _a !== void 0 ? _a : null; },
    };
};
/**
 * Export a StrapiModel to a TypeScript interface
 */
const convert = (discoveredStrapiModels, config) => __awaiter(void 0, void 0, void 0, function* () {
    if (!fs.existsSync(config.output))
        fs.mkdirSync(config.output);
    if (config.excludeField && typeof config.excludeField === 'function')
        Utils.excludeField = config.excludeField;
    if (config.addField && typeof config.addField === 'function')
        Utils.addField = config.addField;
    const strapiModels = discoveredStrapiModels.map(model => {
        return Object.assign(Object.assign({}, model), { name: model.definition.info.name, snakeName: model.file.modelName, typeName: `I${change_case_1.pascalCase(model.file.modelName)}` });
    });
    // Write index.ts
    const outputFile = path.resolve(config.output, 'api-types.d.ts');
    const declarations = [];
    declarations.push(`declare type AvailableStrapiApiModels = ${strapiModels
        .filter((it) => it.file.type !== 'component')
        .map((it) => `'${it.file.modelName}'`)
        .join(' | ')};\n\n`);
    declarations.push(`declare type StrapiApiModels = {
    ${strapiModels
        .filter((it) => it.file.type !== 'component')
        .map((it) => `'${it.file.modelName}': {
          Model: ${it.typeName}
          Query: ${it.typeName}Query
          Input: ${it.typeName}Input
        }`)
        .join('\n')}
  };\n\n`);
    const modelMap = buildModelMap(strapiModels);
    strapiModels.forEach(model => {
        declarations.push(strapiModelToInterface({
            strapiModel: model,
            modelMap,
        }));
    });
    fs.writeFileSync(outputFile, declarations.join('\n\n') + '\n', {
        encoding: 'utf8',
    });
});
exports.convert = convert;
/**
 * strapiModelToInterface
 */
const strapiModelToInterface = (args) => {
    const { strapiModel, modelMap, } = args;
    const result = [];
    const pushModel = (args) => {
        var _a;
        const { prefix = '', suffix = '', useNumberInsteadOfModel = false, makeGeneratedFieldsOptional = false, keepComponentCollections = true, skipDynamicZone = false, } = args;
        result.push('/**');
        result.push(` * Model ${suffix} definition for ${strapiModel.name}`);
        result.push(' */');
        result.push(`declare type ${prefix}${strapiModel.typeName}${suffix} = {`);
        if (makeGeneratedFieldsOptional === false || strapiModel.file.type === 'component') {
            result.push(`  ${strapiModelAttributeToProperty({
                type: 'custom',
                strapiType: 'ID',
                required: !makeGeneratedFieldsOptional,
            }, {
                modelMap,
                interfaceName: strapiModel.typeName,
                name: 'id',
                useNumberInsteadOfModel,
                makeGeneratedFieldsOptional,
                interfacePrefix: '',
                interfaceSuffix: '',
            })}`);
        }
        if (((_a = strapiModel.definition.options) === null || _a === void 0 ? void 0 : _a.timestamps) === true && !makeGeneratedFieldsOptional) {
            result.push(`  ${strapiModelAttributeToProperty({
                type: 'custom',
                strapiType: 'datetime',
                required: true,
            }, {
                modelMap,
                interfaceName: strapiModel.typeName,
                name: 'updated_at',
                useNumberInsteadOfModel,
                makeGeneratedFieldsOptional,
                interfacePrefix: '',
                interfaceSuffix: '',
            })}`);
            result.push(`  ${strapiModelAttributeToProperty({
                type: 'custom',
                strapiType: 'datetime',
                required: true,
            }, {
                modelMap,
                interfaceName: strapiModel.typeName,
                name: 'created_at',
                useNumberInsteadOfModel,
                makeGeneratedFieldsOptional,
                interfacePrefix: '',
                interfaceSuffix: '',
            })}`);
        }
        const attributes = strapiModel.definition.attributes;
        if (attributes) {
            for (const aName in attributes) {
                if ((Utils.excludeField && Utils.excludeField(strapiModel.typeName, aName)) || !attributes.hasOwnProperty(aName))
                    continue;
                const attribute = attributes[aName];
                if (useNumberInsteadOfModel && ((!keepComponentCollections && strapi_model_1.strapiAttributeIsComponent(attribute) && attribute.repeatable) || strapi_model_1.strapiAttributeIsCollection(attribute))) {
                    continue;
                }
                if (skipDynamicZone && strapi_model_1.strapiAttributeIsTyped(attribute) && attribute.type === 'dynamiczone') {
                    continue;
                }
                result.push(`  ${strapiModelAttributeToProperty({
                    type: 'from-strapi',
                    definition: attributes[aName],
                }, {
                    modelMap,
                    interfaceName: strapiModel.typeName,
                    name: aName,
                    useNumberInsteadOfModel,
                    makeGeneratedFieldsOptional,
                    interfacePrefix: prefix,
                    interfaceSuffix: suffix,
                })}`);
            }
        }
        if (Utils.addField) {
            let addFields = Utils.addField(strapiModel.typeName);
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
        keepComponentCollections: false,
        skipDynamicZone: true,
    });
    pushModel({
        suffix: 'Input',
        useNumberInsteadOfModel: true,
        makeGeneratedFieldsOptional: true,
        keepComponentCollections: true,
    });
    const attributes = strapiModel.definition.attributes;
    for (const aName in attributes) {
        if (!attributes.hasOwnProperty(aName))
            continue;
        const attribute = attributes[aName];
        if (!strapi_model_1.strapiAttributeIsTyped(attribute))
            continue;
        if (attribute.type === 'enumeration') {
            result.push(`declare type ${Utils.toEnumerationName(attribute, aName, strapiModel.typeName)} = ${attribute.enum.map(it => `'${it}'`).join(' | ')};`);
        }
        if (attribute.type === 'dynamiczone') {
            result.push(dynamicZoneUnionType({
                components: attribute.components,
                strapiModel,
                attributeName: aName,
                modelMap,
                suffix: '',
            }));
            result.push(dynamicZoneUnionType({
                components: attribute.components,
                strapiModel,
                attributeName: aName,
                modelMap,
                suffix: 'Input',
            }));
        }
    }
    return result.join('\n');
};
const dynamicZoneUnionType = (args) => {
    const componentTypes = args.components.map((it) => { var _a; return `({ __component: '${it}' } & ${(_a = args.modelMap.typeForComponent(it)) === null || _a === void 0 ? void 0 : _a.typeName}${args.suffix})`; });
    return `declare type ${Utils.dynamicZoneTypeName(args.attributeName, args.strapiModel.typeName, args.suffix)} = ${componentTypes.join(' | ')};`;
};
const printTypescriptProperty = (args) => {
    const parts = [];
    parts.push(args.name);
    if (args.optional) {
        parts.push('?');
    }
    parts.push(': ');
    if (args.nullable) {
        parts.push('null | ');
    }
    parts.push(args.type);
    if (args.collection) {
        parts.push('[]');
    }
    return parts.join('');
};
/**
 * Convert a Strapi Attribute to a TypeScript property.
 *
 * @param interfaceName name of current interface
 * @param name Name of the property
 * @param a Attributes of the property
 * @param structure Overall output structure
 * @param enumm Use Enum type (or string literal types)
 */
const strapiModelAttributeToProperty = (data, config) => {
    const { modelMap, interfaceName, name, useNumberInsteadOfModel, makeGeneratedFieldsOptional, interfacePrefix, interfaceSuffix, } = config;
    const findModelName = (model, type) => {
        let result;
        switch (type) {
            case 'model':
                result = modelMap.typeForModel(model);
                break;
            case 'component':
                result = modelMap.typeForComponent(model);
                break;
        }
        if (result === null && model !== '*') {
            console.debug(`type '${model}' unknown on ${interfaceName}[${name}] => fallback to 'any'.`);
        }
        return result
            ? `${interfacePrefix}${result.typeName}${interfaceSuffix}`
            : 'any';
    };
    let collection = false;
    let optional = false;
    let type;
    let required = false;
    if (data.type === 'custom') {
        required = data.required;
        type = data.strapiType === 'ID' ? 'StrapiID' : Utils.propertyTypeForStrapiType(data.strapiType);
    }
    else {
        const def = data.definition;
        if (strapi_model_1.strapiAttributeIsModel(def)) {
            type = useNumberInsteadOfModel ? 'number' : `${findModelName(def.model, 'model')} | number`;
        }
        else if (strapi_model_1.strapiAttributeIsCollection(def)) {
            collection = true;
            required = true;
            type = useNumberInsteadOfModel ? 'number' : findModelName(def.collection, 'model');
        }
        else {
            switch (def.type) {
                case 'enumeration':
                    type = Utils.toEnumerationName(def, name, interfaceName);
                    required = def.required === true;
                    break;
                case 'dynamiczone':
                    type = Utils.dynamicZoneTypeName(name, interfaceName, interfaceSuffix);
                    collection = true;
                    required = def.required === true;
                    break;
                case 'component':
                    type = findModelName(def.component, 'component');
                    collection = def.repeatable === true;
                    required = def.required === true || def.repeatable === true;
                    break;
                default:
                    optional = def.generated === true && makeGeneratedFieldsOptional;
                    type = Utils.propertyTypeForStrapiType(def.type);
                    required = def.required === true || (def.generated === true && !makeGeneratedFieldsOptional);
                    break;
            }
        }
    }
    return printTypescriptProperty({
        name,
        type,
        collection,
        optional,
        nullable: !required,
    });
};
//# sourceMappingURL=ts-exporter.js.map