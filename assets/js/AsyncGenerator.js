export default class AsyncGenerator {
    initial;
    queue;

    get next() {
        if (this.queue.length === 0) {
            return null;
        }

        return this.queue[this.queue.length - 1];
    }

    constructor(initial = []) {
        this.initial = initial;
        this.queue.unshift(AsyncGenerator.promiseWithResolvers());
    }

    async * generator() {
        for (const v of this.initial) {
            yield v;
        }

        while ((value = await this.next)) {
            this.queue.pop();
            if (this.queue.length == 0) {
                this.queue.unshift(AsyncGenerator.promiseWithResolvers());
            }

            yield value;
        }
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
            p.isResolved = true;
        } else {
            next.resolve(data);
            next.isResolved = true;
        }
    }

    static promiseWithResolvers() {
        let resolve;
        let reject;
        const p = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });

        return {
            promise: p,
            resolve: r,
            reject: r,
            isResolved: false,
            isRejected: false
        }
    }
}
