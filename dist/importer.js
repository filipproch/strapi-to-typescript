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
exports.importFiles = exports.findFilesFromMultipleDirectories = exports.findFiles = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Recursively walk a directory asynchronously and obtain all file names (with full path).
 *
 * @param dir Folder name you want to recursively process
 * @param done Callback function to return the results when the processing is done. Returns all files with full path.
 * @param filter Optional filter to specify which files to include, e.g. for json files: (f: string) => /.json$/.test(f)
 */
const walk = (dir, done, filter) => {
    let foundFiles = [];
    fs.readdir(dir, (err, list) => {
        if (err) {
            return done(err);
        }
        let pending = list.length;
        if (!pending) {
            return done(null, foundFiles);
        }
        list.forEach((file) => {
            file = path.resolve(dir, file);
            // tslint:disable-next-line:variable-name
            fs.stat(file, (_err2, stat) => {
                if (stat && stat.isDirectory()) {
                    walk(file, 
                    // tslint:disable-next-line:variable-name
                    (_err3, res) => {
                        if (res) {
                            foundFiles = foundFiles.concat(res);
                        }
                        if (!--pending) {
                            done(null, foundFiles);
                        }
                    }, filter);
                }
                else {
                    if (typeof filter === 'undefined' || (filter && filter(file))) {
                        foundFiles.push(file);
                    }
                    if (!--pending) {
                        done(null, foundFiles);
                    }
                }
            });
        });
    });
};
const findFiles = (dir, ext = /.settings.json$/) => new Promise((resolve, reject) => {
    const filter = (f) => ext.test(f);
    walk(dir, (err, files) => {
        if (err) {
            reject(err);
        }
        else if (files) {
            resolve(files);
        }
    }, filter);
});
exports.findFiles = findFiles;
/**
 * Wrapper around "findFiles".
 *
 */
function findFilesFromMultipleDirectories(...files) {
    return __awaiter(this, void 0, void 0, function* () {
        const inputs = [...new Set(files)];
        var actions = inputs.map(i => exports.findFiles(i)); // run the function over all items
        // we now have a promises array and we want to wait for it
        var results = yield Promise.all(actions); // pass array of promises
        // flatten
        return (new Array()).concat.apply([], results);
    });
}
exports.findFilesFromMultipleDirectories = findFilesFromMultipleDirectories;
/*
 */
const importFiles = (files) => new Promise((resolve, reject) => {
    let pending = files.length;
    const results = [];
    files.forEach(f => fs.readFile(f.path, { encoding: 'utf8' }, (err, data) => {
        if (err)
            reject(err);
        pending--;
        const strapiDef = Object.assign(JSON.parse(data));
        results.push({
            file: f,
            definition: strapiDef,
        });
        if (pending === 0) {
            resolve(results);
        }
    }));
});
exports.importFiles = importFiles;
//# sourceMappingURL=importer.js.map