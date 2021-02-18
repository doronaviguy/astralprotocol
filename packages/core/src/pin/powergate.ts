import { Pow, createPow, powTypes } from '@textile/powergate-client';
import CID from 'cids';

export interface Pinning {
    open(): Promise<void>;
    close(): Promise<void>;
    pin(cid: string): Promise<void>;
    //unpin(cid: CID): Promise<void>;
}

export enum JobStatus {
    JOB_STATUS_UNSPECIFIED = 0,
    JOB_STATUS_QUEUED = 1,
    JOB_STATUS_EXECUTING = 2,
    JOB_STATUS_FAILED = 3,
    JOB_STATUS_CANCELED = 4,
    JOB_STATUS_SUCCESS = 5,
}

// create powergate instance
export class Powergate implements Pinning {
    readonly endpoint?: string;

    // Readonly properties must be initialized at their declaration or in the constructor.
    constructor(private _host: string, private _pow: Pow, private _token?: string) {
        console.log('The Auth Token value is: ' + _token);
    }

    static async build(tokenval?: string): Promise<Powergate> {
        const host: string = "http://0.0.0.0:6002"
        //const host = 'http://40.114.81.87:6002';
        const pow: Pow = createPow({ host });
        if (tokenval) {
            pow.setAdminToken(tokenval);
            pow.setToken(tokenval);
        } else {
            try {
                const { user } = await pow.admin.users.create() // save this token for later use!
                tokenval = user?.token;
                pow.setAdminToken(user?.token);
                pow.setToken(user?.token);
            } catch (err) {
                console.log(err);
            }
        }

        return new Powergate(host, pow, tokenval);
    }

    get pow() {
        return this._pow;
    }

    async open(): Promise<void> {
        this._pow = createPow({ host: this._host });
        if (this._token) {
            this._pow.setAdminToken(this._token);
            this._pow.setToken(this._token);
        }
    }

    async getToken(): Promise<any> {
        return this._token;
    }

    async close(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    async getAssetCid(buffer: any): Promise<string> {
        const { cid } = await this._pow.data.stage(buffer)
        return cid;
    }

    async getGeoDIDDocument(cid: string): Promise<Uint8Array> {
        const bytes = await this._pow.data.get(cid)
        return bytes;
    }

    async pin(cid: string): Promise<void> {
        try {
            const { jobId } = await this._pow.storageConfig.apply(cid)
            //this.waitForJobStatus(jobId);
        } catch (e) {
            if (e.message.includes('cid already pinned, consider using override flag')) {
                // Do Nothing
            } else {
                throw e;
            }
        }
    }

    protected waitForJobStatus(
        jobId: string
    ): Promise<void> {
        return new Promise<void>((resolve, reject) => {

            const jobsCancel = this._pow.storageJobs.watch((job: any) => {
                if (job.status === powTypes.JobStatus.JOB_STATUS_CANCELED) {
                  console.log("job canceled")
                } else if (job.status === powTypes.JobStatus.JOB_STATUS_FAILED) {
                  console.log("job failed")
                } else if (job.status === powTypes.JobStatus.JOB_STATUS_SUCCESS) {
                  console.log("job success!")
                }
              }, jobId)
        });
    }
}