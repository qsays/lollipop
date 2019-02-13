'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const get_port_1 = __importDefault(require("get-port"));
const hapi_1 = __importDefault(require("hapi"));
const inert_1 = __importDefault(require("inert"));
const joi_1 = __importDefault(require("joi"));
const handlebars_1 = __importDefault(require("handlebars"));
const uuid_1 = require("uuid");
const opn_1 = __importDefault(require("opn"));
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
class Lollipop {
    async init() {
        let port = await get_port_1.default({
            port: parseInt(process.env.LOLLIPOP_PORT)
        });
        this.hapi = new hapi_1.default.Server({
            port: port,
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
                path: '/preview/{messageId}',
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
    constructor(options) {
        if (options && options.livePreview) {
            this.livePreview = options.livePreview;
        }
        else {
            this.livePreview = false;
        }
        this.store = [];
        this.init();
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
            link: function (id) {
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
        let { error } = joi_1.default.validate(message, messageSchema);
        if (error) {
            throw error;
        }
        else {
            let storedMessage = Object.assign(message, {
                id: uuid_1.v4()
            });
            this.store.push(storedMessage);
            if (this.livePreview === true) {
                opn_1.default(`${this.hapi.info.uri}/preview/${storedMessage.id}`);
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