export type StrapiFile = {
  path: string
  type: 'api' | 'component'
  categoryName?: string
  modelName: string
};

export interface StrapiModel {
  file: StrapiFile
  definition: StrapiModelDefinitionFile
}

export interface StrapiModelDefinitionFile {
  kind?: 'collectionType' | 'singleType'
  collectionName: string
  info: {
    name: string
    description?: string
  }
  options?: {
    timestamps: boolean
  }
  attributes: {
    [attr: string]: StrapiModelAttributeDefinition
  }
}

export type StrapiAttributeType = 
  | 'string' 
  | 'text'
  | 'richtext'
  | 'email'
  | 'password'
  | 'integer'
  | 'biginteger'
  | 'float' 
  | 'decimal' 
  | 'date'
  | 'time'
  | 'datetime' 
  | 'boolean' 
  | 'enumeration' 
  | 'json' 
  | 'uid' 
  | 'component' 
  | 'dynamiczone';

  


interface StrapiModelGenericAttribute {
  type: 'string' | 'text' | 'richtext' | 'email' | 'password' | 'integer' | 'biginteger' | 'float' | 'decimal' | 'date' | 'time' | 'datetime' | 'boolean' | 'json' | 'uid'
  required?: boolean
  unique?: boolean
  generated?: boolean | 'optional'
}

export interface StrapiModelEnumerationAttribute {
  type: 'enumeration'
  enum: string[]
  enumName?: string
  required?: boolean
}

interface StrapiModelComponentAttribute {
  type: 'component'
  component: string
  repeatable?: boolean
  required?: boolean
}

interface StrapiModelDynamicZoneAttribute {
  type: 'dynamiczone'
  components: string[]
  required?: boolean
}

interface StrapiModelModelAttribute {
  model: string
  plugin?: string
  via?: string
}

interface StrapiModelCollectionAttribute {
  collection: string
  plugin?: string
  via?: string
}


export type StrapiModelAttributeTypedDefinition =
  | StrapiModelGenericAttribute
  | StrapiModelEnumerationAttribute
  | StrapiModelComponentAttribute
  | StrapiModelDynamicZoneAttribute;

export type StrapiModelAttributeDefinition = 
  | StrapiModelAttributeTypedDefinition
  | StrapiModelModelAttribute
  | StrapiModelCollectionAttribute;


export const strapiAttributeIsModel = (def: StrapiModelAttributeDefinition): def is StrapiModelModelAttribute => {
  return typeof (def as StrapiModelModelAttribute).model !== 'undefined';
};

export const strapiAttributeIsCollection = (def: StrapiModelAttributeDefinition): def is StrapiModelCollectionAttribute => {
  return typeof (def as StrapiModelCollectionAttribute).collection !== 'undefined';
};

export const strapiAttributeIsTyped = (def: StrapiModelAttributeDefinition): def is StrapiModelAttributeTypedDefinition => {
  return typeof (def as StrapiModelAttributeTypedDefinition).type !== 'undefined';
};

export const strapiAttributeIsComponent = (def: StrapiModelAttributeDefinition): def is StrapiModelComponentAttribute => {
  return (def as StrapiModelComponentAttribute).type === 'component';
};


export interface OldStrapiModelDefinitionAttribute {
  unique?: boolean;
  required?: boolean;
  type?: StrapiAttributeType | 'StrapiID';
  default?: string | number | boolean;
  dominant?: boolean;
  collection?: string;
  model?: string;
  via?: string;
  plugin?: string;
  enum?: string[];
  components?: string[];
  component?: string;
  repeatable?: boolean;
  generated?: true | 'optional'
  enumName?: string
}