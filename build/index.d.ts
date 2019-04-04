/// <reference types="cheerio" />
import hapi from 'hapi';
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
    link: (id: string) => null | Link;
}
interface LollipopOptions {
    livePreview: boolean;
}
export default class Lollipop {
    port: number;
    hapi: hapi.Server;
    private template;
    private livePreview;
    private store;
    private init;
    constructor(options?: LollipopOptions);
    private parse;
    send(message: Message): Promise<StoredMessage['id']>;
    latest(): null | ParsedMessage;
    message(id: string): null | ParsedMessage;
}
export {};
