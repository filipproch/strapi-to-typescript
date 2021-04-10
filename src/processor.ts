import { convert } from './ts-exporter';
import { IConfigOptions } from '..';
import { findFilesFromMultipleDirectories, importFiles, findFiles } from './importer';
import { StrapiFile } from './models/strapi-model';
import * as path from 'path';

const log = console.log;
const logError = console.error;

export const exec = async (options: IConfigOptions) => {
  try{
    // find *.settings.json
    const files: StrapiFile[] = (await findFilesFromMultipleDirectories(...options.input)).map((filePath) => ({
      path: filePath,
      type: 'api',
      modelName: path.basename(filePath, '.settings.json').toLowerCase(),
    }));
    if(options.inputGroup) {
      files.push(...(await findFiles(options.inputGroup, /.json/)).map<StrapiFile>((filePath) => ({
        path: filePath,
        type: 'component',
        categoryName: path.basename(path.dirname(filePath)),
        modelName: path.basename(filePath, '.json').toLowerCase(),
      })));
    }

    // parse files to object
    const strapiModels = await importFiles(files);

    // build and write .ts
    const count = await convert(strapiModels, options);

    log(`Generated ${count} interfaces.`);
  } catch (e){
    logError(e)
  }
};

