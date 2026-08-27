import { createLunaQueueConsumer } from "./vercelQueueConsumer";

/**
 * Build entrypoint for the private Vercel `queue/v2beta` consumer.
 * It is never mounted in the public Express application.
 */
export default createLunaQueueConsumer();
