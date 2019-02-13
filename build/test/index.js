'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const code_1 = require("code");
const lab_1 = __importDefault(require("lab"));
const fixtures_json_1 = __importDefault(require("./fixtures.json"));
const index_1 = __importDefault(require("../index"));
dotenv_1.default.config();
const lollipopInstance = new index_1.default();
const { experiment, before, describe, it } = exports.lab = lab_1.default.script();
var context = {};
experiment('Lollipop', () => {
    describe('lollipopInstance.latest()', () => {
        it('should return null', async () => {
            let message = lollipopInstance.latest();
            code_1.expect(message).to.equal(null);
        });
    });
    describe('lollipopInstance.send(invalidMessage)', () => {
        it('should throw error', async () => {
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
        it('should throw error', async () => {
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
        it('should add message to store and return message id', async () => {
            let messageId = await lollipopInstance.send(fixtures_json_1.default.messages[0]);
            code_1.expect(messageId).to.match(/^[0-9a-f]{8}\-[0-9a-f]{4}\-[0-9a-f]{4}\-[0-9a-f]{4}\-[0-9a-f]{12}$/);
            context.message1 = {
                messageId: messageId
            };
        });
    });
    describe('lollipopInstance.latest()', () => {
        it('should return latest message from store', async () => {
            let message = lollipopInstance.latest();
            code_1.expect(message.id).to.equal(context.message1.messageId);
        });
    });
    describe('lollipopInstance.send(message2)', () => {
        it('should add message to store and return message id', async () => {
            let messageId = await lollipopInstance.send(fixtures_json_1.default.messages[1]);
            code_1.expect(messageId).to.match(/^[0-9a-f]{8}\-[0-9a-f]{4}\-[0-9a-f]{4}\-[0-9a-f]{4}\-[0-9a-f]{12}$/);
            context.message2 = {
                messageId: messageId
            };
        });
    });
    describe('lollipopInstance.latest()', () => {
        it('should return latest message from store', async () => {
            let message = lollipopInstance.latest();
            code_1.expect(message.id).to.equal(context.message2.messageId);
        });
    });
    describe('lollipopInstance.message(id)', () => {
        it('should return message matching id from store', async () => {
            let message = lollipopInstance.message(context.message1.messageId);
            code_1.expect(message.id).to.equal(context.message1.messageId);
            code_1.expect(message.from).to.equal(fixtures_json_1.default.messages[0].from);
            code_1.expect(message.to).to.equal(fixtures_json_1.default.messages[0].to);
            code_1.expect(message.subject).to.equal(fixtures_json_1.default.messages[0].subject);
            code_1.expect(message.html).to.equal(fixtures_json_1.default.messages[0].html);
            code_1.expect(message.$).to.be.a.function();
            code_1.expect(message.$('a').first().attr('id')).to.equal('test1');
            code_1.expect(message.links).to.be.an.array();
            code_1.expect(message.links.length).to.equal(1);
            message.links.forEach(function (link) {
                code_1.expect(link.href).to.exist();
            });
            code_1.expect(message.link('hello')).to.equal(null);
            code_1.expect(message.link('test1')).to.be.an.object();
            code_1.expect(message.link('test1').id).to.equal('test1');
            code_1.expect(message.link('test1').query.access_token).to.equal('hello123');
        });
    });
});
//# sourceMappingURL=index.js.map