'use strict'

import dotenv from 'dotenv';
import { expect } from 'code';
import lab from 'lab';
import fixtures from './fixtures.json';
import lollipop from '../index';

dotenv.config();

const lollipopInstance = new lollipop();

const { experiment, before, describe, it } = exports.lab = lab.script();

var context: any = {};

experiment('Lollipop', () => {
  describe('lollipopInstance.latest()', () => {
    it('should return null', async () => {
      let message = lollipopInstance.latest();
      expect(message).to.equal(null);
    });
  });
  describe('lollipopInstance.send(invalidMessage)', () => {
    it('should throw error', async () => {
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
    it('should throw error', async () => {
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
    it('should add message to store and return message id', async () => {
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
    it('should return latest message from store', async () => {
      let message = lollipopInstance.latest();
      expect(message.id).to.equal(context.message1.messageId);
    });
  });
  describe('lollipopInstance.send(message2)', () => {
    it('should add message to store and return message id', async () => {
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
    it('should return latest message from store', async () => {
      let message = lollipopInstance.latest();
      expect(message.id).to.equal(context.message2.messageId);
    });
  });
  describe('lollipopInstance.message(id)', () => {
    it('should return message matching id from store', async () => {
      let message = lollipopInstance.message(context.message1.messageId);
      expect(message.id).to.equal(context.message1.messageId);
      expect(message.from).to.equal(fixtures.messages[0].from);
      expect(message.to).to.equal(fixtures.messages[0].to);
      expect(message.subject).to.equal(fixtures.messages[0].subject);
      expect(message.html).to.equal(fixtures.messages[0].html);
      expect(message.$).to.be.a.function();
      expect(message.$('a').first().attr('id')).to.equal('test1');
      expect(message.links).to.be.an.array();
      expect(message.links.length).to.equal(1);
      message.links.forEach(function(link) {
        expect(link.href).to.exist();
      });
      expect(message.link('hello')).to.equal(null);
      expect(message.link('test1')).to.be.an.object();
      expect(message.link('test1').id).to.equal('test1');
      expect(message.link('test1').query.access_token).to.equal('hello123');
    });
  });
});
