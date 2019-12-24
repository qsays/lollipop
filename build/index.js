'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const get_port_1 = __importDefault(require("get-port"));
const hapi_1 = __importDefault(require("@hapi/hapi"));
const inert_1 = __importDefault(require("@hapi/inert"));
const joi_1 = __importDefault(require("@hapi/joi"));
const boom_1 = __importDefault(require("@hapi/boom"));
const handlebars_1 = __importDefault(require("handlebars"));
const uuid_1 = require("uuid");
const open_1 = __importDefault(require("open"));
const cheerio_1 = __importDefault(require("cheerio"));
const query_string_1 = __importDefault(require("query-string"));
dotenv_1.default.config();
const contactSchema = joi_1.default.object().keys({
    email: joi_1.default.string().email().required(),
    name: joi_1.default.string().optional()
});
const messageSchema = joi_1.default.object().keys({
    from: contactSchema.required(),
    to: contactSchema.required(),
    subject: joi_1.default.string().required(),
    html: joi_1.default.string().required(),
});
const readPreviewTemplate = function () {
    return new Promise((resolve, reject) => {
        fs_1.default.readFile(path_1.default.join(__dirname, '../preview.hbs'), function (error, data) {
            if (error) {
                reject(error);
            }
            else {
                resolve(data.toString());
            }
        });
    });
};
exports.getLink = function (links, id) {
    for (let index = links.length; index--;) {
        let link = links[index];
        if (link.id === id) {
            return link;
        }
    }
    return null;
};
class Lollipop {
    constructor(options) {
        if (options && options.livePreview) {
            this.livePreview = options.livePreview;
        }
        else {
            this.livePreview = false;
        }
        this.store = [];
    }
    async init() {
        let port = null;
        if (process.env.LOLLIPOP_PORT) {
            let lollipopPort = parseInt(process.env.LOLLIPOP_PORT);
            if (lollipopPort > 0 && lollipopPort <= 65535) {
                port = lollipopPort;
            }
            else {
                throw new Error('Invalid LOLLIPOP_PORT');
            }
        }
        this.port = await get_port_1.default({
            port: port
        });
        this.hapi = new hapi_1.default.Server({
            port: this.port,
            host: 'localhost',
            routes: {
                files: {
                    relativeTo: path_1.default.join(__dirname, '../public')
                }
            },
            debug: false
        });
        this.template = await readPreviewTemplate();
        await this.hapi.register({ plugin: inert_1.default });
        this.hapi.route([
            {
                method: 'GET',
                path: '/{param*}',
                handler: {
                    directory: {
                        path: './',
                        index: false
                    }
                }
            },
            {
                method: 'GET',
                path: '/messages/latest',
                handler: async (request, h) => {
                    try {
                        let parsedMessage = this.latest();
                        if (parsedMessage) {
                            return parsedMessage;
                        }
                        else {
                            boom_1.default.notFound();
                        }
                    }
                    catch (error) {
                        boom_1.default.badImplementation(error);
                    }
                }
            },
            {
                method: 'GET',
                path: '/messages/{messageId}',
                handler: async (request, h) => {
                    try {
                        let parsedMessage = this.message(request.params.messageId);
                        if (parsedMessage) {
                            return parsedMessage;
                        }
                        else {
                            boom_1.default.notFound();
                        }
                    }
                    catch (error) {
                        boom_1.default.badImplementation(error);
                    }
                }
            },
            {
                method: 'GET',
                path: '/previews/{messageId}',
                handler: async (request, h) => {
                    let message = this.message(request.params.messageId);
                    let templateDeletage = handlebars_1.default.compile(this.template);
                    return templateDeletage({
                        base: this.hapi.info.uri,
                        message: message
                    });
                }
            }
        ]);
        await this.hapi.start();
        if (process.env.DEBUG === 'true') {
            console.log(`Lollipop running at: ${this.hapi.info.uri}`);
        }
    }
    parse(storedMessage) {
        let $ = cheerio_1.default.load(storedMessage.html);
        let links = [];
        $('a').each(function (index, link) {
            let query;
            if (link.attribs.href.match(/\?/)) {
                query = query_string_1.default.parse(link.attribs.href.split('?')[1]);
            }
            links.push({
                id: link.attribs.id,
                href: link.attribs.href,
                query: query
            });
        });
        let parsedMessage = Object.assign(storedMessage, {
            $: $,
            links: links,
            getLink: function (id) {
                for (let index = links.length; index--;) {
                    let link = links[index];
                    if (link.id === id) {
                        return link;
                    }
                }
                return null;
            }
        });
        return parsedMessage;
    }
    async send(message) {
        let { error } = messageSchema.validate(message);
        if (error) {
            throw error;
        }
        else {
            let storedMessage = Object.assign(message, {
                id: uuid_1.v4().replace(/-/g, '')
            });
            this.store.push(storedMessage);
            if (this.livePreview === true) {
                open_1.default(`${this.hapi.info.uri}/previews/${storedMessage.id}`, {
                    background: true
                });
            }
            return storedMessage.id;
        }
    }
    latest() {
        if (this.store.length === 0) {
            return null;
        }
        else {
            return this.parse(this.store[this.store.length - 1]);
        }
    }
    message(id) {
        for (let index = this.store.length; index--;) {
            let storedMessage = this.store[index];
            if (storedMessage.id === id) {
                return this.parse(storedMessage);
            }
        }
        return null;
    }
}
exports.default = Lollipop;
//# sourceMappingURL=index.js.map