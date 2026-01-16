// Import the framework and instantiate it
import Fastify from 'fastify'

const fastify = Fastify({
  logger: false
})
await fastify.register(import('@fastify/rate-limit'), {
  max: 25,
  timeWindow: '1 minute',
})

// Declare a route
fastify.get('/hello', async function handler(req, rep) {
  console.log(req.id, req.ip)
  return `Hello, ${req.ip}!`
})

// Run the server!
try {
  const port = Number(process.env.PORT) || 3000
  console.log(`Server listening on http://localhost:${port}`)
  await fastify.listen({ port })
} catch (err) {
  fastify.log.error(err)
}