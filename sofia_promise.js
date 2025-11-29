const statusTypes = Object.freeze({
  PENDING: "pending",
  FULFILLED: "fulfilled",
  REJECTED: "rejected",
});

export class MyPromise {
  status;
  reason;
  value;

  onRejectedTasks = [];
  onFulfilledTasks = [];

  constructor(executor) {
    if (typeof executor !== "function") {
      throw new TypeError("аргумент должен быть функцией");
    }

    this.status = statusTypes.PENDING;

    try {
      executor(this.resolve, this.reject);
    } catch (error) {
      this.reject(error);
    }
  }

  resolve = (value) => {
    if (this.status !== statusTypes.PENDING) {
      return;
    }

    if (value && (typeof value === "object" || typeof value === "function")) {
      let then;
      try {
        then = value.then;
      } catch (err) {
        return this.reject(err);
      }
      if (typeof then === "function") {
        try {
          return then.call(value, this.resolve, this.reject);
        } catch (err) {
          return this.reject(err);
        }
      }
    }

    this.status = statusTypes.FULFILLED;
    this.value = value;

    if (this.onFulfilledTasks.length === 0) {
      return value;
    }

    this.onFulfilledTasks.forEach((func) => func(value));
  };

  reject = (reason) => {
    if (this.status !== statusTypes.PENDING) {
      return;
    }

    this.status = statusTypes.REJECTED;
    this.reason = reason;

    if (this.onRejectedTasks.length === 0) {
      return reason;
    }

    this.onRejectedTasks.forEach((func) => func(reason));
  };

  then = (onFulfilled, onRejected) => {
    return new MyPromise((resolve, reject) => {
      const wrapedOnFulfilled = (value) => {
        queueMicrotask(() => {
          if (typeof onFulfilled === "function") {
            try {
              resolve(onFulfilled(value));
            } catch (err) {
              reject(err);
            }
          } else {
            resolve(value);
          }
        });
      };

      const wrapedOnRejected = (reason) => {
        queueMicrotask(() => {
          if (typeof onRejected === "function") {
            try {
              resolve(onRejected(reason));
            } catch (err) {
              reject(err);
            }
          } else {
            reject(reason);
          }
        });
      };

      if (this.status === statusTypes.FULFILLED) {
        wrapedOnFulfilled(this.value);
      } else if (this.status === statusTypes.REJECTED) {
        wrapedOnRejected(this.reason);
      } else {
        this.onFulfilledTasks.push(wrapedOnFulfilled);
        this.onRejectedTasks.push(wrapedOnRejected);
      }
    });
  };

  catch = (onRejected) => {
    return this.then(undefined, onRejected);
  };

  finally = (callback) => {
    return this.then(
      (value) => {
        return MyPromise.resolve(callback()).then(() => value);
      },
      (reason) => {
        return MyPromise.resolve(callback()).then(() => {
          throw reason;
        });
      }
    );
  };

  static resolve(value) {
    return new MyPromise((resolve) => resolve(value));
  }

  static reject(reason) {
    return new MyPromise((_, reject) => reject(reason));
  }

  static all = (promises) => {
    return new MyPromise((resolve, reject) => {
      if (promises.length === 0) {
        return resolve([]);
      }

      const results = [];
      let finished = 0;

      promises.forEach((promise, i) => {
        MyPromise.resolve(promise)
          .then((value) => {
            results[i] = value;
            finished++;
            if (finished === promises.length) {
              resolve(results);
            }
          })
          .catch((reason) => reject(reason));
      });
    });
  };

  static race = (promises) => {
    return new MyPromise((resolve, reject) => {
      if (promises.length === 0) {
        return resolve([]);
      }

      promises.forEach((promise) => {
        MyPromise.resolve(promise)
          .then((value) => {
            resolve(value);
          })
          .catch((reason) => reject(reason));
      });
    });
  };

  static any = (promises) => {
    return new MyPromise((resolve, reject) => {
      if (promises.length === 0) {
        return resolve([]);
      }

      const errors = [];
      let finished = 0;

      promises.forEach((promise, i) => {
        MyPromise.resolve(promise)
          .then((value) => {
            resolve(value);
          })
          .catch((reason) => {
            errors[i] = reason;
            finished++;
            if (finished === promises.length) {
              reject(new AggregateError(errors));
            }
          });
      });
    });
  };

  static allSettled = (promises) => {
    return new MyPromise((resolve) => {
      if (promises.length === 0) {
        return resolve([]);
      }

      const results = [];
      let finished = 0;

      promises.forEach((promise, i) => {
        MyPromise.resolve(promise)
          .then((value) => {
            results[i] = { status: statusTypes.FULFILLED, value };
          })
          .catch((reason) => {
            results[i] = { status: statusTypes.REJECTED, reason };
          })
          .finally(() => {
            finished++;
            if (finished === promises.length) {
              resolve(results);
            }
          });
      });
    });
  };
}
