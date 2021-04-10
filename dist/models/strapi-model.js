"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strapiAttributeIsComponent = exports.strapiAttributeIsTyped = exports.strapiAttributeIsCollection = exports.strapiAttributeIsModel = void 0;
const strapiAttributeIsModel = (def) => {
    return typeof def.model !== 'undefined';
};
exports.strapiAttributeIsModel = strapiAttributeIsModel;
const strapiAttributeIsCollection = (def) => {
    return typeof def.collection !== 'undefined';
};
exports.strapiAttributeIsCollection = strapiAttributeIsCollection;
const strapiAttributeIsTyped = (def) => {
    return typeof def.type !== 'undefined';
};
exports.strapiAttributeIsTyped = strapiAttributeIsTyped;
const strapiAttributeIsComponent = (def) => {
    return def.type === 'component';
};
exports.strapiAttributeIsComponent = strapiAttributeIsComponent;
//# sourceMappingURL=strapi-model.js.map