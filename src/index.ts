'use strict';

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import getPort from 'get-port';
import hapi from 'hapi';
import inert from 'inert';
import joi from 'joi';
import boom from 'boom';
import handlebars from 'handlebars';
import { v4 as uuidv4 } from 'uuid';
import opn from 'opn';
import cheerio from 'cheerio';
import queryString from 'query-string';

dotenv.config();

interface Contact {
  email: string;
  name?: string;
}

export interface Message {
  from: Contact;
  to: Contact;
  subject: string;
  html: string;
}

interface StoredMessage extends Message {
  id: string;
}

interface Link {
  id?: string;
  href: string;
  query?: any;
}

export interface ParsedMessage extends StoredMessage {
  $: CheerioStatic;
  links: Link[];
  link: (id: string) => null | Link
}

type Store = StoredMessage[];

interface LollipopOptions {
  livePreview: boolean;
}

const contactSchema = joi.object().keys({
  email: joi.string().email().required(),
  name: joi.string().optional()
});

const messageSchema = joi.object().keys({
  from: contactSchema.required(),
  to: contactSchema.required(),
  subject: joi.string().required(),
  html: joi.string().required(),
});

const readPreviewTemplate = function(): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readFile(path.join(__dirname, '../preview.hbs'), function(error, data) {
      if (error) {
        reject(error);
      } else {
        resolve(data.toString());
      }
    });
  });
}

export default class Lollipop {
  public port: number;
  public hapi: hapi.Server;
  private template: string;
  private livePreview: boolean;
  private store: Store;
  private async init() {
    this.port = await getPort({
      port: parseInt(process.env.LOLLIPOP_PORT)
    });
    this.hapi = new hapi.Server({
      port: this.port,
      host: 'localhost',
      routes: {
        files: {
          relativeTo: path.join(__dirname, '../public')
        }
      },
      debug: false
    });
    this.template = await readPreviewTemplate();
    await this.hapi.register({ plugin: inert });
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
        handler: async (request:hapi.Request, h:hapi.ResponseToolkit) => {
          try {
            let parsedMessage = this.latest();
            if (parsedMessage) {
              return parsedMessage;
            } else {
              boom.notFound();
            }
          } catch(error) {
            boom.badImplementation(error);
          }
        }
      },
      {
        method: 'GET',
        path: '/messages/{messageId}',
        handler: async (request:hapi.Request, h:hapi.ResponseToolkit) => {
          try {
            let parsedMessage = this.message(request.params.messageId);
            if (parsedMessage) {
              return parsedMessage;
            } else {
              boom.notFound();
            }
          } catch(error) {
            boom.badImplementation(error);
          }
        }
      },
      {
        method: 'GET',
        path: '/previews/{messageId}',
        handler: async (request:hapi.Request, h:hapi.ResponseToolkit) => {
          let message = this.message(request.params.messageId);
          let templateDeletage = handlebars.compile(this.template);
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
  constructor(options?: LollipopOptions) {
    if (options && options.livePreview) {
      this.livePreview = options.livePreview;
    } else {
      this.livePreview = false;
    }
    this.store = [];
    this.init();
  }
  private parse(storedMessage: StoredMessage): ParsedMessage {
    let $ = cheerio.load(storedMessage.html);
    let links: ParsedMessage['links'] = [];
    $('a').each(function(index, link) {
      let query;
      if (link.attribs.href.match(/\?/)) {
        query = queryString.parse(link.attribs.href.split('?')[1]);
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
      link: function(id: string) {
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
  public async send(message: Message): Promise<StoredMessage['id']> {
    let { error } = joi.validate(message, messageSchema);
    if (error) {
      throw error
    } else {
      let storedMessage: StoredMessage = Object.assign(message, {
        id: uuidv4()
      });
      this.store.push(storedMessage);
      if (this.livePreview === true) {
        opn(`${this.hapi.info.uri}/previews/${storedMessage.id}`);
      }
      return storedMessage.id;
    }
  }
  public latest(): null | ParsedMessage {
    if (this.store.length === 0) {
      return null;
    } else {
      return this.parse(this.store[this.store.length - 1]);
    }
  }
  public message(id: string): null | ParsedMessage {
    for (let index = this.store.length; index--;)  {
      let storedMessage = this.store[index];
      if (storedMessage.id === id) {
        return this.parse(storedMessage);
      }
    }
    return null;
  }
}
