import * as fs from 'fs';
import * as path from 'path';
//import { singular } from 'pluralize'
import { strapiAttributeIsCollection, strapiAttributeIsComponent, strapiAttributeIsModel, strapiAttributeIsTyped, StrapiAttributeType, StrapiModel as StrapiModel, StrapiModelAttributeDefinition, StrapiModelEnumerationAttribute } from './models/strapi-model';
import { IConfigOptions } from '..';
import { pascalCase } from 'change-case';


interface StrapiModelExtended extends StrapiModel {
  name: string;
  snakeName: string;
  typeName: string;
}


const Utils = {

  // InterfaceName
  toInterfaceName(name: string) {
    return name 
      ? `I${name
        .replace(/^./, (str: string) => str.toUpperCase())
        .replace(/[ ]+./g, (str: string) => str.trimLeft().toUpperCase()).replace(/\//g, '')}` 
      : 'any';
  },

  // EnumName
  toEnumerationName(def: StrapiModelEnumerationAttribute, fieldName: string, interfaceName: string) {
    return def.enumName 
      ? `I${def.enumName}`
      : `${interfaceName}${fieldName.replace(/^./, (str: string) => str.toUpperCase())}`;
  },

  dynamicZoneTypeName(fieldName: string, interfaceName: string) {
    return `${interfaceName}${fieldName.replace(/^./, (str: string) => str.toUpperCase())}DynamicZone`;
  },

  propertyTypeForStrapiType: (type: StrapiAttributeType): string => {
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

  excludeField: undefined as IConfigOptions['excludeField'] | undefined,

  addField: undefined as IConfigOptions['addField'] | undefined,
}


type ModelMap = {
  typeForModel: (name: string) => StrapiModelExtended|null
  typeForComponent: (name: string) => StrapiModelExtended|null
};

const buildModelMap = (allModels: StrapiModelExtended[]): ModelMap => {
  const modelMap: {[key: string]: StrapiModelExtended} = {};
  const componentMap: {[key: string]: StrapiModelExtended} = {};

  for (let model of allModels) {
    if (model.file.type === 'api') {
      modelMap[model.file.modelName] = model;
    } else if (model.file.type === 'component') {
      componentMap[`${model.file.categoryName}.${model.file.modelName}`] = model;
    }
  }

  return {
    typeForModel: (name: string) => modelMap[name] ?? null,
    typeForComponent: (name: string) => componentMap[name] ?? null,
  };
};



/**
 * Export a StrapiModel to a TypeScript interface
 */
export const convert = async (discoveredStrapiModels: StrapiModel[], config: IConfigOptions) => {
  if (!fs.existsSync(config.output)) fs.mkdirSync(config.output);

  if (config.excludeField && typeof config.excludeField === 'function') Utils.excludeField = config.excludeField;
  if (config.addField && typeof config.addField === 'function') Utils.addField = config.addField;

  const strapiModels: StrapiModelExtended[] = discoveredStrapiModels.map(model => {
    return {
      ...model,
      name: model.definition.info.name,
      snakeName: model.file.modelName,
      typeName: `I${pascalCase(model.file.modelName)}`,
    };
  });

  // Write index.ts
  const outputFile = path.resolve(config.output, 'api-types.d.ts');

  const declarations: string[] = [];

  declarations.push(`declare type AvailableStrapiApiModels = ${
    strapiModels
      .filter((it) => it.file.type !== 'component')
      .map((it) => `'${it.file.modelName}'`)
      .join(' | ')
  };\n\n`)

  declarations.push(`declare type StrapiApiModels = {
    ${strapiModels
        .filter((it) => it.file.type !== 'component')
        .map((it) => `'${it.file.modelName}': {
          Model: ${it.typeName}
          Query: ${it.typeName}Query
          Input: ${it.typeName}Input
        }`)
        .join('\n')
    }
  };\n\n`)

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
}



/**
 * strapiModelToInterface
 */
const strapiModelToInterface = (args: {
  strapiModel: StrapiModelExtended,
  modelMap: ModelMap,
}) => {
  const {
    strapiModel,
    modelMap,
  } = args;

  const result: string[] = [];

  const pushModel = (args: {
    prefix?: string
    suffix?: string
    useNumberInsteadOfModel?: boolean
    makeGeneratedFieldsOptional?: boolean
    keepComponentCollections?: boolean
  }) => {
    const {
      prefix = '',
      suffix = '',
      useNumberInsteadOfModel = false,
      makeGeneratedFieldsOptional = false,
      keepComponentCollections = true,
    } = args;

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

    if (strapiModel.definition.options?.timestamps === true && !makeGeneratedFieldsOptional) {
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
        if ((Utils.excludeField && Utils.excludeField(strapiModel.typeName, aName)) || !attributes.hasOwnProperty(aName)) continue;
        
        const attribute = attributes[aName];
        
        if (useNumberInsteadOfModel && (
          (!keepComponentCollections && strapiAttributeIsComponent(attribute) && attribute.repeatable) || strapiAttributeIsCollection(attribute)
        )) {
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
      if (addFields && Array.isArray(addFields)) for (let f of addFields) {
        result.push(`  ${f.name}: ${f.type};`)
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
  });

  pushModel({ 
    suffix: 'Input',
    useNumberInsteadOfModel: true,
    makeGeneratedFieldsOptional: true,
    keepComponentCollections: true,
  });

  result.push('', ...strapiModelAttributeToType(strapiModel, modelMap));

  return result.join('\n');
};



const printTypescriptProperty = (args: {
  name: string
  type: string
  optional: boolean
  collection: boolean
  nullable: boolean
}) => {
  const parts: string[] = [];

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
const strapiModelAttributeToProperty = (
  data: {
    type: 'from-strapi'
    definition: StrapiModelAttributeDefinition
  } | {
    type: 'custom'
    strapiType: StrapiAttributeType | 'ID'
    required: boolean
  },
  config: {
    modelMap: ModelMap,
    interfaceName: string
    name: string
    useNumberInsteadOfModel: boolean
    makeGeneratedFieldsOptional: boolean
    interfacePrefix: string
    interfaceSuffix: string
  },
) => {
  const { 
    modelMap,
    interfaceName,
    name,
    useNumberInsteadOfModel,
    makeGeneratedFieldsOptional,
    interfacePrefix,
    interfaceSuffix,
  } = config;
  
  const findModelName = (model: string, type: 'model'|'component') => {
    let result: StrapiModelExtended|null;
    switch(type) {
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
  let type: string;
  
  let required = false;

  if (data.type === 'custom') {
    required = data.required;
    type = data.strapiType === 'ID' ? 'StrapiID' : Utils.propertyTypeForStrapiType(data.strapiType);
  } else {
    const def = data.definition;
    
    if (strapiAttributeIsModel(def)) {
      type = useNumberInsteadOfModel ? 'number' : findModelName(def.model, 'model');
    } else if (strapiAttributeIsCollection(def)) {
      collection = true;
      required = true;
      type = useNumberInsteadOfModel ? 'number' : findModelName(def.collection, 'model');
    } else {
      switch (def.type) {
        case 'enumeration':
          type = Utils.toEnumerationName(def, name, interfaceName);
          required = def.required === true;
          break;
        case 'dynamiczone':
          type = Utils.dynamicZoneTypeName(name, interfaceName);
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

  // let propType: string;
  // if (a.collection !== undefined) {
  //   if (attribute.component !== undefined) {
  //     propType = findModelName(a.collection);
  //   } else {
  //     propType = findModelName(a.collection);
  //   }
  // } else if(a.model !== undefined) {
  //   if (attribute.component !== undefined) {
  //     propType = findModelName(a.model);
  //   } else {
  //     propType = useNumberInsteadOfModel 
  //       ? 'number' 
  //       : `${findModelName(a.model)} | number`;
  //   }
  // } else {
  //   if (a.type !== undefined) {
  //     propType = Utils.toPropertyType(interfaceName, name, a, true);
  //   } else {
  //     propType = 'unknown';
  //   }
  // }

  // const fieldName = Utils.toPropertyName(name, interfaceName);

  // return `${fieldName}${optional}: ${nullable}${propType}${collection};`;
};


const strapiModelAttributeToType = (strapiModel: StrapiModelExtended, modelMap: ModelMap): string[] => {
  const types: string[] = [];
  const attributes = strapiModel.definition.attributes;

  for (const aName in attributes) {
    if (!attributes.hasOwnProperty(aName)) continue;
    const attribute = attributes[aName];
    if (!strapiAttributeIsTyped(attribute)) continue;

    if (attribute.type === 'enumeration') {
      types.push(`declare type ${Utils.toEnumerationName(attribute, aName, strapiModel.typeName)} = ${attribute.enum.map(it => `'${it}'`).join(' | ')};`);
    }
    if (attribute.type === 'dynamiczone') {
      const componentTypes = attribute.components.map((it) => `({ __component: '${it}' } & I${modelMap.typeForComponent(it)?.typeName})`);
      types.push(`declare type ${Utils.dynamicZoneTypeName(aName, strapiModel.typeName)} = ${componentTypes.join(' | ')};`);
    }
  }
  return types
}