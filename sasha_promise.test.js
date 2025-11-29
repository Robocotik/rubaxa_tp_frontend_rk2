import {SashaPromise} from './sasha_promise.js';

const compare = (result, awaited) => {
  const isObject = obj => obj !== null && (typeof obj === 'object' || typeof obj === 'function');
  if (result === awaited) return true;
  if (isObject(result) && isObject(awaited)) {
    const resultKeys = Object.keys(result);
    const awaitedKeys = Object.keys(awaited);
    if (resultKeys.length !== awaitedKeys.length) return false;
    for (const key of resultKeys) {
      if (!compare(result[key], awaited[key])) return false;
    }
    return true;
  }
  return false;
};

new SashaPromise(resolve => {
  resolve(42);
}).then(value => console.log('Пример 1:', compare(value, 42)));

new SashaPromise((_, reject) => {
  reject(new Error('Что-то пошло не так'));
}).catch(err => console.log('Пример 2:', compare(err.message, 'Что-то пошло не так')));

SashaPromise.resolve(5)
  .then(x => x * 2)
  .then(x => x + 1)
  .then(x => console.log('Пример 3:', compare(x, 11)));

SashaPromise.resolve()
  .then(() => {
    throw new Error('Ошибка в then!');
  })
  .catch(err => console.log('Пример 4:', compare(err.message, 'Ошибка в then!')));

new SashaPromise(resolve => setTimeout(() => resolve(10), 10))
  .then(val => new SashaPromise(resolve => setTimeout(() => resolve(val * 2), 10)))
  .then(val => console.log('Пример 5:', compare(val, 20)));

SashaPromise.reject('Провал')
  .catch(() => 'Исправлено!')
  .then(msg => console.log('Пример 6:', compare(msg, 'Исправлено!')));

SashaPromise.resolve(100)
  .then(x => x / 2)
  .finally(() => {
    console.log('Пример 7 — finally выполнен');
  })
  .then(x => console.log('Пример 7:', compare(x, 50)));

SashaPromise.reject('Ошибка!')
  .finally(() => {
    console.log('Пример 8 — finally');
    return SashaPromise.resolve();
  })
  .catch(msg => console.log('Пример 8:', compare(msg, 'Ошибка!')));

new SashaPromise((resolve, reject) => {
  fetch('https://jsonplaceholder.typicode.com/posts/1')
    .then(res => res.json())
    .then(resolve)
    .catch(reject);
})
  .then(post => console.log('Пример 9:', post.title))
  .catch(err => console.error('Пример 9 — ошибка:', err));

new SashaPromise(() => {
  throw new Error('Executor сломался!');
}).catch(err => console.log('Пример 10:', err.message));
