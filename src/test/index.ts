'use strict'

import dotenv from 'dotenv';
import { expect } from '@hapi/code';
import lab from '@hapi/lab';
import fixtures from './fixtures.json';
import lollipop, { getLink, ParsedMessage } from '../index';

dotenv.config();

const { after, before, experiment, describe, it } = exports.lab = lab.script();

const wait = function (delay: number) {
  return new Promise(resolve => setTimeout(resolve, delay));
}

interface context {
  messageIds: string[];
}

var lollipopInstance: lollipop;
var context: context = {
  messageIds: []
};

experiment('Lollipop', () => {
  before(async () => {
    lollipopInstance = new lollipop({
      livePreview: process.env.LOLLIPOP_LIVE_PREVIEW === 'true' ? true : false
    });
    await lollipopInstance.init();
  });
  describe('lollipopInstance.latest()', () => {
    it('should return null', async () => {
      let parsedMessage = await lollipopInstance.latest();
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
    it('should add message 0 to message store and return its message ID', async () => {
      let messageId = await lollipopInstance.send(fixtures.messages[0]);
      expect(messageId).to.match(
        /^[0-9a-f]{32}$/
      );
      context.messageIds.push(messageId);
    });
  });
  describe('lollipopInstance.latest()', () => {
    it('should return message 0 (latest message) from message store using instance method', async () => {
      let parsedMessage = lollipopInstance.latest();
      expect(parsedMessage.id).to.equal(context.messageIds[0]);
    });
  });
  describe('GET /messages/latest', () => {
    it('should return message 0 (latest message) from message store using API', async () => {
      let response = await lollipopInstance.hapi.inject({
        method: 'GET',
        url: '/messages/latest'
      });
      expect(response.statusCode).to.equal(200);
      let payload: ParsedMessage = JSON.parse(response.payload);
      expect(payload.id).to.equal(context.messageIds[0]);
      let link = getLink(payload.links, 'email-confirmation-anchor');
      expect(link).to.exist();
      expect(link.query).to.exist();
      expect(link.query.access_token).to.equal('51819df95b524388a895738dc4280cca');
    });
  });
  describe('lollipopInstance.send(message2)', () => {
    it('should add message 1 to message store and return its message ID', async () => {
      let messageId = await lollipopInstance.send(fixtures.messages[1]);
      expect(messageId).to.match(
        /^[0-9a-f]{32}$/
      );
      context.messageIds.push(messageId);
    });
  });
  describe('lollipopInstance.latest()', () => {
    it('should return message 1 (latest message) from message store using instance method', async () => {
      let parsedMessage = lollipopInstance.latest();
      expect(parsedMessage.id).to.equal(context.messageIds[1]);
    });
  });
  describe('lollipopInstance.message(id)', () => {
    it('should return message 0 from message store using instance method', async () => {
      let parsedMessage = lollipopInstance.message(context.messageIds[0]);
      expect(parsedMessage.id).to.equal(context.messageIds[0]);
      expect(parsedMessage.from).to.equal(fixtures.messages[0].from);
      expect(parsedMessage.to).to.equal(fixtures.messages[0].to);
      expect(parsedMessage.subject).to.equal(fixtures.messages[0].subject);
      expect(parsedMessage.html).to.equal(fixtures.messages[0].html);
      expect(parsedMessage.$).to.be.a.function();
      expect(parsedMessage.$('a').first().attr('id')).to.equal('email-confirmation-anchor');
      expect(parsedMessage.links).to.be.an.array();
      expect(parsedMessage.links.length).to.equal(1);
      parsedMessage.links.forEach(function(link) {
        expect(link.href).to.exist();
      });
      expect(parsedMessage.getLink('hello')).to.equal(null);
      expect(parsedMessage.getLink('email-confirmation-anchor')).to.be.an.object();
      expect(parsedMessage.getLink('email-confirmation-anchor').id).to.equal('email-confirmation-anchor');
      expect(parsedMessage.getLink('email-confirmation-anchor').query.access_token).to.equal('51819df95b524388a895738dc4280cca');
    });
  });
  describe('GET /messages/:messageId', () => {
    it('should return message 0 from message store using API', async () => {
      let response = await lollipopInstance.hapi.inject({
        method: 'GET',
        url: `/messages/${context.messageIds[0]}`
      });
      expect(response.statusCode).to.equal(200);
      let payload: ParsedMessage = JSON.parse(response.payload);
      expect(payload.id).to.equal(context.messageIds[0]);
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
