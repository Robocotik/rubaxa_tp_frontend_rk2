const PROMISE_STATES = Object.freeze({
  PENDING: 1,
  FULFILLED: 2,
  REJECTED: 3,
});

export class SashaPromise {
  constructor(executor) {
    if (typeof executor !== 'function') {
      throw new TypeError('Executor must be a function');
    }

    this.state = PROMISE_STATES.PENDING;
    this.value = undefined;
    this.reason = undefined;
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];

    const resolve = value => {
      if (this.state !== PROMISE_STATES.PENDING) return;

      if (value instanceof SashaPromise) {
        value.then(resolve, reject);
        return;
      }

      this.state = PROMISE_STATES.FULFILLED;
      this.value = value;
      this.onFulfilledCallbacks.forEach(fn => fn());
    };

    const reject = reason => {
      if (this.state !== PROMISE_STATES.PENDING) return;
      this.state = PROMISE_STATES.REJECTED;
      this.reason = reason;
      this.onRejectedCallbacks.forEach(fn => fn());
    };

    try {
      executor(resolve, reject);
    } catch (e) {
      reject(e);
    }
  }

  then(onFulfilled, onRejected) {
    return new SashaPromise((resolve, reject) => {
      const handleFulfilled = () => {
        try {
          if (typeof onFulfilled !== 'function') {
            resolve(this.value);
          } else {
            const result = onFulfilled(this.value);
            resolve(result);
          }
        } catch (e) {
          reject(e);
        }
      };

      const handleRejected = () => {
        try {
          if (typeof onRejected !== 'function') {
            reject(this.reason);
          } else {
            const result = onRejected(this.reason);
            resolve(result);
          }
        } catch (e) {
          reject(e);
        }
      };

      if (this.state === PROMISE_STATES.FULFILLED) {
        queueMicrotask(handleFulfilled);
      } else if (this.state === PROMISE_STATES.REJECTED) {
        queueMicrotask(handleRejected);
      } else {
        this.onFulfilledCallbacks.push(() => queueMicrotask(handleFulfilled));
        this.onRejectedCallbacks.push(() => queueMicrotask(handleRejected));
      }
    });
  }

  catch(onRejected) {
    return this.then(undefined, onRejected);
  }

  finally(callback) {
    if (typeof callback !== 'function') {
      return this;
    }
    return this.then(
      value => {
        const result = callback();
        if (result instanceof SashaPromise) {
          return result.then(() => value);
        }
        return value;
      },
      reason => {
        const result = callback();
        if (result instanceof SashaPromise) {
          return result.then(() => {
            throw reason;
          });
        }
        throw reason;
      },
    );
  }
  static resolve(value) {
    return new SashaPromise(resolve => resolve(value));
  }
  static reject(reason) {
    return new SashaPromise((_, reject) => reject(reason));
  }
}
