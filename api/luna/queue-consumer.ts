const queueConsumerBundlePath = "../../server/luna/queue-consumer.bundle.js";
const queueConsumer = import(queueConsumerBundlePath).then(
  (module) => module.default as (...args: any[]) => unknown,
);

/** Vercel Queue private callback wrapper; never mounted in the public Express router. */
export default async function queueConsumerCallback(...args: any[]) {
  return (await queueConsumer)(...args);
}
