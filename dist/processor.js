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
exports.exec = void 0;
const ts_exporter_1 = require("./ts-exporter");
const importer_1 = require("./importer");
const path = __importStar(require("path"));
const log = console.log;
const logError = console.error;
const exec = (options) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // find *.settings.json
        const files = (yield importer_1.findFilesFromMultipleDirectories(...options.input)).map((filePath) => ({
            path: filePath,
            type: 'api',
            modelName: path.basename(filePath, '.settings.json'),
        }));
        if (options.inputGroup) {
            files.push(...(yield importer_1.findFiles(options.inputGroup, /.json/)).map((filePath) => ({
                path: filePath,
                type: 'component',
                modelName: path.basename(filePath, '.json'),
            })));
        }
        // parse files to object
        const strapiModels = yield importer_1.importFiles(files);
        // build and write .ts
        const count = yield ts_exporter_1.convert(strapiModels, options);
        log(`Generated ${count} interfaces.`);
    }
    catch (e) {
        logError(e);
    }
});
exports.exec = exec;
//# sourceMappingURL=processor.js.map