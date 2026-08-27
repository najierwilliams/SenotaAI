import { createLunaQueueConsumer } from "../../server/luna/vercelQueueConsumer";

/**
 * This function is invoked only through the `queue/v2beta` trigger declared in vercel.json.
 * It has no public URL and must not be mounted in the Express application.
 */
export default createLunaQueueConsumer();
