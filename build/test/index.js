'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const code_1 = require("@hapi/code");
const lab_1 = __importDefault(require("@hapi/lab"));
const fixtures_json_1 = __importDefault(require("./fixtures.json"));
const index_1 = __importStar(require("../index"));
dotenv_1.default.config();
const { after, before, experiment, describe, it } = exports.lab = lab_1.default.script();
const wait = function (delay) {
    return new Promise(resolve => setTimeout(resolve, delay));
};
var lollipopInstance;
var context = {
    messageIds: []
};
experiment('Lollipop', () => {
    before(async () => {
        lollipopInstance = new index_1.default({
            livePreview: process.env.LOLLIPOP_LIVE_PREVIEW === 'true' ? true : false
        });
        await lollipopInstance.init();
    });
    describe('lollipopInstance.latest()', () => {
        it('should return null', async () => {
            let parsedMessage = await lollipopInstance.latest();
            code_1.expect(parsedMessage).to.equal(null);
        });
    });
    describe('lollipopInstance.send(invalidMessage)', () => {
        it('should throw error because payload is invalid', async () => {
            try {
                //@ts-ignore
                let messageId = await lollipopInstance.send({ foo: 'bar' });
                code_1.expect(messageId).to.equal(undefined);
            }
            catch (error) {
                code_1.expect(error).to.exist();
            }
        });
    });
    describe('lollipopInstance.send(invalidMessage)', () => {
        it('should throw error because payload is incomplete', async () => {
            try {
                let messageId = await lollipopInstance.send({
                    //@ts-ignore
                    from: 'steve@example.com'
                });
                code_1.expect(messageId).to.equal(undefined);
            }
            catch (error) {
                code_1.expect(error).to.exist();
            }
        });
    });
    describe('lollipopInstance.send(message1)', () => {
        it('should add message 0 to message store and return its message ID', async () => {
            let messageId = await lollipopInstance.send(fixtures_json_1.default.messages[0]);
            code_1.expect(messageId).to.match(/^[0-9a-f]{32}$/);
            context.messageIds.push(messageId);
        });
    });
    describe('lollipopInstance.latest()', () => {
        it('should return message 0 (latest message) from message store using instance method', async () => {
            let parsedMessage = lollipopInstance.latest();
            code_1.expect(parsedMessage.id).to.equal(context.messageIds[0]);
        });
    });
    describe('GET /messages/latest', () => {
        it('should return message 0 (latest message) from message store using API', async () => {
            let response = await lollipopInstance.hapi.inject({
                method: 'GET',
                url: '/messages/latest'
            });
            code_1.expect(response.statusCode).to.equal(200);
            let payload = JSON.parse(response.payload);
            code_1.expect(payload.id).to.equal(context.messageIds[0]);
            let link = index_1.getLink(payload.links, 'email-confirmation-anchor');
            code_1.expect(link).to.exist();
            code_1.expect(link.query).to.exist();
            code_1.expect(link.query.access_token).to.equal('51819df95b524388a895738dc4280cca');
        });
    });
    describe('lollipopInstance.send(message2)', () => {
        it('should add message 1 to message store and return its message ID', async () => {
            let messageId = await lollipopInstance.send(fixtures_json_1.default.messages[1]);
            code_1.expect(messageId).to.match(/^[0-9a-f]{32}$/);
            context.messageIds.push(messageId);
        });
    });
    describe('lollipopInstance.latest()', () => {
        it('should return message 1 (latest message) from message store using instance method', async () => {
            let parsedMessage = lollipopInstance.latest();
            code_1.expect(parsedMessage.id).to.equal(context.messageIds[1]);
        });
    });
    describe('lollipopInstance.message(id)', () => {
        it('should return message 0 from message store using instance method', async () => {
            let parsedMessage = lollipopInstance.message(context.messageIds[0]);
            code_1.expect(parsedMessage.id).to.equal(context.messageIds[0]);
            code_1.expect(parsedMessage.from).to.equal(fixtures_json_1.default.messages[0].from);
            code_1.expect(parsedMessage.to).to.equal(fixtures_json_1.default.messages[0].to);
            code_1.expect(parsedMessage.subject).to.equal(fixtures_json_1.default.messages[0].subject);
            code_1.expect(parsedMessage.html).to.equal(fixtures_json_1.default.messages[0].html);
            code_1.expect(parsedMessage.$).to.be.a.function();
            code_1.expect(parsedMessage.$('a').first().attr('id')).to.equal('email-confirmation-anchor');
            code_1.expect(parsedMessage.links).to.be.an.array();
            code_1.expect(parsedMessage.links.length).to.equal(1);
            parsedMessage.links.forEach(function (link) {
                code_1.expect(link.href).to.exist();
            });
            code_1.expect(parsedMessage.getLink('hello')).to.equal(null);
            code_1.expect(parsedMessage.getLink('email-confirmation-anchor')).to.be.an.object();
            code_1.expect(parsedMessage.getLink('email-confirmation-anchor').id).to.equal('email-confirmation-anchor');
            code_1.expect(parsedMessage.getLink('email-confirmation-anchor').query.access_token).to.equal('51819df95b524388a895738dc4280cca');
        });
    });
    describe('GET /messages/:messageId', () => {
        it('should return message 0 from message store using API', async () => {
            let response = await lollipopInstance.hapi.inject({
                method: 'GET',
                url: `/messages/${context.messageIds[0]}`
            });
            code_1.expect(response.statusCode).to.equal(200);
            let payload = JSON.parse(response.payload);
            code_1.expect(payload.id).to.equal(context.messageIds[0]);
            code_1.expect(payload.from).to.equal(fixtures_json_1.default.messages[0].from);
            code_1.expect(payload.to).to.equal(fixtures_json_1.default.messages[0].to);
            code_1.expect(payload.subject).to.equal(fixtures_json_1.default.messages[0].subject);
            code_1.expect(payload.html).to.equal(fixtures_json_1.default.messages[0].html);
            code_1.expect(payload.links).to.be.an.array();
            code_1.expect(payload.links.length).to.equal(1);
            payload.links.forEach(function (link) {
                code_1.expect(link.href).to.exist();
            });
        });
    });
    after(async () => {
        if (process.env.LOLLIPOP_LIVE_PREVIEW === 'true') {
            await wait(1000);
        }
    });
});
//# sourceMappingURL=index.js.map