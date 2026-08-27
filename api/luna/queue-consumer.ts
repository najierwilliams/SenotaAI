import { createLunaQueueConsumer } from "../../server/luna/vercelQueueConsumer";

/**
 * Private Vercel Queue push consumer. Its `queue/v2beta` trigger makes this
 * function unreachable from the public internet; it is not Express-mounted.
 */
export default createLunaQueueConsumer();
