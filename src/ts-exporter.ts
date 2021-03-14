import * as fs from 'fs';
import * as path from 'path';
import { singular } from 'pluralize'
import { IStrapiModel, IStrapiModelAttribute } from './models/strapi-model';
import { IConfigOptions } from '..';
import { pascalCase } from 'change-case';

interface IStrapiModelExtended extends IStrapiModel {
  name: string;
  snakeName: string;
  interfaceName: string;
}

const util = {

  // InterfaceName
  defaultToInterfaceName: (name: string) => name ? `I${name.replace(/^./, (str: string) => str.toUpperCase()).replace(/[ ]+./g, (str: string) => str.trimLeft().toUpperCase()).replace(/\//g, '')}` : 'any',
  overrideToInterfaceName: undefined as IConfigOptions['interfaceName'] | undefined,
  toInterfaceName(name: string) {
    return util.overrideToInterfaceName ? util.overrideToInterfaceName(name) || util.defaultToInterfaceName(name) : this.defaultToInterfaceName(name);
  },

  // EnumName
  defaultToEnumName: (name: string, interfaceName: string) => name ? `${interfaceName}${name.replace(/^./, (str: string) => str.toUpperCase())}` : 'any',
  overrideToEnumName: undefined as IConfigOptions['enumName'] | undefined,
  toEnumName(name: string, interfaceName: string) {
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
  defaultToPropertyType: (interfaceName: string, fieldName: string, model: IStrapiModelAttribute, enumm: boolean) => {
    if (model.type === 'StrapiID') return 'StrapiID';

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
        } else {
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
        return 'any[]'
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
  overrideToPropertyType: undefined as IConfigOptions['fieldType'] | undefined,
  toPropertyType(interfaceName: string, fieldName: string, model: IStrapiModelAttribute, enumm: boolean) {
    return this.overrideToPropertyType 
        ? this.overrideToPropertyType(`${model.type}`, fieldName, interfaceName) || this.defaultToPropertyType(interfaceName, fieldName, model, enumm)
        : this.defaultToPropertyType(interfaceName, fieldName, model, enumm);
  },

  defaultToPropertyname(fieldName: string){
    return fieldName
  },
  overrideToPropertyName: undefined as IConfigOptions['fieldName'] | undefined,
  toPropertyName(fieldName: string, interfaceName: string, ){
    return this.overrideToPropertyName ? this.overrideToPropertyName(fieldName, interfaceName) || this.defaultToPropertyname(fieldName) : this.defaultToPropertyname(fieldName);
  },


  excludeField: undefined as IConfigOptions['excludeField'] | undefined,

  addField: undefined as IConfigOptions['addField'] | undefined,
}

const findModel = (structure: IStrapiModelExtended[], name: string): IStrapiModelExtended | undefined => {
  return structure.filter((s) => s.name.toLowerCase() === name || s.snakeName === name).shift();
};

/**
 * Transform a Strapi Attribute of component.
 *
 * @param attr IStrapiModelAttribute
 */
const componentCompatible = (attr: IStrapiModelAttribute) => {
  if (attr.type === 'component'){
    let model = singular(attr.component!.split('.')[1])
    return attr.repeatable ? { collection: model } : { model: model }
  }
  return attr;
}


class Converter {

  strapiModels: IStrapiModelExtended[] = [];

  constructor(strapiModelsParse: IStrapiModel[], private config: IConfigOptions) {

    if (!fs.existsSync(this.config.output)) fs.mkdirSync(this.config.output);

    if (config.enumName && typeof config.enumName === 'function') util.overrideToEnumName = config.enumName;
    if (config.interfaceName && typeof config.interfaceName === 'function') util.overrideToInterfaceName = config.interfaceName;
    if (config.fieldType && typeof config.fieldType === 'function') util.overrideToPropertyType = config.fieldType;
    else if (config.type && typeof config.type === 'function') util.overrideToPropertyType = config.type;
    if (config.excludeField && typeof config.excludeField === 'function') util.excludeField = config.excludeField;
    if (config.addField && typeof config.addField === 'function') util.addField = config.addField;
    if (config.fieldName && typeof config.fieldName === 'function') util.overrideToPropertyName = config.fieldName;

    this.strapiModels = strapiModelsParse.map(m => {
      return {
        ...m,
        name: m.info.name,
        snakeName: m._modelName,
        interfaceName: `I${pascalCase(m._modelName)}`,
      }
    });

  }

  async run() {
    return new Promise<number>((resolve, _reject) => {

      // Write index.ts
      const outputFile = path.resolve(this.config.output, 'api-types.d.ts');
      // const output = this.strapiModels
      //   .map(s => (this.config.nested ? `export * from './${s.snakeName}/${s.snakeName}';` : `export * from './${s.snakeName}';`))
      //   .sort()
      //   .join('\n');

      // Write each interfaces
      const declarations: string[] = [];

      declarations.push(`
      declare type IStrapiApiModels = ${
        this.strapiModels
          .filter((it) => !it.isComponent)
          .map((it) => `'${it._modelName}'`)
          .join(' | ')
      };
      `)

      this.strapiModels.forEach(g => {
        const folder = this.config.nested ? path.resolve(this.config.output, g.snakeName) : this.config.output;
        if (!fs.existsSync(folder)) fs.mkdirSync(folder);
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
    })
  }

  strapiModelToInterface(m: IStrapiModelExtended) {
    const result: string[] = [];

    //result.push(...this.strapiModelExtractImports(m));
    //if (result.length > 0) result.push('')

    const pushModel = (args: {
      prefix?: string
      suffix?: string
      useNumberInsteadOfModel?: boolean
      omitGeneratedFields?: boolean
    }) => {
      const {
        prefix = '',
        suffix = '',
        useNumberInsteadOfModel = false,
        omitGeneratedFields = false,
      } = args;

      result.push('/**');
      result.push(` * Model ${suffix} definition for ${m.name}`);
      result.push(' */');
      result.push(`declare type ${prefix}${m.interfaceName}${suffix} = {`);

      result.push(`  ${this.strapiModelAttributeToProperty({
        interfaceName: m.interfaceName,
        name: 'id', 
        a: {
          type: 'StrapiID',
          required: true
        },
        useNumberInsteadOfModel,
      })}`);

      if (m.options?.timestamps === true) {
        result.push(`  ${this.strapiModelAttributeToProperty({
          interfaceName: m.interfaceName,
          name: 'updated_at',
          a: {
            type: 'date',
            required: false
          },
          useNumberInsteadOfModel,
        })}`);
        result.push(`  ${this.strapiModelAttributeToProperty({
          interfaceName: m.interfaceName,
          name: 'created_at', 
          a: {
            type: 'date',
            required: true
          },
          useNumberInsteadOfModel,
        })}`);
      }

      if (m.attributes) {
        for (const aName in m.attributes) {
          if ((util.excludeField && util.excludeField(m.interfaceName, aName)) || !m.attributes.hasOwnProperty(aName)) continue;
          
          const attribute = m.attributes[aName];
          
          if (useNumberInsteadOfModel && (
            (attribute.component && attribute.repeatable) || attribute.collection
          )) {
            continue;
          }

          if (omitGeneratedFields) {
            continue;
          }
  
          result.push(`  ${this.strapiModelAttributeToProperty({
            interfaceName: m.interfaceName,
            name: aName,
            a: m.attributes[aName],
            useNumberInsteadOfModel,
          })}`);
        }
      }

      if (util.addField) {
        let addFields = util.addField(m.interfaceName);
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
    });

    pushModel({ 
      suffix: 'Input',
      useNumberInsteadOfModel: true,
      omitGeneratedFields: true,
    });

    if (this.config.enum) {
      result.push('', ...this.strapiModelAttributeToEnum(m.interfaceName, m.attributes));
    } else {
      result.push('', ...this.strapiModelAttributeToType(m.interfaceName, m.attributes));
    }

    return result.join('\n');
  };

  /**
   * Find all required models and import them.
   *
   * @param m Strapi model to examine
   * @param structure Overall output structure
   */
  strapiModelExtractImports(m: IStrapiModelExtended) {
    const toImportDefinition = (name: string) => {
      const found = findModel(this.strapiModels, name);
      const toFolder = (f: IStrapiModelExtended) => (this.config.nested ? `../${f.snakeName}/${f.snakeName}` : `./${f.snakeName}`);
      return found ? `import { ${found.interfaceName} } from '${toFolder(found)}';` : '';
    };

    const imports: string[] = [];
    if (m.attributes) for (const aName in m.attributes) {
      if (!m.attributes.hasOwnProperty(aName)) continue;
      const a = componentCompatible(m.attributes[aName]);
      if((a.collection || a.model) === m.name) continue;

      const proposedImport = toImportDefinition(a.collection || a.model || '')
      if (proposedImport) imports.push(proposedImport);
    }

    return imports
      .filter((value, index, arr) => arr.indexOf(value) === index) // is unique
      .sort()
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
  strapiModelAttributeToProperty(args: {
    interfaceName: string
    name: string
    a: IStrapiModelAttribute
    useNumberInsteadOfModel: boolean
  }) {
    const { 
      interfaceName,
      name,
      a: attribute,
      useNumberInsteadOfModel,
    } = args;
    let a = attribute;
    
    const findModelName = (model: string, opts?: {
      useQuery?: boolean
    }) => {
      const {
        useQuery = false
      } = (opts ?? {});

      const result = findModel(this.strapiModels, model);
      if (!result && model !== '*') 
        console.debug(`type '${model}' unknown on ${interfaceName}[${name}] => fallback to 'any'. Add in the input arguments the folder that contains *.settings.json with info.name === '${model}'`)
      return result 
        ? `${result.interfaceName}${useQuery ? 'Query' : ''}` 
        : 'any';
    };

    const isRequired = a.required || a.collection || a.repeatable || a.generated;

    //const required = isRequired ? '' : '?';
    const nullable = isRequired ? '' : 'null | ';

    a = componentCompatible(a);
    const collection = a.collection ? '[]' : '';

    let propType: string;
    if (a.collection !== undefined) {
      if (attribute.component !== undefined) {
        propType = findModelName(a.collection, {
          useQuery: useNumberInsteadOfModel,
        });
      } else {
        propType = findModelName(a.collection);
      }
    } else if(a.model !== undefined) {
      if (attribute.component !== undefined) {
        propType = findModelName(a.model, {
          useQuery: useNumberInsteadOfModel,
        });
      } else {
        propType = useNumberInsteadOfModel 
          ? 'number' 
          : `${findModelName(a.model)}`;
      }
    } else {
      if (a.type !== undefined) {
        propType = util.toPropertyType(interfaceName, name, a, true);
      } else {
        propType = 'unknown';
      }
    }

    const fieldName = util.toPropertyName(name, interfaceName);

    return `${fieldName}: ${nullable}${propType}${collection};`;
  };

  /**
   * Convert all Strapi Enum to TypeScript Enumeration.
   *
   * @param interfaceName name of current interface
   * @param a Attributes
   */
  strapiModelAttributeToEnum(interfaceName: string, attributes: { [attr: string]: IStrapiModelAttribute }): string[] {
    const enums: string[] = []
    for (const aName in attributes) {
      if (!attributes.hasOwnProperty(aName)) continue;
      if (attributes[aName].type === 'enumeration') {
        enums.push(`declare enum ${util.toEnumName(aName, interfaceName)} {`);
        attributes[aName].enum!.forEach(e => {
          enums.push(`  ${e} = "${e}",`);
        })
        enums.push(`}\n`);
      }
    }
    return enums
  }

  strapiModelAttributeToType(interfaceName: string, attributes: { [attr: string]: IStrapiModelAttribute }): string[] {
    const types: string[] = []
    for (const aName in attributes) {
      if (!attributes.hasOwnProperty(aName)) continue;
      if (attributes[aName].type === 'enumeration') {
        types.push(`declare type ${util.toEnumName(aName, interfaceName)} = ${attributes[aName].enum!.map(it => `'${it}'`).join(' | ')};`);
      }
    }
    return types
  }

}

/**
 * Export a StrapiModel to a TypeScript interface
 */
export const convert = async (strapiModels: IStrapiModel[], config: IConfigOptions) => {
  return new Converter(strapiModels, config).run()
}