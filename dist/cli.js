"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandLineInterface = void 0;
const npmPackage = require('../package.json');
const command_line_usage_1 = __importDefault(require("command-line-usage"));
const command_line_args_1 = __importDefault(require("command-line-args"));
const processor_1 = require("./processor");
const path_1 = require("path");
function examplePath() {
    const pathToEx = `${__dirname}/.stsconfig.js`;
    if (pathToEx.startsWith(process.cwd()))
        return pathToEx.replace(process.cwd(), '.');
    return pathToEx;
}
class CommandLineInterface {
}
exports.CommandLineInterface = CommandLineInterface;
CommandLineInterface.optionDefinitions = [
    {
        name: 'help',
        alias: 'h',
        type: Boolean,
        typeLabel: '{underline Boolean}',
        description: 'Show help text.',
    },
    {
        name: 'input',
        alias: 'i',
        type: String,
        multiple: true,
        typeLabel: '{underline String}',
        defaultOption: true,
        description: 'Input folder with the Strapi models (api folder).',
    },
    {
        name: 'inputGroup',
        alias: 'g',
        type: String,
        typeLabel: '{underline String}',
        description: 'Input folder with the Strapi models (groups/components folder).'
    },
    {
        name: 'output',
        alias: 'o',
        type: String,
        typeLabel: '{underline String}',
        defaultValue: '.',
        description: 'Output folder with the TypeScript models. (default: current directory)',
    },
    {
        name: 'config',
        alias: 'c',
        type: String,
        typeLabel: '{underline String}',
        description: 'Advanced configuration file.',
    },
    {
        name: 'nested',
        alias: 'n',
        type: Boolean,
        typeLabel: '{underline Boolean}',
        defaultValue: false,
        description: 'If true, add each interface in its own folder.',
    },
    {
        name: 'enum',
        alias: 'e',
        type: Boolean,
        typeLabel: '{underline Boolean}',
        defaultValue: false,
        description: 'If true, Enumeration is generate, else string literal types is used',
    },
    {
        name: 'collectionCanBeUndefined',
        alias: 'u',
        type: Boolean,
        typeLabel: '{underline Boolean}',
        defaultValue: false,
        description: 'If true, collection can be undefined',
    },
];
CommandLineInterface.sections = [
    {
        header: `${npmPackage.name.toUpperCase()}, v${npmPackage.version}`,
        content: `${npmPackage.license} license.

    ${npmPackage.description}

    Usage: sts ([OPTION]...) [INPUT FOLDER]...
    `,
    },
    {
        header: 'Options',
        optionList: CommandLineInterface.optionDefinitions,
    },
    {
        header: 'Examples',
        content: [
            {
                desc: '01. Convert the Strapi API folder and write the results to current folder.',
                example: '$ sts ./api',
            },
            {
                desc: '02. Convert the Strapi API folder and write the results to output folder.',
                example: '$ sts ./api -o ./sts',
            },
            {
                desc: '03. Add each interface to its own folder.',
                example: '$ sts ./api -o ./sts -n',
            },
            {
                desc: '04. Define multiple input folders.',
                example: '$ sts ./api ./node_modules/strapi-plugin-users-permissions/models/ ./node_modules/strapi-plugin-upload/models/',
            },
            {
                desc: `05. Use advanced configuration. See example: ${examplePath()}`,
                example: '$ sts -c ./stsconfig.js',
            }
        ],
    },
];
const options = command_line_args_1.default(CommandLineInterface.optionDefinitions);
const usage = command_line_usage_1.default(CommandLineInterface.sections);
const log = console.log;
const warn = (...x) => {
    log(usage);
    console.warn('\x1b[31m%s\x1b[0m', ...x);
    process.exit(1);
};
if (options.help) {
    log(usage);
    process.exit(0);
}
else {
    // if arg config file, merge command line options with config file options
    const mergedOptions = (options.config) ? Object.assign(Object.assign({}, options), require(path_1.resolve(process.cwd(), options.config))) : options;
    if (!mergedOptions.input) {
        warn('need input folder');
    }
    else if ('inputGroup' in mergedOptions && !mergedOptions.inputGroup) {
        warn('option -g need argument');
    }
    else {
        processor_1.exec(mergedOptions);
    }
}
//# sourceMappingURL=cli.js.map