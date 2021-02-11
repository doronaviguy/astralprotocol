import { Powergate } from './pin/powergate';
import { Document } from './docu/document';
import { IDocumentInfo } from './geo-did/interfaces/global-geo-did-interfaces';
import GeoDIDResolver from './resolver/geo-did-resolver';
import { Resolver, ServiceEndpoint } from 'did-resolver';
import { GeoDidType } from './geo-did/interfaces/global-geo-did-interfaces';

// The Astral API Interface
interface AstralAPI {
    createGenesisGeoDID(_typeOfGeoDID: string): Promise<IDocumentInfo>;
    createChildGeoDID(_typeOfGeoDID: string, _parentID: string, _path: string): Promise<IDocumentInfo>;
    addAssetsToItem(docId: string, assets: IAsset[], token?: string): Promise<IDocumentInfo>;
    loadDocument(docId: string, token: string): Promise<LoadInfo>;
}

interface LoadInfo {
    documentInfo: IDocumentInfo;
    powergateInstance: Powergate 
}

interface DocMap {
    [key: string]: InstanceInfo;
}

interface InstanceInfo {
    authToken: string;
    cid: string;
}

export interface IAsset {
    name: string;
    type: string;
    data: any;
}

export interface IPinInfo {
    geodidid: string;
    cid: string;
    pinDate: Date;
    token: string
}   

class AstralClient implements AstralAPI{
    
    docmap: DocMap;

    document: Document;

    powergate: Powergate;

    constructor(public _ethereumAddress: string) {
        this.document = new Document(_ethereumAddress);
        this.docmap = {};
    }

    async getPowergateInstance(token?: string): Promise<Powergate>{
        let powergate: Powergate;

        if(token){
            powergate = await Powergate.build(token);
        }
        else{
            powergate = await Powergate.build();
        }
        
        return powergate;
    }

    async createGenesisGeoDID(_typeOfGeoDID: string): Promise<IDocumentInfo> {
        let response: IDocumentInfo;
        
        try {
            // prints the geodidid of the genesis geodid
            response = await this.document.addGenesisDocument(_typeOfGeoDID);
        }catch(e){
            console.log("Unable to initialize")
        }

        return response;
    }

    // Option to create Child GeoDID
    async createChildGeoDID(_typeOfGeoDID: string, _parentID: string, _path: string): Promise<IDocumentInfo> {
        let response: IDocumentInfo;
        
        try {
            response = await this.document.addChildDocument(_typeOfGeoDID, _parentID, _path);
        }catch(e){
            console.log("Unable to initialize")
        }

        return response;
    }

    // must call getPowergateInstance before hand, in order to call pinDocument
    async pinDocument(documentInfo: IDocumentInfo, token?: string): Promise<IPinInfo>{
        
        let cid: string;
        let pinDate: Date = new Date();
        let powergate: Powergate;
        
        try{
            if(token){
                powergate = await Powergate.build(token);
            }
            else{
                powergate = await Powergate.build();
            }
            token = await powergate.getToken();
            const stringdoc = JSON.stringify(documentInfo.documentVal);
            console.log(stringdoc) // delete 
            const uint8array = new TextEncoder().encode(stringdoc);
            console.log(uint8array) // delete
            cid = await powergate.getAssetCid(uint8array);
            console.log(cid) // delete 
            await powergate.pin(cid); 

            if(this.docmap[documentInfo.geodidid] === undefined){
                this.docmap[documentInfo.geodidid] = {
                    authToken: token,
                    cid: cid
                }
            }
            else{
                this.updateMapping(documentInfo.geodidid, cid);
            }
            
            console.log(this.docmap[documentInfo.geodidid]); // delete
        }catch(e){
            console.log(e);
        }

        return { geodidid: documentInfo.geodidid, cid: cid, pinDate: pinDate, token: token }
    }

    updateMapping(docId: string, newCID: string): void{
        this.docmap[docId].cid = newCID;
    }

    async pinAsset(docId: string, powergate: Powergate, asset: IAsset): Promise<ServiceEndpoint>{
        let seCID: string;
        
        try{
            const uint8array = new TextEncoder().encode(asset.data);
            seCID = await powergate.getAssetCid(uint8array); 
            await powergate.pin(seCID); 
        }catch(e){
            console.log(e);
        }
        
        return {
            id: docId.concat(asset.name),
            type: asset.type,
            serviceEndpoint: seCID
        }
    }

    // Add Assets to an item. Validation happens
    async addAssetsToItem(docId: string, assets: IAsset[], token?: string): Promise<IDocumentInfo>{
        
        let response: LoadInfo;
        let serviceArray: any;
        
        try{
            response = await this.loadDocument(docId, token);

            if(response.documentInfo.documentVal.didmetadata.type === GeoDidType.Item){
                serviceArray = await assets.map(value => this.pinAsset(docId, response.powergateInstance, value));
                //add the serviceArray to the Document's services
                await serviceArray.forEach((value: any) => (response.documentInfo.documentVal.service).push(value));
            }
            else{
                throw new Error('Unfortunately the Document ID you provided is not of Item type, so you cannot add any Assets to this Document. Please try again with a valid GeoDID Item');
            }

        }catch(e){
            console.log(e);
        }

        return response.documentInfo;
    }

    // TODO: Read/Load a GeoDID Document
    async loadDocument(docId: string, token: string): Promise<LoadInfo> {
        
        let doc: any;
        const powergate: Powergate = await this.getPowergateInstance(token);

        try{
            const geoDidResolver = GeoDIDResolver.getResolver(this, powergate);
            const didResolver = new Resolver(geoDidResolver);
            doc = await didResolver.resolve(docId)
        }catch(e){
            console.log(e)
        }

        return { documentInfo: { geodidid: docId, documentVal: doc }, powergateInstance: powergate };
    }
}

async function runTest(){
    let astral = new AstralClient('0xa3e1c2602f628112E591A18004bbD59BDC3cb512');
    try{
        const res = await astral.createGenesisGeoDID('collection')
        console.log(res);

        const results = await astral.pinDocument(res);
        console.log(results);

        const token = results.token;

        const loadResults = await astral.loadDocument(results.geodidid, token);
        console.log(loadResults);

        console.log('\n');
        console.log('\n');

        const itemres = await astral.createChildGeoDID('item', results.geodidid, 'item1');
        console.log(itemres)

        console.log('\n');

        const itemresults = await astral.pinDocument(itemres, token);
        console.log(itemresults);

        console.log('\n');

        const loadItemResults = await astral.loadDocument(itemresults.geodidid, token);
        console.log(loadItemResults);

        console.log('\n');

        console.log(JSON.stringify(loadItemResults.documentInfo.documentVal));

    }catch(e){
        console.log(e);
    }
}

runTest();

export default AstralClient;
