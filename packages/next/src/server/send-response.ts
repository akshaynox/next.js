import type { BaseNextRequest, BaseNextResponse } from './base-http'
import type { NodeNextResponse } from './base-http/node'

/**
 * Sends the response on the underlying next response object.
 *
 * @param req the underlying request object
 * @param res the underlying response object
 * @param response the response to send
 */
export async function sendResponse(
  req: BaseNextRequest,
  res: BaseNextResponse,
  response: Response
): Promise<void> {
  // Don't use in edge runtime
  if (process.env.NEXT_RUNTIME !== 'edge') {
    // Copy over the response status.
    res.statusCode = response.status
    res.statusMessage = response.statusText

    // Copy over the response headers.
    response.headers?.forEach((value, name) => {
      // The append handling is special cased for `set-cookie`.
      if (name.toLowerCase() === 'set-cookie') {
        res.setHeader(name, value)
      } else {
        res.appendHeader(name, value)
      }
    })

    /**
     * The response can't be directly piped to the underlying response. The
     * following is duplicated from the edge runtime handler.
     *
     * See packages/next/server/next-server.ts
     */

    const originalResponse = (res as NodeNextResponse).originalResponse

    // A response body must not be sent for HEAD requests. See https://httpwg.org/specs/rfc9110.html#HEAD
    if (response.body && req.method !== 'HEAD') {
      const { consumeUint8ArrayReadableStream } =
        require('next/dist/compiled/edge-runtime') as typeof import('next/dist/compiled/edge-runtime')
      const iterator = consumeUint8ArrayReadableStream(response.body)
      try {
        for await (const chunk of iterator) {
          originalResponse.write(chunk)
        }
      } finally {
        originalResponse.end()
      }
    } else {
      originalResponse.end()
    }
  }
}
