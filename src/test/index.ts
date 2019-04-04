'use strict'

import dotenv from 'dotenv';
import { expect } from 'code';
import lab from 'lab';
import fixtures from './fixtures.json';
import lollipop, { ParsedMessage } from '../index';

dotenv.config();

const { after, before, experiment, describe, it } = exports.lab = lab.script();

const wait = function (delay: number) {
  return new Promise(resolve => setTimeout(resolve, delay));
}

var lollipopInstance: lollipop;
var context: any = {};

experiment('Lollipop', () => {
  before(async () => {
    lollipopInstance = new lollipop({
      livePreview: process.env.LOLLIPOP_LIVE_PREVIEW === 'true' ? true : false
    });
  });
  describe('lollipopInstance.latest()', () => {
    it('should return null', async () => {
      let parsedMessage = lollipopInstance.latest();
      expect(parsedMessage).to.equal(null);
    });
  });
  describe('lollipopInstance.send(invalidMessage)', () => {
    it('should throw error because payload is invalid', async () => {
      try {
        //@ts-ignore
        let messageId = await lollipopInstance.send({ foo: 'bar' });
        expect(messageId).to.equal(undefined);
      } catch(error) {
        expect(error).to.exist();
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
        expect(messageId).to.equal(undefined);
      } catch(error) {
        expect(error).to.exist();
      }
    });
  });
  describe('lollipopInstance.send(message1)', () => {
    it('should add message 1 to store and return message id', async () => {
      let messageId = await lollipopInstance.send(fixtures.messages[0]);
      expect(messageId).to.match(
        /^[0-9a-f]{8}\-[0-9a-f]{4}\-[0-9a-f]{4}\-[0-9a-f]{4}\-[0-9a-f]{12}$/
      );
      context.message1 = {
        messageId: messageId
      };
    });
  });
  describe('lollipopInstance.latest()', () => {
    it('should return latest message from store using method', async () => {
      let parsedMessage = lollipopInstance.latest();
      expect(parsedMessage.id).to.equal(context.message1.messageId);
    });
  });
  describe('GET /messages/latest', () => {
    it('should return latest message from store using API', async () => {
      let response = await lollipopInstance.hapi.inject({
        method: 'GET',
        url: '/messages/latest'
      });
      expect(response.statusCode).to.equal(200);
      let payload: ParsedMessage = JSON.parse(response.payload);
      expect(payload.id).to.equal(context.message1.messageId);
    });
  });
  describe('lollipopInstance.send(message2)', () => {
    it('should add message 2 to store and return message id', async () => {
      let messageId = await lollipopInstance.send(fixtures.messages[1]);
      expect(messageId).to.match(
        /^[0-9a-f]{8}\-[0-9a-f]{4}\-[0-9a-f]{4}\-[0-9a-f]{4}\-[0-9a-f]{12}$/
      );
      context.message2 = {
        messageId: messageId
      };
    });
  });
  describe('lollipopInstance.latest()', () => {
    it('should return newest latest message from store', async () => {
      let parsedMessage = lollipopInstance.latest();
      expect(parsedMessage.id).to.equal(context.message2.messageId);
    });
  });
  describe('lollipopInstance.message(id)', () => {
    it('should return message matching id from store using method', async () => {
      let parsedMessage = lollipopInstance.message(context.message1.messageId);
      expect(parsedMessage.id).to.equal(context.message1.messageId);
      expect(parsedMessage.from).to.equal(fixtures.messages[0].from);
      expect(parsedMessage.to).to.equal(fixtures.messages[0].to);
      expect(parsedMessage.subject).to.equal(fixtures.messages[0].subject);
      expect(parsedMessage.html).to.equal(fixtures.messages[0].html);
      expect(parsedMessage.$).to.be.a.function();
      expect(parsedMessage.$('a').first().attr('id')).to.equal('test1');
      expect(parsedMessage.links).to.be.an.array();
      expect(parsedMessage.links.length).to.equal(1);
      parsedMessage.links.forEach(function(link) {
        expect(link.href).to.exist();
      });
      expect(parsedMessage.link('hello')).to.equal(null);
      expect(parsedMessage.link('test1')).to.be.an.object();
      expect(parsedMessage.link('test1').id).to.equal('test1');
      expect(parsedMessage.link('test1').query.access_token).to.equal('hello123');
    });
  });
  describe('GET /messages/:messageId', () => {
    it('should return message matching id from store using API', async () => {
      let response = await lollipopInstance.hapi.inject({
        method: 'GET',
        url: `/messages/${context.message1.messageId}`
      });
      expect(response.statusCode).to.equal(200);
      let payload: ParsedMessage = JSON.parse(response.payload);
      expect(payload.id).to.equal(context.message1.messageId);
      expect(payload.from).to.equal(fixtures.messages[0].from);
      expect(payload.to).to.equal(fixtures.messages[0].to);
      expect(payload.subject).to.equal(fixtures.messages[0].subject);
      expect(payload.html).to.equal(fixtures.messages[0].html);
      expect(payload.links).to.be.an.array();
      expect(payload.links.length).to.equal(1);
      payload.links.forEach(function(link) {
        expect(link.href).to.exist();
      });
    });
  });
  after(async () => {
    if (process.env.LOLLIPOP_LIVE_PREVIEW === 'true') {
      await wait(1000);
    }
  });
});
