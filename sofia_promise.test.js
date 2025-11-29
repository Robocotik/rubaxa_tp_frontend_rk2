import { MyPromise } from "./sofia_promise.js";

function describe(name, func) {
  console.log("\n" + name);
  func();
}

function test(name, func) {
  try {
    const res = func();
    if (res instanceof Promise) {
      res
        .then(() => console.log("  ✔ " + name))
        .catch((err) => {
          console.log("  ✘ " + name);
          console.error("    " + err);
        });
    } else {
      console.log("  ✔ " + name);
    }
  } catch (err) {
    console.log("  ✘ " + name);
    console.error("    " + err);
  }
}

function expect(value) {
  return {
    toBe(expected) {
      if (value !== expected)
        throw new Error(`Expected ${value} to be ${expected}`);
    },
    toEqual(expected) {
      const v = JSON.stringify(value);
      const e = JSON.stringify(expected);
      if (v !== e) throw new Error(`Expected ${v} to equal ${e}`);
    },
    toBeInstanceOf(cls) {
      if (!(value instanceof cls))
        throw new Error(`Expected value to be instance of ${cls.name}`);
    },
  };
}

describe("Тесты MyPromise", () => {
  // --- Thenable -------------------------------------------------------------

  test("resolve с thenable объектом", () => {
    return MyPromise.resolve({
      then: (resolve) => resolve(55),
    }).then((v) => expect(v).toBe(55));
  });

  test("reject из thenable", () => {
    return MyPromise.resolve({
      then: (_, reject) => reject("fail"),
    }).catch((e) => expect(e).toBe("fail"));
  });

  test("thenable возвращает thenable", () => {
    return MyPromise.resolve({
      then: (resolve) => resolve({ then: (res) => res(100) }),
    }).then((v) => expect(v).toBe(100));
  });

  test("ошибка внутри thenable", () => {
    return MyPromise.resolve({
      then: () => {
        throw "oops";
      },
    }).catch((e) => expect(e).toBe("oops"));
  });

  test("catch восстанавливает после thenable", () => {
    return MyPromise.resolve({
      then: (_, reject) => reject("err"),
    })
      .catch(() => 42)
      .then((v) => expect(v).toBe(42));
  });

  test("finally после thenable", () => {
    let called = false;
    return MyPromise.resolve({
      then: (resolve) => resolve(10),
    })
      .finally(() => {
        called = true;
      })
      .then((v) => {
        expect(called).toBe(true);
        expect(v).toBe(10);
      });
  });

  // --- Базовые цепочки ------------------------------------------------------

  test("then вызываются по порядку", () => {
    const calls = [];
    return MyPromise.resolve(1)
      .then(() => calls.push(1))
      .then(() => calls.push(2))
      .then(() => calls.push(3))
      .then(() => expect(calls).toEqual([1, 2, 3]));
  });

  test("catch вызывается только один раз", () => {
    const calls = [];
    return MyPromise.reject("err")
      .catch((e) => calls.push(e))
      .catch(() => calls.push("never"))
      .then(() => expect(calls).toEqual(["err"]));
  });

  test("finally после нескольких then", () => {
    let called = false;
    return MyPromise.resolve(5)
      .then((v) => v + 1)
      .then((v) => v + 1)
      .finally(() => (called = true))
      .then((v) => {
        expect(called).toBe(true);
        expect(v).toBe(7);
      });
  });

  test("then возвращает promise", () => {
    return MyPromise.resolve(2)
      .then((v) => MyPromise.resolve(v + 3))
      .then((v) => expect(v).toBe(5));
  });

  test("catch восстанавливает цепочку", () => {
    return MyPromise.reject("err")
      .catch(() => 42)
      .then((v) => expect(v).toBe(42));
  });

  test("finally не меняет значение", () => {
    return MyPromise.resolve(10)
      .finally(() => 99)
      .then((v) => expect(v).toBe(10));
  });

  test("finally после catch сохраняет значение", () => {
    return MyPromise.reject("fail")
      .catch(() => 5)
      .finally(() => {})
      .then((v) => expect(v).toBe(5));
  });

  test("несколько catch в цепочке", () => {
    const errors = [];
    return MyPromise.reject("err1")
      .catch((e) => {
        errors.push(e);
        throw "err2";
      })
      .catch((e) => {
        errors.push(e);
      })
      .then(() => expect(errors).toEqual(["err1", "err2"]));
  });

  test("вложенные then цепочки", () => {
    return MyPromise.resolve(1)
      .then((v) => MyPromise.resolve(v + 1))
      .then((v) => MyPromise.resolve(v + 1))
      .then((v) => expect(v).toBe(3));
  });

  test("catch после then при ошибке", () => {
    return MyPromise.resolve(1)
      .then(() => {
        throw "oops";
      })
      .catch((e) => expect(e).toBe("oops"));
  });

  test("then без аргументов передаёт значение", () => {
    return MyPromise.resolve(3)
      .then()
      .then((v) => expect(v).toBe(3));
  });

  test("несколько finally в цепи", () => {
    const calls = [];
    return MyPromise.resolve(1)
      .finally(() => calls.push(1))
      .then((v) => v)
      .finally(() => calls.push(2))
      .then(() => expect(calls).toEqual([1, 2]));
  });

  test("then после catch", () => {
    return MyPromise.reject("err")
      .catch(() => 10)
      .then((v) => expect(v).toBe(10));
  });

  test("then после finally сохраняет значение", () => {
    return MyPromise.resolve(7)
      .finally(() => {})
      .then((v) => expect(v).toBe(7));
  });

  test("finally выполняется даже при ошибке → catch", () => {
    let called = false;
    return MyPromise.reject("err")
      .finally(() => {
        called = true;
      })
      .catch(() => expect(called).toBe(true));
  });

  test("then возвращает Promise", () => {
    return MyPromise.resolve(1)
      .then(() => MyPromise.resolve(2))
      .then((v) => expect(v).toBe(2));
  });

  test("цепочка со смешанными значениями", () => {
    return MyPromise.resolve(1)
      .then((v) => v + 1)
      .then(() => MyPromise.resolve(3))
      .then((v) => expect(v).toBe(3));
  });

  test("catch возвращает Promise", () => {
    return MyPromise.reject("err")
      .catch(() => MyPromise.resolve(100))
      .then((v) => expect(v).toBe(100));
  });

  test("возврат thenable из then", () => {
    return MyPromise.resolve(1)
      .then(() => ({ then: (res) => res(9) }))
      .then((v) => expect(v).toBe(9));
  });

  test("порядок finally → then → finally", () => {
    const calls = [];
    return MyPromise.resolve(1)
      .finally(() => calls.push("a"))
      .then(() => {
        calls.push("b");
      })
      .finally(() => calls.push("c"))
      .then(() => expect(calls).toEqual(["a", "b", "c"]));
  });

  // --- Статические методы --------------------------------------------------

  test("Promise.all — reject при первой ошибке", () => {
    return MyPromise.all([MyPromise.resolve(1), MyPromise.reject("fail")])
      .then(() => {
        throw "should not resolve";
      })
      .catch((e) => expect(e).toBe("fail"));
  });

  test("Promise.race — берёт первое выполненное", () => {
    return MyPromise.race([MyPromise.resolve(1), MyPromise.resolve(2)]).then(
      (v) => expect(v).toBe(1)
    );
  });

  test("Promise.any — первый успешный", () => {
    return MyPromise.any([
      MyPromise.reject("x"),
      MyPromise.resolve(20),
      MyPromise.resolve(30),
    ]).then((v) => expect(v).toBe(20));
  });

  test("Promise.allSettled — корректные статусы", () => {
    return MyPromise.allSettled([
      MyPromise.resolve(1),
      MyPromise.reject("y"),
    ]).then((r) => {
      expect(r[0].status).toBe("fulfilled");
      expect(r[1].status).toBe("rejected");
    });
  });

  test("then выбрасывает ошибку → catch", () => {
    return MyPromise.resolve(1)
      .then(() => {
        throw "fail";
      })
      .catch((e) => expect(e).toBe("fail"));
  });

  test("вложенный finally выполняется по порядку", () => {
    const calls = [];
    return MyPromise.resolve(1)
      .finally(() => calls.push(1))
      .then((v) => v)
      .finally(() => calls.push(2))
      .then(() => expect(calls).toEqual([1, 2]));
  });

  test("catch возвращает thenable", () => {
    return MyPromise.reject("err")
      .catch(() => ({ then: (res) => res(50) }))
      .then((v) => expect(v).toBe(50));
  });

  test("finally выполняется после rejected thenable", () => {
    let called = false;
    return MyPromise.reject({ then: (_, rej) => rej("fail") })
      .catch((e) => {
        if (typeof e.then !== "function")
          throw new Error("then not a function");
      })
      .finally(() => (called = true))
      .then(() => expect(called).toBe(true));
  });
});
