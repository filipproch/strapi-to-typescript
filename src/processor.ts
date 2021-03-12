import { convert } from './ts-exporter';
import { IConfigOptions } from '..';
import { findFilesFromMultipleDirectories, importFiles, findFiles } from './importer';

const log = console.log;
const logError = console.error;

export const exec = async (options: IConfigOptions) => {
  try{
    // find *.settings.json
    const files: {path: string, type: 'api'|'component'}[] = (await findFilesFromMultipleDirectories(...options.input)).map((path) => ({
      path,
      type: 'api',
    }));
    if(options.inputGroup) {
      files.push(...(await findFiles(options.inputGroup, /.json/)).map<{path: string, type: 'api'|'component'}>((path) => ({
        path,
        type: 'component',
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
