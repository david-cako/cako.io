export default class AsyncGenerator {
    initial;
    queue;
    done;

    get next() {
        if (this.queue.length === 0) {
            return null;
        }

        return this.queue[this.queue.length - 1];
    }

    constructor(initial = []) {
        this.initial = initial;
        this.queue = [AsyncGenerator.promiseWithResolvers()];
        this.done = AsyncGenerator.promiseWithResolvers();
    }

    async * generator() {
        for (const v of this.initial) {
            yield v;
        }

        let value;
        while ((value = await this.next.promise)) {
            this.queue.pop();
            if (this.queue.length === 0) {
                this.queue.unshift(AsyncGenerator.promiseWithResolvers());
            }

            yield value;
        }

        this.done.resolve();
    }

    resolve(data) {
        const next = this.next;
        if (!next) {
            throw new Error("Resolving zero-length queue!");
        }

        if (next.isResolved) {
            // If next element is resolved and not yet removed, add to queue.
            const p = AsyncGenerator.promiseWithResolvers();
            this.queue.unshift(p);
            p.resolve(data);
        } else {
            next.resolve(data);
        }
    }

    reject(data) {
        const next = this.next;
        if (!next) {
            throw new Error("Rejecting zero-length queue!");
        }

        next.reject(data);
        next.isRejected = true;

        this.done.reject();
    }

    static promiseWithResolvers() {
        let r = {
            promise: undefined,
            resolve: undefined,
            reject: undefined,
            isResolved: false,
            isRejected: false
        }

        r.promise = new Promise((res, rej) => {
            r.resolve = (value) => {
                res(value);
                r.isResolved = true;
            }
            r.reject = (value) => {
                rej(value);
                r.isRejected = true;
            }
        });

        return r
    }
}
