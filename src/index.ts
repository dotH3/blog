import Fastify from 'fastify'
import postPlugin from './plugins/post.plugin'
import { readFile } from 'fs/promises'

const fastify = Fastify({
  logger: false
})
await fastify.register(import('@fastify/rate-limit'), {
  max: 100,
  timeWindow: '1 minute',
})

fastify.get('/hello', async function handler(req, rep) {
  const html = await readFile(new URL('./public/index.html', import.meta.url), 'utf8')
  return rep.type('text/html').send(html)
})

await fastify.register(postPlugin, { prefix: '/posts' })

// Run the server!
try {
  const port = Number(process.env.PORT) || 3000
  console.log(`Server listening on http://localhost:${port}`)
  await fastify.listen({ port })
} catch (err) {
  fastify.log.error(err)
}