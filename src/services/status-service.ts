export class StatusService {
    private _status = "";
    private readonly eventTarget = new EventTarget();
    
    get status(): string {
        return this._status;
    }

    set status(value: string) {
        this._status = value;
        this.eventTarget.dispatchEvent(new Event("statuschanged"));
    }

    addEventListener(type: "statuschanged", listener: EventListenerOrEventListenerObject | null): void {
        this.eventTarget.addEventListener(type, listener);
    }
}

export const statusService = new StatusService();