import { ConcreteDefaultGeoDIDCollection } from '../default/geo-did-default-collection';
import { ConcreteDefaultGeoDIDItem } from '../default/geo-did-default-item';
import { ConcreteDefaultGeoDIDDocument } from '../default/geo-did-default-document';

export interface IAbstractGeoDIDFactory {
    createGeoDIDDocument<T>(c: {new (): T}): Promise<T>;
}

// Acts as a Node 
export interface IAbstractGeoDIDDocument {
    label: string;
    geoDIDid: string;
    prepRootGeoDID(ethAddress: string): void;
    prepChildGeoDID(ethAddress: string, parentid: string, path: string): void;
    getGeoDIDid(): string;
    getDidDocument(): string;
}

export type GeoDID = ConcreteDefaultGeoDIDDocument | ConcreteDefaultGeoDIDCollection | ConcreteDefaultGeoDIDItem;